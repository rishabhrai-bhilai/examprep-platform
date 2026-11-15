// Helpers for the student tables (a centre's students, and every student). The numbers themselves are
// built on the server (server/services/institutes.js); these sort, filter and export them.

// Columns in the student CSV export
const CSV_COLUMNS = [
  ['Name', s => s.name],
  ['Email', s => s.email],
  ['Target year', s => s.targetYear ?? ''],
  ['Joined centre', s => isoDate(s.joinedAt)],
  ['Last active', s => isoDate(s.lastActive)],
  ['Questions solved', s => s.solved],
  ['Questions attempted', s => s.attempted],
  ['Accuracy %', s => s.accuracy ?? ''],
  ['Current streak (days)', s => s.streak],
  ['Longest streak (days)', s => s.longestStreak],
  ['Active days', s => s.activeDays],
  ['Practice hours', s => (s.practiceSec / 3600).toFixed(1)],
  ['Answers in last 7 days', s => s.answersLast7],
  ['Mock tests taken', s => s.mockCount],
  ['Average mock score %', s => s.avgMockPercent ?? ''],
  ['Best mock score %', s => s.bestMockPercent ?? ''],
  ['Weakest subjects', s => s.weakestSubjects.join('; ')]
]

// Every student (site admins): sign-up, centre and purchases instead of the centre join date
export const SITE_CSV_COLUMNS = [
  ...CSV_COLUMNS.slice(0, 3),
  ['Signed up', s => isoDate(s.signedUpAt)],
  ['Coaching centre', s => s.centre || ''],
  ['Active test series', s => s.activeSeries],
  ['Paid (INR)', s => ((s.spentPaise || 0) / 100).toFixed(2)],
  ...CSV_COLUMNS.slice(4)
]

const isoDate = (t) => (t ? new Date(t).toISOString().slice(0, 10) : '')

const csvCell = (value) => {
  const text = String(value ?? '')
  // Quote anything with separators, and neutralise spreadsheet formulas (=, +, -, @)
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export const studentsCsv = (students, columns = CSV_COLUMNS) =>
  [columns.map(([h]) => h), ...students.map(s => columns.map(([, get]) => get(s)))]
    .map(row => row.map(csvCell).join(','))
    .join('\r\n')

// Saves text as a file (with a BOM so Excel reads UTF-8 names correctly)
export const downloadText = (filename, text, type = 'text/csv;charset=utf-8') => {
  const url = URL.createObjectURL(new Blob(['﻿', text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const STUDENT_SORTS = {
  name: { label: 'Name', value: s => s.name.toLowerCase(), asc: true },
  solved: { label: 'Solved', value: s => s.solved },
  accuracy: { label: 'Accuracy', value: s => s.accuracy ?? -1 },
  streak: { label: 'Streak', value: s => s.streak },
  week: { label: 'Last 7 days', value: s => s.answersLast7 },
  mocks: { label: 'Mock avg', value: s => s.avgMockPercent ?? -1 },
  lastActive: { label: 'Last active', value: s => s.lastActive || 0 },
  signedUp: { label: 'Signed up', value: s => s.signedUpAt || 0 },
  spent: { label: 'Paid', value: s => s.spentPaise || 0 }
}

export const sortStudents = (students, key, desc) => {
  const sort = STUDENT_SORTS[key] || STUDENT_SORTS.solved
  return students.slice().sort((a, b) => {
    const va = sort.value(a)
    const vb = sort.value(b)
    const cmp = va < vb ? -1 : va > vb ? 1 : 0
    return desc ? -cmp : cmp
  })
}

// Active within a week / a month / longer, for the status pill
export const activityStatus = (lastActive, now = Date.now()) => {
  if (!lastActive) return { label: 'Not started', tone: 'muted' }
  const days = (now - lastActive) / (24 * 3600 * 1000)
  if (days <= 7) return { label: 'Active', tone: 'good' }
  if (days <= 30) return { label: 'Slowing down', tone: 'warning' }
  return { label: 'Inactive', tone: 'critical' }
}
