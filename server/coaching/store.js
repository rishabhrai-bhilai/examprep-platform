// Where a coaching centre's workspace comes from. This is the one switch between
// demo and real data:
//   - the demo centre (id "demo"): generated in memory by demoData.js, never stored
//   - a real centre: its document in coachingDb, its members from instituteDb,
//     and their real practice answers and mock tests
// Both produce the same workspace, so every route and page works on either.
//
// Workspace: {
//   centre: { id, name, code, demo }, now,
//   batches, faculty, students: [{ id, name, email, batchId, joinedAt }],
//   questions (the centre's own), questionById (own + PYQ library),
//   tests (centre tests + platform mocks members took), results (scored),
//   answers: [{ studentId, qid, subject, chapter, correct, timeSec, at, testId? }],
//   assignments, submissions, notices, syllabus, plus lookup maps
// }
import { coachingDb, userDb, attemptDb, mockAttemptDb } from '../db/index.js'
import { generateDemo, DEMO_ID } from './demoData.js'
import { evaluateResult } from './evaluate.js'
import { chapterOf } from './syllabus.js'

export { DEMO_ID }
export const DEMO_NAME = 'Demo Coaching Centre'
// COACHING_DEMO=0 hides the demo centre (it is on by default so it can be shown)
export const demoEnabled = () => process.env.COACHING_DEMO !== '0'

export const emptyDoc = () => ({
  batches: [], faculty: [], questions: [], tests: [], assignments: [], submissions: [], notices: [],
  syllabus: {}, batchOf: {}, rawResults: []
})

let library = []
let libraryById = new Map()
export function setLibrary(questions) {
  library = questions.map(q => {
    const { subject, chapter } = chapterOf(q)
    return { ...q, subject: q.subject || subject, chapter: subject === q.subject ? chapter : 'Other', source: 'pyq' }
  })
  libraryById = new Map(library.map(q => [q.id, q]))
}
export const getLibrary = () => library

// --- Demo ---
let demo = null
let demoVersion = 0
const demoState = () => {
  if (!demo) demo = generateDemo(library)
  return demo
}
export function resetDemo() {
  demo = generateDemo(library)
  demoVersion++
}

// The centre's editable document (a copy for real centres; edit, then saveDoc)
export function getDoc(centre) {
  if (centre.demo) return demoState().doc
  return { ...emptyDoc(), ...(coachingDb.get(centre.id) || {}) }
}
export function saveDoc(centre, doc) {
  if (centre.demo) {
    demoState().doc = doc
    demoVersion++
    return
  }
  coachingDb.put(centre.id, doc)
}

let cached = { version: -1, at: 0, ws: null }

export function workspace(centre, { testTitle } = {}) {
  const now = Date.now()
  if (centre.demo && cached.version === demoVersion && now - cached.at < 60000) return cached.ws
  const doc = getDoc(centre)
  const ws = centre.demo ? demoWorkspace(centre, doc, now) : realWorkspace(centre, doc, now, testTitle)
  index(ws)
  if (centre.demo) cached = { version: demoVersion, at: now, ws }
  return ws
}

const ownQuestions = (doc) => (doc.questions || []).map(q => ({ ...q, source: 'centre', chapter: q.chapter || chapterOf(q).chapter }))

function questionMap(doc) {
  const map = new Map(libraryById)
  ownQuestions(doc).forEach(q => map.set(q.id, q))
  return map
}

function scoredResults(doc, questionById) {
  const tests = new Map((doc.tests || []).map(t => [t.id, t]))
  return (doc.rawResults || []).map(raw => {
    const t = tests.get(raw.testId)
    return t ? evaluateResult(t, questionById, raw) : null
  }).filter(Boolean)
}

const testAnswers = (results, questionById) => results.flatMap(r => Object.entries(r.responses || {})
  .filter(([, v]) => v.answer !== null && v.correct !== null)
  .map(([qid, v]) => {
    const q = questionById.get(isNaN(qid) ? qid : Number(qid)) || questionById.get(qid)
    return { studentId: r.studentId, qid, subject: q?.subject, chapter: q?.chapter || 'Other', correct: v.correct, timeSec: v.timeSec, at: r.submittedAt, testId: r.testId }
  }))

