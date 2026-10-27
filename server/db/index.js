import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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
  attempts: path.join(DATA_DIR, 'attempts.json')
}

// Safely read JSON file with default fallback
function readJson(filePath, defaultValue = {}) {
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
    users[index] = { ...users[index], passwordHash, salt, updatedAt: Date.now() }
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
