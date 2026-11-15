import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectMongo, isMongoEnabled, mongoRead, mongoWrite, flushMongo, mongoHealth } from './mongoStore.js'

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
  testSeries: path.join(DATA_DIR, 'test_series.json')
}

// How each file is shaped, for MongoDB: a list of records with ids, or an object by key
const FILE_KINDS = {
  users: 'array', reports: 'array', mockAttempts: 'array', institutes: 'array',
  testSeries: 'array',
  bookmarks: 'object', notes: 'object', testRecords: 'object', discussions: 'object', attempts: 'object', potd: 'object'
}
const NAME_BY_PATH = Object.fromEntries(Object.entries(FILES).map(([name, file]) => [file, name]))

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

// Safely read JSON file with default fallback
function readJson(filePath, defaultValue = {}) {
  if (isMongoEnabled()) {
    const value = mongoRead(NAME_BY_PATH[filePath])
    return value === undefined ? defaultValue : value
  }
  try {
    if (!fs.existsSync(filePath)) {
      writeJsonAtomic(filePath, defaultValue)
      return defaultValue
    }
    const raw = fs.readFileSync(filePath, 'utf8')
    if (!raw.trim()) return defaultValue
    return JSON.parse(raw)
  } catch (err) {
    console.error(`[DB Read Error] on ${filePath}:`, err.message)
    return defaultValue
  }
}

// Write JSON atomically via temporary file and rename to prevent corruption
function writeJsonAtomic(filePath, data) {
  if (isMongoEnabled()) return mongoWrite(NAME_BY_PATH[filePath], data)
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

// --- USERS DB ---
export const userDb = {
  getAll: () => readJson(FILES.users, []),
  
  findByEmail: (email) => {
    if (!email) return null
    const users = readJson(FILES.users, [])
    const normalized = email.trim().toLowerCase()
    return users.find(u => u.email.toLowerCase() === normalized) || null
  },

  findById: (id) => {
    if (!id) return null
    const users = readJson(FILES.users, [])
    return users.find(u => u.id === id) || null
  },

  create: (userData) => {
    const users = readJson(FILES.users, [])
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
    users.push(newUser)
    writeJsonAtomic(FILES.users, users)
    return newUser
  },

  update: (id, updates) => {
    const users = readJson(FILES.users, [])
    const index = users.findIndex(u => u.id === id)
    if (index === -1) return null
    
    // Disallow overwriting id or salt directly via update
    const safeUpdates = { ...updates }
    delete safeUpdates.id
    delete safeUpdates.salt

    users[index] = { ...users[index], ...safeUpdates, updatedAt: Date.now() }
    writeJsonAtomic(FILES.users, users)
    return users[index]
  },

  // The only way to change a password hash and its salt (update() refuses salt)
  setPassword: (id, passwordHash, salt) => {
    const users = readJson(FILES.users, [])
    const index = users.findIndex(u => u.id === id)
    if (index === -1) return null
    // A new password signs out every other session (see tokenFor in services/auth.js)
    users[index] = { ...users[index], passwordHash, salt, tokenVersion: (users[index].tokenVersion || 0) + 1, updatedAt: Date.now() }
    writeJsonAtomic(FILES.users, users)
    return users[index]
  }
}

// --- ISSUE REPORTS DB ---
// Stored as Report[]: { id, userId, userName, userEmail, category, questionId, page,
//   message, status: 'open' | 'in_progress' | 'resolved', adminNote, createdAt, updatedAt }
export const reportDb = {
  getAll: () => readJson(FILES.reports, []),

  getByUser: (userId) => readJson(FILES.reports, []).filter(r => r.userId === userId),

  create: (report) => {
    const reports = readJson(FILES.reports, [])
    const newReport = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      status: 'open',
      adminNote: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...report
    }
    reports.push(newReport)
    writeJsonAtomic(FILES.reports, reports)
    return newReport
  },

  update: (id, updates) => {
    const reports = readJson(FILES.reports, [])
    const index = reports.findIndex(r => r.id === id)
    if (index === -1) return null
    reports[index] = { ...reports[index], ...updates, id, updatedAt: Date.now() }
    writeJsonAtomic(FILES.reports, reports)
    return reports[index]
  }
}

