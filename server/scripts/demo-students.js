// Demo students: 60 simulated GATE students (their real activity from two ExamPrep
// user studies, in server/demo/study-students.json) imported as ordinary students
// with new random identities, spread over the past weeks. They count everywhere a
// real student does. Each record carries demo: true so the admin app can tag them
// and `remove` can take them all out again.
//
//   node server/scripts/demo-students.js status
//   node server/scripts/demo-students.js import [--days 45] [--seed 7]
//   node server/scripts/demo-students.js remove
//
// Uses MONGODB_URI (server/.env or the environment) when set, otherwise the JSON
// files in server/data. With MongoDB, restart the live server afterwards: it keeps
// the database in memory and only loads it at start-up.
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(here, '..', '.env') })

const {
  initStorage, flushStorage, peek, putRecord, deleteRecord,
  userDb, attemptDb, discussionDb, instituteDb
} = await import('../db/index.js')
const { dayKey } = await import('../../shared/practice.js')

const BATCH = 'study-2026-11'
const TZ = 'Asia/Kolkata'
const DAY = 86400000
const CENTRE_NAME = 'Ace Academy Bhilai'

const args = process.argv.slice(2)
const command = args[0] || 'status'
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? Number(args[i + 1]) : fallback }

await initStorage()
const backend = process.env.MONGODB_URI ? `MongoDB (${process.env.MONGODB_DB || 'examprep'})` : 'JSON files in server/data'

const demoUsers = () => peek('users').filter(u => u.demo)

if (command === 'status') {
  const ids = new Set(demoUsers().map(u => u.id))
  const posts = Object.values(peek('discussions')).flat()
  const countPosts = (list) => list.reduce((n, p) => n + (ids.has(p.authorId) ? 1 : 0) + countPosts(p.replies || []), 0)
  console.log(`Storage: ${backend}`)
  console.log(`Demo students: ${ids.size} of ${peek('users').length} accounts`)
  console.log(`Their mock attempts: ${peek('mockAttempts').filter(a => ids.has(a.userId)).length}, forum posts: ${countPosts(posts)}, reports: ${peek('reports').filter(r => ids.has(r.userId)).length}`)
  process.exit(0)
}

if (command === 'remove') {
  const users = demoUsers()
  const ids = new Set(users.map(u => u.id))
  for (const id of ids) {
    for (const name of ['attempts', 'bookmarks', 'notes', 'testRecords', 'potd']) deleteRecord(name, id)
    deleteRecord('users', id)
  }
  peek('mockAttempts').filter(a => ids.has(a.userId)).map(a => a.id).forEach(id => deleteRecord('mockAttempts', id))
  peek('reports').filter(r => ids.has(r.userId) || r.demo).map(r => r.id).forEach(id => deleteRecord('reports', id))
  const prune = (list) => list.filter(p => !ids.has(p.authorId)).map(p => ({ ...p, replies: prune(p.replies || []) }))
  for (const [qid, list] of Object.entries(structuredClone(peek('discussions')))) {
    const next = prune(list)
    if (JSON.stringify(next) !== JSON.stringify(list)) discussionDb.saveQuestion(qid, next)
  }
  for (const centre of structuredClone(peek('institutes'))) {
    if (centre.demo) { instituteDb.delete(centre.id); continue }
    const members = (centre.members || []).filter(m => !ids.has(m.userId))
    if (members.length !== (centre.members || []).length) putRecord('institutes', centre.id, { ...centre, members })
  }
  await flushStorage()
  console.log(`Removed ${ids.size} demo students and everything they created (${backend}).`)
  process.exit(0)
}

if (command !== 'import') {
  console.log('Commands: status | import [--days 45] [--seed 7] | remove')
  process.exit(1)
}

if (demoUsers().length) {
  console.error(`There are already ${demoUsers().length} demo students. Run "remove" first to import them again.`)
  process.exit(1)
}

