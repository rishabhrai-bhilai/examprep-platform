import { create } from 'zustand'
import initialQuestions from '../data/questions.json'
import { dummyDiscussions } from '../utils/dummyData'
import { useAuthStore } from './useAuthStore'

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

const getInitialDiscussions = () => {
  try {
    const normalizedDummy = {}
    Object.keys(dummyDiscussions).forEach((qId) => {
      normalizedDummy[qId] = (dummyDiscussions[qId] || []).map((sol) => ({
        ...sol,
        upvotes: sol.upvotes !== undefined ? sol.upvotes : (sol.likes || 0),
        downvotes: sol.downvotes || 0,
        createdAt: sol.createdAt || '2 hours ago',
        replies: (sol.replies || []).map((rep) => ({
          ...rep,
          createdAt: rep.createdAt || '1 hour ago'
        }))
      }))
    })

    const stored = localStorage.getItem('discussions')
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...normalizedDummy, ...parsed }
    }
    return normalizedDummy
  } catch (e) {
    return { ...dummyDiscussions }
  }
}

const getInitialSolutionVotes = () => {
  try {
    const stored = localStorage.getItem('solutionVotes')
    if (stored) return JSON.parse(stored)
    return {}
  } catch (e) {
    return {}
  }
}

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

export const useAppStore = create((set, get) => ({
  theme: getInitialTheme(),
  bookmarks: getInitialBookmarks(),
  bookmarkFolders: getInitialBookmarkFolders(),
  bookmarkSelectorQuestionId: null,
  votes: JSON.parse(localStorage.getItem('votes') || '{}'),
  discussions: getInitialDiscussions(),
  solutionVotes: getInitialSolutionVotes(),
  myCommentIds: getInitialMyCommentIds(),
  questionNotes: JSON.parse(localStorage.getItem('questionNotes') || '{}'),
  activeQuestionIndex: 0,
  calculatorOpen: false,
  activeDiscussionQuestionId: null,
  activeVideoSolutionUrl: null,
  activeVideoQuestion: null,
  scratchpadOpenQuestionId: null,
  sidebarOpen: false,
  sidebarCollapsed: JSON.parse(localStorage.getItem('sidebarCollapsed') || 'false'),
  questions: initialQuestions || [],
  loadingQuestions: false,
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

      // Update state & localStorage
      set({
        bookmarks: mergedBookmarks,
        bookmarkFolders: mergedFolders,
        questionNotes: mergedNotes
      })

      localStorage.setItem('bookmarks', JSON.stringify(mergedBookmarks))
      localStorage.setItem('bookmarkFolders', JSON.stringify(mergedFolders))
      localStorage.setItem('questionNotes', JSON.stringify(mergedNotes))
      localStorage.setItem('gate_mock_history', JSON.stringify(mergedMocks))
      localStorage.setItem('gate_pyq_mock_history', JSON.stringify(mergedPyqs))

      // Push merged back to server
      syncBookmarksToServer(mergedBookmarks, mergedFolders)
      syncNotesToServer(mergedNotes)
      syncTestRecordsToServer()
    } catch (err) {
      console.warn('Sync failed:', err.message)
    }
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
    set({ loadingQuestions: true })
    try {
      const res = await fetch('/api/questions')
      const data = await res.json()
      const sanitized = Array.isArray(data) ? data.map(q => ({
        ...q,
        likes: typeof q.likes === 'number' ? q.likes : 0,
        commentsCount: typeof q.commentsCount === 'number' ? q.commentsCount : 0
      })) : []
      set({ questions: sanitized, loadingQuestions: false })
    } catch (e) {
      console.error("Failed to fetch questions:", e)
      set({ loadingQuestions: false })
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

    set({ discussions: currentDiscussions, myCommentIds: nextMyCommentIds })
    try {
      localStorage.setItem('discussions', JSON.stringify(currentDiscussions))
      localStorage.setItem('discussion_my_comment_ids', JSON.stringify(nextMyCommentIds))
    } catch (e) {
      console.warn('Could not persist discussions to localStorage', e)
    }
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

    const targetIdx = qList.findIndex(item => String(item.id) === tId)
    if (targetIdx !== -1) {
      const targetSol = { ...qList[targetIdx] }
      targetSol.replies = targetSol.replies ? [...targetSol.replies, newReply] : [newReply]
      qList[targetIdx] = targetSol
      currentDiscussions[qId] = qList
      set({ discussions: currentDiscussions, myCommentIds: nextMyCommentIds })
      try {
        localStorage.setItem('discussions', JSON.stringify(currentDiscussions))
        localStorage.setItem('discussion_my_comment_ids', JSON.stringify(nextMyCommentIds))
      } catch (e) {
        console.warn('Could not persist discussions to localStorage', e)
      }
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
      set({ discussions: currentDiscussions, myCommentIds: nextMyCommentIds })
      try {
        localStorage.setItem('discussions', JSON.stringify(currentDiscussions))
        localStorage.setItem('discussion_my_comment_ids', JSON.stringify(nextMyCommentIds))
      } catch (e) {
        console.warn('Could not persist discussions to localStorage', e)
      }
    }

    return newReply
  },

  deleteComment: (questionId, commentId) => {
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
    set({ discussions: currentDiscussions, myCommentIds: currentMyCommentIds })

    try {
      localStorage.setItem('discussions', JSON.stringify(currentDiscussions))
      localStorage.setItem('discussion_my_comment_ids', JSON.stringify(currentMyCommentIds))
    } catch (e) {
      console.warn('Could not persist after deleting comment', e)
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
      localStorage.setItem('discussions', JSON.stringify(currentDiscussions))
    } catch (e) {
      console.warn('Could not persist votes to localStorage', e)
    }
  },
}))