// --- BOOKMARKS DB ---
// Stored as { [userId]: { bookmarks: number[], bookmarkFolders: { [folderName]: number[] }, updatedAt: number } }
export const bookmarkDb = {
  getUserBookmarks: (userId) => {
    if (!userId) return { bookmarks: [], bookmarkFolders: { "General": [] } }
    const all = readJson(FILES.bookmarks, {})
    return all[userId] || { bookmarks: [], bookmarkFolders: { "General": [] } }
  },

  saveUserBookmarks: (userId, { bookmarks = [], bookmarkFolders = {} }) => {
    if (!userId) return null
    const all = readJson(FILES.bookmarks, {})
    all[userId] = {
      bookmarks: Array.isArray(bookmarks) ? bookmarks : [],
      bookmarkFolders: typeof bookmarkFolders === 'object' && bookmarkFolders !== null ? bookmarkFolders : { "General": [] },
      updatedAt: Date.now()
    }
    writeJsonAtomic(FILES.bookmarks, all)
    return all[userId]
  }
}

// --- SCRATCHPAD NOTES DB ---
// Stored as { [userId]: { questionNotes: { [questionId]: NoteObject }, updatedAt: number } }
export const noteDb = {
  getUserNotes: (userId) => {
    if (!userId) return { questionNotes: {} }
    const all = readJson(FILES.notes, {})
    return all[userId] || { questionNotes: {} }
  },

  saveUserNotes: (userId, questionNotes = {}) => {
    if (!userId) return null
    const all = readJson(FILES.notes, {})
    all[userId] = {
      questionNotes: typeof questionNotes === 'object' && questionNotes !== null ? questionNotes : {},
      updatedAt: Date.now()
    }
    writeJsonAtomic(FILES.notes, all)
    return all[userId]
  }
}

// --- TEST RECORDS / MOCK HISTORY DB ---
// Stored as { [userId]: { mockHistory: any[], pyqHistory: any[], updatedAt: number } }
export const testRecordDb = {
  getUserRecords: (userId) => {
    if (!userId) return { mockHistory: [], pyqHistory: [] }
    const all = readJson(FILES.testRecords, {})
    return all[userId] || { mockHistory: [], pyqHistory: [] }
  },

  saveUserRecords: (userId, { mockHistory = [], pyqHistory = [] }) => {
    if (!userId) return null
    const all = readJson(FILES.testRecords, {})
    all[userId] = {
      mockHistory: Array.isArray(mockHistory) ? mockHistory : [],
      pyqHistory: Array.isArray(pyqHistory) ? pyqHistory : [],
      updatedAt: Date.now()
    }
    writeJsonAtomic(FILES.testRecords, all)
    return all[userId]
  }
}

// --- PRACTICE ATTEMPTS DB ---
// Stored as { [userId]: { attempts: { [questionId]: Attempt }, days: { 'YYYY-MM-DD': DayTotals },
//   timeZone: string | null, updatedAt: number } } (shapes in shared/practice.js)
export const attemptDb = {
  // Every user's record at once ({ [userId]: ... }), for reading many users in one pass
  getAll: () => readJson(FILES.attempts, {}),

  getUserAttempts: (userId) => {
    if (!userId) return { attempts: {}, days: {}, timeZone: null }
    const all = readJson(FILES.attempts, {})
    return all[userId] || { attempts: {}, days: {}, timeZone: null }
  },

  saveUserAttempts: (userId, { attempts = {}, days = {}, timeZone = null }) => {
    if (!userId) return null
    const all = readJson(FILES.attempts, {})
    all[userId] = { attempts, days, timeZone, updatedAt: Date.now() }
    writeJsonAtomic(FILES.attempts, all)
    return all[userId]
  }
}

// --- DISCUSSIONS DB ---
// Stored as { [questionId]: Solution[] }
export const discussionDb = {
  getAll: () => readJson(FILES.discussions, {}),
  
  saveAll: (discussions) => {
    writeJsonAtomic(FILES.discussions, discussions)
    return discussions
  }
}