// --- Random but repeatable choices ---
let state = opt('seed', 7) * 2654435761 % 4294967296 || 1
const rand = () => ((state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296)
const pick = (list) => list[Math.floor(rand() * list.length)]
const between = (a, b) => a + Math.floor(rand() * (b - a + 1))

const FIRST = ['Aarav', 'Vihaan', 'Aditya', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Rudra', 'Kabir', 'Ayaan', 'Dhruv', 'Harsh', 'Pranav', 'Rohit', 'Siddharth', 'Tushar', 'Yash', 'Nikhil', 'Aman', 'Gaurav', 'Manish', 'Ritesh', 'Sandeep', 'Vivek', 'Abhinav', 'Kartik', 'Tanmay', 'Ananya', 'Diya', 'Aadhya', 'Saanvi', 'Ira', 'Myra', 'Kiara', 'Anika', 'Riya', 'Sneha', 'Pooja', 'Shreya', 'Nisha', 'Kavya', 'Tanvi', 'Meghna', 'Ishita', 'Neha', 'Priyanka', 'Swati', 'Aishwarya', 'Bhavya', 'Charu', 'Deepika', 'Garima', 'Jyoti', 'Komal', 'Lavanya', 'Mansi', 'Payal', 'Ruchi', 'Sakshi', 'Simran', 'Trisha', 'Vaishnavi', 'Zoya', 'Fatima', 'Imran', 'Faizan', 'Arsh']
const LAST = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Menon', 'Rao', 'Joshi', 'Kulkarni', 'Deshmukh', 'Patil', 'Chatterjee', 'Banerjee', 'Das', 'Bose', 'Mukherjee', 'Mishra', 'Tiwari', 'Pandey', 'Dubey', 'Yadav', 'Chauhan', 'Rathore', 'Agarwal', 'Jain', 'Saxena', 'Srivastava', 'Tripathi', 'Pillai', 'Naidu', 'Shetty', 'Hegde', 'Khan', 'Ansari', 'Qureshi', 'Siddiqui', 'Sahu', 'Sinha', 'Thakur', 'Bhatt', 'Dewangan', 'Chandrakar', 'Verghese', 'Fernandes', 'Gill', 'Sandhu']

const bundle = JSON.parse(fs.readFileSync(path.join(here, '..', 'demo', 'study-students.json'), 'utf8'))
const now = Date.now()
const spanDays = opt('days', 45)
const usedEmails = new Set(peek('users').map(u => u.email))
const usedNames = new Set()

// New identity and a sign-up moment for every student; their activity keeps its
// own timing and moves with the sign-up
const people = new Map()
for (const s of bundle.students) {
  let first, last
  do { first = pick(FIRST); last = pick(LAST) } while (usedNames.has(`${first} ${last}`))
  usedNames.add(`${first} ${last}`)
  let email
  do { email = `${first}.${last}${between(1, 99)}`.toLowerCase() + '@example.com' } while (usedEmails.has(email))
  usedEmails.add(email)
  const daysAgo = between(2, spanDays)
  const signupDay = new Date(now - daysAgo * DAY)
  // A time of day a student would plausibly be studying (7:00 to 23:30 IST)
  const istMidnight = Date.UTC(signupDay.getUTCFullYear(), signupDay.getUTCMonth(), signupDay.getUTCDate()) - 5.5 * 3600000
  const createdAt = istMidnight + between(7 * 60, 23 * 60 + 30) * 60000
  people.set(s.key, {
    id: `usr-${createdAt}-${crypto.randomBytes(3).toString('hex')}`,
    first, last, name: `${first} ${last}`, email,
    offset: createdAt - s.profile.createdAt,
    createdAt
  })
}

const fill = (v) => {
  if (typeof v === 'string') {
    return v.replace(/\{\{(name|first):([a-z0-9]+)\}\}/g, (m, kind, key) => {
      const p = people.get(key)
      return p ? (kind === 'name' ? p.name : p.first) : m
    })
  }
  if (Array.isArray(v)) return v.map(fill)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)]))
  return v
}
// Move every timestamp in a record by the student's offset
const shiftTimes = (v, offset) => {
  if (typeof v === 'number' && v > 1.6e12 && v < 2.2e12) return Math.min(now - 60000, v + offset)
  if (Array.isArray(v)) return v.map(x => shiftTimes(x, offset))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shiftTimes(x, offset)]))
  return v
}
const shiftDayKey = (key, offset) => dayKey(Date.parse(`${key}T12:00:00+05:30`) + offset, TZ)
const rekeyDays = (days, offset) => Object.fromEntries(Object.entries(days || {}).map(([k, v]) => [shiftDayKey(k, offset), v]))
const avatarFor = (name) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
const dob = () => `${between(1998, 2005)}-${String(between(1, 12)).padStart(2, '0')}-${String(between(1, 28)).padStart(2, '0')}`

// The coaching centre the study's coaching students joined
let centre = peek('institutes').find(i => i.demo && i.name === CENTRE_NAME)
const centreMembers = []

