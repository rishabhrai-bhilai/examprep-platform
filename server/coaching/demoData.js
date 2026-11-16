// The demo coaching centre: made-up batches, faculty, students, tests, answers,
// assignments and notices, for showing the admin app to coaching centres.
//
// It is generated in memory when the server starts (seeded, so it looks the same
// every time, with dates relative to today) and is never written to the
// database, never counted in real numbers and never shown on the student site.
// Its document has exactly the shape a real centre's has (see store.js), so
// switching a centre to real data changes where the document comes from, nothing else.
import { chapterOf, SYLLABUS } from './syllabus.js'

export const DEMO_ID = 'demo'

// Small seeded random generator (mulberry32)
function rng(seed) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const api = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (list) => list[Math.floor(next() * list.length)],
    normal: () => {
      const u = Math.max(1e-9, next())
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next())
    },
    chance: (p) => next() < p,
    shuffle: (list) => {
      const out = list.slice()
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[out[i], out[j]] = [out[j], out[i]]
      }
      return out
    }
  }
  return api
}

const DAY = 24 * 3600 * 1000
const sigmoid = (x) => 1 / (1 + Math.exp(-x))
const DIFF = { Easy: -0.9, Medium: 0, Hard: 0.9 }

const FIRST = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna', 'Ishaan', 'Rohan', 'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Kiara', 'Ira', 'Myra', 'Riya', 'Priya', 'Neha', 'Kabir', 'Dev', 'Yash', 'Harsh', 'Pranav', 'Tanvi', 'Pooja', 'Sneha', 'Meera', 'Nikhil', 'Rahul', 'Karan', 'Aman', 'Shreya', 'Anjali', 'Varun', 'Siddharth', 'Lakshmi', 'Gauri', 'Om', 'Tara', 'Manav', 'Kavya', 'Ritika', 'Akash', 'Sameer', 'Nisha', 'Tushar', 'Ayesha', 'Farhan', 'Zoya', 'Arnav', 'Bhavya', 'Chirag', 'Esha', 'Gaurav', 'Hrithik', 'Jiya', 'Lavanya', 'Mohit', 'Naina', 'Ojas', 'Parth', 'Ruchi']
const LAST = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Joshi', 'Kulkarni', 'Mehta', 'Chopra', 'Das', 'Bose', 'Rao', 'Pillai', 'Mishra', 'Agarwal', 'Yadav', 'Khan', 'Sahu', 'Tiwari', 'Dubey', 'Chandrakar', 'Banerjee', 'Menon', 'Jain', 'Thakur']

const FACULTY = [
  { name: 'Dr. Meera Iyer', subjects: ['Algorithms', 'Programming & Data Structures'] },
  { name: 'Rahul Khanna', subjects: ['Operating Systems', 'Computer Organization & Architecture'] },
  { name: 'Sneha Patil', subjects: ['Databases', 'Computer Networks'] },
  { name: 'Arvind Rao', subjects: ['Engineering Mathematics', 'Discrete Mathematics'] },
  { name: 'Kavya Nair', subjects: ['Theory of Computation', 'Compiler Design'] },
  { name: 'Imran Sheikh', subjects: ['General Aptitude', 'Digital Logic'] }
]

const BATCHES = [
  { id: 'demo-b1', name: 'GATE 2027 Weekend', course: 'GATE CS 2027 (weekend)', size: 22, shift: -0.25, progress: 0.38, engagement: 0.55, startDays: 120 },
  { id: 'demo-b2', name: 'GATE 2027 Regular', course: 'GATE CS 2027 (weekday)', size: 24, shift: 0.1, progress: 0.56, engagement: 0.7, startDays: 150 },
  { id: 'demo-b3', name: 'GATE 2026 Crash Course', course: 'GATE CS 2026 crash course', size: 18, shift: 0.3, progress: 0.82, engagement: 0.8, startDays: 75 }
]

