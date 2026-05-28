import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('user'),
  error: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      // Mock API call delay
      await new Promise((resolve) => setTimeout(resolve, 600))
      
      if (!email || !password) {
        throw new Error('Please fill in all fields.')
      }

      const mockUser = {
        name: email.split('@')[0],
        email: email,
        streak: 5,
        solvedQuestions: 34,
        rank: 1205,
      }

      set({ user: mockUser, isAuthenticated: true, loading: false })
      localStorage.setItem('user', JSON.stringify(mockUser))
      return true
    } catch (err) {
      set({ error: err.message, loading: false })
      return false
    }
  },

  signup: async (name, email, password) => {
    set({ loading: true, error: null })
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))

      if (!name || !email || !password) {
        throw new Error('Please fill in all fields.')
      }

      const mockUser = {
        name,
        email,
        streak: 1,
        solvedQuestions: 0,
        rank: 9999,
      }

      set({ user: mockUser, isAuthenticated: true, loading: false })
      localStorage.setItem('user', JSON.stringify(mockUser))
      return true
    } catch (err) {
      set({ error: err.message, loading: false })
      return false
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false })
    localStorage.removeItem('user')
  },

  forgotPassword: async (email) => {
    set({ loading: true, error: null })
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (!email) {
        throw new Error('Please enter your email.')
      }
      set({ loading: false })
      return true
    } catch (err) {
      set({ error: err.message, loading: false })
      return false
    }
  },
  
  clearError: () => set({ error: null })
}))
