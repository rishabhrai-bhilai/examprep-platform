// Coaching-centre (institute) dashboard numbers, built from each student's
// server-side records: practice attempts (attemptDb, shapes in shared/practice.js)
// and scored mock test attempts (mockAttemptDb).
//
// What a centre sees is limited to what students agree to when they join:
// name, email, target year, practice progress and mock test results. Notes,
// bookmarks, discussion posts, phone and date of birth are never included.
import { practiceSummary, dayKey } from '../../shared/practice.js'

export const ACTIVITY_DAYS = 30
const DAY_MS = 24 * 3600 * 1000
// A subject is "weak" below this accuracy, once it has enough answers to judge
// (per student, and across the whole batch)
export const WEAK_ACCURACY = 60
const MIN_STUDENT_ANSWERS = 5
const MIN_BATCH_ANSWERS = 10

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : null)
const avg = (values) => {
  const v = values.filter(x => x !== null && x !== undefined)
  return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null
}

// The last `n` day keys, oldest first, ending today
const lastDays = (today, n) => {
  const [y, m, d] = today.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(y, m - 1, d - (n - 1 - i))).toISOString().slice(0, 10))
}

// Weak subject rows, weakest first: lowest accuracy, then most answers
const weakestFirst = (rows, minAnswers) => rows
  .filter(r => r.answers >= minAnswers && r.accuracy !== null && r.accuracy < WEAK_ACCURACY)
  .sort((a, b) => a.accuracy - b.accuracy || b.answers - a.answers)

// Per subject: practice questions tried and solved, plus mock test answers.
// Accuracy blends both: (practice solved + mock correct) / (practice tried + mock questions).
function subjectRows(practice, mocks, subjectOf) {
  const map = {}
  const row = (subject) => map[subject] || (map[subject] = {
    subject, attempted: 0, solved: 0, mockCorrect: 0, mockTotal: 0
  })
  Object.values(practice.attempts || {}).forEach(rec => {
    const r = row(subjectOf(rec.questionId) || 'Other')
    r.attempted++
    if (rec.solvedAt) r.solved++
  })
  mocks.forEach(m => {
    Object.entries(m.subjects || {}).forEach(([subject, s]) => {
      const r = row(subject)
      r.mockCorrect += Number(s.correct) || 0
      r.mockTotal += Number(s.total) || 0
    })
  })
  return Object.values(map).map(r => {
    const answers = r.attempted + r.mockTotal
    return { ...r, answers, accuracy: pct(r.solved + r.mockCorrect, answers) }
  }).sort((a, b) => b.answers - a.answers)
}

// One student's report. `streak` comes from the user record (refreshPracticeStats),
// so it matches what the student sees on their own dashboard.
export function studentReport({ user, joinedAt, practice, mocks, streak, subjectOf, testTitle, now = Date.now() }) {
  const today = dayKey(now, practice.timeZone || undefined)
  const summary = practiceSummary(practice, today)
  const subjects = subjectRows(practice, mocks, subjectOf)

  const lastAnswer = Math.max(0, ...Object.values(practice.attempts || {}).map(r => Number(r.answeredAt) || 0))
  const lastMock = Math.max(0, ...mocks.map(m => Number(m.submittedAt) || 0))
  const lastActive = Math.max(lastAnswer, lastMock) || null

  const mockRows = mocks
    .slice()
    .sort((a, b) => b.submittedAt - a.submittedAt)
    .map(m => ({
      testId: m.testId,
      title: testTitle(m.testId),
      submittedAt: m.submittedAt,
      timeTaken: m.timeTaken,
      score: m.score,
      maxScore: m.maxScore,
      percent: pct(Math.max(0, m.score), m.maxScore),
      correct: m.correct,
      incorrect: m.incorrect,
      unanswered: m.unanswered
    }))

  const days = practice.days || {}
  const activity = lastDays(today, ACTIVITY_DAYS).map(date => ({
    date,
    attempts: days[date]?.attempts || 0,
    correct: days[date]?.correct || 0
  }))

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    targetYear: user.targetYear || null,
    signedUpAt: user.createdAt || null,
    joinedAt,
    lastActive,
    solved: summary.solved,
    attempted: summary.attempted,
    totalAnswers: summary.totalAnswers,
    accuracy: summary.accuracy,
    practiceSec: summary.practiceSec,
    streak: streak || 0,
    longestStreak: summary.longestStreak,
    activeDays: summary.activeDays,
    answersLast7: activity.slice(-7).reduce((s, d) => s + d.attempts, 0),
    mockCount: mockRows.length,
    avgMockPercent: avg(mockRows.map(m => m.percent)),
    bestMockPercent: mockRows.length ? Math.max(...mockRows.map(m => m.percent ?? 0)) : null,
    mocks: mockRows,
    subjects,
    weakestSubjects: weakestFirst(subjects, MIN_STUDENT_ANSWERS).slice(0, 3).map(s => s.subject),
    activity
  }
}

// Whole-batch numbers for the top of the dashboard
export function batchSummary(students, now = Date.now()) {
  const activeSince = now - 7 * DAY_MS

  const subjectMap = {}
  students.forEach(s => s.subjects.forEach(r => {
    const t = subjectMap[r.subject] || (subjectMap[r.subject] = { subject: r.subject, answers: 0, right: 0, students: 0 })
    t.answers += r.answers
    t.right += r.solved + r.mockCorrect
    t.students++
  }))
  const subjects = Object.values(subjectMap)
    .map(t => ({ subject: t.subject, answers: t.answers, students: t.students, accuracy: pct(t.right, t.answers) }))
    .sort((a, b) => b.answers - a.answers)

  const testMap = {}
  students.forEach(s => s.mocks.forEach(m => {
    const t = testMap[m.testId] || (testMap[m.testId] = { testId: m.testId, title: m.title, percents: [], lastAt: 0 })
    t.percents.push(m.percent ?? 0)
    t.lastAt = Math.max(t.lastAt, m.submittedAt || 0)
  }))
  const tests = Object.values(testMap)
    .map(t => ({ testId: t.testId, title: t.title, attempts: t.percents.length, avgPercent: avg(t.percents), bestPercent: Math.max(...t.percents), lastAt: t.lastAt }))
    .sort((a, b) => b.lastAt - a.lastAt)

  // Batch activity by date (each student's own calendar days)
  const dates = students[0]?.activity.map(d => d.date) || lastDays(dayKey(now), ACTIVITY_DAYS)
  const activity = dates.map((date, i) => {
    let attempts = 0
    let active = 0
    students.forEach(s => {
      const n = s.activity[i]?.attempts || 0
      attempts += n
      if (n > 0) active++
    })
    return { date, attempts, activeStudents: active }
  })

  return {
    students: students.length,
    activeLast7: students.filter(s => s.lastActive && s.lastActive >= activeSince).length,
    totalSolved: students.reduce((n, s) => n + s.solved, 0),
    avgSolved: avg(students.map(s => s.solved)),
    avgAccuracy: avg(students.map(s => s.accuracy)),
    avgStreak: avg(students.map(s => s.streak)),
    mockAttempts: students.reduce((n, s) => n + s.mockCount, 0),
    avgMockPercent: avg(students.map(s => s.avgMockPercent)),
    subjects,
    weakestSubjects: weakestFirst(subjects, MIN_BATCH_ANSWERS).slice(0, 3),
    tests,
    activity
  }
}
