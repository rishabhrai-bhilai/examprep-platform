// Everything the coaching admin app shows, computed from one workspace (see
// store.js for its shape). The same code serves the demo centre and real
// centres: only the workspace they're computed from differs.
import { SYLLABUS, CHAPTER_COUNT, chapterKey } from './syllabus.js'

export const TZ = 'Asia/Kolkata'
const DAY_MS = 24 * 3600 * 1000
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null)
const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null)
const round1 = (n) => (n === null || n === undefined ? null : Math.round(n * 10) / 10)
// India has one fixed offset (UTC+5:30, no daylight saving), so days and hours
// are plain arithmetic: much faster than Intl over tens of thousands of answers
const IST_MS = 5.5 * 3600 * 1000
const day = (t) => new Date(Number(t) + IST_MS).toISOString().slice(0, 10)
const hourOf = (t) => Math.floor(((Number(t) + IST_MS) % DAY_MS) / 3600000)

export function lastDays(n, now) {
  const [y, m, d] = day(now).split('-').map(Number)
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(y, m - 1, d - (n - 1 - i))).toISOString().slice(0, 10))
}

// --- Scoping ---
export const studentsOf = (ws, { batchId } = {}) => (batchId ? ws.students.filter(s => s.batchId === batchId) : ws.students)
const idSet = (list) => new Set(list.map(s => s.id))
const answersOf = (ws, ids) => ws.answers.filter(a => ids.has(a.studentId))
const resultsOf = (ws, ids) => ws.results.filter(r => ids.has(r.studentId))

export function testStatus(test, now) {
  if (test.kind === 'platform') return 'completed'
  if (!test.published) return 'draft'
  const start = test.scheduledAt || 0
  const end = start + (test.durationMin || 0) * 60000
  const closes = test.windowEndsAt || end
  if (now < start) return 'scheduled'
  if (now < closes) return 'live'
  return 'completed'
}

// --- Accuracy by subject and chapter ---
function accuracyRows(answers) {
  const subjects = new Map()
  answers.forEach(a => {
    const s = subjects.get(a.subject) || subjects.set(a.subject, { subject: a.subject, answers: 0, correct: 0, time: 0, chapters: new Map() }).get(a.subject)
    s.answers++
    if (a.correct) s.correct++
    s.time += a.timeSec || 0
    const c = s.chapters.get(a.chapter) || s.chapters.set(a.chapter, { chapter: a.chapter, answers: 0, correct: 0, time: 0, students: new Set() }).get(a.chapter)
    c.answers++
    if (a.correct) c.correct++
    c.time += a.timeSec || 0
    c.students.add(a.studentId)
  })
  return [...subjects.values()].map(s => ({
    subject: s.subject,
    answers: s.answers,
    accuracy: pct(s.correct, s.answers),
    avgTimeSec: Math.round(s.time / Math.max(1, s.answers)),
    chapters: [...s.chapters.values()].map(c => ({
      chapter: c.chapter, answers: c.answers, accuracy: pct(c.correct, c.answers),
      avgTimeSec: Math.round(c.time / Math.max(1, c.answers)), students: c.students.size
    })).sort((a, b) => b.answers - a.answers)
  })).sort((a, b) => b.answers - a.answers)
}

export function subjectAnalytics(ws, { batchId, studentId } = {}) {
  const ids = studentId ? new Set([studentId]) : idSet(studentsOf(ws, { batchId }))
  const answers = answersOf(ws, ids)
  const rows = accuracyRows(answers)
  // Test marks per subject (score share), next to practice accuracy
  const testMarks = {}
  resultsOf(ws, ids).forEach(r => Object.entries(r.subjects || {}).forEach(([s, v]) => {
    const t = testMarks[s] || (testMarks[s] = { score: 0, max: 0 })
    t.score += v.score || 0
    t.max += v.maxScore || 0
  }))
  rows.forEach(r => { r.testScorePct = testMarks[r.subject] ? pct(testMarks[r.subject].score, testMarks[r.subject].max) : null })
  return { subjects: rows, totalAnswers: answers.length, accuracy: pct(answers.filter(a => a.correct).length, answers.length) }
}

// --- Per-student summary rows ---
export function studentRows(ws, { batchId } = {}) {
  const now = ws.now
  const list = studentsOf(ws, { batchId })
  const since7 = now - 7 * DAY_MS
  const centreTests = ws.tests.filter(t => t.kind !== 'platform')
  const rows = list.map(s => {
    const answers = ws.answersByStudent.get(s.id) || []
    const results = ws.resultsByStudent.get(s.id) || []
    const last = Math.max(0, ...answers.map(a => a.at), ...results.map(r => r.submittedAt)) || null
    const activeDays = new Set([...answers, ...results.map(r => ({ at: r.submittedAt }))].filter(a => a.at >= since7).map(a => day(a.at))).size
    const dueAssignments = ws.assignments.filter(a => (!a.batchIds?.length || a.batchIds.includes(s.batchId)) && a.dueAt <= now)
    const done = dueAssignments.filter(a => ws.submissions.some(x => x.assignmentId === a.id && x.studentId === s.id)).length
    const assigned = centreTests.filter(t => testStatus(t, now) === 'completed' && (!t.batchIds?.length || t.batchIds.includes(s.batchId)))
    return {
      id: s.id, name: s.name, email: s.email, batchId: s.batchId || null,
      batch: ws.batchById.get(s.batchId)?.name || null,
      joinedAt: s.joinedAt || null,
      testsTaken: results.length,
      testsMissed: assigned.filter(t => !results.some(r => r.testId === t.id)).length,
      avgPercent: round1(avg(results.map(r => r.percent))),
      lastPercent: results.length ? results.slice().sort((a, b) => b.submittedAt - a.submittedAt)[0].percent : null,
      answers: answers.length,
      accuracy: pct(answers.filter(a => a.correct).length, answers.length),
      minutes: Math.round(answers.reduce((n, a) => n + (a.timeSec || 0), 0) / 60),
      lastActive: last,
      activeDays7: activeDays,
      assignmentsDone: done,
      assignmentsDue: dueAssignments.length
    }
  })
  // Rank by average test percentage (students with no tests go last)
  rows.slice().sort((a, b) => (b.avgPercent ?? -1) - (a.avgPercent ?? -1)).forEach((r, i) => { r.rank = r.avgPercent === null ? null : i + 1 })
  return rows
}

