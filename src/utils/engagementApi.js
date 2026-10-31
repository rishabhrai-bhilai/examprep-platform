// Calls for mock test attempts and discussion stats.
// Each returns the parsed reply or throws with the server's message.

async function request(method, path, body) {
  const token = localStorage.getItem('auth_token')
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

export const isSignedIn = () => !!localStorage.getItem('auth_token')

// { counted, reason?, attempt?, comparison? }; the server scores the answers itself
export const submitMockAttempt = (testId, answers, timeTaken) =>
  request('POST', `mock-tests/${encodeURIComponent(testId)}/attempts`, { answers, timeTaken })

export const fetchMyMockAttempts = () => request('GET', 'mock-tests/attempts/me')

export const fetchMockComparison = (testId) =>
  request('GET', `mock-tests/${encodeURIComponent(testId)}/comparison`).then(d => d.comparison)

export const fetchDiscussionStats = () => request('GET', 'discussions/stats/me')
