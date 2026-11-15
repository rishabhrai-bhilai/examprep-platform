import { create } from 'zustand'

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

// A student's coaching centre (the "Join your coaching centre" box in Profile).
// Centres are run from the admin app (admin/).
export const useInstituteStore = create((set) => ({
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
