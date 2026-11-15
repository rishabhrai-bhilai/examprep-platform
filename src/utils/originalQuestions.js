import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useSeriesStore } from '../store/useSeriesStore'

// The questions written for the mock tests come from the server
// (useSeriesStore.originals, only those this student may see) without their
// answers and explanations, so the key can't be read before a ranked attempt.
// A test's answers arrive once it is submitted (revealAnswers), or are fetched
// again to reopen its analysis (fetchTestAnswers). They're kept in memory only.
const revealed = new Map() // questionId -> { answer, explanation }
const listeners = new Set()
const notify = () => listeners.forEach(fn => fn())

export const revealAnswers = (answers) => {
  if (!answers || typeof answers !== 'object') return
  Object.entries(answers).forEach(([id, a]) => revealed.set(Number(id), a))
  notify()
}

export const hasRevealedAnswer = (id) => revealed.has(Number(id))

// The question with its answer and explanation, when they've been revealed
export const withRevealedAnswer = (q) => (q && q.original && revealed.has(q.id) ? { ...q, ...revealed.get(q.id) } : q)

// Answers of a test this user has submitted (the server checks that they did)
export const fetchTestAnswers = async (testId) => {
  const token = localStorage.getItem('auth_token')
  if (!token) throw new Error('Please sign in to see this analysis.')
  const res = await fetch(`/api/mock-tests/${encodeURIComponent(testId)}/answers`, { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not load the answers. Please try again.')
  revealAnswers(data.answers)
  return data.answers
}

// Someone else may sign in on this browser next
useAuthStore.subscribe((state, prev) => {
  if (prev.isAuthenticated && !state.isAuthenticated && revealed.size) {
    revealed.clear()
    notify()
  }
})

// { list, ready, error, retry }: the questions, with any revealed answers merged in
export function useOriginalQuestionsState(enabled = true) {
  const originals = useSeriesStore(s => s.originals)
  const fetchOriginals = useSeriesStore(s => s.fetchOriginals)
  const [version, setVersion] = useState(0)
  const [error, setError] = useState(null)
  useEffect(() => {
    const onChange = () => setVersion(v => v + 1)
    listeners.add(onChange)
    return () => { listeners.delete(onChange) }
  }, [])
  const load = () => {
    setError(null)
    fetchOriginals().catch((err) => {
      console.warn('Could not load the mock test questions:', err.message)
      setError('Could not load the mock tests. Check your connection and try again.')
    })
  }
  useEffect(() => { if (enabled && !originals) load() }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps
  // version changes whenever answers are revealed or forgotten
  const list = useMemo(() => (originals || []).map(withRevealedAnswer), [originals, version])
  return { list, ready: !!originals, error, retry: load }
}

// [] until loaded, then the list
export const useOriginalQuestions = () => useOriginalQuestionsState().list
