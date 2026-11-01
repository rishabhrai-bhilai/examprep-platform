// Problem of the Day and badges, shared by the app and the server.

// --- Problem of the Day ---
// Everyone gets the same question on the same date (their own local date). The
// candidates are put in a fixed shuffled order and each day takes the next one, so no
// question repeats until every one has been used; then a new shuffled round starts.
// It's worked out from the date alone, so it needs no storage and the app and server agree.

const hash = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Questions suitable for a daily problem: a real answer key, not "marks to all"
export const potdCandidates = (questions) =>
  questions
    .filter((q) => !q.marksToAll && q.answer !== null && q.answer !== undefined && q.answer !== '')
    .map((q) => q.id)
    .sort((a, b) => a - b)

// Day 0 of the schedule; any fixed date works
const POTD_START = Date.UTC(2026, 0, 1)
const DAY_MS = 24 * 60 * 60 * 1000

const dayNumber = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - POTD_START) / DAY_MS)
}

// Repeatable pseudo-random numbers from a seed (mulberry32)
const seededRandom = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// The candidates in this round's order (Fisher-Yates with a seed per round)
const roundCache = new Map()
const roundOrder = (round, candidateIds) => {
  const key = `${round}:${candidateIds.length}:${candidateIds[0]}:${candidateIds[candidateIds.length - 1]}`
  if (!roundCache.has(key)) {
    const order = [...candidateIds]
    const random = seededRandom(hash(`potd-round:${round}`))
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    if (roundCache.size > 8) roundCache.clear()
    roundCache.set(key, order)
  }
  return roundCache.get(key)
}

export const problemOfTheDay = (dateKey, candidateIds) => {
  const n = candidateIds.length
  if (!n) return null
  const day = dayNumber(dateKey)
  const round = Math.floor(day / n)
  const position = ((day % n) + n) % n
  const order = roundOrder(round, candidateIds)
  // A new round mustn't open with the question that closed the last one
  if (n > 1 && position === 0 && order[0] === roundOrder(round - 1, candidateIds)[n - 1]) return order[1]
  if (n > 1 && position === 1 && order[0] === roundOrder(round - 1, candidateIds)[n - 1]) return order[0]
  return order[position]
}

// --- Badges ---
// Earned once and kept, even if a streak later breaks. `check` gets the user's stats:
// { solved, bookmarks, longestStreak, longestPotdStreak, contributions }

const STREAK_MILESTONES = [7, 15, 30, 365]
const CONTRIBUTION_MILESTONES = [
  [1, 'First Post', 'Posted your first solution or reply'],
  [10, 'Contributor', '10 solutions or replies in discussions'],
  [50, 'Discussion Regular', '50 solutions or replies in discussions'],
  [100, 'Community Pillar', '100 solutions or replies in discussions']
]

export const BADGES = [
  { id: 'first-steps', name: 'First Steps', group: 'practice', description: 'Solved your first question', check: (s) => s.solved >= 1 },
  { id: 'saver', name: 'Saver', group: 'practice', description: 'Bookmarked 3 questions', check: (s) => s.bookmarks >= 3 },
  ...STREAK_MILESTONES.map((days) => ({
    id: `potd-${days}`,
    name: `${days}-Day Problem Streak`,
    group: 'potd',
    description: `Attempted the Problem of the Day ${days} days in a row`,
    check: (s) => s.longestPotdStreak >= days
  })),
  ...STREAK_MILESTONES.map((days) => ({
    id: `streak-${days}`,
    name: `${days}-Day Study Streak`,
    group: 'streak',
    description: `Studied ${days} days in a row`,
    check: (s) => s.longestStreak >= days
  })),
  ...CONTRIBUTION_MILESTONES.map(([count, name, description]) => ({
    id: `discuss-${count}`,
    name,
    group: 'discussion',
    description,
    check: (s) => s.contributions >= count
  }))
]

export const findBadge = (id) => BADGES.find((b) => b.id === id) || null
