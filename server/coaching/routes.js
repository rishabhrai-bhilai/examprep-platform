// The coaching admin API: /api/coaching/:cid/... for one centre's workspace.
// :cid is a real centre's id (its own admins, or a site admin) or "demo" (the
// demo centre, for any admin of the admin app). See store.js for the switch.
import crypto from 'crypto'
import { instituteDb } from '../db/index.js'
import { requireAuth, requireAdmin } from '../services/auth.js'
import { DEMO_ID, DEMO_NAME, demoEnabled, getDoc, saveDoc, workspace, setLibrary, getLibrary, resetDemo } from './store.js'
import { SYLLABUS, SUBJECTS, chapterKey } from './syllabus.js'
import * as A from './analytics.js'

const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max)
const idList = (v, allowed) => (Array.isArray(v) ? [...new Set(v.map(String))].filter(id => allowed.has(id)) : [])
const time = (v) => {
  const t = typeof v === 'number' ? v : Date.parse(v)
  return Number.isFinite(t) ? t : null
}
const DIFFICULTIES = ['Easy', 'Medium', 'Hard']
const TYPES = ['MCQ', 'MSQ', 'NAT']

class BadRequest extends Error {}
const bad = (msg) => { throw new BadRequest(msg) }

export function registerCoachingRoutes(app, { questions, testTitle }) {
  setLibrary(questions)

  // Who may open which workspace
  const access = (req, res, next) => {
    const cid = req.params.cid
    if (cid === DEMO_ID) {
      if (!demoEnabled()) return res.status(404).json({ error: 'The demo centre is turned off.' })
      if (!req.user.isAdmin && !instituteDb.findByAdmin(req.user.email).length) return res.status(403).json({ error: 'Only admin-app users can open the demo centre.' })
      req.centre = { id: DEMO_ID, name: DEMO_NAME, code: 'DEMO00', demo: true }
      return next()
    }
    const inst = instituteDb.findById(cid)
    if (!inst) return res.status(404).json({ error: 'Coaching centre not found.' })
    if (!req.user.isAdmin && !(inst.adminEmails || []).includes(req.user.email?.toLowerCase())) {
      return res.status(403).json({ error: "Only this centre's admins can do this." })
    }
    req.centre = { id: inst.id, name: inst.name, code: inst.code, demo: false, members: inst.members || [] }
    next()
  }
  const ws = (req) => workspace(req.centre, { testTitle })
  const route = (method, path, handler) => app[method](`/api/coaching/:cid${path}`, requireAuth, access, (req, res) => {
    try {
      const out = handler(req, res)
      if (out !== undefined && !res.headersSent) res.status(method === 'post' ? 201 : 200).json(out)
    } catch (err) {
      if (err instanceof BadRequest) return res.status(400).json({ error: err.message })
      console.error(`Coaching ${method.toUpperCase()} ${path} error:`, err)
      res.status(500).json({ error: 'Something went wrong.' })
    }
  })
  // Change the centre's document and save it
  const edit = (req, change) => {
    const doc = structuredClone(getDoc(req.centre))
    const out = change(doc)
    saveDoc(req.centre, doc)
    return out
  }
  const notFound = (res, what) => { res.status(404).json({ error: `${what} not found.` }) }

  // Workspaces this admin can open
  app.get('/api/coaching', requireAuth, (req, res) => {
    const mine = req.user.isAdmin ? instituteDb.getAll() : instituteDb.findByAdmin(req.user.email)
    const canDemo = demoEnabled() && (req.user.isAdmin || mine.length > 0)
    res.status(200).json({
      demoEnabled: canDemo,
      workspaces: [
        ...(canDemo ? [{ id: DEMO_ID, name: DEMO_NAME, demo: true }] : []),
        ...mine.map(i => ({ id: i.id, name: i.name, demo: false, students: (i.members || []).length }))
      ]
    })
  })
  app.post('/api/coaching/demo/reset', requireAuth, requireAdmin, (req, res) => {
    resetDemo()
    res.status(200).json({ ok: true })
  })

  // --- Workspace basics ---
  route('get', '/workspace', (req) => {
    const w = ws(req)
    return {
      centre: w.centre,
      batches: w.batches.map(b => ({ ...b, students: w.students.filter(s => s.batchId === b.id).length, faculty: (b.facultyIds || []).map(id => w.faculty.find(f => f.id === id)?.name).filter(Boolean) })),
      faculty: w.faculty,
      unassigned: w.students.filter(s => !s.batchId).length,
      syllabus: SYLLABUS,
      counts: { students: w.students.length, questions: w.questions.length, tests: w.tests.length }
    }
  })
  route('get', '/overview', (req) => A.overview(ws(req)))

  // --- 1. Students and batches ---
  route('get', '/students', (req) => ({ students: A.studentRows(ws(req), { batchId: req.query.batchId || undefined }) }))
  route('post', '/students', (req) => {
    if (!req.centre.demo) bad('Students join with the centre code on the student site.')
    const name = str(req.body?.name, 80)
    if (!name) bad('Enter a name.')
    return edit(req, doc => {
      const id = newId('demo-s')
      const batchId = doc.batches.some(b => b.id === req.body?.batchId) ? req.body.batchId : null
      doc.extraStudents = [...(doc.extraStudents || []), { id, name, email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@demo.example`, joinedAt: Date.now(), demo: true }]
      doc.batchOf = { ...doc.batchOf, [id]: batchId }
      return { student: { id, name, batchId } }
    })
  })
  route('patch', '/students/:sid', (req, res) => {
    const w = ws(req)
    if (!w.studentById.has(req.params.sid)) return notFound(res, 'Student')
    const batchId = req.body?.batchId || null
    if (batchId && !w.batchById.has(batchId)) bad('Unknown batch.')
    return edit(req, doc => {
      doc.batchOf = { ...doc.batchOf, [req.params.sid]: batchId }
      return { ok: true }
    })
  })
  route('get', '/students/:sid/report', (req, res) => A.studentReport(ws(req), req.params.sid) || notFound(res, 'Student'))

  const batchFields = (body, doc) => {
    const out = {}
    if (body.name !== undefined) { out.name = str(body.name, 80); if (!out.name) bad('Enter a batch name.') }
    if (body.course !== undefined) out.course = str(body.course, 120)
    if (body.schedule !== undefined) out.schedule = str(body.schedule, 120)
    if (body.startDate !== undefined) out.startDate = time(body.startDate)
    if (body.facultyIds !== undefined) out.facultyIds = idList(body.facultyIds, new Set(doc.faculty.map(f => f.id)))
    return out
  }
  route('post', '/batches', (req) => edit(req, doc => {
    const b = { id: newId('bat'), name: '', course: '', schedule: '', startDate: Date.now(), facultyIds: [], createdAt: Date.now(), ...batchFields({ name: '', ...req.body }, doc) }
    doc.batches.push(b)
    doc.faculty = doc.faculty.map(f => (b.facultyIds.includes(f.id) ? { ...f, batchIds: [...new Set([...(f.batchIds || []), b.id])] } : f))
    return { batch: b }
  }))
  route('patch', '/batches/:bid', (req, res) => {
    if (!getDoc(req.centre).batches.some(b => b.id === req.params.bid)) return notFound(res, 'Batch')
    return edit(req, doc => {
      const updates = batchFields(req.body || {}, doc)
      doc.batches = doc.batches.map(b => (b.id === req.params.bid ? { ...b, ...updates } : b))
      if (updates.facultyIds) doc.faculty = doc.faculty.map(f => ({ ...f, batchIds: updates.facultyIds.includes(f.id) ? [...new Set([...(f.batchIds || []), req.params.bid])] : (f.batchIds || []).filter(id => id !== req.params.bid) }))
      return { batch: doc.batches.find(b => b.id === req.params.bid) }
    })
  })
  route('delete', '/batches/:bid', (req, res) => {
    if (!getDoc(req.centre).batches.some(b => b.id === req.params.bid)) return notFound(res, 'Batch')
    return edit(req, doc => {
      const bid = req.params.bid
      doc.batches = doc.batches.filter(b => b.id !== bid)
      doc.batchOf = Object.fromEntries(Object.entries(doc.batchOf || {}).map(([k, v]) => [k, v === bid ? null : v]))
      doc.faculty = doc.faculty.map(f => ({ ...f, batchIds: (f.batchIds || []).filter(id => id !== bid) }))
      return { ok: true }
    })
  })

  // --- 4. Question bank: the centre's own questions plus the PYQ library ---
  const summary = (q) => ({
    id: q.id, code: q.code || null, source: q.source, subject: q.subject, chapter: q.chapter, topic: q.topic || null,
    difficulty: q.difficulty || 'Medium', type: q.type || 'MCQ', marks: q.marks || 1, year: q.year || null,
    text: A.plainText(q.question).slice(0, 260), options: q.options || null, answer: q.answer,
    createdAt: q.createdAt || null
  })
  route('get', '/questions', (req) => {
    const w = ws(req)
    const { subject, chapter, difficulty, type, source, q } = req.query
    const page = Math.max(1, Number(req.query.page) || 1)
    const size = Math.min(100, Math.max(5, Number(req.query.pageSize) || 25))
    const needle = str(q, 80).toLowerCase()
    const pool = source === 'pyq' ? getLibrary() : source === 'centre' ? w.questions : w.questions.concat(getLibrary())
    const hits = pool.filter(x =>
      (!subject || x.subject === subject) && (!chapter || x.chapter === chapter) && (!difficulty || x.difficulty === difficulty) &&
      (!type || (x.type || 'MCQ') === type) && (!needle || String(x.question || '').toLowerCase().includes(needle) || String(x.code || '').toLowerCase().includes(needle) || String(x.topic || '').toLowerCase().includes(needle)))
    // How often each question is used in this centre's tests
    const used = new Map()
    w.tests.forEach(t => (t.questionIds || []).forEach(id => used.set(String(id), (used.get(String(id)) || 0) + 1)))
    return {
      total: hits.length, page, pageSize: size,
      counts: { centre: w.questions.length, pyq: getLibrary().length },
      items: hits.slice((page - 1) * size, page * size).map(x => ({ ...summary(x), usedIn: used.get(String(x.id)) || 0 }))
    }
  })
  route('get', '/questions/:qid', (req, res) => {
    const w = ws(req)
    const q = w.questionById.get(req.params.qid) || w.questionById.get(Number(req.params.qid))
    if (!q) return notFound(res, 'Question')
    return { question: { ...summary(q), question: q.question, explanation: q.explanation || '', answerAlternatives: q.answerAlternatives || [], negativeMarks: q.negativeMarks ?? null } }
  })
  const questionFields = (body) => {
    const subject = str(body.subject, 80)
    if (!SUBJECTS.includes(subject)) bad('Pick a subject.')
    const chapter = str(body.chapter, 120)
    if (!SYLLABUS.find(s => s.subject === subject).chapters.includes(chapter)) bad('Pick a chapter of that subject.')
    const type = TYPES.includes(body.type) ? body.type : 'MCQ'
    const question = str(body.question, 4000)
    if (question.length < 5) bad('Write the question.')
    const marks = Number(body.marks) === 2 ? 2 : 1
    let options = null
    let answer
    if (type === 'NAT') {
      answer = str(body.answer, 60)
      if (!answer || !/^-?[\d.]+(\s+to\s+-?[\d.]+)?$/i.test(answer)) bad('NAT answers are a number or a range like "2.5 to 2.6".')
    } else {
      options = (Array.isArray(body.options) ? body.options : []).map(o => str(o, 500)).filter(Boolean)
      if (options.length < 2 || options.length > 6) bad('Give 2 to 6 options.')
      if (type === 'MSQ') {
        answer = [...new Set((Array.isArray(body.answer) ? body.answer : []).map(Number))].filter(i => i >= 0 && i < options.length).sort()
        if (!answer.length) bad('Tick at least one correct option.')
      } else {
        answer = Number(body.answer)
        if (!(answer >= 0 && answer < options.length)) bad('Pick the correct option.')
      }
    }
    return {
      subject, chapter, type, question, marks, options, answer, answerAlternatives: [],
      difficulty: DIFFICULTIES.includes(body.difficulty) ? body.difficulty : 'Medium',
      negativeMarks: type === 'MCQ' ? Math.round((marks / 3) * 100) / 100 : 0,
      explanation: str(body.explanation, 4000)
    }
  }
  route('post', '/questions', (req) => edit(req, doc => {
    const q = { id: newId(req.centre.demo ? 'demo-q' : 'cq'), source: 'centre', ...questionFields(req.body || {}), createdBy: str(req.body?.createdBy, 60) || null, createdAt: Date.now() }
    doc.questions.push(q)
    return { question: q }
  }))
  route('patch', '/questions/:qid', (req, res) => {
    if (!getDoc(req.centre).questions.some(q => q.id === req.params.qid)) return notFound(res, "Question (only the centre's own questions can be edited)")
    return edit(req, doc => {
      const fields = questionFields(req.body || {})
      doc.questions = doc.questions.map(q => (q.id === req.params.qid ? { ...q, ...fields, updatedAt: Date.now() } : q))
      return { question: doc.questions.find(q => q.id === req.params.qid) }
    })
  })
  route('delete', '/questions/:qid', (req, res) => {
    const doc0 = getDoc(req.centre)
    if (!doc0.questions.some(q => q.id === req.params.qid)) return notFound(res, 'Question')
    if (doc0.tests.some(t => (t.questionIds || []).includes(req.params.qid))) bad('This question is in a test. Remove it from the test first.')
    return edit(req, doc => {
      doc.questions = doc.questions.filter(q => q.id !== req.params.qid)
      return { ok: true }
    })
  })

  // --- 3 and 5. Tests: creation, scheduling, automatic evaluation ---
  route('get', '/tests', (req) => ({ tests: A.testSummaries(ws(req)) }))
  route('get', '/tests/:tid', (req, res) => {
    const w = ws(req)
    const t = w.testById.get(req.params.tid)
    if (!t) return notFound(res, 'Test')
    const summary = A.testSummaries(w).find(x => x.id === t.id)
    return {
      test: { ...summary, questionIds: t.questionIds || [], bonusIds: t.bonusIds || [], keyOverrides: t.keyOverrides || {}, description: t.description || '' },
      questions: A.questionAnalytics(w, t.id),
      results: A.leaderboard(w, { testId: t.id }).rows,
      evaluatedAt: w.now
    }
  })
  // Questions for a blueprint: [{ subject, chapter?, difficulty?, count }], picked
  // at random from the centre's questions and the PYQ library
  const pickByBlueprint = (w, blueprint) => {
    const chosen = []
    const taken = new Set()
    ;(Array.isArray(blueprint) ? blueprint : []).slice(0, 20).forEach(row => {
      const n = Math.min(65, Math.max(0, Math.round(Number(row.count) || 0)))
      const pool = w.questions.concat(getLibrary()).filter(q =>
        q.subject === row.subject && (!row.chapter || q.chapter === row.chapter) && (!row.difficulty || q.difficulty === row.difficulty) && !taken.has(String(q.id)) && !q.marksToAll)
      for (let i = pool.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1)
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
      }
      pool.slice(0, n).forEach(q => { taken.add(String(q.id)); chosen.push(q.id) })
    })
    return chosen
  }
  const testFields = (body, w, doc) => {
    const out = {}
    if (body.title !== undefined) { out.title = str(body.title, 120); if (!out.title) bad('Give the test a title.') }
    if (body.description !== undefined) out.description = str(body.description, 1000)
    if (body.batchIds !== undefined) out.batchIds = idList(body.batchIds, new Set(doc.batches.map(b => b.id)))
    if (body.durationMin !== undefined) {
      out.durationMin = Math.round(Number(body.durationMin))
      if (!(out.durationMin >= 5 && out.durationMin <= 300)) bad('Duration must be 5 to 300 minutes.')
    }
    if (body.scheduledAt !== undefined) {
      out.scheduledAt = time(body.scheduledAt)
      if (!out.scheduledAt) bad('Pick when the test opens.')
    }
    if (body.windowEndsAt !== undefined) out.windowEndsAt = body.windowEndsAt ? time(body.windowEndsAt) : null
    if (body.negativeMarking !== undefined) out.negativeMarking = Boolean(body.negativeMarking)
    if (body.published !== undefined) out.published = Boolean(body.published)
    if (body.questionIds !== undefined || body.blueprint !== undefined) {
      const fromList = Array.isArray(body.questionIds) ? body.questionIds.map(id => (w.questionById.has(id) ? id : Number(id))).filter(id => w.questionById.has(id)) : []
      out.questionIds = [...new Set([...fromList, ...pickByBlueprint(w, body.blueprint)])].slice(0, 200)
      if (!out.questionIds.length) bad('Add at least one question.')
    }
    return out
  }
  route('post', '/tests', (req) => {
    const w = ws(req)
    return edit(req, doc => {
      const fields = testFields({ title: '', durationMin: 60, scheduledAt: Date.now() + 86400000, questionIds: [], ...req.body }, w, doc)
      const t = {
        id: newId(req.centre.demo ? 'demo-t' : 'ct'), kind: 'centre', batchIds: [], negativeMarking: true, published: true,
        bonusIds: [], keyOverrides: {}, createdBy: str(req.body?.createdBy, 60) || null, createdAt: Date.now(), ...fields
      }
      if (!t.windowEndsAt) t.windowEndsAt = t.scheduledAt + (t.durationMin + 24 * 60) * 60000
      doc.tests.push(t)
      return { test: t }
    })
  })
  route('patch', '/tests/:tid', (req, res) => {
    const w = ws(req)
    if (!getDoc(req.centre).tests.some(t => t.id === req.params.tid)) return notFound(res, 'Test')
    return edit(req, doc => {
      const fields = testFields(req.body || {}, w, doc)
      doc.tests = doc.tests.map(t => (t.id === req.params.tid ? { ...t, ...fields, updatedAt: Date.now() } : t))
      return { test: doc.tests.find(t => t.id === req.params.tid) }
    })
  })
  route('delete', '/tests/:tid', (req, res) => {
    if (!getDoc(req.centre).tests.some(t => t.id === req.params.tid)) return notFound(res, 'Test')
    return edit(req, doc => {
      doc.tests = doc.tests.filter(t => t.id !== req.params.tid)
      doc.rawResults = (doc.rawResults || []).filter(r => r.testId !== req.params.tid)
      return { ok: true }
    })
  })
  // Fix a key, award marks to all, or undo: every result is re-scored at once
  route('post', '/tests/:tid/key', (req, res) => {
    const w = ws(req)
    const test = getDoc(req.centre).tests.find(t => t.id === req.params.tid)
    if (!test) return notFound(res, 'Test')
    const qid = (test.questionIds || []).find(id => String(id) === String(req.body?.questionId))
    if (qid === undefined) bad('That question is not in this test.')
    const q = w.questionById.get(qid)
    edit(req, doc => {
      const t = doc.tests.find(x => x.id === test.id)
      t.keyOverrides = { ...(t.keyOverrides || {}) }
      t.bonusIds = (t.bonusIds || []).filter(id => String(id) !== String(qid))
      if (req.body.reset) {
        delete t.keyOverrides[qid]
      } else if (req.body.bonus) {
        t.bonusIds.push(qid)
      } else {
        const ans = req.body.answer
        if (q.type === 'NAT') {
          if (!/^-?[\d.]+(\s+to\s+-?[\d.]+)?$/i.test(String(ans || ''))) bad('Enter a number or a range.')
          t.keyOverrides[qid] = String(ans)
        } else if (q.type === 'MSQ') {
          const list = [...new Set((Array.isArray(ans) ? ans : []).map(Number))].filter(i => i >= 0 && i < (q.options || []).length).sort()
          if (!list.length) bad('Tick at least one option.')
          t.keyOverrides[qid] = list
        } else {
          if (!(Number(ans) >= 0 && Number(ans) < (q.options || []).length)) bad('Pick an option.')
          if (Number(ans) === Number(q.answer)) delete t.keyOverrides[qid]
          else t.keyOverrides[qid] = Number(ans)
        }
      }
    })
    const after = ws(req)
    return { questions: A.questionAnalytics(after, test.id), results: A.leaderboard(after, { testId: test.id }).rows, evaluatedAt: after.now }
  })

  // --- 6. Leaderboard ---
  route('get', '/leaderboard', (req) => A.leaderboard(ws(req), { batchId: req.query.batchId || undefined, testId: req.query.testId || undefined }))

  // --- 7. Course completion ---
  route('get', '/syllabus', (req) => A.syllabusProgress(ws(req), { batchId: req.query.batchId || undefined }))
  route('put', '/syllabus', (req) => {
    const { batchId, subject, chapter, done, facultyId } = req.body || {}
    const doc0 = getDoc(req.centre)
    if (!doc0.batches.some(b => b.id === batchId)) bad('Pick a batch.')
    if (!SYLLABUS.find(s => s.subject === subject)?.chapters.includes(chapter)) bad('Unknown chapter.')
    return edit(req, doc => {
      const key = chapterKey(subject, chapter)
      const current = { ...(doc.syllabus?.[batchId] || {}) }
      if (done) current[key] = { doneAt: time(req.body.doneAt) || Date.now(), facultyId: doc.faculty.some(f => f.id === facultyId) ? facultyId : null }
      else delete current[key]
      doc.syllabus = { ...(doc.syllabus || {}), [batchId]: current }
      return { ok: true }
    })
  })

  // --- 8, 12, 13, 16, 17. Analytics ---
  const scope = (req) => ({ batchId: req.query.batchId || undefined, studentId: req.query.studentId || undefined, facultyId: req.query.facultyId || undefined })
  route('get', '/analytics', (req) => A.subjectAnalytics(ws(req), scope(req)))
  route('get', '/weaknesses', (req) => A.weaknesses(ws(req), scope(req)))
  route('get', '/compare', (req) => A.batchComparison(ws(req)))
  route('get', '/activity', (req) => A.activity(ws(req), { batchId: req.query.batchId || undefined, days: Math.min(90, Math.max(7, Number(req.query.days) || 30)) }))
  route('get', '/insights', (req) => ({
    // Rule-based today; see the MODEL HOOK note in analytics.js insights()
    source: 'rules', label: 'Automated insights', items: A.insights(ws(req), scope(req))
  }))

  // --- 14. Faculty ---
  const facultyFields = (body, doc) => {
    const out = {}
    if (body.name !== undefined) { out.name = str(body.name, 80); if (!out.name) bad('Enter a name.') }
    if (body.email !== undefined) {
      out.email = str(body.email, 120).toLowerCase()
      if (out.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.email)) bad('That email looks wrong.')
    }
    if (body.subjects !== undefined) out.subjects = (Array.isArray(body.subjects) ? body.subjects : []).filter(s => SUBJECTS.includes(s))
    if (body.batchIds !== undefined) out.batchIds = idList(body.batchIds, new Set(doc.batches.map(b => b.id)))
    return out
  }
  const syncBatchFaculty = (doc) => {
    doc.batches = doc.batches.map(b => ({ ...b, facultyIds: doc.faculty.filter(f => (f.batchIds || []).includes(b.id)).map(f => f.id) }))
  }
  route('get', '/faculty', (req) => {
    const w = ws(req)
    return { faculty: w.faculty.map(f => ({ ...f, batches: (f.batchIds || []).map(id => w.batchById.get(id)?.name).filter(Boolean) })) }
  })
  route('post', '/faculty', (req) => edit(req, doc => {
    const f = { id: newId('fac'), name: '', email: '', subjects: [], batchIds: [], joinedAt: Date.now(), ...facultyFields({ name: '', ...req.body }, doc) }
    doc.faculty.push(f)
    syncBatchFaculty(doc)
    return { faculty: f }
  }))
  route('patch', '/faculty/:fid', (req, res) => {
    if (!getDoc(req.centre).faculty.some(f => f.id === req.params.fid)) return notFound(res, 'Faculty member')
    return edit(req, doc => {
      const updates = facultyFields(req.body || {}, doc)
      doc.faculty = doc.faculty.map(f => (f.id === req.params.fid ? { ...f, ...updates } : f))
      syncBatchFaculty(doc)
      return { faculty: doc.faculty.find(f => f.id === req.params.fid) }
    })
  })
  route('delete', '/faculty/:fid', (req, res) => {
    if (!getDoc(req.centre).faculty.some(f => f.id === req.params.fid)) return notFound(res, 'Faculty member')
    return edit(req, doc => {
      doc.faculty = doc.faculty.filter(f => f.id !== req.params.fid)
      syncBatchFaculty(doc)
      return { ok: true }
    })
  })
  route('get', '/faculty/:fid/dashboard', (req, res) => A.facultyDashboard(ws(req), req.params.fid) || notFound(res, 'Faculty member'))

  // --- 15. Assignments ---
  route('get', '/assignments', (req) => ({ assignments: A.assignmentSummaries(ws(req)) }))
  const assignmentFields = (body, doc) => {
    const out = {}
    if (body.title !== undefined) { out.title = str(body.title, 160); if (!out.title) bad('Give the assignment a title.') }
    if (body.description !== undefined) out.description = str(body.description, 3000)
    if (body.subject !== undefined) out.subject = SUBJECTS.includes(body.subject) ? body.subject : null
    if (body.chapter !== undefined) out.chapter = str(body.chapter, 120) || null
    if (body.batchIds !== undefined) out.batchIds = idList(body.batchIds, new Set(doc.batches.map(b => b.id)))
    if (body.dueAt !== undefined) { out.dueAt = time(body.dueAt); if (!out.dueAt) bad('Pick a due date.') }
    if (body.maxMarks !== undefined) {
      out.maxMarks = Math.round(Number(body.maxMarks))
      if (!(out.maxMarks >= 1 && out.maxMarks <= 500)) bad('Maximum marks must be 1 to 500.')
    }
    if (body.facultyId !== undefined) out.facultyId = doc.faculty.some(f => f.id === body.facultyId) ? body.facultyId : null
    return out
  }
  route('post', '/assignments', (req) => edit(req, doc => {
    const a = { id: newId('asg'), title: '', description: '', subject: null, chapter: null, batchIds: [], dueAt: Date.now() + 7 * 86400000, maxMarks: 20, facultyId: null, createdAt: Date.now(), ...assignmentFields({ title: '', ...req.body }, doc) }
    doc.assignments.push(a)
    return { assignment: a }
  }))
  route('patch', '/assignments/:aid', (req, res) => {
    if (!getDoc(req.centre).assignments.some(a => a.id === req.params.aid)) return notFound(res, 'Assignment')
    return edit(req, doc => {
      const updates = assignmentFields(req.body || {}, doc)
      doc.assignments = doc.assignments.map(a => (a.id === req.params.aid ? { ...a, ...updates } : a))
      return { assignment: doc.assignments.find(a => a.id === req.params.aid) }
    })
  })
  route('delete', '/assignments/:aid', (req, res) => {
    if (!getDoc(req.centre).assignments.some(a => a.id === req.params.aid)) return notFound(res, 'Assignment')
    return edit(req, doc => {
      doc.assignments = doc.assignments.filter(a => a.id !== req.params.aid)
      doc.submissions = doc.submissions.filter(s => s.assignmentId !== req.params.aid)
      return { ok: true }
    })
  })
  // Record a submission (e.g. handed in on paper) and/or its marks; clear to remove it
  route('put', '/assignments/:aid/submissions/:sid', (req, res) => {
    const w = ws(req)
    const a = w.assignments.find(x => x.id === req.params.aid)
    if (!a) return notFound(res, 'Assignment')
    if (!w.studentById.has(req.params.sid)) return notFound(res, 'Student')
    const body = req.body || {}
    let marks = null
    if (body.marks !== null && body.marks !== undefined && body.marks !== '') {
      marks = Number(body.marks)
      if (!(marks >= 0 && marks <= a.maxMarks)) bad(`Marks must be 0 to ${a.maxMarks}.`)
    }
    return edit(req, doc => {
      const rest = doc.submissions.filter(s => !(s.assignmentId === a.id && s.studentId === req.params.sid))
      const current = doc.submissions.find(s => s.assignmentId === a.id && s.studentId === req.params.sid)
      if (body.clear) {
        doc.submissions = rest
        return { ok: true }
      }
      const sub = { assignmentId: a.id, studentId: req.params.sid, submittedAt: current?.submittedAt || time(body.submittedAt) || Date.now(), marks, feedback: str(body.feedback, 1000) }
      doc.submissions = [...rest, sub]
      return { submission: sub }
    })
  })

  // --- 10. Notice board ---
  const noticeFields = (body, doc) => {
    const out = {}
    if (body.title !== undefined) { out.title = str(body.title, 160); if (!out.title) bad('Give the notice a title.') }
    if (body.body !== undefined) out.body = str(body.body, 4000)
    if (body.batchIds !== undefined) out.batchIds = idList(body.batchIds, new Set(doc.batches.map(b => b.id)))
    if (body.pinned !== undefined) out.pinned = Boolean(body.pinned)
    if (body.priority !== undefined) out.priority = body.priority === 'important' ? 'important' : 'normal'
    if (body.author !== undefined) out.author = str(body.author, 80)
    if (body.expiresAt !== undefined) out.expiresAt = body.expiresAt ? time(body.expiresAt) : null
    return out
  }
  route('get', '/notices', (req) => {
    const w = ws(req)
    return {
      notices: w.notices.map(n => ({ ...n, batches: (n.batchIds || []).map(id => w.batchById.get(id)?.name).filter(Boolean), expired: Boolean(n.expiresAt && n.expiresAt < w.now) }))
        .sort((a, b) => (a.expired - b.expired) || (b.pinned - a.pinned) || b.createdAt - a.createdAt)
    }
  })
  route('post', '/notices', (req) => edit(req, doc => {
    const n = { id: newId('ntc'), title: '', body: '', batchIds: [], pinned: false, priority: 'normal', author: req.user.name || 'Centre office', expiresAt: null, createdAt: Date.now(), ...noticeFields({ title: '', ...req.body }, doc) }
    doc.notices.push(n)
    return { notice: n }
  }))
  route('patch', '/notices/:nid', (req, res) => {
    if (!getDoc(req.centre).notices.some(n => n.id === req.params.nid)) return notFound(res, 'Notice')
    return edit(req, doc => {
      const updates = noticeFields(req.body || {}, doc)
      doc.notices = doc.notices.map(n => (n.id === req.params.nid ? { ...n, ...updates, updatedAt: Date.now() } : n))
      return { notice: doc.notices.find(n => n.id === req.params.nid) }
    })
  })
  route('delete', '/notices/:nid', (req, res) => {
    if (!getDoc(req.centre).notices.some(n => n.id === req.params.nid)) return notFound(res, 'Notice')
    return edit(req, doc => {
      doc.notices = doc.notices.filter(n => n.id !== req.params.nid)
      return { ok: true }
    })
  })

  // --- 18. Report data (the admin app builds the PDF / Excel files from it) ---
  route('get', '/report/batch', (req) => A.batchReport(ws(req), req.query.batchId || undefined))
}
