import { create } from 'zustand'
import { useAuthStore } from './useAuthStore'

const authHeaders = () => {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) }
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

// Admins being added or removed changes who sees the Coaching Dashboard link
const refreshUser = () => useAuthStore.getState().checkAuth?.()

// Coaching centres (institutes).
// Centre: { id, name, code, adminEmails, memberCount, createdAt }
// Dashboard: { institute, summary, students, generatedAt } (server/services/institutes.js)
export const useInstituteStore = create((set) => ({
  // --- Centre admins and site admins (/institute) ---
  fetchInstitutes: () => request('/api/institutes'),
  createInstitute: async (name, adminEmails) => {
    const data = await request('/api/institutes', { method: 'POST', body: JSON.stringify({ name, adminEmails }) })
    refreshUser()
    return data.institute
  },
  updateInstitute: async (id, updates) => {
    const data = await request(`/api/institutes/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
    if (updates.adminEmails !== undefined) refreshUser()
    return data.institute
  },
  deleteInstitute: async (id) => {
    await request(`/api/institutes/${id}`, { method: 'DELETE' })
    refreshUser()
  },
  fetchDashboard: (id) => request(`/api/institutes/${id}/dashboard`),
  removeStudent: (id, userId) => request(`/api/institutes/${id}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' }),

  // --- Students (Profile) ---
  membership: undefined, // undefined = not loaded, null = no centre
  fetchMembership: async () => {
    const data = await request('/api/me/institute')
    set({ membership: data.institute })
    return data.institute
  },
  lookupCode: async (code) => (await request(`/api/me/institute/lookup?code=${encodeURIComponent(code)}`)).institute,
  joinInstitute: async (code) => {
    const data = await request('/api/me/institute', { method: 'POST', body: JSON.stringify({ code, consent: true }) })
    set({ membership: data.institute })
    return data.institute
  },
  leaveInstitute: async () => {
    await request('/api/me/institute', { method: 'DELETE' })
    set({ membership: null })
  }
}))
