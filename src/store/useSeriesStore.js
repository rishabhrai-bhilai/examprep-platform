import { create } from 'zustand'

const authHeaders = () => {
  const token = localStorage.getItem('auth_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) }
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}
const post = (url, body) => request(url, { method: 'POST', body: JSON.stringify(body || {}) })

// Razorpay's checkout script, loaded the first time someone pays
let razorpayScript = null
const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve()
  if (!razorpayScript) {
    razorpayScript = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://checkout.razorpay.com/v1/checkout.js'
      s.onload = () => resolve()
      s.onerror = () => { razorpayScript = null; reject(new Error("Couldn't load the payment window. Check your connection and try again.")) }
      document.body.appendChild(s)
    })
  }
  return razorpayScript
}

// ₹499, or ₹99.50 when there are paise
export const formatRupees = (paise) => {
  const p = paise || 0
  return `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 })}`
}

// Test series (paid bundles of mock tests): the store, purchases, and which
// tests and original questions the student has unlocked. Shapes: server/routes/store.js
export const useSeriesStore = create((set, get) => ({
  series: null, // published series, null = not loaded
  paymentMode: null, // 'razorpay' | 'razorpay-test' | 'dev' | 'off'
  access: { locked: {}, unlocked: [], series: [] },
  accessLoaded: false,
  originals: null, // original (non-PYQ) questions this visitor may see
  orders: null,

  fetchSeries: async () => {
    const data = await request('/api/series')
    set({ series: data.series, paymentMode: data.paymentMode })
    return data.series
  },
  fetchOneSeries: async (id) => {
    const data = await request(`/api/series/${encodeURIComponent(id)}`)
    set({ paymentMode: data.paymentMode })
    return data.series
  },
  fetchAccess: async () => {
    const access = await request('/api/me/access')
    set({ access, accessLoaded: true })
    return access
  },
  fetchOriginals: async () => {
    const originals = await request('/api/mock-tests/originals')
    set({ originals })
    return originals
  },
  fetchOrders: async () => {
    const data = await request('/api/me/orders')
    set({ orders: data.orders })
    return data.orders
  },
  // Everything that changes when access changes (after buying, signing in or out)
  refreshAccess: () => Promise.all([get().fetchAccess(), get().fetchOriginals(), get().fetchSeries()]).catch(() => {}),

  // Is this test locked for the student? Returns the series ids that unlock it, or null
  lockFor: (testId) => {
    const { locked, unlocked } = get().access
    return locked[testId] && !unlocked.includes(testId) ? locked[testId] : null
  },

  quote: (seriesId, coupon) => post('/api/payments/quote', { seriesId, coupon }),

  // Starts a purchase. Resolves { status: 'paid' } once access is unlocked, or
  // { status: 'dev', orderId } in development without Razorpay keys (the page then
  // offers a simulated payment). Rejects when the payment fails or is closed.
  buy: async (seriesId, coupon) => {
    const order = await post('/api/payments/order', { seriesId, coupon })
    if (order.granted) {
      await get().refreshAccess()
      return { status: 'paid' }
    }
    if (order.mode === 'dev') return { status: 'dev', orderId: order.orderId, amountPaise: order.amountPaise }

    await loadRazorpay()
    await new Promise((resolve, reject) => {
      let settled = false
      const fail = (reason) => {
        if (settled) return
        settled = true
        post('/api/payments/failed', { orderId: order.orderId, reason }).catch(() => {})
        reject(new Error(reason))
      }
      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.razorpayOrderId,
        amount: order.amountPaise,
        currency: order.currency,
        name: 'ExamPrep',
        description: order.description,
        prefill: order.prefill,
        theme: { color: '#4f46e5' },
        handler: async (response) => {
          settled = true
          try {
            await post('/api/payments/verify', {
              orderId: order.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            })
            resolve()
          } catch (err) {
            reject(err)
          }
        },
        modal: { ondismiss: () => fail('Payment cancelled.') }
      })
      checkout.on('payment.failed', (resp) => fail(resp?.error?.description || 'The payment failed.'))
      checkout.open()
    })
    await get().refreshAccess()
    return { status: 'paid' }
  },

  // Development only: finish or abandon a simulated payment
  completeDevPayment: async (orderId) => {
    await post('/api/payments/dev-complete', { orderId })
    await get().refreshAccess()
  },
  cancelDevPayment: (orderId) => post('/api/payments/failed', { orderId, reason: 'Simulated payment cancelled' }).catch(() => {})
}))
