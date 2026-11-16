import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectMongo, isMongoEnabled, mongoPeek, mongoSaveRecord, flushMongo, mongoHealth } from './mongoStore.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '..', 'data')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  bookmarks: path.join(DATA_DIR, 'bookmarks.json'),
  notes: path.join(DATA_DIR, 'notes.json'),
  testRecords: path.join(DATA_DIR, 'test_records.json'),
  discussions: path.join(DATA_DIR, 'discussions.json'),
  reports: path.join(DATA_DIR, 'reports.json'),
  attempts: path.join(DATA_DIR, 'attempts.json'),
  mockAttempts: path.join(DATA_DIR, 'mock_attempts.json'),
  potd: path.join(DATA_DIR, 'potd.json'),
  institutes: path.join(DATA_DIR, 'institutes.json'),
  testSeries: path.join(DATA_DIR, 'test_series.json'),
  coaching: path.join(DATA_DIR, 'coaching.json')
}

// How each file is shaped, for MongoDB: a list of records with ids, or an object by key
const FILE_KINDS = {
  users: 'array', reports: 'array', mockAttempts: 'array', institutes: 'array',
  testSeries: 'array',
  bookmarks: 'object', notes: 'object', testRecords: 'object', discussions: 'object', attempts: 'object', potd: 'object',
  coaching: 'object'
}

// With MONGODB_URI set, data lives in MongoDB (Render's disk is wiped on every
// deploy and sleep); otherwise in the JSON files in server/data. Call before serving.
export async function initStorage() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    // On Render the disk is wiped on every deploy and sleep, so running production
    // on files silently loses every account. Refuse unless explicitly allowed.
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_FILE_STORAGE !== '1') {
      throw new Error('MONGODB_URI is not set. Production needs MongoDB (or set ALLOW_FILE_STORAGE=1 on a host with a persistent disk).')
    }
    console.log('Storing data in JSON files (set MONGODB_URI to use MongoDB).')
    return null
  }
  return connectMongo(uri, FILE_KINDS)
}

export const flushStorage = () => (isMongoEnabled() ? flushMongo() : Promise.resolve())
export const storageHealth = () => (isMongoEnabled() ? mongoHealth() : { backend: 'files', ok: true })

// --- STORAGE PRIMITIVES ---
// Every collection is held in memory (MongoDB's cache, or the parsed JSON file).
// Requests read and write single records: one user, one user's notes, one
// question's posts. Nothing on a request path copies a whole collection.
//
//   peek(name)                 the live value, read-only (never change or keep it)
//   getRecord(name, key)       a private copy of one record, or undefined
//   putRecord(name, key, rec)  saves one record (MongoDB: one upsert)
//   deleteRecord(name, key)    removes one record

const emptyOf = (name) => (FILE_KINDS[name] === 'array' ? [] : {})

// JSON files: parsed once and kept, re-read only if the file changes on disk
// (someone edited it by hand). Writes go to a temporary file, then a rename.
const fileCache = new Map() // name -> { mtimeMs, size, value }