export const activityStatus = (lastActive, now) => {
  if (!lastActive) return 'never'
  const d = (now - lastActive) / DAY_MS
  return d <= 2 ? 'active' : d <= 7 ? 'slowing' : 'inactive'
}

// --- Leaderboard ---
export function leaderboard(ws, { batchId, testId } = {}) {
  const ids = idSet(studentsOf(ws, { batchId }))
  const name = (id) => ws.studentById.get(id)?.name || 'Student'
  const batchName = (id) => ws.batchById.get(ws.studentById.get(id)?.batchId)?.name || null
  if (testId) {
    const test = ws.testById.get(testId)
    const results = ws.results.filter(r => r.testId === testId && ids.has(r.studentId)).sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken)
    const n = results.length
    return {
      test: test ? { id: test.id, title: test.title } : null,
      rows: results.map((r, i) => ({
        rank: 1 + results.filter(x => x.score > r.score).length,
        studentId: r.studentId, name: name(r.studentId), batch: batchName(r.studentId),
        score: r.score, maxScore: r.maxScore, percent: r.percent,
        percentile: n > 1 ? round1(((n - 1 - i) / (n - 1)) * 100) : 100,
        correct: r.correct, incorrect: r.incorrect, timeTaken: r.timeTaken
      }))
    }
  }
  const byStudent = new Map()
  ws.results.filter(r => ids.has(r.studentId)).forEach(r => {
    if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, [])
    byStudent.get(r.studentId).push(r)
  })
  const rows = [...byStudent.entries()].map(([sid, list]) => {
    const sorted = list.slice().sort((a, b) => a.submittedAt - b.submittedAt)
    const half = Math.max(1, Math.floor(sorted.length / 2))
    const early = avg(sorted.slice(0, half).map(r => r.percent))
    const late = avg(sorted.slice(-half).map(r => r.percent))
    return {
      studentId: sid, name: name(sid), batch: batchName(sid), tests: list.length,
      avgPercent: round1(avg(list.map(r => r.percent))),
      best: Math.max(...list.map(r => r.percent)),
      improvement: sorted.length >= 2 ? round1(late - early) : null
    }
  }).sort((a, b) => b.avgPercent - a.avgPercent)
  rows.forEach(r => { r.rank = 1 + rows.filter(x => x.avgPercent > r.avgPercent).length })
  const improvers = rows.filter(r => r.improvement !== null).slice().sort((a, b) => b.improvement - a.improvement).slice(0, 5)
  return { test: null, rows, improvers }
}

// --- Question-level analytics for one test ---
export function questionAnalytics(ws, testId) {
  const test = ws.testById.get(testId)
  if (!test || !test.questionIds?.length) return []
  const results = ws.results.filter(r => r.testId === testId && r.responses)
  if (!results.length) return test.questionIds.map((qid, i) => questionMeta(ws, test, qid, i))
  // Upper and lower 27% by total score, for the discrimination index
  const sorted = results.slice().sort((a, b) => b.score - a.score)
  const k = Math.max(1, Math.round(sorted.length * 0.27))
  const top = sorted.slice(0, k)
  const bottom = sorted.slice(-k)
  const rate = (group, qid) => group.filter(r => r.responses[qid]?.correct === true).length / group.length
  return test.questionIds.map((qid, i) => {
    const meta = questionMeta(ws, test, qid, i)
    const rs = results.map(r => r.responses[qid]).filter(Boolean)
    const attempted = rs.filter(r => r.answer !== null)
    const right = rs.filter(r => r.correct === true)
    const options = meta.options ? meta.options.map(() => 0) : null
    if (options) attempted.forEach(r => [].concat(r.answer).forEach(o => { if (options[o] !== undefined) options[o]++ }))
    const discrimination = Math.round((rate(top, qid) - rate(bottom, qid)) * 100) / 100
    const correctPct = pct(right.length, rs.length)
    const keyed = [].concat(meta.answer)
    const topWrong = options
      ? options.map((n, o) => ({ o, n })).filter(x => !keyed.includes(x.o)).sort((a, b) => b.n - a.n)[0]
      : null
    // The top group's most common answer: when most of them agree on something
    // other than the key, the key is probably wrong
    const topPicks = new Map()
    top.forEach(r => {
      const a = r.responses[qid]?.answer
      if (a !== null && a !== undefined) topPicks.set(JSON.stringify(a), (topPicks.get(JSON.stringify(a)) || 0) + 1)
    })
    const [topAnswer, topCount] = [...topPicks.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0]
    const topDisagrees = topAnswer !== null && topCount / top.length >= 0.5 && !meta.bonus &&
      (meta.type === 'NAT' ? false : JSON.stringify([].concat(JSON.parse(topAnswer)).sort()) !== JSON.stringify(keyed.slice().sort()))
    const flags = []
    if (topDisagrees) flags.push(`Possible key error: most top scorers answered ${[].concat(JSON.parse(topAnswer)).map(o => String.fromCharCode(65 + o)).join(', ')}`)
    else if (discrimination < -0.1) flags.push('Stronger students got it wrong more often')
    else if (discrimination < 0.15 && rs.length >= 10) flags.push('Weak discrimination')
    if (correctPct !== null && correctPct < 20) flags.push('Very hard')
    if (correctPct !== null && correctPct > 90) flags.push('Very easy')
    if (topWrong && options && topWrong.n > right.length && meta.type === 'MCQ') flags.push(`Most picked option ${String.fromCharCode(65 + topWrong.o)} instead of the key`)
    return {
      ...meta,
      responses: rs.length,
      attemptedPct: pct(attempted.length, rs.length),
      correctPct,
      avgTimeSec: Math.round(avg(attempted.map(r => r.timeSec || 0)) || 0),
      discrimination,
      optionCounts: options,
      topWrong: topWrong && topWrong.n ? String.fromCharCode(65 + topWrong.o) : null,
      keySuspect: topDisagrees,
      flags
    }
  })
}

