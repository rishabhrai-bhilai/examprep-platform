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

export const useAppStore = create((set, get) => ({
  theme: getInitialTheme(),
  bookmarks: JSON.parse(localStorage.getItem('bookmarks') || '[]'),
  votes: JSON.parse(localStorage.getItem('votes') || '{}'), // { [questionId]: 'up' | 'down' | null }
  questionNotes: JSON.parse(localStorage.getItem('questionNotes') || '{}'), // { [questionId]: { type: 'canvas' | 'pdf', data: string, name: string } }
  activeQuestionIndex: 0,
  calculatorOpen: false,
  activeDiscussionQuestionId: null, // null if closed, otherwise questionId
  activeVideoSolutionUrl: null, // null if closed, otherwise youtubeUrl
  scratchpadOpenQuestionId: null, // null if closed, otherwise questionId
  sidebarOpen: false,
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
    const bookmarks = get().bookmarks
    const isBookmarked = bookmarks.includes(questionId)
    const nextBookmarks = isBookmarked
      ? bookmarks.filter((id) => id !== questionId)
      : [...bookmarks, questionId]
    
    set({ bookmarks: nextBookmarks })
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
