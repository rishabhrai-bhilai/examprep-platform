// Real numbers for the Analytics page, in the shapes its design uses.
//
// Personal analytics come from the account's finished tests (test history,
// synced to the server) and practice record. Nothing is estimated: a section
// without enough data comes back empty and the page says so.

import { isAnswerCorrect } from '../../shared/answers.js'
import { isAnswered } from '../../shared/testAnalytics.js'
import { parseSet, pyqPaperId } from '../../shared/pyqPapers.js'
import { dayKey } from '../../shared/practice.js'

export const HISTORY_KEYS = { mock: 'gate_mock_history', pyq: 'gate_pyq_mock_history' }

const round1 = (n) => Math.round(n * 10) / 10
const round2 = (n) => Math.round(n * 100) / 100
const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Finished, counted tests, oldest first (under-a-minute submissions don't count)
export function readHistory(kind) {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEYS[kind]) || '[]')
    return (Array.isArray(list) ? list : [])
      .filter(h => h && h.counted !== false && h.maxScore > 0)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
  } catch {
    return []
  }
}

// Attempts kept but not counted (e.g. submitted in under a minute)
export function countUncounted(kind) {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEYS[kind]) || '[]')
    return Array.isArray(list) ? list.filter(h => h && h.counted === false).length : 0
  } catch {
    return 0
  }
}

