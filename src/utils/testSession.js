// A fixed paper (a mock test or a full PYQ year paper) can be taken once: after
// Submit it only opens its analysis. The test in progress is saved as it goes,
// so a refresh, crash or closed tab resumes it where it stopped, with the time
// that was left. Only one test can be in progress at a time.
//
// Session: { page: 'mock' | 'pyq', testId, title, modeInfo, fixed, questionIds,
//   durationMinutes, answers, flags, visited, timeLeft, timeSpent, answerTimes,
//   currentQuestionIndex, paperId, savedAt }

export const IN_PROGRESS_KEY = 'gate_test_in_progress'
export const MOCK_HISTORY_KEY = 'gate_mock_history'
export const PYQ_HISTORY_KEY = 'gate_pyq_mock_history'

export const loadSession = () => {
  try {
    const s = JSON.parse(localStorage.getItem(IN_PROGRESS_KEY) || 'null')
    return s && s.testId && Array.isArray(s.questionIds) && s.questionIds.length ? s : null
  } catch {
    return null
  }
}

export const saveSession = (session) => {
  try {
    localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify({ ...session, savedAt: Date.now() }))
  } catch (e) {
    console.warn('Could not save test progress:', e.message)
  }
}

export const clearSession = () => localStorage.removeItem(IN_PROGRESS_KEY)

const readHistory = (key) => {
  try {
    const list = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

// The finished attempt of a fixed mock test, newest first (history is newest first)
export const findMockAttempt = (testId) =>
  readHistory(MOCK_HISTORY_KEY).find(h => h && h.testId === testId) || null

// The finished attempt of a PYQ year paper ('pyq-2025-s1'). Older entries have
// no paperId, so they are matched by the paper's title.
export const findPaperAttempt = (paperId, title) =>
  readHistory(PYQ_HISTORY_KEY).find(h => h && (h.paperId ? h.paperId === paperId : h.testTitle === title)) || null

// Before starting a new test: a fixed paper in progress must be finished first
// (dropping it would allow a fresh retake); a custom set can be dropped.
// Returns true when it is fine to start.
export const canStartNewTest = (testId) => {
  const s = loadSession()
  if (!s || s.testId === testId) return true
  if (s.fixed) {
    window.alert(`"${s.title}" is still in progress. Resume it and submit it before starting another test.`)
    return false
  }
  if (!window.confirm(`"${s.title}" is still in progress. Starting a new test discards it. Continue?`)) return false
  clearSession()
  return true
}

export const formatSavedAt = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
}
