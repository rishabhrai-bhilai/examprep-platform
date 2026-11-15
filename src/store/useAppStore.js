import { create } from 'zustand'
import { dummyDiscussions } from '../utils/dummyData'
import { useAuthStore } from './useAuthStore'
import { addAttempt, mergePractice, sanitizePractice } from '../../shared/practice.js'
import { timeAgo } from '../utils/practiceStats'

// The question bank (~4 MB) is its own chunk, loaded after the first render so the
// app's code doesn't wait for it. Pages that need it wait behind <QuestionsGate>.
let questionsPromise = null
const loadQuestionBank = () => {
  if (!questionsPromise) {
    questionsPromise = import('../data/questions.json').then(m => m.default || [])
    questionsPromise.catch(() => { questionsPromise = null }) // let a retry try again
  }
  return questionsPromise
}

const getInitialTheme = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedPrefs = window.localStorage.getItem('theme')
    if (typeof storedPrefs === 'string') {
      return storedPrefs
    }
    const userMedia = window.matchMedia('(prefers-color-scheme: dark)')
    if (userMedia.matches) {
      return 'dark'
    }
  }
  return 'light'
}

const getInitialBookmarks = () => {
  try {
    const stored = localStorage.getItem('bookmarks')
    if (stored) return JSON.parse(stored)
    const foldersStored = localStorage.getItem('bookmarkFolders')
    if (foldersStored) {
      const folders = JSON.parse(foldersStored)
      return Array.from(new Set(Object.values(folders).flat()))
    }
    return []
  } catch (e) {
    return []
  }
}

const getInitialBookmarkFolders = () => {
  try {
    const stored = localStorage.getItem('bookmarkFolders')
    if (stored) return JSON.parse(stored)
    
    // Migration: Move existing bookmarks to General folder
    const flat = getInitialBookmarks()
    return { "General": flat }
  } catch (e) {
    return { "General": [] }
  }
}

// Discussions are loaded one question at a time (loadDiscussion); lists of
// questions only need how many posts each has (discussionCounts, from
// /api/discussions/summary). The browser used to keep a copy of every post on the
// site in localStorage; that copy is dropped.
try { localStorage.removeItem('discussions') } catch (e) { /* storage unavailable */ }

const DISCUSSION_COUNTS_KEY = 'discussionCounts'
const NO_POSTS = Object.freeze({ posts: 0, replies: 0 })
// { posts, replies } as the question lists show them: top-level posts, and the
// direct replies to them
const countPosts = (list) => ({
  posts: (list || []).length,
  replies: (list || []).reduce((n, p) => n + (p.replies?.length || 0), 0)
})
export const discussionCountFor = (counts, questionId) => (counts && counts[questionId]) || NO_POSTS

// Example posts plus the server's counts
const addServerCounts = (serverCounts) => {
  const counts = Object.fromEntries(Object.entries(getDummyDiscussions()).map(([qId, list]) => [qId, countPosts(list)]))
  Object.entries(serverCounts || {}).forEach(([qId, c]) => {
    const base = counts[qId] || NO_POSTS
    counts[qId] = { posts: base.posts + (c?.posts || 0), replies: base.replies + (c?.replies || 0) }
  })
  return counts
}

// The last counts seen, shown until the summary arrives
const getInitialDiscussionCounts = () => {
  try {
    return addServerCounts(JSON.parse(localStorage.getItem(DISCUSSION_COUNTS_KEY) || '{}'))
  } catch (e) {
    return addServerCounts({})
  }
}

// Questions whose posts have come from the server (their counts come from the list)
const loadedDiscussions = new Set()
const discussionLoads = new Map() // questionId -> request in flight

const getInitialSolutionVotes = () => {
  try {
    const stored = localStorage.getItem('solutionVotes')
    if (stored) return JSON.parse(stored)
    return {}
  } catch (e) {
    return {}
  }
}

// Per-question practice attempts ({ attempts, days }, see shared/practice.js)
const PRACTICE_KEY = 'practiceAttempts'
const getInitialPractice = () => {
  try {
    return sanitizePractice(JSON.parse(localStorage.getItem(PRACTICE_KEY) || '{}'))
  } catch (e) {
    return { attempts: {}, days: {} }
  }
}
const savePracticeLocally = (practice) => {
  try {
    localStorage.setItem(PRACTICE_KEY, JSON.stringify(practice))
  } catch (e) {
    console.warn('Could not persist practice attempts', e)
  }
}

// The browser keeps one person's study data (bookmarks, notes, mock history,
// practice, votes) at a time. DATA_OWNER_KEY says whose: a user id, or 'guest'
// for data made while signed out. Signing out wipes it, and signing in only
// merges it into the account when it is that account's or a guest's.
const DATA_OWNER_KEY = 'data_owner'
const GUEST = 'guest'
const USER_DATA_KEYS = ['bookmarks', 'bookmarkFolders', 'questionNotes', 'gate_mock_history', 'gate_pyq_mock_history',
  PRACTICE_KEY, 'votes', 'solutionVotes', 'discussion_my_comment_ids', 'gate_test_in_progress']