// Question text without Markdown code fences or LaTeX dollar signs, for one-line previews
export const plainText = (t) => String(t || '').replace(/```[a-z]*\n?/gi, ' ').replace(/\$\$?/g, '').replace(/\\(times|cdot|le|ge|neq|to|mid|in)\b/g, (m, w) => ({ times: '×', cdot: '·', le: '≤', ge: '≥', neq: '≠', to: '→', mid: '|', in: '∈' })[w]).replace(/\*\*?/g, '').replace(/\s+/g, ' ').trim()

function questionMeta(ws, test, qid, i) {
  const q = ws.questionById.get(qid) || {}
  const override = test.keyOverrides?.[qid]
  return {
    number: i + 1, id: qid, code: q.code || null, source: q.source || 'pyq',
    subject: q.subject, chapter: q.chapter, difficulty: q.difficulty, type: q.type || 'MCQ', marks: q.marks || 1,
    text: plainText(q.question).slice(0, 220),
    options: q.type === 'NAT' ? null : (q.options || []).map(o => String(o).slice(0, 80)),
    answer: override !== undefined ? override : q.answer,
    originalAnswer: q.answer,
    keyChanged: override !== undefined,
    bonus: (test.bonusIds || []).includes(qid)
  }
}

// --- Weakness detection ---
// A chapter is weak for a group when its accuracy is well under the group's
// overall accuracy (or under 45%) with enough answers to trust it.
export function weaknesses(ws, { batchId, studentId } = {}) {
  const ids = studentId ? new Set([studentId]) : idSet(studentsOf(ws, { batchId }))
  const answers = answersOf(ws, ids)
  const overall = pct(answers.filter(a => a.correct).length, answers.length) ?? 0
  const minAnswers = studentId ? 4 : 12
  const recentCut = ws.now - 14 * DAY_MS
  const chapters = new Map()
  answers.forEach(a => {
    const key = chapterKey(a.subject, a.chapter)
    const c = chapters.get(key) || chapters.set(key, { subject: a.subject, chapter: a.chapter, n: 0, ok: 0, rn: 0, rok: 0, students: new Map() }).get(key)
    c.n++; if (a.correct) c.ok++
    if (a.at >= recentCut) { c.rn++; if (a.correct) c.rok++ }
    const st = c.students.get(a.studentId) || c.students.set(a.studentId, { n: 0, ok: 0 }).get(a.studentId)
    st.n++; if (a.correct) st.ok++
  })
  const list = [...chapters.values()].filter(c => c.n >= minAnswers && c.chapter !== 'Other').map(c => {
    const accuracy = pct(c.ok, c.n)
    const before = c.n - c.rn
    const trend = c.rn >= 4 && before >= 4 ? round1(pct(c.rok, c.rn) - pct(c.ok - c.rok, before)) : null
    const struggling = [...c.students.entries()].filter(([, s]) => s.n >= 3 && s.ok / s.n < 0.4)
    return {
      subject: c.subject, chapter: c.chapter, answers: c.n, accuracy, gap: round1(overall - accuracy), trend,
      strugglingStudents: struggling.length,
      struggling: struggling.slice(0, 8).map(([id]) => ({ id, name: ws.studentById.get(id)?.name }))
    }
  })
  const weak = list.filter(c => c.accuracy < 45 || c.gap >= 12).sort((a, b) => b.gap * Math.log(b.answers) - a.gap * Math.log(a.answers))
  const strong = list.filter(c => c.accuracy >= 70 && c.gap <= -10).sort((a, b) => b.accuracy - a.accuracy).slice(0, 6)
  return { overallAccuracy: overall, weak, strong }
}

// --- Course completion ---
export function syllabusProgress(ws, { batchId } = {}) {
  const batches = batchId ? ws.batches.filter(b => b.id === batchId) : ws.batches
  const practiced = new Map() // chapterKey -> Set(studentId)
  const ids = idSet(studentsOf(ws, { batchId }))
  answersOf(ws, ids).forEach(a => {
    const key = chapterKey(a.subject, a.chapter)
    if (!practiced.has(key)) practiced.set(key, new Map())
    const m = practiced.get(key)
    m.set(a.studentId, (m.get(a.studentId) || 0) + 1)
  })
  const studentCount = Math.max(1, ids.size)
  const perBatch = batches.map(b => {
    const done = ws.syllabus?.[b.id] || {}
    const subjects = SYLLABUS.map(s => {
      const chapters = s.chapters.map(ch => {
        const entry = done[chapterKey(s.subject, ch)]
        const counts = practiced.get(chapterKey(s.subject, ch))
        const practicedBy = counts ? [...counts.values()].filter(n => n >= 3).length : 0
        return {
          chapter: ch, done: Boolean(entry), doneAt: entry?.doneAt || null,
          by: entry?.facultyId ? ws.faculty.find(f => f.id === entry.facultyId)?.name || null : null,
          practicedPct: pct(practicedBy, studentCount)
        }
      })
      const n = chapters.filter(c => c.done).length
      return { subject: s.subject, done: n, total: chapters.length, percent: pct(n, chapters.length), chapters }
    })
    const doneCount = subjects.reduce((n, s) => n + s.done, 0)
    return { batchId: b.id, batch: b.name, done: doneCount, total: CHAPTER_COUNT, percent: pct(doneCount, CHAPTER_COUNT), subjects }
  })
  return { batches: perBatch }
}

// --- Activity ---
export function activity(ws, { batchId, days = 30 } = {}) {
  const now = ws.now
  const list = studentsOf(ws, { batchId })
  const ids = idSet(list)
  const keys = lastDays(days, now)
  const index = new Map(keys.map((k, i) => [k, i]))
  const daily = keys.map(d => ({ date: d, active: new Set(), answers: 0, minutes: 0, tests: 0 }))
  const perStudent = new Map(list.map(s => [s.id, keys.map(() => 0)]))
  const hours = Array(24).fill(0)
  answersOf(ws, ids).forEach(a => {
    const i = index.get(day(a.at))
    hours[hourOf(a.at)]++
    if (i === undefined) return
    daily[i].active.add(a.studentId)
    daily[i].answers++
    daily[i].minutes += (a.timeSec || 0) / 60
    perStudent.get(a.studentId)[i] += (a.timeSec || 0) / 60
  })
  resultsOf(ws, ids).forEach(r => {
    const i = index.get(day(r.submittedAt))
    if (i === undefined) return
    daily[i].active.add(r.studentId)
    daily[i].tests++
    perStudent.get(r.studentId)[i] += (r.timeTaken || 0) / 60
  })
  const rows = studentRows(ws, { batchId })
  return {
    days: daily.map(d => ({ date: d.date, active: d.active.size, answers: d.answers, minutes: Math.round(d.minutes), tests: d.tests })),
    hours,
    students: rows.map(r => ({
      id: r.id, name: r.name, batch: r.batch, lastActive: r.lastActive, status: activityStatus(r.lastActive, now),
      activeDays7: r.activeDays7, minutes: perStudent.get(r.id).map(m => Math.round(m))
    })).sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0)),
    inactive: rows.filter(r => activityStatus(r.lastActive, now) !== 'active').length
  }
}

// --- Batch comparison ---
export function batchComparison(ws) {
  const now = ws.now
  const subjectsSeen = new Set()
  const batches = ws.batches.map(b => {
    const rows = studentRows(ws, { batchId: b.id })
    const ids = new Set(rows.map(r => r.id))
    const subj = subjectAnalytics(ws, { batchId: b.id })
    subj.subjects.forEach(s => subjectsSeen.add(s.subject))
    const syl = syllabusProgress(ws, { batchId: b.id }).batches[0]
    const due = rows.reduce((n, r) => n + r.assignmentsDue, 0)
    const done = rows.reduce((n, r) => n + r.assignmentsDone, 0)
    const minutes7 = answersOf(ws, ids).filter(a => a.at >= now - 7 * DAY_MS).reduce((n, a) => n + (a.timeSec || 0), 0) / 60
    return {
      id: b.id, name: b.name, students: rows.length,
      avgPercent: round1(avg(rows.filter(r => r.avgPercent !== null).map(r => r.avgPercent))),
      accuracy: subj.accuracy,
      activeRate: pct(rows.filter(r => activityStatus(r.lastActive, now) === 'active').length, rows.length),
      minutesPerStudent7: rows.length ? Math.round(minutes7 / rows.length) : 0,
      syllabusPercent: syl?.percent ?? null,
      assignmentRate: pct(done, due),
      subjects: Object.fromEntries(subj.subjects.map(s => [s.subject, s.accuracy]))
    }
  })
  // Tests more than one batch took: average % per batch
  const tests = ws.tests.filter(t => testStatus(t, now) === 'completed').map(t => {
    const perBatch = Object.fromEntries(ws.batches.map(b => {
      const rs = ws.results.filter(r => r.testId === t.id && ws.studentById.get(r.studentId)?.batchId === b.id)
      return [b.id, rs.length ? round1(avg(rs.map(r => r.percent))) : null]
    }))
    return { id: t.id, title: t.title, scheduledAt: t.scheduledAt || null, perBatch }
  }).filter(t => Object.values(t.perBatch).filter(v => v !== null).length >= 2)
  return { batches, subjects: [...subjectsSeen], tests }
}

// --- Test list with summary numbers ---
export function testSummaries(ws) {
  const now = ws.now
  return ws.tests.map(t => {
    const rs = ws.results.filter(r => r.testId === t.id)
    const eligible = ws.students.filter(s => !t.batchIds?.length || t.batchIds.includes(s.batchId)).length
    return {
      id: t.id, title: t.title, kind: t.kind || 'centre', status: testStatus(t, now),
      batchIds: t.batchIds || [], batches: (t.batchIds || []).map(id => ws.batchById.get(id)?.name).filter(Boolean),
      questionCount: t.questionIds?.length || null, durationMin: t.durationMin || null,
      scheduledAt: t.scheduledAt || null, windowEndsAt: t.windowEndsAt || null,
      negativeMarking: t.negativeMarking !== false, published: t.published !== false,
      createdBy: t.createdBy || null,
      attempts: rs.length, eligible,
      avgPercent: round1(avg(rs.map(r => r.percent))),
      topPercent: rs.length ? Math.max(...rs.map(r => r.percent)) : null,
      maxScore: rs[0]?.maxScore ?? null
    }
  }).sort((a, b) => (b.scheduledAt || 0) - (a.scheduledAt || 0))
}

// --- Assignments with submission numbers ---
export function assignmentSummaries(ws) {
  const now = ws.now
  return ws.assignments.map(a => {
    const eligible = ws.students.filter(s => !a.batchIds?.length || a.batchIds.includes(s.batchId))
    const subs = ws.submissions.filter(x => x.assignmentId === a.id)
    const graded = subs.filter(x => typeof x.marks === 'number')
    return {
      ...a,
      batches: (a.batchIds || []).map(id => ws.batchById.get(id)?.name).filter(Boolean),
      faculty: ws.faculty.find(f => f.id === a.facultyId)?.name || null,
      status: a.dueAt > now ? 'open' : 'closed',
      eligible: eligible.length,
      submitted: subs.length,
      late: subs.filter(x => x.submittedAt > a.dueAt).length,
      graded: graded.length,
      avgMarks: graded.length ? round1(avg(graded.map(x => x.marks))) : null,
      submissions: eligible.map(s => {
        const sub = subs.find(x => x.studentId === s.id)
        return {
          studentId: s.id, name: s.name, batch: ws.batchById.get(s.batchId)?.name || null,
          submittedAt: sub?.submittedAt || null, late: Boolean(sub && sub.submittedAt > a.dueAt),
          marks: typeof sub?.marks === 'number' ? sub.marks : null, feedback: sub?.feedback || ''
        }
      })
    }
  }).sort((a, b) => b.dueAt - a.dueAt)
}

// --- One student's report ---
export function studentReport(ws, studentId) {
  const s = ws.studentById.get(studentId)
  if (!s) return null
  const now = ws.now
  const batchRows = studentRows(ws, { batchId: s.batchId })
  const row = batchRows.find(r => r.id === studentId)
  const results = (ws.resultsByStudent.get(studentId) || []).slice().sort((a, b) => a.submittedAt - b.submittedAt)
  const tests = results.map(r => {
    const lb = leaderboard(ws, { batchId: s.batchId, testId: r.testId }).rows
    const mine = lb.find(x => x.studentId === studentId)
    const all = ws.results.filter(x => x.testId === r.testId)
    return {
      testId: r.testId, title: ws.testById.get(r.testId)?.title || r.testId, submittedAt: r.submittedAt,
      score: r.score, maxScore: r.maxScore, percent: r.percent, correct: r.correct, incorrect: r.incorrect,
      unanswered: r.unanswered, timeTaken: r.timeTaken,
      batchRank: mine?.rank ?? null, batchSize: lb.length, percentile: mine?.percentile ?? null,
      centreAvg: round1(avg(all.map(x => x.percent)))
    }
  })
  const act = activity(ws, { batchId: s.batchId, days: 30 })
  const minutes = act.students.find(x => x.id === studentId)?.minutes || []
  const syl = syllabusProgress(ws, { batchId: s.batchId }).batches[0] || null
  const assignments = assignmentSummaries(ws)
    .filter(a => !a.batchIds?.length || a.batchIds.includes(s.batchId))
    .map(a => {
      const sub = a.submissions.find(x => x.studentId === studentId)
      return { id: a.id, title: a.title, dueAt: a.dueAt, maxMarks: a.maxMarks, submittedAt: sub?.submittedAt || null, late: sub?.late || false, marks: sub?.marks ?? null, status: a.status }
    })
  const batchSubjects = subjectAnalytics(ws, { batchId: s.batchId }).subjects
  const subjects = subjectAnalytics(ws, { studentId }).subjects.map(r => ({
    ...r, batchAccuracy: batchSubjects.find(b => b.subject === r.subject)?.accuracy ?? null
  }))
  return {
    student: { id: s.id, name: s.name, email: s.email, batchId: s.batchId, batch: ws.batchById.get(s.batchId)?.name || null, joinedAt: s.joinedAt || null },
    summary: { ...row, batchSize: batchRows.length, status: activityStatus(row?.lastActive, now) },
    tests,
    subjects,
    weaknesses: weaknesses(ws, { studentId }),
    activity: { days: act.days.map((d, i) => ({ date: d.date, minutes: minutes[i] || 0 })) },
    syllabus: syl ? { percent: syl.percent, done: syl.done, total: syl.total } : null,
    assignments,
    generatedAt: now
  }
}

// --- Faculty dashboard ---
export function facultyDashboard(ws, facultyId) {
  const f = ws.faculty.find(x => x.id === facultyId)
  if (!f) return null
  const batches = ws.batches.filter(b => (f.batchIds || []).includes(b.id))
  const syl = syllabusProgress(ws).batches
  const classes = []
  batches.forEach(b => {
    const subj = subjectAnalytics(ws, { batchId: b.id }).subjects
    const weak = weaknesses(ws, { batchId: b.id }).weak
    ;(f.subjects || []).forEach(subject => {
      const row = subj.find(s => s.subject === subject)
      const sylRow = syl.find(x => x.batchId === b.id)?.subjects.find(s => s.subject === subject)
      classes.push({
        batchId: b.id, batch: b.name, subject,
        accuracy: row?.accuracy ?? null, answers: row?.answers || 0,
        chaptersDone: sylRow?.done || 0, chaptersTotal: sylRow?.total || 0,
        nextChapter: sylRow?.chapters.find(c => !c.done)?.chapter || null,
        weakChapters: weak.filter(w => w.subject === subject).slice(0, 3).map(w => ({ chapter: w.chapter, accuracy: w.accuracy, struggling: w.strugglingStudents }))
      })
    })
  })
  const assignments = assignmentSummaries(ws).filter(a => a.facultyId === f.id).map(a => ({
    id: a.id, title: a.title, dueAt: a.dueAt, batches: a.batches, eligible: a.eligible, submitted: a.submitted, graded: a.graded, avgMarks: a.avgMarks, maxMarks: a.maxMarks, status: a.status,
    toGrade: a.submitted - a.graded
  }))
  // Students below 40% in this faculty's subjects
  const attention = []
  batches.forEach(b => studentsOf(ws, { batchId: b.id }).forEach(s => {
    const answers = (ws.answersByStudent.get(s.id) || []).filter(a => (f.subjects || []).includes(a.subject))
    if (answers.length < 8) return
    const acc = pct(answers.filter(a => a.correct).length, answers.length)
    if (acc < 40) attention.push({ id: s.id, name: s.name, batch: b.name, accuracy: acc, answers: answers.length })
  }))
  const tests = testSummaries(ws).filter(t => t.kind !== 'platform' && (t.createdBy === f.id || t.batchIds.some(id => (f.batchIds || []).includes(id)))).slice(0, 8)
  return {
    faculty: { ...f, batches: batches.map(b => b.name) },
    classes,
    assignments,
    attention: attention.sort((a, b) => a.accuracy - b.accuracy).slice(0, 15),
    tests,
    insights: insights(ws, { facultyId }).slice(0, 6)
  }
}

// --- Automated insights ---
// Rule-based for now: each rule reads the numbers above and writes a sentence.
// MODEL HOOK: to use a language model later, pass the same inputs (the rows from
// studentRows, weaknesses, questionAnalytics, assignmentSummaries) to the model
// in server/coaching/routes.js (GET .../insights) and return its items in this
// same shape, keeping these rules as the fallback when the call fails.
export function insights(ws, { batchId, studentId, facultyId } = {}) {
  const now = ws.now
  const out = []
  const push = (item) => out.push({ id: `${item.kind}-${out.length}`, ...item })
  const faculty = facultyId ? ws.faculty.find(f => f.id === facultyId) : null
  const scopeBatch = faculty ? null : batchId
  const inScope = (sid) => {
    const st = ws.studentById.get(sid)
    if (!st) return false
    if (faculty) return (faculty.batchIds || []).includes(st.batchId)
    return !scopeBatch || st.batchId === scopeBatch
  }

  if (studentId) {
    const r = studentReport(ws, studentId)
    if (!r) return []
    const t = r.tests
    if (t.length >= 4) {
      const late = avg(t.slice(-2).map(x => x.percent))
      const early = avg(t.slice(-4, -2).map(x => x.percent))
      if (late - early <= -8) push({ kind: 'trend', severity: 'critical', title: 'Scores are falling', detail: `Last two tests averaged ${round1(late)}%, down from ${round1(early)}% in the two before.`, action: 'Talk to the student this week and check their study plan.' })
      if (late - early >= 8) push({ kind: 'trend', severity: 'good', title: 'Scores are rising', detail: `Last two tests averaged ${round1(late)}%, up from ${round1(early)}%.`, action: 'Recognise the progress; move them to harder sets.' })
    }
    r.weaknesses.weak.slice(0, 3).forEach(w => push({ kind: 'weakness', severity: w.accuracy < 35 ? 'critical' : 'warning', title: `Weak in ${w.chapter}`, detail: `${w.accuracy}% over ${w.answers} answers (${w.subject}), ${w.gap} points under their own average.`, action: `Assign a short practice set on ${w.chapter}.` }))
    r.weaknesses.strong.slice(0, 2).forEach(w => push({ kind: 'strength', severity: 'good', title: `Strong in ${w.chapter}`, detail: `${w.accuracy}% over ${w.answers} answers.`, action: 'Could help peers or skip revision here.' }))
    if (r.summary?.status === 'inactive') push({ kind: 'engagement', severity: 'critical', title: 'Inactive for over a week', detail: `Last active ${new Date(r.summary.lastActive || 0).toLocaleDateString('en-IN')}.`, action: 'Call or message the student.' })
    const unanswered = t.reduce((n, x) => n + x.unanswered, 0)
    const total = t.reduce((n, x) => n + x.correct + x.incorrect + x.unanswered, 0)
    if (total >= 30 && unanswered / total > 0.3) push({ kind: 'test', severity: 'warning', title: 'Leaves many questions unanswered', detail: `${Math.round((unanswered / total) * 100)}% of test questions were skipped.`, action: 'Work on time management and attempting easy questions first.' })
    const wrong = t.reduce((n, x) => n + x.incorrect, 0)
    if (total >= 30 && wrong / total > 0.35) push({ kind: 'test', severity: 'warning', title: 'Losing marks to negative marking', detail: `${Math.round((wrong / total) * 100)}% of test questions were answered wrong.`, action: 'Advise skipping MCQs they can’t narrow to two options.' })
    const missed = r.assignments.filter(a => a.status === 'closed' && !a.submittedAt).length
    if (missed >= 2) push({ kind: 'engagement', severity: 'warning', title: `Missed ${missed} assignments`, detail: 'Closed assignments with no submission.', action: 'Follow up on the pending work.' })
    return out
  }

  const students = ws.students.filter(s => inScope(s.id))
  const rows = studentRows(ws).filter(r => inScope(r.id))
  // Engagement
  const inactive = rows.filter(r => activityStatus(r.lastActive, now) === 'inactive' || activityStatus(r.lastActive, now) === 'never')
  if (inactive.length) push({ kind: 'engagement', severity: inactive.length / Math.max(1, rows.length) > 0.15 ? 'critical' : 'warning', title: `${inactive.length} student${inactive.length === 1 ? '' : 's'} inactive for over a week`, detail: inactive.slice(0, 5).map(r => r.name).join(', ') + (inactive.length > 5 ? ` and ${inactive.length - 5} more` : ''), action: 'Reach out before they drop off.', students: inactive.map(r => r.id) })
  // Falling scores
  const falling = students.map(s => {
    const t = (ws.resultsByStudent.get(s.id) || []).slice().sort((a, b) => a.submittedAt - b.submittedAt)
    if (t.length < 4) return null
    const drop = avg(t.slice(-4, -2).map(x => x.percent)) - avg(t.slice(-2).map(x => x.percent))
    return drop >= 10 ? { id: s.id, name: s.name, drop: round1(drop) } : null
  }).filter(Boolean).sort((a, b) => b.drop - a.drop)
  if (falling.length) push({ kind: 'risk', severity: 'critical', title: `${falling.length} student${falling.length === 1 ? '' : 's'} with falling scores`, detail: falling.slice(0, 4).map(f => `${f.name} (−${f.drop} pts)`).join(', '), action: 'Schedule one-to-one reviews.', students: falling.map(f => f.id) })
  // Weak chapters, and whether they've been taught
  const scopes = faculty ? (faculty.batchIds || []) : scopeBatch ? [scopeBatch] : [null]
  scopes.forEach(bid => {
    const w = weaknesses(ws, { batchId: bid || undefined }).weak.filter(x => !faculty || (faculty.subjects || []).includes(x.subject))
    const bname = bid ? ws.batchById.get(bid)?.name : null
    w.slice(0, 3).forEach(x => {
      const taught = bid ? Boolean(ws.syllabus?.[bid]?.[chapterKey(x.subject, x.chapter)]) : null
      push({
        kind: 'weakness', severity: x.accuracy < 35 ? 'critical' : 'warning',
        title: `${x.chapter} is weak${bname ? ` in ${bname}` : ''}`,
        detail: `${x.accuracy}% accuracy over ${x.answers} answers; ${x.strugglingStudents} student${x.strugglingStudents === 1 ? '' : 's'} under 40%.${taught === true ? ' Already taught in class.' : taught === false ? ' Not taught yet.' : ''}`,
        action: taught ? `Plan a revision class on ${x.chapter}.` : `Cover ${x.chapter} before the next test that includes it.`
      })
    })
  })
  // Answer key problems
  ws.tests.filter(t => t.kind !== 'platform' && testStatus(t, now) !== 'draft').forEach(t => {
    if (faculty && !(t.batchIds || []).some(id => (faculty.batchIds || []).includes(id))) return
    if (scopeBatch && t.batchIds?.length && !t.batchIds.includes(scopeBatch)) return
    questionAnalytics(ws, t.id).filter(q => q.keySuspect && q.responses >= 10).forEach(q => push({
      kind: 'test', severity: 'warning', title: `Check the key of Q${q.number} in ${t.title}`,
      detail: `${q.flags[0]}, not the key ${[].concat(q.answer).map(o => String.fromCharCode(65 + o)).join(', ')}. Only ${q.correctPct}% got it right.`,
      action: 'Open the test and fix the key or award marks to all; results re-evaluate instantly.', testId: t.id
    }))
  })
  // Assignments
  assignmentSummaries(ws).filter(a => a.status === 'closed' && (!faculty || a.facultyId === faculty.id) && (!scopeBatch || !a.batchIds?.length || a.batchIds.includes(scopeBatch))).slice(0, 4).forEach(a => {
    const rate = pct(a.submitted, a.eligible)
    if (rate !== null && rate < 65) push({ kind: 'engagement', severity: 'warning', title: `Only ${rate}% submitted "${a.title}"`, detail: `${a.submitted} of ${a.eligible} students, ${a.late} late.`, action: 'Remind the batch, or extend the deadline.' })
    if (a.submitted - a.graded > 0) push({ kind: 'task', severity: 'info', title: `${a.submitted - a.graded} submissions to grade`, detail: `"${a.title}"${a.faculty ? `, set by ${a.faculty}` : ''}.`, action: 'Grade them so students get feedback.' })
  })
  // Improvers
  const lb = leaderboard(ws, { batchId: scopeBatch }).improvers?.filter(r => inScope(r.studentId) && r.improvement >= 8) || []
  if (lb.length) push({ kind: 'strength', severity: 'good', title: 'Most improved', detail: lb.slice(0, 3).map(r => `${r.name} (+${r.improvement} pts)`).join(', '), action: 'Celebrate them on the notice board.' })
  // Upcoming tests covering untaught chapters
  ws.tests.filter(t => testStatus(t, now) === 'scheduled' && t.scheduledAt - now < 10 * DAY_MS).forEach(t => {
    (t.batchIds?.length ? t.batchIds : ws.batches.map(b => b.id)).filter(bid => (!scopeBatch || bid === scopeBatch) && (!faculty || (faculty.batchIds || []).includes(bid))).forEach(bid => {
      const untaught = new Set()
      t.questionIds.forEach(qid => {
        const q = ws.questionById.get(qid)
        if (q && q.chapter !== 'Other' && !ws.syllabus?.[bid]?.[chapterKey(q.subject, q.chapter)]) untaught.add(q.chapter)
      })
      if (untaught.size) push({ kind: 'test', severity: 'info', title: `${t.title} covers ${untaught.size} chapter${untaught.size === 1 ? '' : 's'} ${ws.batchById.get(bid)?.name} hasn't done`, detail: [...untaught].slice(0, 5).join(', '), action: 'Teach them first, or swap those questions.', testId: t.id })
    })
  })
  const order = { critical: 0, warning: 1, info: 2, good: 3 }
  return out.sort((a, b) => order[a.severity] - order[b.severity])
}