// Questions the demo centre wrote itself (the rest of its bank is the PYQ library)
const CENTRE_QUESTIONS = [
  { subject: 'Algorithms', chapter: 'Divide & Conquer', difficulty: 'Easy', type: 'MCQ', marks: 1, question: 'What is the worst-case number of comparisons made by insertion sort on an array of n distinct elements?', options: ['n - 1', 'n log n', 'n(n - 1)/2', 'n^2'], answer: 2 },
  { subject: 'Algorithms', chapter: 'Greedy Method', difficulty: 'Medium', type: 'NAT', marks: 2, question: 'A connected undirected graph has 12 vertices and 20 edges. How many edges does any spanning tree of it have?', answer: '11' },
  { subject: 'Operating Systems', chapter: 'Process Management I (processes, threads, scheduling)', difficulty: 'Medium', type: 'MCQ', marks: 2, question: 'Which scheduling algorithm can cause starvation of long processes?', options: ['FCFS', 'Round robin', 'Shortest job first', 'None of these'], answer: 2 },
  { subject: 'Databases', chapter: 'Functional Dependencies & Normalization', difficulty: 'Easy', type: 'MCQ', marks: 1, question: 'A relation in BCNF is always in:', options: ['3NF', '4NF', '5NF', 'None of these'], answer: 0 },
  { subject: 'Computer Networks', chapter: 'IP Addresses', difficulty: 'Medium', type: 'NAT', marks: 2, question: 'How many usable host addresses does a /27 IPv4 subnet have?', answer: '30' },
  { subject: 'Engineering Mathematics', chapter: 'Probability & Statistics', difficulty: 'Easy', type: 'NAT', marks: 1, question: 'Two fair dice are rolled. What is the probability (to two decimals) that the sum is 7?', answer: '0.16 to 0.17' },
  { subject: 'Discrete Mathematics', chapter: 'Mathematical Logic', difficulty: 'Medium', type: 'MSQ', marks: 2, question: 'Which of these are tautologies?', options: ['p ∨ ¬p', 'p → p', 'p ∧ ¬p', '(p → q) ∨ (q → p)'], answer: [0, 1, 3] },
  { subject: 'Theory of Computation', chapter: 'RL, FA, RE & RG', difficulty: 'Easy', type: 'MCQ', marks: 1, question: 'The minimum DFA accepting binary strings that end in 01 has how many states?', options: ['2', '3', '4', '5'], answer: 1 },
  { subject: 'Digital Logic', chapter: 'Boolean Algebra', difficulty: 'Easy', type: 'MCQ', marks: 1, question: 'A + AB simplifies to:', options: ['AB', 'A', 'B', 'A + B'], answer: 1 },
  { subject: 'General Aptitude', chapter: 'Quantitative Aptitude', difficulty: 'Easy', type: 'NAT', marks: 1, question: 'A price rises by 20% and then falls by 20%. What is the net change in percent (enter a negative number for a fall)?', answer: '-4' },
  { subject: 'Compiler Design', chapter: 'Parsing Techniques', difficulty: 'Hard', type: 'MCQ', marks: 2, question: 'Which parser is the most powerful of these?', options: ['SLR(1)', 'LALR(1)', 'Canonical LR(1)', 'LL(1)'], answer: 2 },
  { subject: 'Computer Organization & Architecture', chapter: 'Pipeline Organization', difficulty: 'Medium', type: 'NAT', marks: 2, question: 'A 5-stage pipeline with no stalls runs 100 instructions. How many cycles does it take?', answer: '104' }
]

