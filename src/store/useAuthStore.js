import { create } from 'zustand'

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('auth_token') || null,
  isAuthenticated: !!(localStorage.getItem('auth_token') && localStorage.getItem('user')),
  error: null,
  loading: false,

  // Auth Prompt Modal state (triggered when guest clicks restricted action)
  authPrompt: {
    isOpen: false,
    title: 'Register / Login to access this feature',
    message: 'Join ExamPrep to unlock voting, replying to discussions, and syncing your notes and bookmarks across devices.',
    actionContext: 'restricted_action'
  },

  openAuthPrompt: (actionContext = 'this feature', customMessage = null) => {
    set({
      authPrompt: {
        isOpen: true,
        title: 'Register / Login to access this feature',
        actionContext,
        message: customMessage || `You need to be logged in to ${actionContext}. Create a free account in seconds or sign in to continue.`
      }
    })
  },

  closeAuthPrompt: () => {
    set((state) => ({
      authPrompt: { ...state.authPrompt, isOpen: false }
    }))
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      if (!email || !password) {
        throw new Error('Please fill in both email and password.')
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in.')
      }

      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        loading: false,
        error: null
      })

      // Close auth prompt modal if open
      get().closeAuthPrompt()
      return { success: true, user: data.user }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  signup: async (name, email, password) => {
    set({ loading: true, error: null })
    try {
      if (!name || !email || !password) {
        throw new Error('Please fill in all fields.')
      }

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account.')
      }

      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        loading: false,
        error: null
      })

      get().closeAuthPrompt()
      return { success: true, user: data.user }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  loginWithGoogle: async (credential, profile = null) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, profile })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Google sign-in failed.')
      }

      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        loading: false,
        error: null
      })

      get().closeAuthPrompt()
      return { success: true, user: data.user }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      set({ isAuthenticated: false, user: null, token: null })
      return null
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        // Token invalid or expired
        get().logout()
        return null
      }
      const data = await res.json()
      set({ user: data.user, token, isAuthenticated: true })
      localStorage.setItem('user', JSON.stringify(data.user))
      return data.user
    } catch (err) {
      console.warn('Could not verify auth session:', err.message)
      return null
    }
  },

  updateProfile: async (updates) => {
    const token = get().token || localStorage.getItem('auth_token')
    if (!token) return { success: false, error: 'Not authenticated' }

    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile')

      set({ user: data.user, loading: false })
      localStorage.setItem('user', JSON.stringify(data.user))
      return { success: true, user: data.user }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    set({ user: null, token: null, isAuthenticated: false, error: null })
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