export const formatMinutes = (sec) => {
  const s = Math.round(Number(sec) || 0)
  if (s < 60) return `${s}s`
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

const SHORT_SUBJECT = {
  'Engineering Mathematics': 'Maths', 'Discrete Mathematics': 'DM', 'Digital Logic': 'DL',
  'Computer Organization & Architecture': 'COA', 'Programming & Data Structures': 'PDS', Algorithms: 'Algo',
  'Theory of Computation': 'TOC', 'Compiler Design': 'CD', 'Operating Systems': 'OS', Databases: 'DBMS',
  'Computer Networks': 'CN', 'General Aptitude': 'GA', 'Software Engineering & Web Technologies': 'SE'
}
export const shortSubject = (name) => SHORT_SUBJECT[name] || String(name || '').split(/\s+/).map(w => w[0]).join('').slice(0, 4)

// Judged on the questions actually answered: skipping isn't a weakness in the subject
const statusFor = (accuracy, attempted) => (attempted === 0 ? 'Not attempted' : accuracy >= 80 ? 'Strength' : accuracy >= 65 ? 'Solid' : accuracy >= 50 ? 'Needs Revision' : 'Weak Area')

// Mistake tags students add in a test's review
const ERROR_TAGS = {
  conceptual: { reason: 'Conceptual gap', tip: 'Revisit the theory of these topics before more questions.' },
  calculation: { reason: 'Silly or calculation slip', tip: 'Recheck numbers and units before you submit, especially NATs.' },
  time: { reason: 'Time pressure', tip: 'Leave long 2-mark questions for a second pass.' },
  reading: { reason: 'Misread the question', tip: 'Underline NOT, EXCEPT and FALSE before you read the options.' },
  guess: { reason: 'Guessed wrong', tip: 'Guess an MCQ only after removing at least one option.' }
}

/**
 * @param {object[]} history  readHistory(kind)
 * @param {Map<number, object>} questionsById  question bank + original mock questions
 */
export function buildPersonal(history, questionsById) {
  const n = history.length
  if (!n) return null

  let correct = 0; let incorrect = 0; let unanswered = 0; let questionsSeen = 0; let timeTotal = 0
  const types = {
    'MCQ (1 Mark)': { attempted: 0, correct: 0, incorrect: 0, penalty: 0 },
    'MCQ (2 Marks)': { attempted: 0, correct: 0, incorrect: 0, penalty: 0 },
    'MSQ (Multiple Select)': { attempted: 0, correct: 0, incorrect: 0, penalty: 0 },
    'NAT (Numerical)': { attempted: 0, correct: 0, incorrect: 0, penalty: 0 }
  }
  const subjects = {}
  const topics = {}
  const tagCounts = {}
  let wrongMarks = 0; let skippedMarks = 0

  for (const h of history) {
    correct += h.correct || 0
    incorrect += h.incorrect || 0
    unanswered += h.unanswered || 0
    questionsSeen += h.questionsCount || ((h.correct || 0) + (h.incorrect || 0) + (h.unanswered || 0))
    timeTotal += h.timeTaken || 0

    // Per question: type split, negative marks, marks left on the table
    for (const ref of h.questions || []) {
      const q = typeof ref === 'object' && ref ? ref : questionsById.get(ref)
      if (!q) continue
      const marks = Number(q.marks) || 1
      const answer = h.answers?.[q.id]
      const type = q.type === 'MSQ' ? 'MSQ (Multiple Select)' : q.type === 'NAT' ? 'NAT (Numerical)' : marks === 2 ? 'MCQ (2 Marks)' : 'MCQ (1 Mark)'
      if (!isAnswered(answer)) { skippedMarks += marks; continue }
      const t = types[type]
      t.attempted++
      if (isAnswerCorrect(q, answer)) {
        t.correct++
      } else {
        t.incorrect++
        wrongMarks += marks
        if (type.startsWith('MCQ')) t.penalty += marks / 3
      }
    }

    for (const [name, s] of Object.entries(h.subjectStats || {})) {
      const a = subjects[name] || (subjects[name] = { obtained: 0, max: 0, correct: 0, incorrect: 0, total: 0, time: 0 })
      a.obtained += s.marksObtained || 0
      a.max += s.marksMax || 0
      a.correct += s.correctQs || 0
      a.incorrect += s.incorrectQs || 0
      a.total += s.totalQs || 0
      a.time += s.timeSpent || 0
    }
    for (const [name, s] of Object.entries(h.topicStats || {})) {
      const a = topics[name] || (topics[name] = { subject: s.subject, correct: 0, incorrect: 0 })
      a.correct += s.correctQs || 0
      a.incorrect += s.incorrectQs || 0
    }
    for (const tag of Object.values(h.errorTags || {})) {
      if (ERROR_TAGS[tag]) tagCounts[tag] = (tagCounts[tag] || 0) + 1
    }
  }

  const scores = history.map(h => pct(h.score, h.maxScore))
  const negativeMarksLost = round2(Object.values(types).reduce((s, t) => s + t.penalty, 0))
  const attempted = correct + incorrect

  const questionTypes = Object.entries(types)
    .filter(([, t]) => t.attempted > 0)
    .map(([type, t]) => ({
      type,
      attempted: t.attempted,
      correct: t.correct,
      incorrect: t.incorrect,
      accuracy: round1(pct(t.correct, t.attempted)),
      negativePenalty: -round2(t.penalty)
    }))

  const subjectMastery = Object.entries(subjects)
    .filter(([, s]) => s.max > 0)
    .map(([name, s]) => {
      const scorePct = Math.max(0, Math.round(pct(s.obtained, s.max)))
      const attempted = s.correct + s.incorrect
      const accuracy = Math.round(pct(s.correct, attempted))
      return { name, scorePct, accuracy, attempted, correct: s.correct, status: statusFor(accuracy, attempted) }
    })
    .sort((a, b) => b.scorePct - a.scorePct)

  // Why marks were lost: the student's own mistake tags if they've added any,
  // otherwise where the marks went (wrong answers, negative marking, skipped)
  const tagTotal = Object.values(tagCounts).reduce((a, b) => a + b, 0)
  let errorAnalysis
  let errorsTagged = false
  if (tagTotal > 0) {
    errorsTagged = true
    errorAnalysis = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ reason: ERROR_TAGS[tag].reason, count, percentage: Math.round(pct(count, tagTotal)), tip: ERROR_TAGS[tag].tip }))
  } else {
    const lost = wrongMarks + negativeMarksLost + skippedMarks
    errorAnalysis = lost > 0 ? [
      { reason: 'Wrong answers', count: incorrect, marks: round1(wrongMarks), percentage: Math.round(pct(wrongMarks, lost)), tip: 'Review each wrong answer in the test report and note why it went wrong.' },
      { reason: 'Negative marking', count: types['MCQ (1 Mark)'].incorrect + types['MCQ (2 Marks)'].incorrect, marks: negativeMarksLost, percentage: Math.round(pct(negativeMarksLost, lost)), tip: 'Guess an MCQ only after removing at least one option.' },
      { reason: 'Skipped questions', count: unanswered, marks: round1(skippedMarks), percentage: Math.round(pct(skippedMarks, lost)), tip: 'MSQs and NATs carry no penalty: never leave them blank.' }
    ].filter(e => e.marks > 0) : []
  }

  const progression = history.slice(-10).map((h, i, arr) => {
    const d = h.timestamp ? new Date(h.timestamp) : null
    return { test: `T${history.length - arr.length + i + 1}`, title: h.testTitle || 'Test', score: round1(pct(h.score, h.maxScore)), date: d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : '' }
  })

  const scatter = Object.entries(subjects)
    .filter(([, s]) => s.correct + s.incorrect >= 3 && s.total > 0)
    .map(([name, s]) => ({
      name,
      short: shortSubject(name),
      accuracy: Math.round(pct(s.correct, s.correct + s.incorrect)),
      timePerQ: round1(s.time / s.total / 60),
      questionsSeen: s.total
    }))

  const topicRows = Object.entries(topics)
    .map(([topic, t]) => ({ topic, subject: t.subject, attempts: t.correct + t.incorrect, accuracy: Math.round(pct(t.correct, t.correct + t.incorrect)) }))
    .filter(t => t.attempts >= 2)
  const weakTopics = topicRows.filter(t => t.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts).slice(0, 5)
  const strongTopics = topicRows.filter(t => t.accuracy >= 75).sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts).slice(0, 3)

  // Insights from the numbers above
  const IDEAL = 2.7
  const rushing = scatter.filter(s => s.timePerQ < IDEAL && s.accuracy < 65).sort((a, b) => a.accuracy - b.accuracy)[0]
  const slow = scatter.filter(s => s.timePerQ > IDEAL * 1.25).sort((a, b) => b.timePerQ - a.timePerQ)[0]
  const insights = []
  if (rushing) {
    insights.push({ tag: 'Rushing detected', color: 'rose', title: `${rushing.name} answers are rushed`, description: `You spend ${rushing.timePerQ} min per ${rushing.short} question, under the ${IDEAL} min GATE pace, and get ${rushing.accuracy}% right. Slowing down here is the quickest win.` })
  }
  if (negativeMarksLost >= 2) {
    const wrongMcq = types['MCQ (1 Mark)'].incorrect + types['MCQ (2 Marks)'].incorrect
    insights.push({ tag: 'Negative marking', color: 'amber', title: `Wrong MCQs cost you ${negativeMarksLost} marks`, description: `${wrongMcq} wrong MCQ answer${wrongMcq === 1 ? '' : 's'} across ${n} test${n === 1 ? '' : 's'} took away ${negativeMarksLost} marks on top of the marks missed. Guess only after removing an option.` })
  }
  if (n >= 4) {
    const half = Math.floor(n / 2)
    const early = scores.slice(0, half).reduce((a, b) => a + b, 0) / half
    const late = scores.slice(-half).reduce((a, b) => a + b, 0) / half
    const delta = round1(late - early)
    if (Math.abs(delta) >= 1) {
      insights.push(delta > 0
        ? { tag: 'Score trend', color: 'emerald', title: `Up ${delta} marks since your first tests`, description: `Your last ${half} tests average ${round1(late)} against ${round1(early)} in your first ${half}.` }
        : { tag: 'Score trend', color: 'amber', title: `Down ${Math.abs(delta)} marks from your first tests`, description: `Your last ${half} tests average ${round1(late)} against ${round1(early)} in your first ${half}. Check the weakest topics below.` })
    }
  }
  const attemptRate = round1(pct(attempted, questionsSeen))
  if (attemptRate < 80 && questionsSeen > 0) {
    insights.push({ tag: 'Unanswered', color: 'amber', title: `${round1(100 - attemptRate)}% of questions left blank`, description: 'MSQs and NATs have no negative marking, so an attempt there can only gain marks.' })
  }
  if (!rushing && slow) {
    insights.push({ tag: 'Pacing', color: 'amber', title: `${slow.name} takes the longest`, description: `${slow.timePerQ} min per question against the ${IDEAL} min GATE pace. Practise timed sets in this subject.` })
  }

  const pacingInsight = rushing
    ? { subject: rushing.name, text: `You answer ${rushing.name} in ${rushing.timePerQ} min per question (fast) but get only ${rushing.accuracy}% right. Taking a little longer there should pay back in marks.` }
    : slow
      ? { subject: slow.name, text: `${slow.name} takes you ${slow.timePerQ} min per question, well above the ${IDEAL} min pace. Timed practice in this subject will free up time for the rest of the paper.` }
      : scatter.length ? { subject: null, text: 'Your pace is close to the GATE benchmark in every subject with enough questions. Keep accuracy above 65% as you speed up.' } : null

  return {
    overview: {
      averageScore: round1(scores.reduce((a, b) => a + b, 0) / n),
      bestScore: round1(Math.max(...scores)),
      latestScore: round1(scores[scores.length - 1]),
      maxMarks: 100,
      accuracy: round1(pct(correct, attempted)),
      attemptRate,
      testsTaken: n,
      totalQuestionsAttempted: attempted,
      totalCorrect: correct,
      totalIncorrect: incorrect,
      totalUnanswered: unanswered,
      negativeMarksLost,
      averageTimePerQ: questionsSeen ? formatMinutes(timeTotal / questionsSeen) : '—',
      totalTimeSpent: formatMinutes(timeTotal)
    },
    questionTypes,
    subjectMastery,
    errorAnalysis,
    errorsTagged,
    progression,
    scatter,
    weakTopics,
    strongTopics,
    insights: insights.slice(0, 3),
    pacingInsight
  }
}