const VIDEO_NOTE_PREFIX = 'note_question_'

// A browser that has never signed in holds guest data. One that is signed in but
// has no owner yet is from before this existed and may hold anyone's, so it is dropped.
if (!localStorage.getItem(DATA_OWNER_KEY) && !localStorage.getItem('auth_token')) {
  localStorage.setItem(DATA_OWNER_KEY, GUEST)
}

const clearUserDataLocally = () => {
  USER_DATA_KEYS.forEach((key) => localStorage.removeItem(key))
  Object.keys(localStorage)
    .filter((key) => key.startsWith(VIDEO_NOTE_PREFIX))
    .forEach((key) => localStorage.removeItem(key))
}

const emptyUserData = () => ({
  bookmarks: [],
  bookmarkFolders: { General: [] },
  questionNotes: {},
  practice: { attempts: {}, days: {} },
  votes: {},
  solutionVotes: {},
  myCommentIds: []
})

// Example posts shipped with the app (never stored on the server)
const getDummyDiscussions = () => {
  const normalized = {}
  Object.keys(dummyDiscussions).forEach((qId) => {
    normalized[qId] = (dummyDiscussions[qId] || []).map((sol) => ({
      ...sol,
      upvotes: sol.upvotes !== undefined ? sol.upvotes : (sol.likes || 0),
      downvotes: sol.downvotes || 0,
      createdAt: sol.createdAt || '2 hours ago',
      replies: (sol.replies || []).map((rep) => ({ ...rep, createdAt: rep.createdAt || '1 hour ago' }))
    }))
  })
  return normalized
}

// Server posts carry a timestamp; the UI shows createdAt
const withCreatedAt = (post) => ({
  ...post,
  createdAt: post.timestamp ? timeAgo(post.timestamp) : (post.createdAt || 'Recent'),
  replies: (post.replies || []).map(withCreatedAt)
})

const discussionRequest = async (method, path, body) => {
  const token = localStorage.getItem('auth_token')
  if (!token) throw new Error('Please log in first.')
  const res = await fetch(`/api/discussions/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  // Posting can earn a badge, so the reply carries the updated user
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user))
    useAuthStore.setState({ user: data.user })
  }
  return data
}

// After a question's list changes here: its count follows the list
const withListCount = (counts, qId, list) => ({ ...counts, [qId]: countPosts(list) })

export const getClientUserId = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'client-default'
  }
  try {
    let id = localStorage.getItem('discussion_client_id')
    if (!id) {
      id = `client-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`
      localStorage.setItem('discussion_client_id', id)
    }
    return id
  } catch (e) {
    return 'client-fallback'
  }
}

export const getInitialMyCommentIds = () => {
  try {
    const stored = localStorage.getItem('discussion_my_comment_ids')
    if (stored) return JSON.parse(stored)
    return []
  } catch (e) {
    return []
  }
}

export const DEFAULT_GATE_VIDEO_URL = 'https://www.youtube.com/embed/FchQ6wZVqsA?list=PLmXKhU9FNesTaKDC-MKWt-rFuB8OwqrCY'

export function getEmbedVideoUrl(url, question = null) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return DEFAULT_GATE_VIDEO_URL
  }
  const trimmed = url.trim()
  if (trimmed.includes('youtube.com/embed/')) {
    return trimmed
  }
  const watchMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/)|youtu\.be\/)([^#&?]*)/)
  if (watchMatch && watchMatch[1] && watchMatch[1].length === 11) {
    const videoId = watchMatch[1]
    const listMatch = trimmed.match(/[?&]list=([^#&]+)/)
    return `https://www.youtube.com/embed/${videoId}${listMatch ? `?list=${listMatch[1]}` : ''}`
  }
  return trimmed
}

// --- DUAL-STORAGE CLOUD SYNC HELPERS ---
export const syncBookmarksToServer = async (bookmarks, bookmarkFolders) => {
  const token = localStorage.getItem('auth_token')
  if (!token) return
  try {
    await fetch('/api/sync/bookmarks', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ bookmarks, bookmarkFolders })
    })
  } catch (e) {
    console.warn('Failed to sync bookmarks to cloud:', e.message)
  }
}

export const syncNotesToServer = async (questionNotes) => {
  const token = localStorage.getItem('auth_token')
  if (!token) return
  try {
    await fetch('/api/sync/notes', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ questionNotes })
    })
  } catch (e) {
    console.warn('Failed to sync notes to cloud:', e.message)
  }
}

