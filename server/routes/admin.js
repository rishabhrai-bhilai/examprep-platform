// The admin app's API (site admins from ADMIN_EMAILS only): overview numbers,
// every student, sales and refunds, test series, coupons and access grants.
// Coaching-centre routes live in server.js (/api/institutes), since centre
// admins use those too.
import { userDb, seriesDb, orderDb, couponDb, instituteDb, attemptDb, mockAttemptDb } from '../db/index.js'
import { requireAuth, requireAdmin } from '../services/auth.js'
import { seriesAccess, centreSeat, orderIsActive } from '../services/access.js'
import { refundRazorpayPayment, isRazorpayConfigured } from '../services/razorpay.js'
import { studentReport } from '../services/institutes.js'
import { dayKey } from '../../shared/practice.js'
import { publicOrder, markOrderPaid } from './store.js'

const DAY_MS = 24 * 3600 * 1000
const ADMIN_TZ = 'Asia/Kolkata'
const MAX_PRICE_PAISE = 10_000_000 // ₹1,00,000

const lastDays = (n, now = Date.now()) => {
  const today = dayKey(now, ADMIN_TZ)
  const [y, m, d] = today.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(y, m - 1, d - (n - 1 - i))).toISOString().slice(0, 10))
}

// Rupees from the form ("499", 499.5) -> paise, or null when invalid
const toPaise = (value, { allowEmpty = false } = {}) => {
  if (allowEmpty && (value === '' || value === null || value === undefined)) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return undefined
  const paise = Math.round(n * 100)
  return paise > MAX_PRICE_PAISE ? undefined : paise
}

