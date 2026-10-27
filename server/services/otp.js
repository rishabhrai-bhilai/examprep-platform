import crypto from 'crypto'

// One-time codes for email verification and password reset. Kept in memory:
// they live for minutes, so losing them on a restart only means asking for a new code.
export const OTP_MINUTES = 10
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_ATTEMPTS = 5

const codes = new Map() // `${purpose}:${email}` -> { hash, expiresAt, sentAt, attempts, data }
const hashCode = code => crypto.createHash('sha256').update(String(code)).digest('hex')
const keyFor = (purpose, email) => `${purpose}:${email.trim().toLowerCase()}`

// Returns { code } or { retryAfter } (seconds) when a code was sent less than a minute ago.
export function issueOtp(purpose, email, data = null) {
  const key = keyFor(purpose, email)
  const existing = codes.get(key)
  if (existing && Date.now() - existing.sentAt < RESEND_COOLDOWN_MS) {
    return { retryAfter: Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000) }
  }
  const code = String(crypto.randomInt(100000, 1000000))
  codes.set(key, { hash: hashCode(code), expiresAt: Date.now() + OTP_MINUTES * 60 * 1000, sentAt: Date.now(), attempts: 0, data })
  return { code }
}

// Returns { ok: true, data } or { ok: false, error }. A code works once.
export function verifyOtp(purpose, email, code) {
  const key = keyFor(purpose, email)
  const entry = codes.get(key)
  if (!entry || entry.expiresAt < Date.now()) {
    codes.delete(key)
    return { ok: false, error: 'This code has expired. Please request a new one.' }
  }
  entry.attempts++
  const given = Buffer.from(hashCode(String(code || '').trim()), 'hex')
  if (!crypto.timingSafeEqual(given, Buffer.from(entry.hash, 'hex'))) {
    if (entry.attempts >= MAX_ATTEMPTS) {
      codes.delete(key)
      return { ok: false, error: 'Too many wrong codes. Please request a new one.' }
    }
    return { ok: false, error: `Incorrect code. ${MAX_ATTEMPTS - entry.attempts} attempt(s) left.` }
  }
  codes.delete(key)
  return { ok: true, data: entry.data }
}

export function clearOtp(purpose, email) {
  codes.delete(keyFor(purpose, email))
}

// Sweep expired codes now and then so the map doesn't grow.
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of codes) if (entry.expiresAt < now) codes.delete(key)
}, 5 * 60 * 1000).unref()
