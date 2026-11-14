import { MongoClient } from 'mongodb'

// MongoDB backing for the JSON "files" in db/index.js, used when MONGODB_URI is set.
//
// Render's free instances lose their disk on every deploy and whenever they sleep,
// so files there don't survive. Instead, every file lives in its own collection and
// is held in memory: reads come from memory (so the rest of the server stays
// synchronous), and each write saves only the records that changed, in order.
//
// Files are either an array of records with an `id` (users, reports, ...) or an
// object keyed by user or question id (bookmarks, discussions, ...). Each record or
// key becomes one document: { _id: id, data: record }.

const cache = new Map()       // file name -> current value
const kinds = new Map()       // file name -> 'array' | 'object'
let db = null
let queue = Promise.resolve() // writes go out one at a time, in order

export const isMongoEnabled = () => !!db

export async function connectMongo(uri, files, { dbName = process.env.MONGODB_DB || 'examprep' } = {}) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 })
  await client.connect()
  db = client.db(dbName)

  for (const [name, kind] of Object.entries(files)) {
    kinds.set(name, kind)
    const docs = await db.collection(name).find({}).toArray()
    if (kind === 'array') {
      cache.set(name, docs.map(d => d.data).sort((a, b) => (a?.createdAt || 0) - (b?.createdAt || 0)))
    } else {
      cache.set(name, Object.fromEntries(docs.map(d => [d._id, d.data])))
    }
  }
  console.log(`Connected to MongoDB (${dbName}); loaded ${[...cache.values()].reduce((n, v) => n + (Array.isArray(v) ? v.length : Object.keys(v).length), 0)} records.`)
  return client
}

// Callers change what they read and write it back, so hand out copies
export const mongoRead = (name) => structuredClone(cache.get(name))

const entriesOf = (name, value) => (kinds.get(name) === 'array'
  ? new Map((value || []).filter(r => r && r.id !== undefined).map(r => [String(r.id), r]))
  : new Map(Object.entries(value || {})))

export function mongoWrite(name, value) {
  const before = entriesOf(name, cache.get(name))
  const after = entriesOf(name, value)
  cache.set(name, structuredClone(value))

  const ops = []
  for (const [id, record] of after) {
    const old = before.get(id)
    if (old === undefined || JSON.stringify(old) !== JSON.stringify(record)) {
      ops.push({ replaceOne: { filter: { _id: id }, replacement: { _id: id, data: record }, upsert: true } })
    }
  }
  for (const id of before.keys()) {
    if (!after.has(id)) ops.push({ deleteOne: { filter: { _id: id } } })
  }
  if (!ops.length) return

  queue = queue.then(() => writeWithRetry(name, ops))
}

// A write that fails (a network blip, an Atlas failover) is retried with backoff
// before the next queued write goes out, so writes stay in order. Errors that
// retrying can't fix (a document over MongoDB's 16 MB limit, a bad value) are
// logged once and skipped. `failing` is reported by /api/health.
const MAX_ATTEMPTS = 8
const PERMANENT_CODES = new Set([2, 10334, 17419]) // BadValue, BSONObjectTooLarge, document too large
let failing = null // null | { collection, since, message, lost }
let lostWrites = 0
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function writeWithRetry(name, ops) {
  for (let attempt = 1; ; attempt++) {
    try {
      await db.collection(name).bulkWrite(ops, { ordered: true })
      if (failing) {
        console.log(`[MongoDB] Writes are succeeding again (failing since ${new Date(failing.since).toISOString()}).`)
        failing = null
      }
      return
    } catch (err) {
      const permanent = PERMANENT_CODES.has(err?.code) || /too large/i.test(err?.message || '')
      failing = failing || { collection: name, since: Date.now() }
      failing.message = err?.message || String(err)
      if (permanent || attempt >= MAX_ATTEMPTS) {
        lostWrites += ops.length
        console.error(`[MongoDB] GAVE UP saving ${ops.length} change(s) to ${name} after ${attempt} attempt(s): ${failing.message}`)
        return
      }
      console.error(`[MongoDB] Could not save ${name} (attempt ${attempt}/${MAX_ATTEMPTS}), retrying: ${failing.message}`)
      await sleep(Math.min(30000, 1000 * 2 ** (attempt - 1)))
    }
  }
}

export const mongoHealth = () => ({ backend: 'mongodb', ok: !failing, failingSince: failing?.since || null, error: failing?.message || null, lostWrites })

// Resolves once everything written so far has reached MongoDB (used on shutdown)
export const flushMongo = () => queue
