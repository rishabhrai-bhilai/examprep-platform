// The admin app's API for site admins (ADMIN_EMAILS) only: overview numbers,
// every student, and test series. Coaching-centre routes live in server.js
// (/api/institutes): centre admins use those too, and only ever see their own
// centre's students.
import { userDb, seriesDb, instituteDb, attemptDb, mockAttemptDb } from '../db/index.js'
import { requireAuth, requireAdmin } from '../services/auth.js'
import { seriesAccess, centreSeat } from '../services/access.js'
import { studentReport } from '../services/institutes.js'
import { dayKey } from '../../shared/practice.js'

const DAY_MS = 24 * 3600 * 1000
const ADMIN_TZ = 'Asia/Kolkata'

const lastDays = (n, now = Date.now()) => {
  const today = dayKey(now, ADMIN_TZ)
  const [y, m, d] = today.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(y, m - 1, d - (n - 1 - i))).toISOString().slice(0, 10))
}

export function registerAdminRoutes(app, { mockTests, refreshPracticeStats, questionSubjects, testTitle }) {
  const admin = [requireAuth, requireAdmin]
  const testIds = new Set(mockTests.map(t => t.id))

  const groupMocks = () => {
    const byUser = new Map()
    mockAttemptDb.getAll().forEach(a => {
      if (!byUser.has(a.userId)) byUser.set(a.userId, [])
      byUser.get(a.userId).push(a)
    })
    return byUser
  }

  const reportFor = (user, allPractice, mocksByUser, now) => studentReport({
    user,
    joinedAt: null,
    practice: allPractice[user.id] || { attempts: {}, days: {}, timeZone: null },
    mocks: mocksByUser.get(user.id) || [],
    streak: user.streak,
    subjectOf: (id) => questionSubjects.get(Number(id)),
    testTitle,
    now
  })

  // Students holding a centre seat, per series
  const seatHolders = () => {
    const bySeries = {}
    instituteDb.getAll().forEach(i => (i.members || []).forEach(m => {
      if (centreSeat(m.userId, i)) i.seriesIds.forEach(id => { bySeries[id] = (bySeries[id] || 0) + 1 })
    }))
    return bySeries
  }

  // --- OVERVIEW ---
  app.get('/api/admin/overview', ...admin, (req, res) => {
    try {
      const now = Date.now()
      const days = lastDays(30, now)
      const users = userDb.getAll()
      const allPractice = attemptDb.getAll()
      const mocks = mockAttemptDb.getAll()
      const centres = instituteDb.getAll()

      const daily = Object.fromEntries(days.map(d => [d, { date: d, signups: 0, active: new Set(), mocks: 0 }]))
      users.forEach(u => {
        const d = u.createdAt && dayKey(u.createdAt, ADMIN_TZ)
        if (daily[d]) daily[d].signups++
      })
      Object.entries(allPractice).forEach(([userId, p]) => {
        Object.entries(p?.days || {}).forEach(([d, v]) => { if (daily[d] && v?.attempts > 0) daily[d].active.add(userId) })
      })
      mocks.forEach(a => {
        const d = dayKey(a.submittedAt, ADMIN_TZ)
        if (daily[d]) { daily[d].active.add(a.userId); daily[d].mocks++ }
      })
      const activeLast7 = new Set()
      days.slice(-7).forEach(d => daily[d].active.forEach(id => activeLast7.add(id)))
      const since30 = now - 30 * DAY_MS

      res.status(200).json({
        totals: {
          students: users.length,
          newLast30: users.filter(u => (u.createdAt || 0) >= since30).length,
          activeLast7: activeLast7.size,
          activeToday: daily[days[days.length - 1]].active.size,
          mockAttempts: mocks.length,
          mockAttemptsLast30: mocks.filter(a => a.submittedAt >= since30).length,
          centres: centres.length,
          centreStudents: centres.reduce((n, i) => n + (i.members || []).length, 0),
          seats: centres.reduce((n, i) => n + ((i.seriesIds || []).length ? i.seats || 0 : 0), 0),
          series: seriesDb.getAll().length,
          publishedSeries: seriesDb.getAll().filter(s => s.published).length
        },
        daily: days.map(d => ({ date: d, signups: daily[d].signups, active: daily[d].active.size, mocks: daily[d].mocks })),
        centres: centres
          .map(i => ({ id: i.id, name: i.name, students: (i.members || []).length, seats: i.seats || 0, series: (i.seriesIds || []).length }))
          .sort((a, b) => b.students - a.students)
          .slice(0, 8),
        generatedAt: now
      })
    } catch (err) {
      console.error('Admin overview error:', err)
      res.status(500).json({ error: 'Failed to load the overview.' })
    }
  })

  // --- STUDENTS ---
  app.get('/api/admin/students', ...admin, (req, res) => {
    try {
      const now = Date.now()
      const allPractice = attemptDb.getAll()
      const mocksByUser = groupMocks()
      const centreOf = new Map()
      instituteDb.getAll().forEach(i => (i.members || []).forEach(m => centreOf.set(m.userId, i)))
      const students = userDb.getAll().map(u => {
        const user = refreshPracticeStats(u)
        // The table needs totals only: drop the per-test, per-subject and per-day lists
        const row = reportFor(user, allPractice, mocksByUser, now)
        delete row.mocks
        delete row.subjects
        delete row.activity
        const centre = centreOf.get(u.id)
        return {
          ...row,
          provider: user.provider,
          centre: centre?.name || null,
          hasSeat: !!(centre && centreSeat(u.id, centre))
        }
      })
      res.status(200).json({ students, generatedAt: now })
    } catch (err) {
      console.error('Admin students error:', err)
      res.status(500).json({ error: 'Failed to load students.' })
    }
  })

  app.get('/api/admin/students/:id', ...admin, (req, res) => {
    const raw = userDb.findById(req.params.id)
    if (!raw) return res.status(404).json({ error: 'Student not found.' })
    const now = Date.now()
    const user = refreshPracticeStats(raw)
    const report = reportFor(user, attemptDb.getAll(), groupMocks(), now)
    const centre = instituteDb.findByMember(user.id)
    const access = seriesAccess({ id: user.id, isAdmin: false })
    res.status(200).json({
      student: {
        ...report,
        phone: user.phone || null,
        provider: user.provider,
        centre: centre ? { id: centre.id, name: centre.name, joinedAt: centre.members.find(m => m.userId === user.id)?.joinedAt } : null,
        access: [...access.entries()].map(([seriesId, a]) => ({ seriesId, title: seriesDb.findById(seriesId)?.title || seriesId, ...a }))
      }
    })
  })

  // --- TEST SERIES ---
  const seriesInput = (body, existing = {}) => {
    const out = {}
    if (body.title !== undefined || !existing.id) {
      const title = String(body.title || '').trim()
      if (title.length < 3 || title.length > 100) return { error: 'Title must be 3 to 100 characters.' }
      out.title = title
    }
    if (body.description !== undefined) out.description = String(body.description || '').trim().slice(0, 2000)
    if (body.testIds !== undefined) {
      if (!Array.isArray(body.testIds)) return { error: 'Pick the tests in this series.' }
      out.testIds = Array.from(new Set(body.testIds.map(String))).filter(id => testIds.has(id))
    }
    if (body.published !== undefined) out.published = !!body.published
    const next = { ...existing, ...out }
    if (next.published && !(next.testIds || []).length) return { error: 'Add at least one test before making it live.' }
    return { value: out }
  }

  app.get('/api/admin/series', ...admin, (req, res) => {
    const holders = seatHolders()
    const centres = instituteDb.getAll()
    res.status(200).json({
      series: seriesDb.getAll().sort((a, b) => b.createdAt - a.createdAt).map(s => ({
        ...s,
        activeStudents: holders[s.id] || 0,
        centres: centres.filter(c => (c.seriesIds || []).includes(s.id)).map(c => c.name)
      })),
      tests: mockTests.map(t => ({ id: t.id, title: t.title, subject: t.subject, totalQuestions: t.totalQuestions, durationMinutes: t.durationMinutes, difficulty: t.difficulty }))
    })
  })

  app.post('/api/admin/series', ...admin, (req, res) => {
    const input = seriesInput(req.body || {})
    if (input.error) return res.status(400).json({ error: input.error })
    const series = seriesDb.create({ description: '', testIds: [], published: false, ...input.value, createdBy: req.user.email })
    res.status(201).json({ series })
  })

  app.patch('/api/admin/series/:id', ...admin, (req, res) => {
    const existing = seriesDb.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Test series not found.' })
    const input = seriesInput(req.body || {}, existing)
    if (input.error) return res.status(400).json({ error: input.error })
    res.status(200).json({ series: seriesDb.update(existing.id, input.value) })
  })

  // Deleting a series unlocks its tests for everyone and takes it off every centre
  app.delete('/api/admin/series/:id', ...admin, (req, res) => {
    const existing = seriesDb.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Test series not found.' })
    seriesDb.delete(existing.id)
    instituteDb.getAll().filter(i => (i.seriesIds || []).includes(existing.id))
      .forEach(i => instituteDb.update(i.id, { seriesIds: i.seriesIds.filter(id => id !== existing.id) }))
    res.status(200).json({ ok: true })
  })
}
