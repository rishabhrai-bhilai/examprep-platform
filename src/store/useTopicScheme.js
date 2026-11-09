import { create } from 'zustand'

// How topics are grouped across the site, picked by the user:
//   'chapters'  the book's chapters (65, in book order) - the default
//   'topics'    the classic GATE Overflow topics (533), and the classic sectional mocks
// Saved in this browser, so the choice sticks between visits.
const KEY = 'topic_scheme'
export const TOPIC_SCHEMES = ['chapters', 'topics']

const read = () => {
  try {
    const v = localStorage.getItem(KEY)
    return TOPIC_SCHEMES.includes(v) ? v : 'chapters'
  } catch {
    return 'chapters'
  }
}

export const useTopicScheme = create((set) => ({
  scheme: read(),
  setScheme: (scheme) => {
    if (!TOPIC_SCHEMES.includes(scheme)) return
    try { localStorage.setItem(KEY, scheme) } catch { /* private mode: keep it for this visit */ }
    set({ scheme })
  }
}))

export const currentTopicScheme = () => useTopicScheme.getState().scheme