function writeJsonAtomic(filePath, data) {
  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substr(2, 6)}.tmp`
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8')
    fs.renameSync(tempPath, filePath)
  } catch (err) {
    console.error(`[DB Write Error] on ${filePath}:`, err.message)
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath) } catch (_) {}
    }
    throw err
  }
}

function filePeek(name) {
  const filePath = FILES[name]
  try {
    if (!fs.existsSync(filePath)) saveFile(name, emptyOf(name))
    const stat = fs.statSync(filePath)
    const cached = fileCache.get(name)
    if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.value
    const raw = fs.readFileSync(filePath, 'utf8')
    const value = raw.trim() ? JSON.parse(raw) : emptyOf(name)
    fileCache.set(name, { mtimeMs: stat.mtimeMs, size: stat.size, value })
    return value
  } catch (err) {
    console.error(`[DB Read Error] on ${filePath}:`, err.message)
    return fileCache.get(name)?.value || emptyOf(name)
  }
}

function saveFile(name, value) {
  writeJsonAtomic(FILES[name], value)
  const stat = fs.statSync(FILES[name])
  fileCache.set(name, { mtimeMs: stat.mtimeMs, size: stat.size, value })
}

export const peek = (name) => (isMongoEnabled() ? mongoPeek(name) : filePeek(name)) || emptyOf(name)

// Array collections: id -> position, rebuilt whenever the array itself is replaced
// (loaded from MongoDB, or re-read from disk)
const positions = new WeakMap()
function positionOf(list, id) {
  let index = positions.get(list)
  if (!index) {
    index = new Map()
    list.forEach((r, i) => { if (r && r.id !== undefined) index.set(String(r.id), i) })
    positions.set(list, index)
  }
  const i = index.get(String(id))
  return i === undefined ? -1 : i
}

const rawRecord = (name, key) => {
  const value = peek(name)
  if (FILE_KINDS[name] === 'array') {
    const i = positionOf(value, key)
    return i === -1 ? undefined : value[i]
  }
  return Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined
}

export const getRecord = (name, key) => {
  const record = rawRecord(name, key)
  return record === undefined ? undefined : structuredClone(record)
}

// Stored records are never changed in place, only replaced, so a copy handed out
// earlier (or one waiting to be sent to MongoDB) can't change underneath anyone
export function putRecord(name, key, record) {
  const value = peek(name)
  const copy = structuredClone(record)
  if (FILE_KINDS[name] === 'array') {
    const i = positionOf(value, key)
    if (i === -1) {
      value.push(copy)
      positions.get(value).set(String(key), value.length - 1)
    } else {
      value[i] = copy
    }
  } else {
    value[key] = copy
  }
  if (isMongoEnabled()) mongoSaveRecord(name, key, copy)
  else saveFile(name, value)
  return structuredClone(copy)
}

export function deleteRecord(name, key) {
  const value = peek(name)
  if (FILE_KINDS[name] === 'array') {
    const i = positionOf(value, key)
    if (i === -1) return
    value.splice(i, 1)
    positions.delete(value) // positions after it moved
  } else {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return
    delete value[key]
  }
  if (isMongoEnabled()) mongoSaveRecord(name, key, undefined)
  else saveFile(name, value)
}

// Copies of every record that matches (for small result sets)
const findAll = (name, predicate) => peek(name).filter(predicate).map(r => structuredClone(r))

// --- USERS DB ---
export const userDb = {
  getAll: () => structuredClone(peek('users')),

  findByEmail: (email) => {
    if (!email) return null
    const normalized = email.trim().toLowerCase()
    const user = peek('users').find(u => u.email.toLowerCase() === normalized)
    return user ? structuredClone(user) : null
  },

  findById: (id) => {
    if (!id) return null
    return getRecord('users', id) || null
  },

  create: (userData) => {
    const newUser = {
      id: userData.id || `usr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      passwordHash: userData.passwordHash || null,
      salt: userData.salt || null,
      provider: userData.provider || 'local', // 'local' | 'google'
      avatar: userData.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(userData.name)}`,
      createdAt: Date.now(),
      // Derived from the user's practice attempts (see refreshPracticeStats in server.js)
      streak: 0,
      solvedQuestions: 0,
      ...userData
    }
    return putRecord('users', newUser.id, newUser)
  },

  update: (id, updates) => {
    const user = rawRecord('users', id)
    if (!user) return null

    // Disallow overwriting id or salt directly via update
    const safeUpdates = { ...updates }
    delete safeUpdates.id
    delete safeUpdates.salt

    return putRecord('users', id, { ...user, ...safeUpdates, updatedAt: Date.now() })
  },

  // The only way to change a password hash and its salt (update() refuses salt)
  setPassword: (id, passwordHash, salt) => {
    const user = rawRecord('users', id)
    if (!user) return null
    // A new password signs out every other session (see tokenFor in services/auth.js)
    return putRecord('users', id, { ...user, passwordHash, salt, tokenVersion: (user.tokenVersion || 0) + 1, updatedAt: Date.now() })
  }
}

// --- ISSUE REPORTS DB ---
// Stored as Report[]: { id, userId, userName, userEmail, category, questionId, page,
//   message, status: 'open' | 'in_progress' | 'resolved', adminNote, createdAt, updatedAt }
export const reportDb = {
  getAll: () => structuredClone(peek('reports')),

  getByUser: (userId) => findAll('reports', r => r.userId === userId),

  create: (report) => {
    const newReport = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      status: 'open',
      adminNote: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...report
    }
    return putRecord('reports', newReport.id, newReport)
  },

  update: (id, updates) => {
    const report = rawRecord('reports', id)
    if (!report) return null
    return putRecord('reports', id, { ...report, ...updates, id, updatedAt: Date.now() })
  }
}

// --- BOOKMARKS DB ---
// Stored as { [userId]: { bookmarks: number[], bookmarkFolders: { [folderName]: number[] }, updatedAt: number } }
export const bookmarkDb = {
  getUserBookmarks: (userId) => {
    if (!userId) return { bookmarks: [], bookmarkFolders: { "General": [] } }
    return getRecord('bookmarks', userId) || { bookmarks: [], bookmarkFolders: { "General": [] } }
  },

  // How many questions the user has bookmarked, without copying the list
  countUserBookmarks: (userId) => (userId ? (rawRecord('bookmarks', userId)?.bookmarks || []).length : 0),

  saveUserBookmarks: (userId, { bookmarks = [], bookmarkFolders = {} }) => {
    if (!userId) return null
    return putRecord('bookmarks', userId, {
      bookmarks: Array.isArray(bookmarks) ? bookmarks : [],
      bookmarkFolders: typeof bookmarkFolders === 'object' && bookmarkFolders !== null ? bookmarkFolders : { "General": [] },
      updatedAt: Date.now()
    })
  }
}

// --- SCRATCHPAD NOTES DB ---
// Stored as { [userId]: { questionNotes: { [questionId]: NoteObject }, updatedAt: number } }
export const noteDb = {
  getUserNotes: (userId) => {
    if (!userId) return { questionNotes: {} }
    return getRecord('notes', userId) || { questionNotes: {} }
  },

  saveUserNotes: (userId, questionNotes = {}) => {
    if (!userId) return null
    return putRecord('notes', userId, {
      questionNotes: typeof questionNotes === 'object' && questionNotes !== null ? questionNotes : {},
      updatedAt: Date.now()
    })
  }
}

// --- TEST RECORDS / MOCK HISTORY DB ---
// Stored as { [userId]: { mockHistory: any[], pyqHistory: any[], updatedAt: number } }
export const testRecordDb = {
  getUserRecords: (userId) => {
    if (!userId) return { mockHistory: [], pyqHistory: [] }
    return getRecord('testRecords', userId) || { mockHistory: [], pyqHistory: [] }
  },

  saveUserRecords: (userId, { mockHistory = [], pyqHistory = [] }) => {
    if (!userId) return null
    return putRecord('testRecords', userId, {
      mockHistory: Array.isArray(mockHistory) ? mockHistory : [],
      pyqHistory: Array.isArray(pyqHistory) ? pyqHistory : [],
      updatedAt: Date.now()
    })
  }
}

// --- PRACTICE ATTEMPTS DB ---
// Stored as { [userId]: { attempts: { [questionId]: Attempt }, days: { 'YYYY-MM-DD': DayTotals },
//   timeZone: string | null, updatedAt: number } } (shapes in shared/practice.js)
export const attemptDb = {
  // Every user's record at once ({ [userId]: ... }): peer comparisons and reading many users in one pass
  getAll: () => structuredClone(peek('attempts')),

  getUserAttempts: (userId) => {
    if (!userId) return { attempts: {}, days: {}, timeZone: null }
    return getRecord('attempts', userId) || { attempts: {}, days: {}, timeZone: null }
  },

  // Just the saved time zone, without copying the attempts
  getUserTimeZone: (userId) => (userId ? rawRecord('attempts', userId)?.timeZone || null : null),

  saveUserAttempts: (userId, { attempts = {}, days = {}, timeZone = null }) => {
    if (!userId) return null
    return putRecord('attempts', userId, { attempts, days, timeZone, updatedAt: Date.now() })
  }
}

// --- DISCUSSIONS DB ---
// Stored as { [questionId]: Solution[] }; each question's posts are one record
export const discussionDb = {
  getAll: () => structuredClone(peek('discussions')),

  // The live object, read-only: for building the per-question summary and stats
  peekAll: () => peek('discussions'),

  getQuestion: (questionId) => getRecord('discussions', String(questionId)) || [],

  saveQuestion: (questionId, posts) => {
    if (Array.isArray(posts) && posts.length) putRecord('discussions', String(questionId), posts)
    else deleteRecord('discussions', String(questionId))
  }
}

// --- MOCK TEST ATTEMPTS ---
// Every counted attempt, scored by the server: [{ id, userId, testId, attemptNo,
// submittedAt, timeTaken, score, maxScore, correct, incorrect, unanswered, subjects }].
// attemptNo 1 is the one used for global comparison.
export const mockAttemptDb = {
  getAll: () => structuredClone(peek('mockAttempts')),
  getByUser: (userId) => findAll('mockAttempts', a => a.userId === userId),
  // First attempts of everyone at one test
  getFirstAttempts: (testId) => findAll('mockAttempts', a => a.testId === testId && a.attemptNo === 1),
  create: (attempt) => {
    const attemptNo = peek('mockAttempts').filter(a => a.userId === attempt.userId && a.testId === attempt.testId).length + 1
    const saved = { id: `ma-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...attempt, attemptNo }
    return putRecord('mockAttempts', saved.id, saved)
  }
}

