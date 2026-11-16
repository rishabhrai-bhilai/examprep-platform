// Automatic evaluation of a coaching test: every response is checked against the
// answer key and scored with the test's marking scheme. Results are never stored
// scored: they are evaluated on every read, so changing a key or dropping a
// question (marks to all) re-scores everyone at once.
import { isAnswerCorrect } from '../../shared/answers.js'

const round2 = (n) => Math.round(n * 100) / 100
const answered = (a) => a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0)

// The key a test uses for one question: the question's own key, unless the test
// overrides it (a corrected key) or awards it to everyone (bonus)
export function keyedQuestion(test, q) {
  if (!q) return q
  const bonus = (test.bonusIds || []).includes(q.id)
  const override = test.keyOverrides?.[q.id]
  return {
    ...q,
    answer: override !== undefined ? override : q.answer,
    answerAlternatives: override !== undefined ? [] : q.answerAlternatives,
    marksToAll: bonus || q.marksToAll
  }
}

// The penalty for a wrong answer: the question's own negative marks, or GATE's
// 1/3 for MCQs; none for MSQ/NAT, or when the test turns negative marking off
export function penaltyFor(test, q) {
  if (test.negativeMarking === false) return 0
  if ((q.type || 'MCQ') !== 'MCQ') return 0
  return typeof q.negativeMarks === 'number' ? q.negativeMarks : (q.marks || 1) / 3
}

// raw: { studentId, testId, submittedAt, timeTaken, responses: { [qid]: { answer, timeSec } } }
export function evaluateResult(test, questionById, raw) {
  const out = {
    ...raw, score: 0, maxScore: 0, correct: 0, incorrect: 0, unanswered: 0, subjects: {}, responses: {}
  }
  for (const qid of test.questionIds) {
    const q = keyedQuestion(test, questionById.get(qid))
    if (!q) continue
    const marks = q.marks || 1
    const s = out.subjects[q.subject] || (out.subjects[q.subject] = { total: 0, correct: 0, incorrect: 0, score: 0, maxScore: 0 })
    out.maxScore += marks
    s.maxScore += marks
    s.total++
    const r = raw.responses?.[qid]
    let correct = null
    let gained = 0
    if (q.marksToAll) {
      correct = true
      gained = marks
    } else if (!answered(r?.answer)) {
      out.unanswered++
    } else if (isAnswerCorrect(q, r.answer)) {
      correct = true
      gained = marks
    } else {
      correct = false
      gained = -penaltyFor(test, q)
    }
    if (correct === true) { out.correct++; s.correct++ }
    if (correct === false) { out.incorrect++; s.incorrect++ }
    out.score += gained
    s.score += gained
    out.responses[qid] = { answer: r?.answer ?? null, timeSec: r?.timeSec || 0, correct, marks: round2(gained) }
  }
  out.score = round2(out.score)
  Object.values(out.subjects).forEach(s => { s.score = round2(s.score) })
  out.percent = out.maxScore ? Math.round((out.score / out.maxScore) * 1000) / 10 : 0
  return out
}
