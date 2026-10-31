import { isAnswerCorrect } from './answers.js'

// Rules shared by the app and the server for timed tests (mock tests, PYQ tests).

// A test finished in under a minute is not a real attempt: it isn't saved, doesn't
// count toward any analytics, and the test can simply be taken again.
export const MIN_VALID_SECONDS = 60
export const isValidAttempt = (timeTakenSec) => Number(timeTakenSec) >= MIN_VALID_SECONDS

export const isAnswered = (a) =>
  a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0)

const round2 = (n) => Math.round(n * 100) / 100

// GATE marking: a wrong MCQ loses a third of its marks; MSQ and NAT have no penalty.
// Returns totals plus a per-subject breakdown.
export function scoreAnswers(questions, answers) {
  const result = { correct: 0, incorrect: 0, unanswered: 0, score: 0, maxScore: 0, subjects: {} }
  for (const q of questions) {
    const marks = q.marks || 1
    const subject = q.subject || 'General Aptitude'
    const s = result.subjects[subject] || (result.subjects[subject] = { total: 0, correct: 0, incorrect: 0, score: 0, maxScore: 0 })
    result.maxScore += marks
    s.maxScore += marks
    s.total++
    const answer = answers?.[q.id]
    if (!isAnswered(answer)) {
      result.unanswered++
    } else if (isAnswerCorrect(q, answer)) {
      result.correct++
      s.correct++
      result.score += marks
      s.score += marks
    } else {
      result.incorrect++
      s.incorrect++
      const penalty = (q.type || 'MCQ') === 'MCQ' ? marks / 3 : 0
      result.score -= penalty
      s.score -= penalty
    }
  }
  result.score = round2(result.score)
  for (const s of Object.values(result.subjects)) s.score = round2(s.score)
  return result
}

const pct = (score, max) => (max > 0 ? (score / max) * 100 : 0)

// How one attempt compares with everyone's first attempts at the same test.
// `mine` and each of `everyone` are { score, maxScore, subjects }; `everyone` includes mine.
// Rank: 1 + people who scored higher (ties share a rank).
// Percentile: share of the other participants you scored above (ties count half),
// so the top score is 100 and the only participant is 100.
export function compareAttempt(mine, everyone) {
  const scores = everyone.map((a) => a.score)
  const n = scores.length
  const higher = scores.filter((s) => s > mine.score).length
  const lower = scores.filter((s) => s < mine.score).length
  const tiedOthers = n - higher - lower - 1
  const percentile = n > 1 ? ((lower + tiedOthers / 2) / (n - 1)) * 100 : 100

  // Score spread in tenths of the maximum (0-10%, 10-20%, ... 90-100%)
  const buckets = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: (i + 1) * 10, count: 0 }))
  for (const a of everyone) {
    const p = Math.max(0, Math.min(99.999, pct(a.score, a.maxScore)))
    buckets[Math.floor(p / 10)].count++
  }

  // Your percentage in each subject next to the participants' average percentage
  const subjects = Object.entries(mine.subjects || {}).map(([name, s]) => {
    const others = everyone.map((a) => a.subjects?.[name]).filter(Boolean)
    const avg = others.length ? others.reduce((sum, o) => sum + pct(o.score, o.maxScore), 0) / others.length : 0
    return { name, yourPercent: round2(pct(s.score, s.maxScore)), averagePercent: round2(avg) }
  })

  return {
    participants: n,
    rank: higher + 1,
    percentile: round2(percentile),
    yourScore: mine.score,
    maxScore: mine.maxScore,
    averageScore: round2(scores.reduce((a, b) => a + b, 0) / (n || 1)),
    highestScore: n ? Math.max(...scores) : mine.score,
    distribution: buckets,
    yourBucket: Math.floor(Math.max(0, Math.min(99.999, pct(mine.score, mine.maxScore))) / 10),
    subjects
  }
}
