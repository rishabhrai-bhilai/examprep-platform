// Test series for students: the store, buying with Razorpay, and which tests
// (and original questions) each student may see.
import { seriesDb, orderDb, couponDb } from '../db/index.js'
import { requireAuth } from '../services/auth.js'
import { lockedTests, seriesAccess, canTakeTest, expiryFor } from '../services/access.js'
import {
  isRazorpayConfigured, isRazorpayTestMode, razorpayKeyId, createRazorpayOrder,
  checkoutSignatureOk, webhookSignatureOk
} from '../services/razorpay.js'

// Why a coupon can't be used on this series (null = it can)
export function couponProblem(coupon, seriesId, now = Date.now()) {
  if (!coupon || !coupon.active) return 'That coupon code is not valid.'
  if (coupon.expiresAt && coupon.expiresAt < now) return 'That coupon has expired.'
  if (coupon.maxUses && (coupon.uses || 0) >= coupon.maxUses) return 'That coupon has been fully used.'
  if ((coupon.seriesIds || []).length && !coupon.seriesIds.includes(seriesId)) return "That coupon doesn't apply to this series."
  return null
}

// Price after an optional coupon: { pricePaise, discountPaise, amountPaise, coupon } or { error }
export function quoteFor(series, code) {
  const pricePaise = series.pricePaise || 0
  if (!code) return { pricePaise, discountPaise: 0, amountPaise: pricePaise, coupon: null }
  const coupon = couponDb.findByCode(code)
  const problem = couponProblem(coupon, series.id)
  if (problem) return { error: problem }
  const discountPaise = Math.min(pricePaise, Math.round(pricePaise * coupon.percentOff / 100))
  return { pricePaise, discountPaise, amountPaise: pricePaise - discountPaise, coupon }
}

// Marks an order paid (once) and starts its access period
export function markOrderPaid(order, { razorpayPaymentId, source } = {}) {
  if (order.status === 'paid') return order
  const series = seriesDb.findById(order.seriesId)
  const now = Date.now()
  const updated = orderDb.update(order.id, {
    status: 'paid',
    paidAt: now,
    expiresAt: series ? expiryFor(series, now) : null,
    ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
    ...(source ? { source } : {})
  })
  if (order.couponCode) {
    const coupon = couponDb.findByCode(order.couponCode)
    if (coupon) couponDb.update(coupon.id, { uses: (coupon.uses || 0) + 1 })
  }
  return updated
}

export const publicOrder = (o) => ({
  id: o.id, seriesId: o.seriesId, seriesTitle: o.seriesTitle, amountPaise: o.amountPaise,
  discountPaise: o.discountPaise || 0, couponCode: o.couponCode || null, status: o.status,
  source: o.source, paidAt: o.paidAt || null, expiresAt: o.expiresAt || null,
  refundedAt: o.refundedAt || null, createdAt: o.createdAt, razorpayPaymentId: o.razorpayPaymentId || null
})

// Razorpay's webhook needs the exact bytes it signed, so it's registered before
// the JSON body parser (see server.js)
export function handleRazorpayWebhook(req, res) {
  const raw = Buffer.isBuffer(req.body) ? req.body : null
  if (!webhookSignatureOk(raw, req.headers['x-razorpay-signature'])) return res.status(400).json({ error: 'Bad signature.' })
  let event
  try {
    event = JSON.parse(raw.toString('utf8'))
  } catch {
    return res.status(400).json({ error: 'Malformed request.' })
  }
  const payment = event?.payload?.payment?.entity
  const order = payment?.order_id ? orderDb.findByRazorpayOrder(payment.order_id) : null
  if (order) {
    if ((event.event === 'payment.captured' || event.event === 'order.paid') && order.status !== 'refunded') {
      markOrderPaid(order, { razorpayPaymentId: payment.id })
    } else if (event.event === 'payment.failed' && order.status === 'created') {
      orderDb.update(order.id, { status: 'failed', failureReason: payment.error_description || null })
    } else if ((event.event === 'refund.processed' || event.event === 'payment.refunded') && order.status === 'paid') {
      orderDb.update(order.id, { status: 'refunded', refundedAt: Date.now(), refundId: event?.payload?.refund?.entity?.id || order.refundId || null })
    }
  }
  res.status(200).json({ ok: true })
}