// --- MOCK TEST ATTEMPTS ---
// Every counted attempt, scored by the server: [{ id, userId, testId, attemptNo,
// submittedAt, timeTaken, score, maxScore, correct, incorrect, unanswered, subjects }].
// attemptNo 1 is the one used for global comparison.
export const mockAttemptDb = {
  getAll: () => readJson(FILES.mockAttempts, []),
  getByUser: (userId) => readJson(FILES.mockAttempts, []).filter(a => a.userId === userId),
  // First attempts of everyone at one test
  getFirstAttempts: (testId) => readJson(FILES.mockAttempts, []).filter(a => a.testId === testId && a.attemptNo === 1),
  create: (attempt) => {
    const all = readJson(FILES.mockAttempts, [])
    const attemptNo = all.filter(a => a.userId === attempt.userId && a.testId === attempt.testId).length + 1
    const saved = { id: `ma-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...attempt, attemptNo }
    all.push(saved)
    writeJsonAtomic(FILES.mockAttempts, all)
    return saved
  }
}

// --- PROBLEM OF THE DAY ---
// { [userId]: { [dateKey]: { questionId, correct, at } } }; one entry per day
export const potdDb = {
  getUserDays: (userId) => readJson(FILES.potd, {})[userId] || {},
  // Records the day's first attempt; later attempts the same day change nothing
  record: (userId, dateKey, entry) => {
    const all = readJson(FILES.potd, {})
    const days = all[userId] || (all[userId] = {})
    if (days[dateKey]) return { entry: days[dateKey], isNew: false }
    days[dateKey] = entry
    writeJsonAtomic(FILES.potd, all)
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
  getAll: () => readJson(FILES.institutes, []),
  findById: (id) => readJson(FILES.institutes, []).find(i => i.id === id) || null,
  findByCode: (code) => {
    const wanted = normalizeCode(code)
    return wanted ? readJson(FILES.institutes, []).find(i => i.code === wanted) || null : null
  },
  // Centres where this email is an admin
  findByAdmin: (email) => {
    const e = String(email || '').toLowerCase()
    return e ? readJson(FILES.institutes, []).filter(i => (i.adminEmails || []).includes(e)) : []
  },
  findByMember: (userId) => readJson(FILES.institutes, []).find(i => (i.members || []).some(m => m.userId === userId)) || null,

  create: ({ name, adminEmails, seats = 0, seriesIds = [], createdBy }) => {
    const all = readJson(FILES.institutes, [])
    const institute = {
      id: `ins-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name,
      code: newInviteCode(new Set(all.map(i => i.code))),
      adminEmails,
      seats,
      seriesIds,
      members: [],
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    all.push(institute)
    writeJsonAtomic(FILES.institutes, all)
    return institute
  },

  update: (id, { name, adminEmails, seats, seriesIds, regenerateCode } = {}) => {
    const all = readJson(FILES.institutes, [])
    const index = all.findIndex(i => i.id === id)
    if (index === -1) return null
    const next = { ...all[index], updatedAt: Date.now() }
    if (name !== undefined) next.name = name
    if (adminEmails !== undefined) next.adminEmails = adminEmails
    if (seats !== undefined) next.seats = seats
    if (seriesIds !== undefined) next.seriesIds = seriesIds
    if (regenerateCode) next.code = newInviteCode(new Set(all.map(i => i.code)))
    all[index] = next
    writeJsonAtomic(FILES.institutes, all)
    return next
  },

  // Joining one centre leaves any other (one centre at a time)
  addMember: (id, userId) => {
    const all = readJson(FILES.institutes, [])
    const target = all.find(i => i.id === id)
    if (!target) return null
    all.forEach(i => { i.members = (i.members || []).filter(m => m.userId !== userId || i.id === id) })
    if (!target.members.some(m => m.userId === userId)) target.members.push({ userId, joinedAt: Date.now() })
    writeJsonAtomic(FILES.institutes, all)
    return target
  },

  removeMember: (id, userId) => {
    const all = readJson(FILES.institutes, [])
    const target = all.find(i => i.id === id)
    if (!target || !(target.members || []).some(m => m.userId === userId)) return null
    target.members = target.members.filter(m => m.userId !== userId)
    writeJsonAtomic(FILES.institutes, all)
    return target
  },

  delete: (id) => {
    const all = readJson(FILES.institutes, [])
    const next = all.filter(i => i.id !== id)
    if (next.length === all.length) return false
    writeJsonAtomic(FILES.institutes, next)
    return true
  }
}

// A simple list store: records with ids in one file
const listStore = (file, prefix) => ({
  getAll: () => readJson(file, []),
  findById: (id) => readJson(file, []).find(r => r.id === id) || null,
  create: (data) => {
    const all = readJson(file, [])
    const now = Date.now()
    const record = { id: `${prefix}-${now}-${crypto.randomBytes(3).toString('hex')}`, ...data, createdAt: now, updatedAt: now }
    all.push(record)
    writeJsonAtomic(file, all)
    return record
  },
  update: (id, updates) => {
    const all = readJson(file, [])
    const index = all.findIndex(r => r.id === id)
    if (index === -1) return null
    const safe = { ...updates }
    delete safe.id
    all[index] = { ...all[index], ...safe, updatedAt: Date.now() }
    writeJsonAtomic(file, all)
    return all[index]
  },
  delete: (id) => {
    const all = readJson(file, [])
    const next = all.filter(r => r.id !== id)
    if (next.length === all.length) return false
    writeJsonAtomic(file, next)
    return true
  }
})

// --- TEST SERIES ---
// Bundles of mock tests that coaching centres give their students (see centre
// seats in instituteDb). A test in any series is locked for everyone else.
// [{ id, title, description, testIds: string[] (ids from shared/mockTests.js),
//   published, createdBy, createdAt, updatedAt }]
export const seriesDb = listStore(FILES.testSeries, 'ser')