function base(centre, doc, now) {
  return {
    centre: { id: centre.id, name: centre.name, code: centre.code || null, demo: Boolean(centre.demo) },
    now,
    batches: doc.batches || [],
    faculty: doc.faculty || [],
    questions: ownQuestions(doc),
    assignments: doc.assignments || [],
    submissions: doc.submissions || [],
    notices: doc.notices || [],
    syllabus: doc.syllabus || {}
  }
}

function demoWorkspace(centre, doc, now) {
  const state = demoState()
  const questionById = questionMap(doc)
  const results = scoredResults(doc, questionById)
  const batchIds = new Set((doc.batches || []).map(b => b.id))
  const students = state.students.concat(doc.extraStudents || []).map(s => ({
    ...s, batchId: batchIds.has(doc.batchOf?.[s.id]) ? doc.batchOf[s.id] : null
  }))
  return {
    ...base(centre, doc, now),
    students,
    questionById,
    tests: doc.tests || [],
    results,
    answers: state.practice.concat(testAnswers(results, questionById))
  }
}

function realWorkspace(centre, doc, now, testTitle) {
  const questionById = questionMap(doc)
  const batchIds = new Set((doc.batches || []).map(b => b.id))
  const students = (centre.members || []).map(m => {
    const u = userDb.findById(m.userId)
    if (!u) return null
    const batchId = doc.batchOf?.[u.id]
    return { id: u.id, name: u.name || u.email, email: u.email, batchId: batchIds.has(batchId) ? batchId : null, joinedAt: m.joinedAt }
  }).filter(Boolean)
  const ids = new Set(students.map(s => s.id))

  // Centre tests students took (on the student site, once that is wired up)
  const results = scoredResults(doc, questionById).filter(r => ids.has(r.studentId))
  // Platform mock tests members took (real, already scored)
  const platformTests = new Map()
  mockAttemptDb.getAll().filter(a => ids.has(a.userId) && a.attemptNo === 1).forEach(a => {
    if (!platformTests.has(a.testId)) platformTests.set(a.testId, { id: a.testId, title: testTitle ? testTitle(a.testId) : a.testId, kind: 'platform', questionIds: [], batchIds: [], published: true, scheduledAt: a.submittedAt })
    const t = platformTests.get(a.testId)
    t.scheduledAt = Math.min(t.scheduledAt, a.submittedAt)
    results.push({
      id: a.id, studentId: a.userId, testId: a.testId, submittedAt: a.submittedAt, timeTaken: a.timeTaken,
      score: a.score, maxScore: a.maxScore, correct: a.correct, incorrect: a.incorrect, unanswered: a.unanswered,
      subjects: a.subjects || {}, percent: a.maxScore ? Math.round((a.score / a.maxScore) * 1000) / 10 : 0
    })
  })

  // Real practice answers (latest answer per question)
  const practice = []
  const all = attemptDb.getAll()
  students.forEach(s => Object.values(all[s.id]?.attempts || {}).forEach(a => {
    const q = libraryById.get(Number(a.questionId)) || libraryById.get(a.questionId)
    if (!q) return
    practice.push({
      studentId: s.id, qid: q.id, subject: q.subject, chapter: q.chapter, correct: Boolean(a.correct),
      timeSec: Math.round((a.totalTimeSec || a.timeSpentSec || 0) / Math.max(1, a.attempts || 1)), at: Number(a.answeredAt) || 0
    })
  }))

  return {
    ...base(centre, doc, now),
    students,
    questionById,
    tests: (doc.tests || []).concat([...platformTests.values()]),
    results,
    answers: practice.concat(testAnswers(results.filter(r => r.responses), questionById))
  }
}

function index(ws) {
  ws.studentById = new Map(ws.students.map(s => [s.id, s]))
  ws.batchById = new Map(ws.batches.map(b => [b.id, b]))
  ws.testById = new Map(ws.tests.map(t => [t.id, t]))
  ws.answersByStudent = new Map()
  ws.answers.forEach(a => {
    if (!ws.answersByStudent.has(a.studentId)) ws.answersByStudent.set(a.studentId, [])
    ws.answersByStudent.get(a.studentId).push(a)
  })
  ws.resultsByStudent = new Map()
  ws.results.forEach(r => {
    if (!ws.resultsByStudent.has(r.studentId)) ws.resultsByStudent.set(r.studentId, [])
    ws.resultsByStudent.get(r.studentId).push(r)
  })
}
