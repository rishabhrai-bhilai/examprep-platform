import { create } from 'zustand'

// POST JSON and return the parsed reply, throwing the server's error message on failure
async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.')
    err.retryAfter = data.retryAfter
    throw err
  }
  return data
}

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

  // Sign up step 1: send the details; the server emails a 6-digit code.
  // `website` is a honeypot field that real users never fill in.
  startSignup: async (name, email, password, website = '') => {
    set({ loading: true, error: null })
    try {
      if (!name || !email || !password) {
        throw new Error('Please fill in all fields.')
      }
      const data = await postJson('/api/auth/signup/start', { name, email, password, website })
      set({ loading: false })
      return { success: true, message: data.message }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message, retryAfter: err.retryAfter }
    }
  },

  // Sign up step 2: confirm the code; this creates the account and signs in
  verifySignup: async (email, code) => {
    set({ loading: true, error: null })
    try {
      const data = await postJson('/api/auth/signup/verify', { email, code })
      get().setSession(data.token, data.user)
      return { success: true, user: data.user }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  setSession: (token, user) => {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true, loading: false, error: null })
    get().closeAuthPrompt()
  },

  // Public sign-in options: { googleClientId, devGoogleLogin, emailEnabled }
  authConfig: null,
  fetchAuthConfig: async () => {
    if (get().authConfig) return get().authConfig
    try {
      const res = await fetch('/api/auth/config')
      const config = res.ok ? await res.json() : null
      if (config) set({ authConfig: config })
      return config
    } catch {
      return null
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

  // Emails a reset code (the reply is the same whether or not the account exists)
  forgotPassword: async (email) => {
    set({ loading: true, error: null })
    try {
      if (!email) {
        throw new Error('Please enter your email.')
      }
      const data = await postJson('/api/auth/password/forgot', { email })
      set({ loading: false })
      return { success: true, message: data.message }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message, retryAfter: err.retryAfter }
    }
  },

  // Sets a new password with the emailed code, then signs in
  resetPassword: async (email, code, password) => {
    set({ loading: true, error: null })
    try {
      const data = await postJson('/api/auth/password/reset', { email, code, password })
      get().setSession(data.token, data.user)
      return { success: true, user: data.user }
    } catch (err) {
      set({ error: err.message, loading: false })
      return { success: false, error: err.message }
    }
  },

  clearError: () => set({ error: null })
}))
