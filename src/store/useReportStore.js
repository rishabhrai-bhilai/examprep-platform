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

// Issue reports ("Report an Issue" page and the per-question report button).
// Report shape: { id, category: 'question'|'bug'|'suggestion'|'other', questionId, page,
//   message, status: 'open'|'in_progress'|'resolved', adminNote, userName, userEmail, createdAt }
export const useReportStore = create((set) => ({
  // Modal opened from a question: { isOpen, questionId, category }
  reportModal: { isOpen: false, questionId: null, category: 'question' },
  openReportModal: (questionId = null, category = questionId ? 'question' : 'bug') =>
    set({ reportModal: { isOpen: true, questionId, category } }),
  closeReportModal: () => set((state) => ({ reportModal: { ...state.reportModal, isOpen: false } })),

  // { category, questionId, message, page } -> created report
  submitReport: async (report) => {
    const data = await request('/api/reports', { method: 'POST', body: JSON.stringify(report) })
    return data.report
  },
  fetchMyReports: () => request('/api/reports/mine'),
  // Admins only (ADMIN_EMAILS on the server; user.isAdmin on the client)
  fetchAllReports: () => request('/api/reports'),
  updateReport: (id, updates) => request(`/api/reports/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
}))
