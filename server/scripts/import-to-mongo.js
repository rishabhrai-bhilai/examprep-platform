// Copies the JSON files in server/data into MongoDB (MONGODB_URI), replacing what's
// there. Run once to move existing data:  node server/scripts/import-to-mongo.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { connectMongo, mongoWrite, flushMongo } from '../db/mongoStore.js'

const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(here, '..', '.env') })

const FILES = {
  users: ['users.json', 'array'], reports: ['reports.json', 'array'], mockAttempts: ['mock_attempts.json', 'array'],
  bookmarks: ['bookmarks.json', 'object'], notes: ['notes.json', 'object'], testRecords: ['test_records.json', 'object'],
  discussions: ['discussions.json', 'object'], attempts: ['attempts.json', 'object'], potd: ['potd.json', 'object']
}

if (!process.env.MONGODB_URI) {
  console.error('Set MONGODB_URI (in server/.env or the environment) first.')
  process.exit(1)
}

const client = await connectMongo(process.env.MONGODB_URI, Object.fromEntries(Object.entries(FILES).map(([n, [, kind]]) => [n, kind])))
for (const [name, [file, kind]] of Object.entries(FILES)) {
  const full = path.join(here, '..', 'data', file)
  const data = fs.existsSync(full) ? JSON.parse(fs.readFileSync(full, 'utf8') || (kind === 'array' ? '[]' : '{}')) : (kind === 'array' ? [] : {})
  mongoWrite(name, data)
  console.log(`${name}: ${Array.isArray(data) ? data.length : Object.keys(data).length} records`)
}
await flushMongo()
await client.close()
console.log('Done.')
