import { useEffect, useState } from 'react'

// The questions written for the mock tests (shared/originalQuestions.json, ~0.5 MB).
// Only the mock test page needs them up front; the report form and the reports
// page just look up a question's code, so they load the file on first use instead
// of it riding in the main bundle.
let cached = null
let pending = null

export const loadOriginalQuestions = () => {
  if (cached) return Promise.resolve(cached)
  if (!pending) {
    pending = import('../../shared/originalQuestions.json')
      .then((m) => { cached = m.default || []; return cached })
      .catch((err) => { pending = null; throw err })
  }
  return pending
}

// [] until loaded, then the list
export function useOriginalQuestions() {
  const [list, setList] = useState(cached || [])
  useEffect(() => {
    if (cached) return undefined
    let alive = true
    loadOriginalQuestions()
      .then((loaded) => { if (alive) setList(loaded) })
      .catch((err) => console.warn('Could not load the mock test questions:', err.message))
    return () => { alive = false }
  }, [])
  return list
}