// --- Dashboard ---
export function overview(ws) {
  const now = ws.now
  const rows = studentRows(ws)
  const tests = testSummaries(ws)
  const act = activity(ws, { days: 30 })
  const syl = syllabusProgress(ws).batches
  const completed = tests.filter(t => t.status === 'completed' && t.kind !== 'platform')
  return {
    totals: {
      students: rows.length,
      batches: ws.batches.length,
      faculty: ws.faculty.length,
      questions: ws.questions.length,
      testsCompleted: completed.length,
      testsUpcoming: tests.filter(t => t.status === 'scheduled' || t.status === 'live').length,
      avgPercent: round1(avg(rows.filter(r => r.avgPercent !== null).map(r => r.avgPercent))),
      activeLast7: rows.filter(r => r.activeDays7 > 0).length,
      inactive: rows.filter(r => activityStatus(r.lastActive, now) !== 'active').length,
      assignmentsOpen: ws.assignments.filter(a => a.dueAt > now).length,
      syllabusPercent: round1(avg(syl.map(b => b.percent ?? 0)))
    },
    days: act.days,
    upcoming: tests.filter(t => t.status === 'scheduled' || t.status === 'live').sort((a, b) => a.scheduledAt - b.scheduledAt).slice(0, 5),
    recent: completed.slice(0, 5),
    top: rows.filter(r => r.avgPercent !== null).sort((a, b) => b.avgPercent - a.avgPercent).slice(0, 5),
    atRisk: rows.filter(r => activityStatus(r.lastActive, now) !== 'active' || (r.avgPercent !== null && r.avgPercent < 30)).sort((a, b) => (a.avgPercent ?? 0) - (b.avgPercent ?? 0)).slice(0, 6),
    batches: batchComparison(ws).batches.map(b => ({ id: b.id, name: b.name, students: b.students, avgPercent: b.avgPercent, syllabusPercent: b.syllabusPercent, activeRate: b.activeRate })),
    notices: ws.notices.filter(n => !n.expiresAt || n.expiresAt > now).sort((a, b) => (b.pinned - a.pinned) || b.createdAt - a.createdAt).slice(0, 3),
    insights: insights(ws).slice(0, 4)
  }
}

// --- Everything one batch report needs (PDF / Excel) ---
export function batchReport(ws, batchId) {
  const b = batchId ? ws.batchById.get(batchId) : null
  return {
    centre: ws.centre,
    batch: b ? { id: b.id, name: b.name, course: b.course || null } : null,
    students: studentRows(ws, { batchId }),
    subjects: subjectAnalytics(ws, { batchId }).subjects,
    weaknesses: weaknesses(ws, { batchId }),
    leaderboard: leaderboard(ws, { batchId }),
    tests: testSummaries(ws).filter(t => t.status === 'completed' && (!batchId || !t.batchIds.length || t.batchIds.includes(batchId))),
    syllabus: syllabusProgress(ws, { batchId }).batches,
    insights: insights(ws, { batchId }),
    generatedAt: ws.now
  }
}
