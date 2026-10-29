// Cloudflare Turnstile ("are you human?") check for the forms that send email.
// Needs TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY; without them the check is off.
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const isConfigured = () => !!(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY)

// Public key the browser widget needs (null when the check is off)
export const turnstileSiteKey = () => (isConfigured() ? process.env.TURNSTILE_SITE_KEY : null)

// Returns { ok } or { ok: false, unavailable } when Cloudflare couldn't be reached
export async function verifyTurnstile(token, ip) {
  if (!isConfigured()) return { ok: true }
  if (typeof token !== 'string' || !token || token.length > 2048) return { ok: false }

  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY, response: token })
    if (ip) body.append('remoteip', ip)
    const res = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    if (!data.success) console.warn('Turnstile check failed:', (data['error-codes'] || []).join(', '))
    return { ok: !!data.success }
  } catch (err) {
    console.error('Turnstile verification error:', err.message)
    return { ok: false, unavailable: true }
  }
}

// Express middleware: reads req.body.turnstileToken
export async function requireHuman(req, res, next) {
  const result = await verifyTurnstile(req.body?.turnstileToken, req.ip)
  if (result.ok) return next()
  if (result.unavailable) {
    return res.status(503).json({ error: 'We could not run the security check right now. Please try again in a minute.' })
  }
  res.status(400).json({ error: 'The security check did not pass. Please wait for it to finish (or refresh the page) and try again.' })
}
