// Dashboard / profile numbers built from the practice record (shared/practice.js)
// and the question bank.
import { practiceSummary } from '../../shared/practice.js'
import { compareSubjects } from './subjects'
import { getTags } from './topics'

export { practiceSummary }

// [{ subject, total, attempted, solved }] for every subject in the bank, syllabus order
export const subjectProgress = (practice, questions) => {
  const map = {}
  questions.forEach(q => {
    const row = map[q.subject] || (map[q.subject] = { subject: q.subject, total: 0, attempted: 0, solved: 0 })
    row.total++
    const rec = practice.attempts[q.id]
    if (rec) row.attempted++
    if (rec?.solvedAt) row.solved++
  })
  return Object.values(map).sort((a, b) => compareSubjects(a.subject, b.subject))
}

// [{ subject, topic, total, attempted, solved, correctLatest }] for topics the user
// has tried. A question counts toward each of its tags.
export const topicProgress = (practice, questions) => {
  const map = {}
  questions.forEach(q => {
    getTags(q).forEach(({ subject, topic }) => {
      const key = `${subject}::${topic}`
      const row = map[key] || (map[key] = { subject, topic, total: 0, attempted: 0, solved: 0 })
      row.total++
      const rec = practice.attempts[q.id]
      if (rec) row.attempted++
      if (rec?.solvedAt) row.solved++
    })
  })
  return Object.values(map).filter(r => r.attempted > 0)
}

// Topics with unsolved attempts, smallest share solved first
export const weakestTopics = (topics, limit = 5) =>
  topics
    .filter(t => t.solved < t.attempted)
    .sort((a, b) => (a.solved / a.attempted) - (b.solved / b.attempted) || b.attempted - a.attempted)
    .slice(0, limit)

// Latest answers and finished mock tests, newest first:
// [{ kind: 'question' | 'mock', time, title, detail, correct? }]
export const recentActivity = (practice, questions, mockHistory = [], limit = 6) => {
  const byId = new Map(questions.map(q => [q.id, q]))
  const answers = Object.values(practice.attempts)
    .sort((a, b) => b.answeredAt - a.answeredAt)
    .slice(0, limit)
    .map(rec => {
      const q = byId.get(rec.questionId)
      const topic = q ? getTags(q)[0]?.topic : null
      return {
        kind: 'question',
        time: rec.answeredAt,
        correct: rec.correct,
        title: `${rec.correct ? 'Solved' : 'Attempted'} ${topic || 'a question'}${q?.year ? ` (GATE ${q.year})` : ''}`,
        detail: [q?.subject, rec.attempts > 1 ? `${rec.attempts} attempts` : null].filter(Boolean).join(' • ')
      }
    })
  const mocks = mockHistory
    .filter(m => Number(m.timestamp) > 0)
    .map(m => ({
      kind: 'mock',
      time: Number(m.timestamp),
      title: `Finished ${m.displayName || m.testTitle || 'a mock test'}`,
      detail: `Score ${m.score}/${m.maxScore} • ${m.correct}/${m.questionsCount} correct`
    }))
  return [...answers, ...mocks].sort((a, b) => b.time - a.time).slice(0, limit)
}

export const formatDuration = (sec) => {
  if (!sec) return '0 min'
  if (sec < 60) return '< 1 min'
  if (sec < 3600) return `${Math.round(sec / 60)} min`
  const hrs = sec / 3600
  return `${hrs < 10 ? hrs.toFixed(1) : Math.round(hrs)} hrs`
}

export const timeAgo = (time, now = Date.now()) => {
  const sec = Math.max(0, Math.round((now - time) / 1000))
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hrs = Math.round(min / 60)
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