// Every full year paper, with the account's score on the ones taken
export function buildPyqCoverage(questions, pyqHistory) {
  const map = new Map()
  for (const q of questions || []) {
    if (!q.year) continue
    const key = `${q.year}_${parseSet(q.set)}`
    if (!map.has(key)) map.set(key, { year: Number(q.year), set: parseSet(q.set) })
  }
  const list = [...map.values()].sort((a, b) => a.year - b.year || a.set - b.set)
  return list.map(p => {
    const multi = list.filter(o => o.year === p.year).length > 1
    const id = pyqPaperId(p.year, p.set)
    const attempt = [...pyqHistory].reverse().find(h => h.paperId === id || h.testTitle === `PYQ Mock: GATE ${p.year} Set ${p.set}`)
    const d = attempt?.timestamp ? new Date(attempt.timestamp) : null
    return {
      id,
      year: p.year,
      set: p.set,
      label: multi ? `'${String(p.year).slice(2)} S${p.set}` : String(p.year),
      title: multi ? `GATE ${p.year} (Set ${p.set})` : `GATE ${p.year}`,
      done: Boolean(attempt),
      score: attempt ? round2(attempt.score) : null,
      date: d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : null
    }
  })
}

// 26 weeks of questions answered per day, from the practice record
export function buildHeatmap(days = {}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dow = (today.getDay() + 6) % 7 // Monday = 0
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dow - 25 * 7)
  let total = 0; let active = 0; let longest = 0; let cur = 0
  const monthLabels = []
  const cells = []
  let lastM = -1
  for (let c = 0; c < 26; c++) {
    const cd = new Date(start.getFullYear(), start.getMonth(), start.getDate() + c * 7)
    if (cd.getMonth() !== lastM) { monthLabels.push({ col: c + 2, label: MONTHS[cd.getMonth()] }); lastM = cd.getMonth() }
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + c * 7 + d)
      if (date > today) continue
      const rec = days[dayKey(date.getTime())] || {}
      const q = rec.attempts || 0
      const mins = Math.round((rec.timeSec || 0) / 60)
      if (q > 0) { total += q; active++; cur++; longest = Math.max(longest, cur) } else { cur = 0 }
      cells.push({
        key: `${c}-${d}`,
        col: c + 2,
        row: d + 2,
        date,
        dateStr: `${date.getDate()} ${MONTHS[date.getMonth()]}`,
        q,
        mins,
        lv: q === 0 ? 0 : q <= 5 ? 1 : q <= 15 ? 2 : q <= 30 ? 3 : 4,
        tipText: q ? `${q} question${q === 1 ? '' : 's'}${mins ? ` · about ${mins} min` : ''}` : 'No practice'
      })
    }
  }
  return { monthLabels, cells, total, days: active, longest }
}

