// Problem of the Day and badges, shared by the app and the server.

// --- Problem of the Day ---
// Everyone gets the same question on the same date (their own local date). The pick
// is a hash of the date, so it needs no storage and is the same in app and server.

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

export const problemOfTheDay = (dateKey, candidateIds) =>
  candidateIds.length ? candidateIds[hash(`potd:${dateKey}`) % candidateIds.length] : null

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
