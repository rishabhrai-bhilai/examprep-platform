import { useAuthStore } from '../store/useAuthStore'

// Calls for mock test attempts, the Problem of the Day, badges and discussion stats.
// Each returns the parsed reply or throws with the server's message.

const userTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

async function request(method, path, body) {
  const token = localStorage.getItem('auth_token')
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  // Replies that change streaks or badges carry the updated user
  if (data.user && useAuthStore.getState().isAuthenticated) {
    localStorage.setItem('user', JSON.stringify(data.user))
    useAuthStore.setState({ user: data.user })
  }
  return data
}

export const isSignedIn = () => !!localStorage.getItem('auth_token')

// { counted, reason?, attempt?, comparison? }; the server scores the answers itself
export const submitMockAttempt = (testId, answers, timeTaken) =>
  request('POST', `mock-tests/${encodeURIComponent(testId)}/attempts`, { answers, timeTaken })

export const fetchMyMockAttempts = () => request('GET', 'mock-tests/attempts/me')

export const fetchMockComparison = (testId) =>
  request('GET', `mock-tests/${encodeURIComponent(testId)}/comparison`).then(d => d.comparison)

// { date, questionId, attempted, correct, potdStreak }
export const fetchProblemOfTheDay = () => {
  const tz = userTimeZone()
  return request('GET', `potd${tz ? `?timeZone=${encodeURIComponent(tz)}` : ''}`)
}

export const submitProblemOfTheDay = (questionId, answer) =>
  request('POST', 'potd/attempt', { questionId, answer, timeZone: userTimeZone() })

export const markBadgesSeen = (ids) => request('POST', 'badges/seen', { ids })

export const fetchDiscussionStats = () => request('GET', 'discussions/stats/me')