let mocks = 0, reports = 0, posts = 0
for (const s of bundle.students) {
  const p = people.get(s.key)
  const t = (v) => shiftTimes(fill(v), p.offset)

  const profile = t(s.profile)
  userDb.create({
    ...profile,
    id: p.id,
    name: p.name,
    email: p.email,
    passwordHash: null,
    salt: null,
    avatar: avatarFor(p.name),
    ...(profile.provider === 'google' ? { googleId: `g-demo-${crypto.randomBytes(6).toString('hex')}`, emailVerified: true } : { emailVerified: true }),
    dob: profile.dob ? dob() : profile.dob,
    createdAt: p.createdAt,
    demo: true,
    demoBatch: BATCH
  })

  if (s.attempts) {
    const a = t(s.attempts)
    attemptDb.saveUserAttempts(p.id, { attempts: a.attempts || {}, days: rekeyDays(s.attempts.days, p.offset), timeZone: TZ })
  }
  if (s.bookmarks) putRecord('bookmarks', p.id, t(s.bookmarks))
  if (s.notes) putRecord('notes', p.id, t(s.notes))
  if (s.potd) {
    putRecord('potd', p.id, Object.fromEntries(Object.entries(s.potd).map(([k, v]) => [shiftDayKey(k, p.offset), shiftTimes(v, p.offset)])))
  }
  if (s.testRecords) {
    const fix = (h) => {
      const r = t(h)
      if (r.timestamp) {
        const d = new Date(r.timestamp)
        r.date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })
        r.time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ })
      }
      return r
    }
    putRecord('testRecords', p.id, {
      mockHistory: (s.testRecords.mockHistory || []).map(fix),
      pyqHistory: (s.testRecords.pyqHistory || []).map(fix),
      updatedAt: shiftTimes(s.testRecords.updatedAt, p.offset)
    })
  }
  for (const m of s.mockAttempts) {
    const rec = t(m)
    const attemptNo = peek('mockAttempts').filter(a => a.userId === p.id && a.testId === rec.testId).length + 1
    const id = `ma-${rec.submittedAt}-${crypto.randomBytes(3).toString('hex')}`
    putRecord('mockAttempts', id, { ...rec, id, userId: p.id, attemptNo })
    mocks++
  }
  for (const r of s.reports) {
    const rec = t(r)
    const id = `rep-${rec.createdAt}-${crypto.randomBytes(3).toString('hex')}`
    putRecord('reports', id, { ...rec, id, userId: p.id, userName: p.name, userEmail: p.email, status: 'open', adminNote: '', demo: true })
    reports++
  }
  if (s.centreJoinedAt) centreMembers.push({ userId: p.id, joinedAt: Math.min(now - 60000, s.centreJoinedAt + p.offset) })
}

if (centreMembers.length) {
  if (!centre) {
    const created = instituteDb.create({ name: CENTRE_NAME, adminEmails: [], seats: 0, seriesIds: [], createdBy: 'demo-import' })
    centre = putRecord('institutes', created.id, { ...created, demo: true, createdAt: Math.min(...centreMembers.map(m => m.joinedAt)) - 7 * DAY })
  }
  putRecord('institutes', centre.id, { ...centre, members: [...(centre.members || []), ...centreMembers] })
}

// Forum posts and replies, each moved with its own author; a reply never comes
// before what it answers
const toPost = (raw, parentTime = 0) => {
  const p = people.get(raw.authorKey)
  if (!p) return null
  const { authorKey, voters, replies, ...rest } = raw
  const post = fill(rest)
  post.timestamp = Math.min(now - 60000, Math.max(parentTime + 60000, (rest.timestamp || p.createdAt) + p.offset))
  if (post.editedAt) post.editedAt = Math.max(post.timestamp, post.editedAt + p.offset)
  posts++
  return {
    ...post,
    author: p.name,
    authorId: p.id,
    avatar: avatarFor(p.name),
    voters: Object.fromEntries(Object.entries(voters || {}).map(([k, v]) => [people.get(k)?.id, v]).filter(([id]) => id)),
    replies: (replies || []).map(r => toPost(r, post.timestamp)).filter(Boolean)
  }
}
for (const [qid, list] of Object.entries(bundle.discussions)) {
  const added = list.map(r => toPost(r)).filter(Boolean)
  if (added.length) discussionDb.saveQuestion(qid, [...discussionDb.getQuestion(qid), ...added])
}

await flushStorage()
console.log(`Imported ${bundle.students.length} demo students into ${backend}:`)
console.log(`  sign-ups spread over the last ${spanDays} days, ${mocks} mock attempts, ${posts} forum posts, ${reports} issue reports, ${centreMembers.length} in "${CENTRE_NAME}"`)
if (process.env.MONGODB_URI) console.log('Restart the live server now so it loads them (it reads MongoDB only at start-up).')
process.exit(0)
