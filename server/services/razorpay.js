// Razorpay (payments in INR) over its REST API, so there's no SDK to install.
//
// Settings (server/.env, or Environment on Render):
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET   from Razorpay Dashboard > Account & Settings > API keys
//                                          (rzp_test_... keys while testing, rzp_live_... to charge)
//   RAZORPAY_WEBHOOK_SECRET                the secret you type when adding the webhook
//                                          https://<your site>/api/payments/webhook
//
// Without keys, development offers a simulated checkout (see /api/payments/dev-complete)
// and production shows "payments aren't set up yet".
import crypto from 'crypto'

const API = 'https://api.razorpay.com/v1'

export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID || ''
export const isRazorpayConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
export const isRazorpayTestMode = () => razorpayKeyId().startsWith('rzp_test_')

async function call(method, pathname, body) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error?.description || `Razorpay request failed (${res.status})`)
    err.status = 502
    throw err
  }
  return data
}

// amount in paise; receipt is our order id
export const createRazorpayOrder = ({ amountPaise, receipt, notes }) =>
  call('POST', '/orders', { amount: amountPaise, currency: 'INR', receipt, notes })

export const fetchRazorpayPayment = (paymentId) => call('GET', `/payments/${encodeURIComponent(paymentId)}`)

export const refundRazorpayPayment = (paymentId, notes) =>
  call('POST', `/payments/${encodeURIComponent(paymentId)}/refund`, { notes })

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ''))
  const y = Buffer.from(String(b || ''))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

// The checkout's success callback: signature = HMAC-SHA256(order_id|payment_id, key secret)
export function checkoutSignatureOk({ razorpayOrderId, razorpayPaymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret || !razorpayOrderId || !razorpayPaymentId) return false
  const expected = crypto.createHmac('sha256', secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex')
  return safeEqual(expected, signature)
}

// Webhooks: signature = HMAC-SHA256(raw body, webhook secret)
export function webhookSignatureOk(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !rawBody) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return safeEqual(expected, signature)
}
