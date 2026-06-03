import { create } from 'zustand'

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
    if (!stored) return []
    return JSON.parse(stored)
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

export const useAppStore = create((set, get) => ({
  theme: getInitialTheme(),
  bookmarks: getInitialBookmarks(),
  bookmarkFolders: getInitialBookmarkFolders(),
  bookmarkSelectorQuestionId: null,
  votes: JSON.parse(localStorage.getItem('votes') || '{}'), // { [questionId]: 'up' | 'down' | null }
  questionNotes: JSON.parse(localStorage.getItem('questionNotes') || '{}'), // { [questionId]: { type: 'canvas' | 'pdf', data: string, name: string } }
  activeQuestionIndex: 0,
  calculatorOpen: false,
  activeDiscussionQuestionId: null, // null if closed, otherwise questionId
  activeVideoSolutionUrl: null, // null if closed, otherwise youtubeUrl
  scratchpadOpenQuestionId: null, // null if closed, otherwise questionId
  sidebarOpen: false,
  sidebarCollapsed: JSON.parse(localStorage.getItem('sidebarCollapsed') || 'false'),
  questions: [],
  loadingQuestions: false,

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
  setActiveVideoSolutionUrl: (url) => set({ activeVideoSolutionUrl: url }),
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

  saveQuestionNote: (questionId, noteType, data, name = '', strokes = null) => {
    const questionNotes = { ...get().questionNotes }
    questionNotes[questionId] = { type: noteType, data, name, strokes }
    set({ questionNotes })
    localStorage.setItem('questionNotes', JSON.stringify(questionNotes))
  },

  deleteQuestionNote: (questionId) => {
    const questionNotes = { ...get().questionNotes }
    delete questionNotes[questionId]
    set({ questionNotes })
    localStorage.setItem('questionNotes', JSON.stringify(questionNotes))
  },
}))