// The demo centre's document plus its students' answers.
// `library` is the PYQ question bank (server/data/questions.json).
export function generateDemo(library, now = Date.now()) {
  const r = rng(20270101)
  const usable = library.filter(q => q.question && (q.type === 'NAT' || (q.options?.length >= 2)) && !q.marksToAll)
  const byChapter = new Map()
  usable.forEach(q => {
    const { subject, chapter } = chapterOf(q)
    if (chapter === 'Other') return
    const key = `${subject}|${chapter}`
    if (!byChapter.has(key)) byChapter.set(key, [])
    byChapter.get(key).push(q.id)
  })
  const qById = new Map(usable.map(q => [q.id, q]))

  // --- Faculty and batches ---
  const faculty = FACULTY.map((f, i) => ({
    id: `demo-f${i + 1}`, name: f.name, email: `${f.name.toLowerCase().replace(/^dr\. /, '').replace(/[^a-z]+/g, '.')}@demo.example`,
    subjects: f.subjects, batchIds: BATCHES.filter((_, bi) => (i + bi) % 3 !== 2 || i < 2).map(b => b.id),
    phoneVisible: false, joinedAt: now - r.int(200, 700) * DAY
  }))
  const batches = BATCHES.map(b => ({
    id: b.id, name: b.name, course: b.course, startDate: now - b.startDays * DAY,
    facultyIds: faculty.filter(f => f.batchIds.includes(b.id)).map(f => f.id),
    schedule: b.id === 'demo-b1' ? 'Sat & Sun, 9 am – 1 pm' : b.id === 'demo-b2' ? 'Mon – Fri, 6 – 8 pm' : 'Daily, 10 am – 4 pm',
    createdAt: now - b.startDays * DAY
  }))

  // --- Syllabus covered in class, in subject order, up to each batch's progress ---
  const chapterOrder = SYLLABUS.flatMap(s => s.chapters.map(ch => ({ subject: s.subject, chapter: ch })))
  const syllabus = {}
  BATCHES.forEach(b => {
    const done = {}
    const n = Math.round(chapterOrder.length * b.progress)
    // Interleave subjects so a batch has some of every subject done
    const order = r.shuffle(chapterOrder.map((c, i) => ({ ...c, w: (i % 4) + r.next() * 3 }))).sort((a, x) => a.w - x.w)
    order.slice(0, n).forEach((c, i) => {
      const f = faculty.find(x => x.subjects.includes(c.subject))
      done[`${c.subject}|${c.chapter}`] = { doneAt: now - b.startDays * DAY + Math.round(((i + 1) / (n + 1)) * (b.startDays - 3) * DAY), facultyId: f?.id || null }
    })
    syllabus[b.id] = done
  })
  const taught = (batchId, subject, chapter, at = now) => {
    const e = syllabus[batchId]?.[`${subject}|${chapter}`]
    return Boolean(e && e.doneAt <= at)
  }

  // --- Students ---
  const usedNames = new Set()
  const students = []
  BATCHES.forEach(b => {
    for (let i = 0; i < b.size; i++) {
      let name
      do { name = `${r.pick(FIRST)} ${r.pick(LAST)}` } while (usedNames.has(name))
      usedNames.add(name)
      const subjectSkill = Object.fromEntries(SYLLABUS.map(s => [s.subject, r.normal() * 0.55]))
      // A few students drift off (inactive), a few improve sharply
      const persona = r.next()
      students.push({
        id: `demo-s${String(students.length + 1).padStart(2, '0')}`,
        name,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@demo.example`,
        batchId: b.id,
        joinedAt: b.id && now - (b.startDays - r.int(0, 20)) * DAY,
        _ability: b.shift + r.normal() * 0.75,
        _skill: subjectSkill,
        _engagement: Math.min(1, Math.max(0.1, b.engagement + r.normal() * 0.2)),
        _growth: persona > 0.85 ? 0.9 : persona < 0.1 ? -0.6 : r.normal() * 0.25,
        _stopsAt: persona < 0.12 ? now - r.int(9, 25) * DAY : null
      })
    }
  })
  const pCorrect = (s, q, at) => {
    const { subject, chapter } = chapterOf(q)
    const progress = Math.max(0, Math.min(1, 1 - (now - at) / (120 * DAY)))
    const t = taught(s.batchId, subject, chapter, at) ? 0.35 : -0.3
    return sigmoid(s._ability + (s._skill[subject] || 0) + s._growth * progress + t - (DIFF[q.difficulty] ?? 0) + 0.15)
  }
  const wrongAnswer = (q, rr) => {
    if (q.type === 'NAT') {
      const v = parseFloat(String(q.answer).split(/\s+to\s+|\s+OR\s+/i)[0])
      return String(Number.isNaN(v) ? rr.int(1, 99) : Math.round((v + (rr.chance(0.5) ? 1 : -1) * Math.max(1, Math.abs(v) * 0.2)) * 100) / 100)
    }
    const opts = q.options.length
    if (q.type === 'MSQ') {
      const key = [].concat(q.answer)
      const flipped = rr.int(0, opts - 1)
      const ans = key.includes(flipped) ? key.filter(x => x !== flipped) : [...key, flipped].sort()
      return ans.length ? ans : [flipped]
    }
    // MCQ: one "attractive" distractor per question takes most wrong answers
    const key = Number(q.answer)
    const lure = (key + 1 + (Number(q.id) % (opts - 1))) % opts
    if (rr.chance(0.6) && lure !== key) return lure
    let o
    do { o = rr.int(0, opts - 1) } while (o === key)
    return o
  }
  const correctAnswer = (q) => (q.type === 'MSQ' ? [].concat(q.answer) : q.type === 'NAT' ? String(q.answer).split(/\s+to\s+|\s+OR\s+/i)[0] : Number(q.answer))
  const respond = (s, q, at, timeScale = 1) => {
    const p = pCorrect(s, q, at)
    const attemptP = Math.min(0.97, 0.55 + p * 0.5)
    const timeSec = Math.round(Math.max(20, (q.marks === 2 ? 170 : 95) * timeScale * Math.exp(r.normal() * 0.35)))
    if (!r.chance(attemptP)) return { answer: null, timeSec: Math.round(timeSec * 0.3) }
    return { answer: r.chance(p) ? correctAnswer(q) : wrongAnswer(q, r), timeSec }
  }

  // --- Centre-authored questions ---
  const questions = CENTRE_QUESTIONS.map((q, i) => ({
    id: `demo-q${i + 1}`, source: 'centre', ...q, negativeMarks: q.type === 'MCQ' ? Math.round(q.marks / 3 * 100) / 100 : 0,
    answerAlternatives: [], explanation: '', createdBy: faculty.find(f => f.subjects.includes(q.subject))?.id || null,
    createdAt: now - r.int(10, 90) * DAY
  }))
  questions.forEach(q => qById.set(q.id, q))

  // --- Tests ---
  const pickQs = (subjects, n, seedShift = 0) => {
    const pool = subjects.flatMap(s => [...byChapter.entries()].filter(([k]) => k.startsWith(`${s}|`)).flatMap(([, ids]) => ids))
    const own = questions.filter(q => subjects.includes(q.subject)).map(q => q.id)
    const chosen = r.shuffle(pool).slice(0, n - Math.min(own.length, 2 + seedShift % 2))
    return r.shuffle([...chosen, ...own.slice(0, n - chosen.length)])
  }
  const allSubjects = SYLLABUS.map(s => s.subject)
  const at = (daysAgo, hour = 10) => {
    const d = new Date(now - daysAgo * DAY)
    d.setUTCHours(hour - 5, 30, 0, 0) // hour in IST
    return d.getTime()
  }
  const T = (id, title, subjects, n, daysAgo, durationMin, batchIds, extra = {}) => ({
    id, title, kind: 'centre', subjects, questionIds: pickQs(subjects, n, id.length), durationMin,
    scheduledAt: at(daysAgo), windowEndsAt: at(daysAgo) + (durationMin + 24 * 60) * 60000,
    batchIds, negativeMarking: true, published: true, bonusIds: [], keyOverrides: {},
    createdBy: faculty.find(f => f.subjects.includes(subjects[0]))?.id || null, createdAt: at(daysAgo + 5), ...extra
  })
  const allB = BATCHES.map(b => b.id)
  const tests = [
    T('demo-t1', 'Weekly Test 1: Programming & DS', ['Programming & Data Structures'], 20, 49, 60, allB),
    T('demo-t2', 'Weekly Test 2: Mathematics', ['Engineering Mathematics', 'Discrete Mathematics'], 20, 42, 60, allB),
    T('demo-t3', 'Weekly Test 3: Algorithms', ['Algorithms'], 20, 35, 60, allB),
    T('demo-t4', 'Full Mock 1', allSubjects, 40, 28, 120, allB),
    T('demo-t5', 'Weekly Test 4: OS & COA', ['Operating Systems', 'Computer Organization & Architecture'], 20, 21, 60, ['demo-b2', 'demo-b3']),
    T('demo-t6', 'Weekly Test 5: DBMS & Networks', ['Databases', 'Computer Networks'], 20, 14, 60, allB),
    T('demo-t7', 'Full Mock 2', allSubjects, 40, 7, 120, allB),
    T('demo-t8', 'Weekly Test 6: TOC & Compilers', ['Theory of Computation', 'Compiler Design'], 20, 0.05, 60, allB),
    T('demo-t9', 'Weekly Test 7: Digital Logic & Aptitude', ['Digital Logic', 'General Aptitude'], 20, -4, 60, allB),
    T('demo-t10', 'Full Mock 3', allSubjects, 40, -11, 120, allB),
    { ...T('demo-t11', 'Crash Course Revision Test', ['Operating Systems', 'Databases', 'Algorithms'], 25, -16, 75, ['demo-b3']), published: false }
  ]
  // Weekly Test 6 starts in a few minutes' window: "live" right now
  tests[7].scheduledAt = now - 25 * 60000
  tests[7].windowEndsAt = now + 6 * 3600 * 1000
  // One MCQ in Full Mock 1 was keyed wrongly when the test was made, so its
  // question analytics flag it (fixing the key re-evaluates everyone)
  const mock1 = tests[3]
  const badKeyQ = mock1.questionIds.map(id => qById.get(id)).find(q => q && q.type === 'MCQ' && q.options?.length === 4 && q.difficulty !== 'Hard')
  if (badKeyQ) mock1.keyOverrides[badKeyQ.id] = (Number(badKeyQ.answer) + 2) % 4

  // --- Test responses (raw: the engine scores them, see evaluate.js) ---
  const results = []
  tests.forEach(t => {
    if (!t.published || t.scheduledAt > now) return
    const live = t.windowEndsAt > now
    students.filter(s => t.batchIds.includes(s.batchId)).forEach(s => {
      if (s._stopsAt && s._stopsAt < t.scheduledAt) return
      if (!r.chance(live ? 0.35 : 0.72 + s._engagement * 0.25)) return
      const submittedAt = t.scheduledAt + r.int(20, Math.min(t.durationMin, 600)) * 60000 + (live ? 0 : r.int(0, 8) * 3600000)
      if (submittedAt > now) return
      const responses = {}
      t.questionIds.forEach(qid => {
        const q = qById.get(qid)
        if (q) responses[qid] = respond(s, q, t.scheduledAt, (t.durationMin * 60) / (t.questionIds.length * 130))
      })
      const timeTaken = Math.min(t.durationMin * 60, Object.values(responses).reduce((n, x) => n + x.timeSec, 0))
      results.push({ id: `demo-r${results.length + 1}`, studentId: s.id, testId: t.id, submittedAt, timeTaken, responses })
    })
  })

  // --- Practice answers outside tests (about 60 days) ---
  const practice = []
  students.forEach(s => {
    const days = 60
    for (let d = days; d >= 0; d--) {
      const dayStart = now - d * DAY
      if (s._stopsAt && dayStart > s._stopsAt) continue
      const weekend = new Date(dayStart).getUTCDay() % 6 === 0
      if (!r.chance(s._engagement * (weekend ? 0.75 : 0.55))) continue
      const n = r.int(3, 6 + Math.round(s._engagement * 12))
      // Practice mostly chapters taught by then, sometimes ahead
      const pool = [...byChapter.keys()].filter(k => {
        const [subject, chapter] = k.split('|')
        return taught(s.batchId, subject, chapter, dayStart) || r.chance(0.08)
      })
      if (!pool.length) continue
      const chapterKeys = [r.pick(pool), r.pick(pool)]
      let t = dayStart - r.int(1, 6) * 3600000 - (r.chance(0.6) ? r.int(0, 3) * 3600000 : 0)
      for (let i = 0; i < n; i++) {
        const q = qById.get(r.pick(byChapter.get(r.pick(chapterKeys))))
        if (!q) continue
        const p = pCorrect(s, q, t)
        const timeSec = Math.round(Math.max(15, (q.marks === 2 ? 150 : 80) * Math.exp(r.normal() * 0.4)))
        t += timeSec * 1000 + r.int(5, 60) * 1000
        if (t > now) break
        const { subject, chapter } = chapterOf(q)
        practice.push({ studentId: s.id, qid: q.id, subject, chapter, correct: r.chance(p), timeSec, at: t })
      }
    }
  })

  // --- Assignments and submissions ---
  const A = (i, title, subject, chapter, batchIds, dueDays, maxMarks, description) => ({
    id: `demo-a${i}`, title, subject, chapter, batchIds, dueAt: at(dueDays, 23), maxMarks, description,
    facultyId: faculty.find(f => f.subjects.includes(subject))?.id || null, createdAt: at(dueDays + 7), attachmentName: null
  })
  const assignments = [
    A(1, 'Recursion and tree traversal problem set', 'Programming & Data Structures', 'Trees', allB, 40, 20, '15 questions on recursion, tree traversals and BST operations. Submit worked solutions.'),
    A(2, 'Linear algebra worksheet', 'Engineering Mathematics', 'Linear Algebra', allB, 33, 25, 'Eigenvalues, rank and systems of equations: 12 questions.'),
    A(3, 'Greedy vs DP: 10 classic problems', 'Algorithms', 'Dynamic Programming', ['demo-b2', 'demo-b3'], 26, 30, 'Identify the technique and write the recurrence or greedy choice for each problem.'),
    A(4, 'Process scheduling numericals', 'Operating Systems', 'Process Management I (processes, threads, scheduling)', ['demo-b2', 'demo-b3'], 19, 20, 'Gantt charts and waiting times for FCFS, SJF, SRTF and RR.'),
    A(5, 'SQL query writing set', 'Databases', 'SQL', allB, 12, 25, 'Write 10 SQL queries on the given schema, including joins and GROUP BY.'),
    A(6, 'Subnetting drill', 'Computer Networks', 'IP Addresses', allB, 5, 20, 'Twenty subnetting and supernetting questions.'),
    A(7, 'Regular expressions and DFA design', 'Theory of Computation', 'RL, FA, RE & RG', allB, -3, 20, 'Design DFAs for the eight languages listed and give regular expressions.'),
    A(8, 'Aptitude speed sheet', 'General Aptitude', 'Quantitative Aptitude', allB, -6, 15, 'Thirty quick aptitude questions; aim for 30 minutes.')
  ]
  const submissions = []
  assignments.forEach(a => {
    const open = a.dueAt > now
    students.filter(s => a.batchIds.includes(s.batchId)).forEach(s => {
      if (s._stopsAt && s._stopsAt < a.createdAt) return
      if (!r.chance(open ? s._engagement * 0.45 : 0.35 + s._engagement * 0.6)) return
      const late = !open && r.chance(0.15)
      const submittedAt = Math.min(now - 3600000, late ? a.dueAt + r.int(1, 48) * 3600000 : a.dueAt - r.int(2, 120) * 3600000)
      if (submittedAt < a.createdAt) return
      const graded = !open && (a.dueAt < now - 3 * DAY || r.chance(0.3))
      const quality = sigmoid(s._ability + (s._skill[a.subject] || 0) + 0.6)
      submissions.push({
        assignmentId: a.id, studentId: s.id, submittedAt,
        marks: graded ? Math.max(0, Math.min(a.maxMarks, Math.round(a.maxMarks * (quality + r.normal() * 0.08)))) : null,
        feedback: graded && quality < 0.5 ? 'Revise the basics and redo the marked questions.' : ''
      })
    })
  })

  // --- Notices ---
  const notices = [
    { id: 'demo-n1', title: 'Full Mock 3 on Sunday', body: 'Full Mock 3 opens at 10 am this Sunday for all batches. 40 questions, 2 hours, negative marking on. Reach the centre by 9:45 if you are taking it on-site.', batchIds: [], pinned: true, priority: 'important', author: 'Centre office', createdAt: now - 2 * DAY, expiresAt: now + 12 * DAY },
    { id: 'demo-n2', title: 'Extra class: Pipelining doubts', body: 'Rahul sir is taking a doubt-clearing class on pipeline hazards on Thursday, 6 pm, Room 2.', batchIds: ['demo-b2', 'demo-b3'], pinned: false, priority: 'normal', author: 'Rahul Khanna', createdAt: now - 1 * DAY, expiresAt: now + 4 * DAY },
    { id: 'demo-n3', title: 'Weekend batch timing change', body: 'From next week the Saturday class starts at 9:30 am instead of 9 am.', batchIds: ['demo-b1'], pinned: false, priority: 'normal', author: 'Centre office', createdAt: now - 4 * DAY, expiresAt: now + 10 * DAY },
    { id: 'demo-n4', title: 'Full Mock 2 results are out', body: 'Results and question-wise analysis for Full Mock 2 are now live. Toppers: see the leaderboard.', batchIds: [], pinned: false, priority: 'normal', author: 'Centre office', createdAt: now - 6 * DAY, expiresAt: null },
    { id: 'demo-n5', title: 'GATE 2026 registration reminder', body: 'GATE 2026 application closes soon. Crash course students: bring a printout of your application to the office for verification.', batchIds: ['demo-b3'], pinned: true, priority: 'important', author: 'Centre office', createdAt: now - 8 * DAY, expiresAt: now + 20 * DAY },
    { id: 'demo-n6', title: 'Holiday on Friday', body: 'The centre is closed on Friday. Online tests stay open.', batchIds: [], pinned: false, priority: 'normal', author: 'Centre office', createdAt: now - 20 * DAY, expiresAt: now - 15 * DAY }
  ]

  const batchOf = Object.fromEntries(students.map(s => [s.id, s.batchId]))
  return {
    doc: { batches, faculty, questions, tests, assignments, submissions, notices, syllabus, batchOf, rawResults: results },
    students: students.map(({ id, name, email, batchId, joinedAt }) => ({ id, name, email, batchId, joinedAt, demo: true })),
    practice,
    generatedAt: now
  }
}
