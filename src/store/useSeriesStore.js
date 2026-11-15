import { create } from 'zustand'

const authHeaders = () => {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(url) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...authHeaders() } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

// Test series are bundles of mock tests that coaching centres give their
// students. This tracks which tests are locked, which the student has through
// their centre, and the original questions they may see. Shapes: server/routes/series.js
export const useSeriesStore = create((set, get) => ({
  access: { locked: {}, unlocked: [], series: [] },
  originals: null, // original (non-PYQ) questions this visitor may see

  fetchAccess: async () => {
    const access = await request('/api/me/access')
    set({ access })
    return access
  },
  fetchOriginals: async () => {
    const originals = await request('/api/mock-tests/originals')
    set({ originals })
    return originals
  },
  // Everything that changes when access changes (joining or leaving a centre, signing in or out)
  refreshAccess: () => Promise.all([get().fetchAccess(), get().fetchOriginals()]).catch(() => {})
}))
