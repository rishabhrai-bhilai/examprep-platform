import { create } from 'zustand'
import initialQuestions from '../data/questions.json'
import { dummyDiscussions } from '../utils/dummyData'

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
    // Normalize dummyDiscussions so each solution has upvotes, downvotes, replies
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

export const useAppStore = create((set, get) => ({
  theme: getInitialTheme(),
  bookmarks: getInitialBookmarks(),
  bookmarkFolders: getInitialBookmarkFolders(),
  bookmarkSelectorQuestionId: null,
  votes: JSON.parse(localStorage.getItem('votes') || '{}'), // { [questionId]: 'up' | 'down' | null }
  discussions: getInitialDiscussions(), // { [questionId]: Solution[] }
  solutionVotes: getInitialSolutionVotes(), // { [solutionId]: 'up' | 'down' | null }
  myCommentIds: getInitialMyCommentIds(), // IDs of solutions/replies authored locally
  questionNotes: JSON.parse(localStorage.getItem('questionNotes') || '{}'), // { [questionId]: { type: 'canvas' | 'pdf', data: string, name: string } }
  activeQuestionIndex: 0,
  calculatorOpen: false,
  activeDiscussionQuestionId: null, // null if closed, otherwise questionId
  activeVideoSolutionUrl: null, // null if closed, otherwise youtubeUrl
  activeVideoQuestion: null, // question object for the video
  scratchpadOpenQuestionId: null, // null if closed, otherwise questionId
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
    
    // Apply changes to document element
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
  },

  deleteBookmarkFolder: (folderName) => {
    const folders = { ...get().bookmarkFolders }
    delete folders[folderName]
    const nextBookmarks = Array.from(new Set(Object.values(folders).flat()))
    set({ bookmarkFolders: folders, bookmarks: nextBookmarks })
    localStorage.setItem('bookmarkFolders', JSON.stringify(folders))
    localStorage.setItem('bookmarks', JSON.stringify(nextBookmarks))
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
  },

  removeQuestionFromFolder: (folderName, questionId) => {
    const folders = { ...get().bookmarkFolders }
    if (!folders[folderName]) return
    folders[folderName] = folders[folderName].filter(id => id !== questionId)
    const nextBookmarks = Array.from(new Set(Object.values(folders).flat()))
    set({ bookmarkFolders: folders, bookmarks: nextBookmarks })
    localStorage.setItem('bookmarkFolders', JSON.stringify(folders))
    localStorage.setItem('bookmarks', JSON.stringify(nextBookmarks))
  },

  removeQuestionsFromFolder: (folderName, questionIds) => {
    const folders = { ...get().bookmarkFolders }
    if (!folders[folderName]) return
    folders[folderName] = folders[folderName].filter(id => !questionIds.includes(id))
    const nextBookmarks = Array.from(new Set(Object.values(folders).flat()))
    set({ bookmarkFolders: folders, bookmarks: nextBookmarks })
    localStorage.setItem('bookmarkFolders', JSON.stringify(folders))
    localStorage.setItem('bookmarks', JSON.stringify(nextBookmarks))
  },

  upvoteQuestion: (questionId) => {
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
      set({ questions: data, loadingQuestions: false })
    } catch (e) {
      console.error("Failed to fetch questions:", e)
      set({ loadingQuestions: false })
    }
  },

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
  },

  deleteQuestionNote: (questionId) => {
    const questionNotes = { ...get().questionNotes }
    delete questionNotes[questionId]
    set({ questionNotes })
    localStorage.setItem('questionNotes', JSON.stringify(questionNotes))
  },

  addSolution: (questionId, { content, author, avatar, authorEmail, authorId }) => {
    if (!content || !content.trim()) return null
    const qId = String(questionId)
    const currentDiscussions = { ...get().discussions }
    const qList = currentDiscussions[qId] ? [...currentDiscussions[qId]] : []
    const clientUserId = getClientUserId()

    const newSolution = {
      id: `sol-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      author: author || 'Anonymous Scholar',
      authorId: authorId || (author && author !== 'Anonymous Scholar' ? author : clientUserId),
      authorEmail: authorEmail || null,
      clientUserId: clientUserId,
      avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${Date.now()}`,
      content: content.trim(),
      createdAt: 'Just now',
      timestamp: Date.now(),
      upvotes: 0,
      downvotes: 0,
      replies: []
    }

    // Deduplicate safeguard
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
    if (!content || !content.trim()) return null
    const qId = String(questionId)
    const tId = String(targetId)
    const currentDiscussions = { ...get().discussions }
    const qList = currentDiscussions[qId] ? [...currentDiscussions[qId]] : []
    const clientUserId = getClientUserId()

    const newReply = {
      id: `rep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      author: author || 'Anonymous Scholar',
      authorId: authorId || (author && author !== 'Anonymous Scholar' ? author : clientUserId),
      authorEmail: authorEmail || null,
      clientUserId: clientUserId,
      avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${Date.now()}`,
      content: content.trim(),
      createdAt: 'Just now',
      timestamp: Date.now(),
      replyToAuthor: replyToAuthor || null,
      parentId: tId,
      replies: []
    }

    // Helper to insert reply into arbitrary depth of reply tree
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

    // 1. First check if target is a top-level solution
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

    // 2. Otherwise search inside solutions' reply trees
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

    // 1. Check if it's a top-level solution
    const solIndex = qList.findIndex(item => String(item.id) === cId)
    if (solIndex !== -1) {
      qList.splice(solIndex, 1)
      currentDiscussions[qId] = qList
      modified = true
    } else {
      // 2. Search recursively in reply trees
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

  voteSolution: (questionId, solutionId, voteType) => {
    const qId = String(questionId)
    const sId = String(solutionId)
    const currentVotes = { ...get().solutionVotes }
    const previousVote = currentVotes[sId] // 'up' | 'down' | undefined | null

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

      // Revert previous vote effect
      if (previousVote === 'up') up = Math.max(0, up - 1)
      if (previousVote === 'down') down = Math.max(0, down - 1)

      // Apply next vote effect
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
