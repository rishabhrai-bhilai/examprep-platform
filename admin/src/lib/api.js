// The admin app talks to the same Express API as the student site. On its own
// domain it can call the API on another address: set VITE_API_URL at build time
// (and add the admin address to ADMIN_APP_URL on the server, for CORS).
import { create } from 'zustand'

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const TOKEN_KEY = 'examprep_admin_token'

export async function api(path, { method = 'GET', body } = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && token) useAdminAuth.getState().signOut()
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

// Signed-in admin. Site admins (ADMIN_EMAILS) see everything; coaching-centre
// admins see only their own centres.
export const useAdminAuth = create((set) => ({
  user: null,
  checked: false,
  check: async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return set({ user: null, checked: true })
    try {
      const data = await api('/api/auth/me')
      set({ user: data.user || data, checked: true })
    } catch {
      set({ user: null, checked: true })
    }
  },
  signIn: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    set({ user, checked: true })
  },
  signOut: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ user: null, checked: true })
  }
}))

export const roleOf = (user) => (user?.isAdmin ? 'site' : user?.isInstituteAdmin ? 'centre' : null)