export const syncTestRecordsToServer = async () => {
  const token = localStorage.getItem('auth_token')
  if (!token) return
  try {
    const mockHistory = JSON.parse(localStorage.getItem('gate_mock_history') || '[]')
    const pyqHistory = JSON.parse(localStorage.getItem('gate_pyq_mock_history') || '[]')
    await fetch('/api/sync/test-records', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ mockHistory, pyqHistory })
    })
  } catch (e) {
    console.warn('Failed to sync test records to cloud:', e.message)
  }
}

// Sends the whole practice map (the server merges it in). Answers come in bursts,
// so this waits a moment and sends once. The token is taken when the answer is
// recorded, so a sign-out right after still saves it to the right account.
let attemptsSyncTimer = null
let attemptsSyncToken = null
const sendAttempts = async (token, practice, keepalive = false) => {
  try {
    const res = await fetch('/api/sync/attempts', {
      method: 'PUT',
      keepalive,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ...practice,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null
      })
    })
    if (!res.ok) return
    const data = await res.json()
    // The server keeps solvedQuestions / streak on the user record
    const auth = useAuthStore.getState()
    if (data.user && auth.token === token) {
      localStorage.setItem('user', JSON.stringify(data.user))
      useAuthStore.setState({ user: data.user })
    }
  } catch (e) {
    console.warn('Failed to sync practice attempts to cloud:', e.message)
  }
}

export const syncAttemptsToServer = (practice, { immediate = false } = {}) => {
  const token = attemptsSyncToken || localStorage.getItem('auth_token')
  if (!token) return
  attemptsSyncToken = token
  clearTimeout(attemptsSyncTimer)
  const run = (keepalive) => {
    attemptsSyncTimer = null
    attemptsSyncToken = null
    return sendAttempts(token, practice, keepalive)
  }
  if (immediate) return run(true)
  attemptsSyncTimer = setTimeout(() => run(false), 1500)
}

