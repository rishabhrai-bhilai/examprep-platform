import crypto from 'crypto'
import { userDb } from '../db/index.js'

// Read on use: this module loads before server.js runs dotenv.config()
const DEFAULT_JWT_SECRET = 'gate-prep-platform-secure-jwt-key-2026-supersecret-gatekeeper'
let warnedAboutSecret = false
function jwtSecret() {
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production' && !warnedAboutSecret) {
    // The default is public in the repo, so anyone could forge a login token with it
    console.warn('[security] JWT_SECRET is not set: login tokens are signed with the default key. Set JWT_SECRET.')
    warnedAboutSecret = true
  }
  return process.env.JWT_SECRET || DEFAULT_JWT_SECRET
}

// --- PASSWORD HASHING (SCRYPT + SALT) ---
export function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a valid string')
  }
  const salt = crypto.randomBytes(16).toString('hex')
  const hashBuffer = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
  return {
    hash: hashBuffer.toString('hex'),
    salt
  }
}

export function verifyPassword(password, storedHash, salt) {
  if (!password || !storedHash || !salt) return false
  try {
    const derivedHash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
    const storedBuffer = Buffer.from(storedHash, 'hex')
    if (derivedHash.length !== storedBuffer.length) return false
    return crypto.timingSafeEqual(derivedHash, storedBuffer)
  } catch (err) {
    console.error('Password verification error:', err)
    return false
  }
}

// --- SECURE HMAC-SHA256 JWT IMPLEMENTATION ---
function base64UrlEncode(str) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return Buffer.from(base64, 'base64').toString('utf8')
}

export function generateToken(payload, expiresInSeconds = 7 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))
  const dataToSign = `${encodedHeader}.${encodedPayload}`

  const signature = crypto
    .createHmac('sha256', jwtSecret())
    .update(dataToSign)
    .digest('base64url')

  return `${dataToSign}.${signature}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, signature] = parts
  const dataToSign = `${encodedHeader}.${encodedPayload}`

  const expectedSignature = crypto
    .createHmac('sha256', jwtSecret())
    .update(dataToSign)
    .digest('base64url')

  try {
    const sigBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null
    }

    const payloadJson = base64UrlDecode(encodedPayload)
    const payload = JSON.parse(payloadJson)

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null // Expired token
    }

    return payload
  } catch (err) {
    return null
  }
}

// --- GOOGLE OAUTH PARSER / VERIFIER ---
export function parseGoogleCredential(credential) {
  if (!credential || typeof credential !== 'string') return null
  
  // Standard Google JWT has 3 parts: header.payload.signature
  const parts = credential.split('.')
  if (parts.length === 3) {
    try {
      const payloadStr = base64UrlDecode(parts[1])
      const payload = JSON.parse(payloadStr)
      if (payload.email) {
        return {
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          avatar: payload.picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(payload.name || payload.email)}`,
          sub: payload.sub,
          emailVerified: payload.email_verified
        }
      }
    } catch (e) {
      console.warn('Failed to parse standard Google credential JWT', e.message)
    }
  }

  // Fallback for simulated/demo Google token (e.g. JSON string or dev format)
  if (credential.startsWith('{') && credential.endsWith('}')) {
    try {
      const parsed = JSON.parse(credential)
      if (parsed.email) {
        return {
          email: parsed.email,
          name: parsed.name || parsed.email.split('@')[0],
          avatar: parsed.avatar || parsed.picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(parsed.email)}`,
          sub: parsed.sub || `g-${Date.now()}`
        }
      }
    } catch (_) {}
  }

  return null
}

// --- GOOGLE ID TOKEN VERIFICATION ---
// Checks the token with Google (signature, expiry) and that it was issued for our
// client id. Without GOOGLE_CLIENT_ID, development falls back to the demo sign-in.
export async function verifyGoogleCredential(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return process.env.NODE_ENV === 'production' ? null : parseGoogleCredential(credential)
  }
  if (!credential || typeof credential !== 'string') return null
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
    if (!res.ok) return null
    const info = await res.json()
    const issuerOk = info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com'
    if (info.aud !== clientId || !issuerOk || info.email_verified !== 'true' || !info.email) return null
    if (Number(info.exp) * 1000 < Date.now()) return null
    return {
      email: info.email,
      name: info.name || info.email.split('@')[0],
      avatar: info.picture || null,
      sub: info.sub,
      emailVerified: true
    }
  } catch (err) {
    console.error('Google token verification failed:', err.message)
    return null
  }
}

// --- FAILED LOGIN LOCKOUT ---
// After 5 wrong passwords for an email within 15 minutes, that email is locked for 15 minutes.
const LOCK_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILED_LOGINS = 5
const failedLogins = new Map() // email -> { count, firstAt, lockedUntil }

export function loginLockedFor(email) {
  const entry = failedLogins.get(email)
  if (!entry || !entry.lockedUntil) return 0
  const left = entry.lockedUntil - Date.now()
  if (left <= 0) { failedLogins.delete(email); return 0 }
  return Math.ceil(left / 60000)
}

export function recordFailedLogin(email) {
  const now = Date.now()
  let entry = failedLogins.get(email)
  if (!entry || now - entry.firstAt > LOCK_WINDOW_MS) entry = { count: 0, firstAt: now, lockedUntil: 0 }
  entry.count++
  if (entry.count >= MAX_FAILED_LOGINS) entry.lockedUntil = now + LOCK_WINDOW_MS
  failedLogins.set(email, entry)
}

export function clearFailedLogins(email) {
  failedLogins.delete(email)
}

// --- REQUIRE AUTH MIDDLEWARE ---
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Register/login to access this feature.' })
  }

  const token = authHeader.split(' ')[1]
  const payload = verifyToken(token)

  if (!payload || !payload.userId) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' })
  }

  const user = userDb.findById(payload.userId)
  if (!user) {
    return res.status(401).json({ error: 'User account not found.' })
  }

  // Attach sanitized user to request object
  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    streak: user.streak,
    solvedQuestions: user.solvedQuestions,
    provider: user.provider,
    isAdmin: isAdminEmail(user.email)
  }
  next()
}

// Admins (comma-separated ADMIN_EMAILS) can see and update every issue report.
// ADMIN_EMAILS: comma-separated developer emails (they also get every new report)
export function adminEmails() {
  return (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

export function isAdminEmail(email) {
  return !!email && adminEmails().includes(email.toLowerCase())
}

export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Only admins can do this.' })
  next()
}