export function registerAdminRoutes(app, { mockTests, refreshPracticeStats, questionSubjects, testTitle, postLimiter }) {
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

  // --- OVERVIEW ---
  app.get('/api/admin/overview', ...admin, (req, res) => {
    try {
      const now = Date.now()
      const days = lastDays(30, now)
      const users = userDb.getAll()
      const orders = orderDb.getAll()
      const paid = orders.filter(o => o.status === 'paid' || o.status === 'refunded')
      const realSales = paid.filter(o => o.amountPaise > 0)
      const allPractice = attemptDb.getAll()
      const mocks = mockAttemptDb.getAll()

      const daily = Object.fromEntries(days.map(d => [d, { date: d, signups: 0, active: new Set(), revenuePaise: 0, orders: 0 }]))
      users.forEach(u => {
        const d = u.createdAt && dayKey(u.createdAt, ADMIN_TZ)
        if (daily[d]) daily[d].signups++
      })
      Object.entries(allPractice).forEach(([userId, p]) => {
        Object.entries(p?.days || {}).forEach(([d, v]) => { if (daily[d] && v?.attempts > 0) daily[d].active.add(userId) })
      })
      mocks.forEach(a => {
        const d = dayKey(a.submittedAt, ADMIN_TZ)
        if (daily[d]) daily[d].active.add(a.userId)
      })
      realSales.filter(o => o.status === 'paid').forEach(o => {
        const d = dayKey(o.paidAt || o.createdAt, ADMIN_TZ)
        if (daily[d]) { daily[d].revenuePaise += o.amountPaise; daily[d].orders++ }
      })

      const activeLast7 = new Set()
      days.slice(-7).forEach(d => daily[d].active.forEach(id => activeLast7.add(id)))
      const since30 = now - 30 * DAY_MS
      const sum = (list) => list.reduce((n, o) => n + (o.amountPaise || 0), 0)
      const net = realSales.filter(o => o.status === 'paid')

      const bySeries = {}
      net.forEach(o => {
        const t = bySeries[o.seriesId] || (bySeries[o.seriesId] = { seriesId: o.seriesId, title: seriesDb.findById(o.seriesId)?.title || o.seriesTitle, sales: 0, revenuePaise: 0 })
        t.sales++
        t.revenuePaise += o.amountPaise
      })
      const userName = new Map(users.map(u => [u.id, u.name]))

      res.status(200).json({
        totals: {
          students: users.length,
          newLast30: users.filter(u => (u.createdAt || 0) >= since30).length,
          activeLast7: activeLast7.size,
          activeToday: daily[days[days.length - 1]].active.size,
          paidOrders: net.length,
          buyers: new Set(net.map(o => o.userId)).size,
          revenuePaise: sum(net),
          revenueLast30Paise: sum(net.filter(o => (o.paidAt || 0) >= since30)),
          refundedPaise: sum(realSales.filter(o => o.status === 'refunded')),
          activeAccess: orders.filter(o => orderIsActive(o, now)).length,
          centres: instituteDb.getAll().length,
          centreStudents: instituteDb.getAll().reduce((n, i) => n + (i.members || []).length, 0),
          series: seriesDb.getAll().length,
          publishedSeries: seriesDb.getAll().filter(s => s.published).length
        },
        daily: days.map(d => ({ date: d, signups: daily[d].signups, active: daily[d].active.size, revenuePaise: daily[d].revenuePaise, orders: daily[d].orders })),
        topSeries: Object.values(bySeries).sort((a, b) => b.revenuePaise - a.revenuePaise).slice(0, 5),
        recentOrders: paid.sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0)).slice(0, 8)
          .map(o => ({ ...publicOrder(o), userName: userName.get(o.userId) || 'Deleted user' })),
        paymentsLive: isRazorpayConfigured(),
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
      const orders = orderDb.getAll()
      const centreOf = new Map()
      instituteDb.getAll().forEach(i => (i.members || []).forEach(m => centreOf.set(m.userId, i.name)))
      const students = userDb.getAll().map(u => {
        const user = refreshPracticeStats(u)
        // The table needs totals only: drop the per-test, per-subject and per-day lists
        const row = reportFor(user, allPractice, mocksByUser, now)
        const activity = row.activity
        delete row.mocks
        delete row.subjects
        delete row.activity
        const mine = orders.filter(o => o.userId === u.id)
        return {
          ...row,
          provider: user.provider,
          centre: centreOf.get(u.id) || null,
          activeSeries: mine.filter(o => orderIsActive(o, now)).length + (centreSeat(u.id) ? 1 : 0),
          spentPaise: mine.filter(o => o.status === 'paid').reduce((n, o) => n + (o.amountPaise || 0), 0),
          answersLast7: row.answersLast7,
          activityLast30: activity.reduce((n, d) => n + d.attempts, 0)
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
    const access = seriesAccess({ id: user.id, isAdmin: false }, now)
    res.status(200).json({
      student: {
        ...report,
        phone: user.phone || null,
        provider: user.provider,
        centre: centre ? { id: centre.id, name: centre.name } : null,
        access: [...access.entries()].map(([seriesId, a]) => ({ seriesId, title: seriesDb.findById(seriesId)?.title || seriesId, ...a })),
        orders: orderDb.getByUser(user.id).filter(o => o.status !== 'created').sort((a, b) => b.createdAt - a.createdAt).map(publicOrder)
      }
    })
  })

  // Give a student a series without payment (e.g. paid by UPI outside the site)
  app.post('/api/admin/students/:id/grants', ...admin, postLimiter, (req, res) => {
    const user = userDb.findById(req.params.id)
    if (!user) return res.status(404).json({ error: 'Student not found.' })
    const series = seriesDb.findById(req.body?.seriesId)
    if (!series) return res.status(404).json({ error: 'Test series not found.' })
    if (orderDb.getByUser(user.id).some(o => o.seriesId === series.id && orderIsActive(o))) {
      return res.status(400).json({ error: 'This student already has that series.' })
    }
    const note = String(req.body?.note || '').trim().slice(0, 200)
    const order = markOrderPaid(orderDb.create({
      userId: user.id, seriesId: series.id, seriesTitle: series.title, amountPaise: 0, discountPaise: 0,
      couponCode: null, status: 'created', source: 'admin', grantedBy: req.user.email, note
    }))
    res.status(201).json({ order: publicOrder(order) })
  })

  // Take back a granted series (purchases are refunded instead)
  app.post('/api/admin/orders/:id/revoke', ...admin, (req, res) => {
    const order = orderDb.findById(req.params.id)
    if (!order || order.status !== 'paid') return res.status(404).json({ error: 'No active access to revoke.' })
    if (order.amountPaise > 0) return res.status(400).json({ error: 'This was paid for: refund it instead.' })
    res.status(200).json({ order: publicOrder(orderDb.update(order.id, { status: 'revoked', revokedAt: Date.now(), revokedBy: req.user.email })) })
  })

  // --- SALES ---
  app.get('/api/admin/orders', ...admin, (req, res) => {
    const users = new Map(userDb.getAll().map(u => [u.id, u]))
    const orders = orderDb.getAll()
      .filter(o => o.status !== 'created' || Date.now() - o.createdAt < DAY_MS)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(o => ({ ...publicOrder(o), userId: o.userId, userName: users.get(o.userId)?.name || 'Deleted user', userEmail: users.get(o.userId)?.email || '', grantedBy: o.grantedBy || null, note: o.note || '' }))
    res.status(200).json({ orders, paymentsLive: isRazorpayConfigured() })
  })

  // Full refund through Razorpay; access ends straight away
  app.post('/api/admin/orders/:id/refund', ...admin, async (req, res) => {
    try {
      const order = orderDb.findById(req.params.id)
      if (!order || order.status !== 'paid') return res.status(404).json({ error: 'Only paid orders can be refunded.' })
      if (!(order.amountPaise > 0)) return res.status(400).json({ error: 'Nothing was paid for this order: revoke it instead.' })
      let refundId = null
      if (order.source === 'razorpay') {
        if (!isRazorpayConfigured()) return res.status(503).json({ error: 'Razorpay keys are not set, so the refund cannot be sent.' })
        const refund = await refundRazorpayPayment(order.razorpayPaymentId, { orderId: order.id, by: req.user.email })
        refundId = refund.id
      }
      const updated = orderDb.update(order.id, { status: 'refunded', refundedAt: Date.now(), refundId, refundedBy: req.user.email })
      res.status(200).json({ order: publicOrder(updated) })
    } catch (err) {
      console.error('Refund error:', err)
      res.status(err.status || 500).json({ error: err.message || 'The refund failed.' })
    }
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
    if (body.price !== undefined || !existing.id) {
      const p = toPaise(body.price)
      if (p === undefined || p === null) return { error: 'Enter a price in rupees (0 for free, up to ₹1,00,000).' }
      if (p > 0 && p < 100) return { error: 'A paid series must cost at least ₹1.' }
      out.pricePaise = p
    }
    if (body.mrp !== undefined) {
      const m = toPaise(body.mrp, { allowEmpty: true })
      if (m === undefined) return { error: 'The original price must be a number of rupees.' }
      out.mrpPaise = m
    }
    if (body.validityDays !== undefined) {
      const v = body.validityDays === '' || body.validityDays === null ? null : Math.round(Number(body.validityDays))
      if (v !== null && (!Number.isFinite(v) || v < 1 || v > 3650)) return { error: 'Validity must be 1 to 3650 days, or empty for no expiry.' }
      out.validityDays = v
    }
    if (body.testIds !== undefined) {
      if (!Array.isArray(body.testIds)) return { error: 'Pick the tests in this series.' }
      const ids = Array.from(new Set(body.testIds.map(String))).filter(id => testIds.has(id))
      out.testIds = ids
    }
    if (body.published !== undefined) out.published = !!body.published
    const next = { ...existing, ...out }
    if (next.published && !(next.testIds || []).length) return { error: 'Add at least one test before publishing.' }
    return { value: out }
  }

  const seriesStats = () => {
    const stats = {}
    orderDb.getAll().forEach(o => {
      const s = stats[o.seriesId] || (stats[o.seriesId] = { sales: 0, revenuePaise: 0, activeStudents: 0 })
      if (o.status === 'paid' && o.amountPaise > 0) { s.sales++; s.revenuePaise += o.amountPaise }
      if (orderIsActive(o)) s.activeStudents++
    })
    return stats
  }

  app.get('/api/admin/series', ...admin, (req, res) => {
    const stats = seriesStats()
    const centres = instituteDb.getAll()
    res.status(200).json({
      series: seriesDb.getAll().sort((a, b) => b.createdAt - a.createdAt).map(s => ({
        ...s,
        ...(stats[s.id] || { sales: 0, revenuePaise: 0, activeStudents: 0 }),
        centres: centres.filter(c => (c.seriesIds || []).includes(s.id)).map(c => c.name)
      })),
      tests: mockTests.map(t => ({ id: t.id, title: t.title, subject: t.subject, totalQuestions: t.totalQuestions, durationMinutes: t.durationMinutes, difficulty: t.difficulty }))
    })
  })

  app.post('/api/admin/series', ...admin, (req, res) => {
    const input = seriesInput(req.body || {})
    if (input.error) return res.status(400).json({ error: input.error })
    const series = seriesDb.create({ description: '', mrpPaise: null, validityDays: null, testIds: [], published: false, ...input.value, createdBy: req.user.email })
    res.status(201).json({ series })
  })

  app.patch('/api/admin/series/:id', ...admin, (req, res) => {
    const existing = seriesDb.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Test series not found.' })
    const input = seriesInput(req.body || {}, existing)
    if (input.error) return res.status(400).json({ error: input.error })
    res.status(200).json({ series: seriesDb.update(existing.id, input.value) })
  })

  // Only a series nobody has bought can be deleted; otherwise unpublish it
  app.delete('/api/admin/series/:id', ...admin, (req, res) => {
    const existing = seriesDb.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Test series not found.' })
    if (orderDb.getAll().some(o => o.seriesId === existing.id && o.status !== 'created' && o.status !== 'failed')) {
      return res.status(400).json({ error: 'Students have bought or been given this series. Unpublish it instead.' })
    }
    seriesDb.delete(existing.id)
    instituteDb.getAll().filter(i => (i.seriesIds || []).includes(existing.id))
      .forEach(i => instituteDb.update(i.id, { seriesIds: i.seriesIds.filter(id => id !== existing.id) }))
    res.status(200).json({ ok: true })
  })

  // --- COUPONS ---
  const couponInput = (body, existing = null) => {
    const out = {}
    if (!existing) {
      const code = String(body.code || '').trim().toUpperCase()
      if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return { error: 'Codes are 3 to 24 letters, numbers, - or _.' }
      if (couponDb.findByCode(code)) return { error: 'That code already exists.' }
      out.code = code
    }
    if (body.percentOff !== undefined || !existing) {
      const pct = Math.round(Number(body.percentOff))
      if (!Number.isFinite(pct) || pct < 1 || pct > 100) return { error: 'Discount must be 1 to 100 percent.' }
      out.percentOff = pct
    }
    if (body.seriesIds !== undefined) {
      const known = new Set(seriesDb.getAll().map(s => s.id))
      out.seriesIds = (Array.isArray(body.seriesIds) ? body.seriesIds : []).filter(id => known.has(id))
    }
    if (body.maxUses !== undefined) {
      const m = body.maxUses === '' || body.maxUses === null ? null : Math.round(Number(body.maxUses))
      if (m !== null && (!Number.isFinite(m) || m < 1)) return { error: 'Max uses must be at least 1, or empty for unlimited.' }
      out.maxUses = m
    }
    if (body.expiresAt !== undefined) {
      const t = body.expiresAt === '' || body.expiresAt === null ? null : new Date(body.expiresAt).getTime()
      if (t !== null && !Number.isFinite(t)) return { error: 'Pick a valid expiry date.' }
      out.expiresAt = t
    }
    if (body.active !== undefined) out.active = !!body.active
    return { value: out }
  }

  app.get('/api/admin/coupons', ...admin, (req, res) => {
    res.status(200).json({ coupons: couponDb.getAll().sort((a, b) => b.createdAt - a.createdAt) })
  })

  app.post('/api/admin/coupons', ...admin, (req, res) => {
    const input = couponInput(req.body || {})
    if (input.error) return res.status(400).json({ error: input.error })
    const coupon = couponDb.create({ seriesIds: [], maxUses: null, expiresAt: null, active: true, ...input.value, uses: 0, createdBy: req.user.email })
    res.status(201).json({ coupon })
  })

  app.patch('/api/admin/coupons/:id', ...admin, (req, res) => {
    const existing = couponDb.findById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Coupon not found.' })
    const input = couponInput(req.body || {}, existing)
    if (input.error) return res.status(400).json({ error: input.error })
    res.status(200).json({ coupon: couponDb.update(existing.id, input.value) })
  })

  app.delete('/api/admin/coupons/:id', ...admin, (req, res) => {
    if (!couponDb.delete(req.params.id)) return res.status(404).json({ error: 'Coupon not found.' })
    res.status(200).json({ ok: true })
  })

}