// Rows for the test history table (both kinds of tests)
export function buildHistoryRows(mockHistory, pyqHistory) {
  const row = (h, type) => {
    const d = h.timestamp ? new Date(h.timestamp) : null
    return {
      id: `${type}-${h.timestamp}-${h.testId || h.paperId || ''}`,
      testId: type === 'PYQ' ? (h.paperId || null) : h.testId,
      title: h.testTitle || h.displayName || 'Test',
      type,
      date: h.date || (d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '—'),
      timestamp: h.timestamp || 0,
      score: round2(Number(h.score) || 0),
      maxScore: Number(h.maxScore) || 0,
      accuracy: round1(Number(h.percentage) || 0),
      timeTaken: h.timeTakenFormatted || formatMinutes(h.timeTaken),
      correct: h.correct || 0,
      wrong: h.incorrect || 0,
      skipped: h.unanswered || 0,
      total: h.questionsCount || ((h.correct || 0) + (h.incorrect || 0) + (h.unanswered || 0))
    }
  }
  return [...mockHistory.map(h => row(h, 'Mock')), ...pyqHistory.map(h => row(h, 'PYQ'))]
}

// Analytics key in the record for 'answered n questions' (practice record has
// no per-question time for tests; tests carry their own)
export const hasPracticeData = (practice) => Object.keys(practice?.days || {}).length > 0