export function registerStoreRoutes(app, { mockTests, originalQuestions, optionalUser, isAdminEmail, postLimiter, isProduction }) {
  const testsById = new Map(mockTests.map(t => [t.id, t]))
  const testSummary = (id) => {
    const t = testsById.get(id)
    return t ? { id: t.id, title: t.title, subject: t.subject, totalQuestions: t.totalQuestions, durationMinutes: t.durationMinutes, difficulty: t.difficulty } : null
  }
  const viewer = (req) => {
    const user = optionalUser(req)
    return user ? { id: user.id, email: user.email, name: user.name, isAdmin: isAdminEmail(user.email) } : null
  }
  const publicSeries = (s, access) => {
    const tests = (s.testIds || []).map(testSummary).filter(Boolean)
    return {
      id: s.id, title: s.title, description: s.description || '', pricePaise: s.pricePaise || 0,
      mrpPaise: s.mrpPaise || null, validityDays: s.validityDays || null, published: !!s.published,
      tests, testCount: tests.length, questionCount: tests.reduce((n, t) => n + (t.totalQuestions || 0), 0),
      access: access?.get(s.id) || null
    }
  }
  const paymentMode = () => (isRazorpayConfigured() ? (isRazorpayTestMode() ? 'razorpay-test' : 'razorpay') : (isProduction ? 'off' : 'dev'))

  // The store: published series (admins also see drafts)
  app.get('/api/series', (req, res) => {
    const user = viewer(req)
    const access = seriesAccess(user)
    const list = seriesDb.getAll().filter(s => s.published || user?.isAdmin)
      .sort((a, b) => (a.pricePaise || 0) - (b.pricePaise || 0))
    res.status(200).json({ series: list.map(s => publicSeries(s, access)), paymentMode: paymentMode() })
  })

  app.get('/api/series/:id', (req, res) => {
    const user = viewer(req)
    const s = seriesDb.findById(req.params.id)
    if (!s || (!s.published && !user?.isAdmin)) return res.status(404).json({ error: 'Test series not found.' })
    res.status(200).json({ series: publicSeries(s, seriesAccess(user)), paymentMode: paymentMode() })
  })

  // Which tests are locked, and which of those this student has unlocked
  app.get('/api/me/access', (req, res) => {
    const user = viewer(req)
    const locked = lockedTests()
    const access = seriesAccess(user)
    const unlocked = Object.keys(locked).filter(id => canTakeTest(user, id, locked, access))
    const series = [...access.entries()].map(([id, a]) => ({ seriesId: id, title: seriesDb.findById(id)?.title || id, ...a }))
    res.status(200).json({ locked, unlocked, series })
  })

  // Original (non-PYQ) questions this visitor may see: those in free tests or in
  // tests they've unlocked. They aren't bundled into the site, so paid ones stay paid.
  app.get('/api/mock-tests/originals', (req, res) => {
    const user = viewer(req)
    const locked = lockedTests()
    const access = seriesAccess(user)
    const hidden = new Set()
    const visible = new Set()
    mockTests.forEach(t => {
      const target = canTakeTest(user, t.id, locked, access) ? visible : hidden
      t.questions.forEach(id => target.add(id))
    })
    res.set('Cache-Control', 'private, no-store')
    res.status(200).json(originalQuestions.filter(q => visible.has(q.id) || !hidden.has(q.id)))
  })

  app.get('/api/me/orders', requireAuth, (req, res) => {
    const orders = orderDb.getByUser(req.user.id)
      .filter(o => o.status !== 'created')
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(publicOrder)
    res.status(200).json({ orders })
  })

  // Price check (with a coupon) before paying
  app.post('/api/payments/quote', requireAuth, postLimiter, (req, res) => {
    const s = seriesDb.findById(req.body?.seriesId)
    if (!s || !s.published) return res.status(404).json({ error: 'Test series not found.' })
    const quote = quoteFor(s, String(req.body?.coupon || '').trim())
    if (quote.error) return res.status(400).json({ error: quote.error })
    res.status(200).json({ pricePaise: quote.pricePaise, discountPaise: quote.discountPaise, amountPaise: quote.amountPaise, couponCode: quote.coupon?.code || null })
  })

  // Starts a purchase: a Razorpay order for the checkout, or straight access when
  // the price (after a coupon) is zero
  app.post('/api/payments/order', requireAuth, postLimiter, async (req, res) => {
    try {
      const s = seriesDb.findById(req.body?.seriesId)
      if (!s || !s.published) return res.status(404).json({ error: 'Test series not found.' })
      const access = seriesAccess(req.user).get(s.id)
      if (access && access.via !== 'admin') return res.status(400).json({ error: 'You already have this test series.' })
      const quote = quoteFor(s, String(req.body?.coupon || '').trim())
      if (quote.error) return res.status(400).json({ error: quote.error })

      const base = {
        userId: req.user.id, seriesId: s.id, seriesTitle: s.title, amountPaise: quote.amountPaise,
        discountPaise: quote.discountPaise, couponCode: quote.coupon?.code || null, status: 'created'
      }
      if (quote.amountPaise === 0) {
        const order = markOrderPaid(orderDb.create({ ...base, source: quote.coupon ? 'coupon' : 'free' }))
        return res.status(201).json({ granted: true, order: publicOrder(order) })
      }
      if (quote.amountPaise < 100) return res.status(400).json({ error: 'The price after discount must be at least ₹1.' })

      const mode = paymentMode()
      if (mode === 'off') return res.status(503).json({ error: "Payments aren't set up yet. Please try again later." })
      if (mode === 'dev') {
        const order = orderDb.create({ ...base, source: 'dev' })
        return res.status(201).json({ mode, orderId: order.id, amountPaise: order.amountPaise })
      }

      const order = orderDb.create({ ...base, source: 'razorpay' })
      const rzp = await createRazorpayOrder({
        amountPaise: quote.amountPaise,
        receipt: order.id,
        notes: { orderId: order.id, seriesId: s.id, userId: req.user.id }
      })
      orderDb.update(order.id, { razorpayOrderId: rzp.id })
      res.status(201).json({
        mode,
        orderId: order.id,
        keyId: razorpayKeyId(),
        razorpayOrderId: rzp.id,
        amountPaise: quote.amountPaise,
        currency: 'INR',
        description: s.title,
        prefill: { name: req.user.name, email: req.user.email }
      })
    } catch (err) {
      console.error('Create order error:', err)
      res.status(err.status || 500).json({ error: 'Could not start the payment. Please try again.' })
    }
  })

  // The checkout's success callback. The webhook marks the order paid too, in case
  // the student closes the tab before this arrives.
  app.post('/api/payments/verify', requireAuth, postLimiter, (req, res) => {
    const order = orderDb.findById(req.body?.orderId)
    if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Order not found.' })
    const ok = checkoutSignatureOk({
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: req.body?.razorpayPaymentId,
      signature: req.body?.razorpaySignature
    })
    if (!ok || req.body?.razorpayOrderId !== order.razorpayOrderId) {
      return res.status(400).json({ error: "We couldn't confirm that payment. If money was taken, it will be confirmed automatically or refunded." })
    }
    const paid = markOrderPaid(order, { razorpayPaymentId: req.body.razorpayPaymentId })
    res.status(200).json({ order: publicOrder(paid) })
  })

  // The student closed the checkout or the payment failed
  app.post('/api/payments/failed', requireAuth, (req, res) => {
    const order = orderDb.findById(req.body?.orderId)
    if (order && order.userId === req.user.id && order.status === 'created') {
      orderDb.update(order.id, { status: 'failed', failureReason: String(req.body?.reason || 'Checkout closed').slice(0, 200) })
    }
    res.status(200).json({ ok: true })
  })

  // Development only, without Razorpay keys: pretend the payment went through
  app.post('/api/payments/dev-complete', requireAuth, (req, res) => {
    if (paymentMode() !== 'dev') return res.status(404).json({ error: 'Not found.' })
    const order = orderDb.findById(req.body?.orderId)
    if (!order || order.userId !== req.user.id || order.source !== 'dev') return res.status(404).json({ error: 'Order not found.' })
    const paid = markOrderPaid(order, { razorpayPaymentId: `dev_${order.id}` })
    res.status(200).json({ order: publicOrder(paid) })
  })

}