export const useAppStore = create((set, get) => ({
  theme: getInitialTheme(),
  bookmarks: getInitialBookmarks(),
  bookmarkFolders: getInitialBookmarkFolders(),
  bookmarkSelectorQuestionId: null,
  votes: JSON.parse(localStorage.getItem('votes') || '{}'),
  discussions: getDummyDiscussions(),
  discussionCounts: getInitialDiscussionCounts(),
  discussionLoading: {},
  solutionVotes: getInitialSolutionVotes(),
  myCommentIds: getInitialMyCommentIds(),
  questionNotes: JSON.parse(localStorage.getItem('questionNotes') || '{}'),
  practice: getInitialPractice(),
  activeQuestionIndex: 0,
  calculatorOpen: false,
  activeDiscussionQuestionId: null,
  activeVideoSolutionUrl: null,
  activeVideoQuestion: null,
  scratchpadOpenQuestionId: null,
  sidebarOpen: false,
  sidebarCollapsed: true,
  questions: [],
  loadingQuestions: true,
  questionsError: null,
  isPracticeActive: false,

  setIsPracticeActive: (isPracticeActive) => set({ isPracticeActive }),

  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light'
    set({ theme: nextTheme })
    localStorage.setItem('theme', nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  },

  setTheme: (theme) => {
    set({ theme })
    localStorage.setItem('theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  },

  // --- DUAL-STORAGE CLOUD SYNC METHOD ---
  syncUserData: async (customToken = null) => {
    const token = customToken || localStorage.getItem('auth_token')
    if (!token) return

    try {
      const res = await fetch('/api/sync/user-data', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const serverData = await res.json()

      // Data left by another account must not leak into this one
      const userId = useAuthStore.getState().user?.id
      const owner = localStorage.getItem(DATA_OWNER_KEY)
      if (!userId) return
      if (owner !== userId && owner !== GUEST) {
        clearUserDataLocally()
        set(emptyUserData())
      }
      localStorage.setItem(DATA_OWNER_KEY, userId)

      // 1. Merge Bookmarks
      const localFolders = get().bookmarkFolders || { "General": [] }
      const serverFolders = serverData.bookmarkFolders || { "General": [] }
      const mergedFolders = { ...serverFolders }
      Object.keys(localFolders).forEach((folder) => {
        if (!mergedFolders[folder]) {
          mergedFolders[folder] = localFolders[folder]
        } else {
          mergedFolders[folder] = Array.from(new Set([...mergedFolders[folder], ...localFolders[folder]]))
        }
      })
      const mergedBookmarks = Array.from(new Set(Object.values(mergedFolders).flat()))

      // 2. Merge Question Notes
      const localNotes = get().questionNotes || {}
      const serverNotes = serverData.questionNotes || {}
      const mergedNotes = { ...serverNotes, ...localNotes }

      // 3. Merge Mock Test Records
      const localMocks = JSON.parse(localStorage.getItem('gate_mock_history') || '[]')
      const serverMocks = serverData.mockHistory || []
      const seenMocks = new Set()
      const mergedMocks = []
      ;[...serverMocks, ...localMocks].forEach((m) => {
        const key = `${m.testId || m.testTitle || 'mock'}_${m.timestamp || m.date || ''}`
        if (!seenMocks.has(key)) {
          seenMocks.add(key)
          mergedMocks.push(m)
        }
      })

      // 4. Merge PYQ Mock Test Records
      const localPyqs = JSON.parse(localStorage.getItem('gate_pyq_mock_history') || '[]')
      const serverPyqs = serverData.pyqHistory || []
      const seenPyqs = new Set()
      const mergedPyqs = []
      ;[...serverPyqs, ...localPyqs].forEach((p) => {
        const key = `${p.year || p.testId || 'pyq'}_${p.timestamp || p.date || ''}`
        if (!seenPyqs.has(key)) {
          seenPyqs.add(key)
          mergedPyqs.push(p)
        }
      })

      // 5. Merge practice attempts (guest answers carry over into the account)
      const mergedPractice = mergePractice(
        sanitizePractice({ attempts: serverData.attempts, days: serverData.days }),
        get().practice
      )

      // Update state & localStorage
      set({
        bookmarks: mergedBookmarks,
        bookmarkFolders: mergedFolders,
        questionNotes: mergedNotes,
        practice: mergedPractice
      })
      savePracticeLocally(mergedPractice)

      localStorage.setItem('bookmarks', JSON.stringify(mergedBookmarks))
      localStorage.setItem('bookmarkFolders', JSON.stringify(mergedFolders))
      localStorage.setItem('questionNotes', JSON.stringify(mergedNotes))
      localStorage.setItem('gate_mock_history', JSON.stringify(mergedMocks))
      localStorage.setItem('gate_pyq_mock_history', JSON.stringify(mergedPyqs))

      // Push merged back to server
      syncBookmarksToServer(mergedBookmarks, mergedFolders)
      syncNotesToServer(mergedNotes)
      syncTestRecordsToServer()
      syncAttemptsToServer(mergedPractice, { immediate: true })
    } catch (err) {
      console.warn('Sync failed:', err.message)
    }
  },

  // --- PRACTICE ATTEMPTS ---
  // entries: [{ questionId, correct, timeSpentSec }]
  recordAttempts: (entries) => {
    if (!entries?.length) return
    const answeredAt = Date.now()
    const practice = entries.reduce((acc, e) => addAttempt(acc, { ...e, answeredAt }), get().practice)
    set({ practice })
    savePracticeLocally(practice)
    syncAttemptsToServer(practice)
  },

  recordAttempt: (questionId, correct, timeSpentSec = 0) => {
    get().recordAttempts([{ questionId, correct, timeSpentSec }])
  },

  // --- BOOKMARKS ---
  toggleBookmark: (questionId) => {
    set({ bookmarkSelectorQuestionId: questionId })
  },

  setBookmarkSelectorQuestionId: (questionId) => {
    set({ bookmarkSelectorQuestionId: questionId })
  },

  createBookmarkFolder: (folderName) => {
    if (!folderName.trim()) return
    const folders = { ...get().bookmarkFolders }
    if (folders[folderName]) return
    folders[folderName] = []
    set({ bookmarkFolders: folders })
    localStorage.setItem('bookmarkFolders', JSON.stringify(folders))
    syncBookmarksToServer(get().bookmarks, folders)
  },

  deleteBookmarkFolder: (folderName) => {
    const folders = { ...get().bookmarkFolders }
    delete folders[folderName]
    const nextBookmarks = Array.from(new Set(Object.values(folders).flat()))
    set({ bookmarkFolders: folders, bookmarks: nextBookmarks })
    localStorage.setItem('bookmarkFolders', JSON.stringify(folders))
    localStorage.setItem('bookmarks', JSON.stringify(nextBookmarks))
    syncBookmarksToServer(nextBookmarks, folders)
  },

  toggleQuestionInFolder: (folderName, questionId) => {
    const folders = { ...get().bookmarkFolders }
    if (!folders[folderName]) return
    const list = folders[folderName]
    const nextList = list.includes(questionId)
      ? list.filter(id => id !== questionId)
      : [...list, questionId]
    folders[folderName] = nextList
    const nextBookmarks = Array.from(new Set(Object.values(folders).flat()))
    set({ bookmarkFolders: folders, bookmarks: nextBookmarks })
    localStorage.setItem('bookmarkFolders', JSON.stringify(folders))
    localStorage.setItem('bookmarks', JSON.stringify(nextBookmarks))
    syncBookmarksToServer(nextBookmarks, folders)
  },

  removeQuestionFromFolder: (folderName, questionId) => {
    const folders = { ...get().bookmarkFolders }
    if (!folders[folderName]) return
    folders[folderName] = folders[folderName].filter(id => id !== questionId)
    const nextBookmarks = Array.from(new Set(Object.values(folders).flat()))
    set({ bookmarkFolders: folders, bookmarks: nextBookmarks })
    localStorage.setItem('bookmarkFolders', JSON.stringify(folders))
    localStorage.setItem('bookmarks', JSON.stringify(nextBookmarks))
    syncBookmarksToServer(nextBookmarks, folders)
  },

  removeQuestionsFromFolder: (folderName, questionIds) => {
    const folders = { ...get().bookmarkFolders }
    if (!folders[folderName]) return
    folders[folderName] = folders[folderName].filter(id => !questionIds.includes(id))
    const nextBookmarks = Array.from(new Set(Object.values(folders).flat()))
    set({ bookmarkFolders: folders, bookmarks: nextBookmarks })
    localStorage.setItem('bookmarkFolders', JSON.stringify(folders))
    localStorage.setItem('bookmarks', JSON.stringify(nextBookmarks))
    syncBookmarksToServer(nextBookmarks, folders)
  },

  // --- QUESTION VOTES (GATED FOR LOGGED-IN USERS) ---
  upvoteQuestion: (questionId) => {
    const { isAuthenticated, openAuthPrompt } = useAuthStore.getState()
    if (!isAuthenticated) {
      openAuthPrompt('upvote questions', 'Please register or log in to upvote questions and highlight quality study material.')
      return
    }

    const currentVotes = { ...get().votes }
    const currentVote = currentVotes[questionId]

    if (currentVote === 'up') {
      currentVotes[questionId] = null
    } else {
      currentVotes[questionId] = 'up'
    }

    set({ votes: currentVotes })
    localStorage.setItem('votes', JSON.stringify(currentVotes))
  },

  downvoteQuestion: (questionId) => {
    const { isAuthenticated, openAuthPrompt } = useAuthStore.getState()
    if (!isAuthenticated) {
      openAuthPrompt('downvote questions', 'Please register or log in to downvote questions.')
      return
    }

    const currentVotes = { ...get().votes }
    const currentVote = currentVotes[questionId]

    if (currentVote === 'down') {
      currentVotes[questionId] = null
    } else {
      currentVotes[questionId] = 'down'
    }

    set({ votes: currentVotes })
    localStorage.setItem('votes', JSON.stringify(currentVotes))
  },

  setActiveQuestionIndex: (index) => set({ activeQuestionIndex: index }),
  setCalculatorOpen: (isOpen) => set({ calculatorOpen: isOpen }),
  setActiveDiscussionQuestionId: (questionId) => set({ activeDiscussionQuestionId: questionId }),
  setActiveVideoSolutionUrl: (url, question = null) => {
    if (!url && !question) {
      set({ activeVideoSolutionUrl: null, activeVideoQuestion: null })
      return
    }
    const resolvedUrl = getEmbedVideoUrl(url, question)
    set({ activeVideoSolutionUrl: resolvedUrl, activeVideoQuestion: question })
  },
  openVideoSolution: (question) => {
    if (!question) return
    const resolvedUrl = getEmbedVideoUrl(question.videoSolutionUrl, question)
    set({ activeVideoSolutionUrl: resolvedUrl, activeVideoQuestion: question })
  },
  setScratchpadOpenQuestionId: (questionId) => set({ scratchpadOpenQuestionId: questionId }),
  setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSidebarCollapsed: () => {
    const nextCollapsed = !get().sidebarCollapsed
    set({ sidebarCollapsed: nextCollapsed })
    localStorage.setItem('sidebarCollapsed', JSON.stringify(nextCollapsed))
  },

  fetchQuestions: async () => {
    if (get().questions.length > 0) return
    set({ loadingQuestions: true, questionsError: null })
    try {
      const questions = await loadQuestionBank()
      set({ questions, loadingQuestions: false })
    } catch (e) {
      console.error('Failed to load questions:', e)
      set({ loadingQuestions: false, questionsError: 'Could not load the questions. Check your connection and try again.' })
    }
  },

  // --- SCRATCHPAD NOTES (DUAL-STORAGE) ---
  saveQuestionNote: (questionId, noteType, data, name = '', strokes = null, sheets = null, attachments = null) => {
    const questionNotes = { ...get().questionNotes }
    questionNotes[questionId] = { 
      type: noteType, 
      data, 
      name, 
      strokes,
      sheets: sheets || (strokes ? [{ id: 'sheet-1', title: 'Sheet 1', strokes, undoStack: [] }] : []),
      attachments: attachments || []
    }
    set({ questionNotes })
    localStorage.setItem('questionNotes', JSON.stringify(questionNotes))
    syncNotesToServer(questionNotes)
  },

  deleteQuestionNote: (questionId) => {
    const questionNotes = { ...get().questionNotes }
    delete questionNotes[questionId]
    set({ questionNotes })
    localStorage.setItem('questionNotes', JSON.stringify(questionNotes))
    syncNotesToServer(questionNotes)
  },

  // --- DISCUSSIONS (GATED FOR LOGGED-IN USERS) ---
  // The server holds everyone's posts. This loads how many each question has; the
  // posts themselves come one question at a time from loadDiscussion.
  fetchDiscussions: async () => {
    try {
      const res = await fetch('/api/discussions/summary')
      if (!res.ok) return
      const serverCounts = (await res.json()) || {}
      try { localStorage.setItem(DISCUSSION_COUNTS_KEY, JSON.stringify(serverCounts)) } catch (e) { /* only a cache */ }
      const counts = addServerCounts(serverCounts)
      // Questions already open count what they show
      const { discussions } = get()
      loadedDiscussions.forEach(qId => { counts[qId] = countPosts(discussions[qId]) })
      set({ discussionCounts: counts })
    } catch (e) {
      console.warn('Could not load discussions:', e.message)
    }
  },

  // One question's posts (examples first, then the server's)
  loadDiscussion: (questionId) => {
    if (questionId === null || questionId === undefined) return Promise.resolve()
    const qId = String(questionId)
    if (discussionLoads.has(qId)) return discussionLoads.get(qId)
    if (!loadedDiscussions.has(qId)) set({ discussionLoading: { ...get().discussionLoading, [qId]: true } })
    const done = () => {
      discussionLoads.delete(qId)
      const rest = { ...get().discussionLoading }
      delete rest[qId]
      set({ discussionLoading: rest })
    }
    const request = fetch(`/api/discussions/${encodeURIComponent(qId)}`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((serverList) => {
        const fromServer = (Array.isArray(serverList) ? serverList : []).map(withCreatedAt)
        const serverIds = new Set(fromServer.map(p => String(p.id)))
        // A post made here moments ago may not have reached the server yet
        const mine = get().myCommentIds || []
        const pending = (get().discussions[qId] || []).filter(p =>
          !serverIds.has(String(p.id)) && mine.includes(p.id) && Date.now() - (p.timestamp || 0) < 60000)
        const list = [...(getDummyDiscussions()[qId] || []), ...fromServer, ...pending]
        loadedDiscussions.add(qId)
        set({
          discussions: { ...get().discussions, [qId]: list },
          discussionCounts: withListCount(get().discussionCounts, qId, list)
        })
        done()
      })
      .catch((e) => {
        console.warn('Could not load the discussion:', e.message)
        done()
      })
    discussionLoads.set(qId, request)
    return request
  },

  // Undo an optimistic post the server refused
  _dropUnsavedPost: (questionId, postId, message) => {
    get().deleteComment(questionId, postId, { local: true })
    if (message) alert(message)
  },

  addSolution: (questionId, { content, author, avatar, authorEmail, authorId }) => {
    const { isAuthenticated, openAuthPrompt, user } = useAuthStore.getState()
    if (!isAuthenticated) {
      openAuthPrompt('post solutions', 'Please register or log in to post your solutions and share insights with the community.')
      return null
    }

    if (!content || !content.trim()) return null
    const qId = String(questionId)
    const currentDiscussions = { ...get().discussions }
    const qList = currentDiscussions[qId] ? [...currentDiscussions[qId]] : []
    const clientUserId = getClientUserId()

    const authorName = user?.name || author || 'Aspirant'
    const authorAvatar = user?.avatar || avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(authorName)}`

    const newSolution = {
      id: `sol-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      author: authorName,
      authorId: user?.id || authorId || clientUserId,
      authorEmail: user?.email || authorEmail || null,
      clientUserId: clientUserId,
      avatar: authorAvatar,
      content: content.trim(),
      createdAt: 'Just now',
      timestamp: Date.now(),
      upvotes: 0,
      downvotes: 0,
      replies: []
    }

    if (!qList.some(item => item.id === newSolution.id)) {
      qList.push(newSolution)
    }
    currentDiscussions[qId] = qList

    const nextMyCommentIds = Array.from(new Set([...(get().myCommentIds || []), newSolution.id]))

    set({ discussions: currentDiscussions, discussionCounts: withListCount(get().discussionCounts, qId, qList), myCommentIds: nextMyCommentIds })
    try {
      localStorage.setItem('discussion_my_comment_ids', JSON.stringify(nextMyCommentIds))
    } catch (e) {
      console.warn('Could not persist discussions to localStorage', e)
    }
    discussionRequest('POST', `${qId}/posts`, { id: newSolution.id, content: newSolution.content })
      .catch((err) => get()._dropUnsavedPost(qId, newSolution.id, `Your solution was not posted: ${err.message}`))
    return newSolution
  },

  addReply: (questionId, targetId, { content, author, avatar, replyToAuthor, authorEmail, authorId }) => {
    const { isAuthenticated, openAuthPrompt, user } = useAuthStore.getState()
    if (!isAuthenticated) {
      openAuthPrompt('reply to discussions', 'Please register or log in to reply to comments and discussions.')
      return null
    }

    if (!content || !content.trim()) return null
    const qId = String(questionId)
    const tId = String(targetId)
    const currentDiscussions = { ...get().discussions }
    const qList = currentDiscussions[qId] ? [...currentDiscussions[qId]] : []
    const clientUserId = getClientUserId()

    const authorName = user?.name || author || 'Aspirant'
    const authorAvatar = user?.avatar || avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(authorName)}`

    const newReply = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      author: authorName,
      authorId: user?.id || authorId || clientUserId,
      authorEmail: user?.email || authorEmail || null,
      clientUserId: clientUserId,
      avatar: authorAvatar,
      content: content.trim(),
      createdAt: 'Just now',
      timestamp: Date.now(),
      replyToAuthor: replyToAuthor || null,
      parentId: tId,
      replies: []
    }

    const insertInTree = (replyList) => {
      if (!replyList || !Array.isArray(replyList)) return null
      for (let i = 0; i < replyList.length; i++) {
        if (String(replyList[i].id) === tId) {
          const updated = [...replyList]
          updated[i] = {
            ...updated[i],
            replies: updated[i].replies ? [...updated[i].replies, newReply] : [newReply]
          }
          return updated
        }
        if (replyList[i].replies && replyList[i].replies.length > 0) {
          const childUpdated = insertInTree(replyList[i].replies)
          if (childUpdated) {
            const updated = [...replyList]
            updated[i] = { ...updated[i], replies: childUpdated }
            return updated
          }
        }
      }
      return null
    }

    const nextMyCommentIds = Array.from(new Set([...(get().myCommentIds || []), newReply.id]))
    const sendReply = () => {
      discussionRequest('POST', `${qId}/posts`, {
        id: newReply.id,
        content: newReply.content,
        parentId: tId,
        replyToAuthor: newReply.replyToAuthor
      }).catch((err) => get()._dropUnsavedPost(qId, newReply.id, `Your reply was not posted: ${err.message}`))
    }

    const targetIdx = qList.findIndex(item => String(item.id) === tId)
    if (targetIdx !== -1) {
      const targetSol = { ...qList[targetIdx] }
      targetSol.replies = targetSol.replies ? [...targetSol.replies, newReply] : [newReply]
      qList[targetIdx] = targetSol
      currentDiscussions[qId] = qList
      set({ discussions: currentDiscussions, discussionCounts: withListCount(get().discussionCounts, qId, qList), myCommentIds: nextMyCommentIds })
      try {
        localStorage.setItem('discussion_my_comment_ids', JSON.stringify(nextMyCommentIds))
      } catch (e) {
        console.warn('Could not persist discussions to localStorage', e)
      }
      sendReply()
      return newReply
    }

    let inserted = false
    for (let sIdx = 0; sIdx < qList.length; sIdx++) {
      const sol = qList[sIdx]
      if (sol.replies && sol.replies.length > 0) {
        const updatedReplies = insertInTree(sol.replies)
        if (updatedReplies) {
          qList[sIdx] = { ...sol, replies: updatedReplies }
          inserted = true
          break
        }
      }
    }

    if (inserted) {
      currentDiscussions[qId] = qList
      set({ discussions: currentDiscussions, discussionCounts: withListCount(get().discussionCounts, qId, qList), myCommentIds: nextMyCommentIds })
      try {
        localStorage.setItem('discussion_my_comment_ids', JSON.stringify(nextMyCommentIds))
      } catch (e) {
        console.warn('Could not persist discussions to localStorage', e)
      }
      sendReply()
    }

    return newReply
  },

  deleteComment: (questionId, commentId, { local = false } = {}) => {
    if (!questionId || !commentId) return false
    const qId = String(questionId)
    const cId = String(commentId)
    const currentDiscussions = { ...get().discussions }
    const qList = currentDiscussions[qId] ? [...currentDiscussions[qId]] : []

    let modified = false

    const solIndex = qList.findIndex(item => String(item.id) === cId)
    if (solIndex !== -1) {
      qList.splice(solIndex, 1)
      currentDiscussions[qId] = qList
      modified = true
    } else {
      const removeFromTree = (replyList) => {
        if (!replyList || !Array.isArray(replyList)) return { updated: replyList, removed: false }
        const filtered = replyList.filter(item => String(item.id) !== cId)
        if (filtered.length !== replyList.length) {
          return { updated: filtered, removed: true }
        }
        let anyChildRemoved = false
        const updated = replyList.map(item => {
          if (item.replies && item.replies.length > 0) {
            const res = removeFromTree(item.replies)
            if (res.removed) {
              anyChildRemoved = true
              return { ...item, replies: res.updated }
            }
          }
          return item
        })
        return { updated, removed: anyChildRemoved }
      }

      for (let sIdx = 0; sIdx < qList.length; sIdx++) {
        const sol = qList[sIdx]
        if (sol.replies && sol.replies.length > 0) {
          const res = removeFromTree(sol.replies)
          if (res.removed) {
            qList[sIdx] = { ...sol, replies: res.updated }
            modified = true
            break
          }
        }
      }
      if (modified) {
        currentDiscussions[qId] = qList
      }
    }

    const currentMyCommentIds = (get().myCommentIds || []).filter(id => id !== cId)
    set({
      discussions: currentDiscussions,
      ...(modified ? { discussionCounts: withListCount(get().discussionCounts, qId, currentDiscussions[qId]) } : {}),
      myCommentIds: currentMyCommentIds
    })

    try {
      localStorage.setItem('discussion_my_comment_ids', JSON.stringify(currentMyCommentIds))
    } catch (e) {
      console.warn('Could not persist after deleting comment', e)
    }

    // Example posts aren't on the server; for everything else the server
    // checks that this user wrote it
    if (!local && modified && localStorage.getItem('auth_token')) {
      discussionRequest('DELETE', `${qId}/posts/${encodeURIComponent(cId)}`)
        .catch((err) => {
          if (!/not found/i.test(err.message)) alert(`Could not delete the comment: ${err.message}`)
          get().loadDiscussion(qId)
        })
    }

    return modified
  },

  isCommentAuthor: (comment, currentUser = null) => {
    if (!comment) return false
    const myCommentIds = get().myCommentIds || []
    if (comment.id && myCommentIds.includes(comment.id)) {
      return true
    }
    const currentClientId = getClientUserId()
    if (comment.clientUserId && comment.clientUserId === currentClientId) {
      return true
    }
    if (currentUser) {
      if (currentUser.email && comment.authorEmail && comment.authorEmail === currentUser.email) {
        return true
      }
      if (comment.authorId && (comment.authorId === currentUser.id || comment.authorId === currentUser.email || comment.authorId === currentUser.name)) {
        return true
      }
      if (currentUser.name && comment.author && comment.author === currentUser.name && comment.isLocalAuthor) {
        return true
      }
    }
    return false
  },

  // --- SOLUTION VOTES (GATED FOR LOGGED-IN USERS) ---
  voteSolution: (questionId, solutionId, voteType) => {
    const { isAuthenticated, openAuthPrompt } = useAuthStore.getState()
    if (!isAuthenticated) {
      openAuthPrompt(`${voteType === 'up' ? 'like' : 'dislike'} solutions`, `Please register or log in to ${voteType === 'up' ? 'like' : 'dislike'} solutions.`)
      return
    }

    const qId = String(questionId)
    const sId = String(solutionId)
    const currentVotes = { ...get().solutionVotes }
    const previousVote = currentVotes[sId]

    let nextVote = null
    if (previousVote === voteType) {
      nextVote = null
    } else {
      nextVote = voteType
    }
    currentVotes[sId] = nextVote

    const currentDiscussions = { ...get().discussions }
    const qList = currentDiscussions[qId] ? [...currentDiscussions[qId]] : []
    const targetIdx = qList.findIndex(item => String(item.id) === sId)

    if (targetIdx !== -1) {
      const targetSol = { ...qList[targetIdx] }
      let up = targetSol.upvotes || 0
      let down = targetSol.downvotes || 0

      if (previousVote === 'up') up = Math.max(0, up - 1)
      if (previousVote === 'down') down = Math.max(0, down - 1)

      if (nextVote === 'up') up += 1
      if (nextVote === 'down') down += 1

      targetSol.upvotes = up
      targetSol.downvotes = down
      qList[targetIdx] = targetSol
      currentDiscussions[qId] = qList
    }

    set({ solutionVotes: currentVotes, discussions: currentDiscussions })
    try {
      localStorage.setItem('solutionVotes', JSON.stringify(currentVotes))
    } catch (e) {
      console.warn('Could not persist votes to localStorage', e)
    }

    discussionRequest('PUT', `${qId}/posts/${encodeURIComponent(sId)}/vote`, { vote: nextVote })
      .then(({ upvotes, downvotes }) => {
        const latest = { ...get().discussions }
        const idx = (latest[qId] || []).findIndex(item => String(item.id) === sId)
        if (idx === -1) return
        latest[qId] = [...latest[qId]]
        latest[qId][idx] = { ...latest[qId][idx], upvotes, downvotes }
        set({ discussions: latest })
      })
      .catch(() => {}) // example posts aren't on the server; the local count stays
  },
}))

// Signing out sends any unsent answers to that account, then forgets all of that
// account's data here, so the next person on this browser starts from their own
useAuthStore.subscribe((state, prev) => {
  if (prev.isAuthenticated && !state.isAuthenticated) {
    if (attemptsSyncTimer && prev.token) {
      attemptsSyncToken = prev.token
      syncAttemptsToServer(useAppStore.getState().practice, { immediate: true })
    }
    clearUserDataLocally()
    localStorage.setItem(DATA_OWNER_KEY, GUEST)
    useAppStore.setState(emptyUserData())
  }
})