// --- PROBLEM OF THE DAY ---
// { [userId]: { [dateKey]: { questionId, correct, at } } }; one entry per day
export const potdDb = {
  getUserDays: (userId) => getRecord('potd', userId) || {},
  // Records the day's first attempt; later attempts the same day change nothing
  record: (userId, dateKey, entry) => {
    const days = rawRecord('potd', userId) || {}
    if (days[dateKey]) return { entry: structuredClone(days[dateKey]), isNew: false }
    putRecord('potd', userId, { ...days, [dateKey]: entry })
    return { entry, isNew: true }
  }
}

// --- COACHING CENTRES (INSTITUTES) ---
// [{ id, name, code, adminEmails: string[], seats, seriesIds, members: [{ userId, joinedAt }],
//   createdBy, createdAt, updatedAt }]. Site admins (ADMIN_EMAILS) create centres;
// students join with the centre's code and can belong to one centre at a time.
const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O or 1/I
const newInviteCode = (taken) => {
  for (;;) {
    const code = Array.from(crypto.randomBytes(6), b => INVITE_ALPHABET[b % INVITE_ALPHABET.length]).join('')
    if (!taken.has(code)) return code
  }
}
const normalizeCode = (code) => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

export const instituteDb = {
  getAll: () => structuredClone(peek('institutes')),
  findById: (id) => getRecord('institutes', id) || null,
  findByCode: (code) => {
    const wanted = normalizeCode(code)
    const found = wanted ? peek('institutes').find(i => i.code === wanted) : null
    return found ? structuredClone(found) : null
  },
  // Centres where this email is an admin
  findByAdmin: (email) => {
    const e = String(email || '').toLowerCase()
    return e ? findAll('institutes', i => (i.adminEmails || []).includes(e)) : []
  },
  findByMember: (userId) => {
    const found = peek('institutes').find(i => (i.members || []).some(m => m.userId === userId))
    return found ? structuredClone(found) : null
  },

  create: ({ name, adminEmails, seats = 0, seriesIds = [], createdBy }) => {
    const institute = {
      id: `ins-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name,
      code: newInviteCode(new Set(peek('institutes').map(i => i.code))),
      adminEmails,
      seats,
      seriesIds,
      members: [],
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    return putRecord('institutes', institute.id, institute)
  },

  update: (id, { name, adminEmails, seats, seriesIds, regenerateCode } = {}) => {
    const current = rawRecord('institutes', id)
    if (!current) return null
    const next = { ...current, updatedAt: Date.now() }
    if (name !== undefined) next.name = name
    if (adminEmails !== undefined) next.adminEmails = adminEmails
    if (seats !== undefined) next.seats = seats
    if (seriesIds !== undefined) next.seriesIds = seriesIds
    if (regenerateCode) next.code = newInviteCode(new Set(peek('institutes').map(i => i.code)))
    return putRecord('institutes', id, next)
  },

  // Joining one centre leaves any other (one centre at a time)
  addMember: (id, userId) => {
    const target = rawRecord('institutes', id)
    if (!target) return null
    peek('institutes')
      .filter(i => i.id !== id && (i.members || []).some(m => m.userId === userId))
      .forEach(i => putRecord('institutes', i.id, { ...i, members: i.members.filter(m => m.userId !== userId) }))
    if ((target.members || []).some(m => m.userId === userId)) return structuredClone(target)
    return putRecord('institutes', id, { ...target, members: [...(target.members || []), { userId, joinedAt: Date.now() }] })
  },

  removeMember: (id, userId) => {
    const target = rawRecord('institutes', id)
    if (!target || !(target.members || []).some(m => m.userId === userId)) return null
    return putRecord('institutes', id, { ...target, members: target.members.filter(m => m.userId !== userId) })
  },

  delete: (id) => {
    if (!rawRecord('institutes', id)) return false
    deleteRecord('institutes', id)
    return true
  }
}

// A simple list store: records with ids in one collection
const listStore = (name, prefix) => ({
  getAll: () => structuredClone(peek(name)),
  findById: (id) => getRecord(name, id) || null,
  create: (data) => {
    const now = Date.now()
    const record = { id: `${prefix}-${now}-${crypto.randomBytes(3).toString('hex')}`, ...data, createdAt: now, updatedAt: now }
    return putRecord(name, record.id, record)
  },
  update: (id, updates) => {
    const current = rawRecord(name, id)
    if (!current) return null
    const safe = { ...updates }
    delete safe.id
    return putRecord(name, id, { ...current, ...safe, updatedAt: Date.now() })
  },
  delete: (id) => {
    if (!rawRecord(name, id)) return false
    deleteRecord(name, id)
    return true
  }
})

// --- TEST SERIES ---
// Bundles of mock tests that coaching centres give their students (see centre
// seats in instituteDb). A test in any series is locked for everyone else.
// [{ id, title, description, testIds: string[] (ids from shared/mockTests.js),
//   published, createdBy, createdAt, updatedAt }]
export const seriesDb = listStore('testSeries', 'ser')

// --- COACHING WORKSPACES ---
// { [centreId]: { batches, faculty, questions, tests, assignments, notices, syllabus,
//   batchOf: { [userId]: batchId } } }: what a coaching centre manages in the admin
// app (see server/coaching/). The demo centre is never stored here.
export const coachingDb = {
  get: (centreId) => getRecord('coaching', centreId) || null,
  put: (centreId, doc) => putRecord('coaching', centreId, doc),
  delete: (centreId) => deleteRecord('coaching', centreId)
}
