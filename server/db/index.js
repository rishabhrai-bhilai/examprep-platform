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
  discussions: path.join(DATA_DIR, 'discussions.json')
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
      streak: userData.streak !== undefined ? userData.streak : 1,
      solvedQuestions: userData.solvedQuestions || 0,
      rank: userData.rank || 1500,
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

// --- DISCUSSIONS DB ---
// Stored as { [questionId]: Solution[] }
export const discussionDb = {
  getAll: () => readJson(FILES.discussions, {}),
  
  saveAll: (discussions) => {
    writeJsonAtomic(FILES.discussions, discussions)
    return discussions
  }
}
