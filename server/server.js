import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import rateLimit from 'express-rate-limit'

// Database and Auth Services
import { userDb, bookmarkDb, noteDb, testRecordDb, discussionDb, reportDb, attemptDb } from './db/index.js'
import { mergePractice, sanitizePractice, practiceSummary, dayKey } from '../shared/practice.js'
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  verifyGoogleCredential,
  requireAuth,
  requireAdmin,
  isAdminEmail,
  loginLockedFor,
  recordFailedLogin,
  clearFailedLogins
} from './services/auth.js'
import { issueOtp, verifyOtp, OTP_MINUTES } from './services/otp.js'
import { publicDiscussions, publicPost, addPost, deletePost, votePost } from './services/discussions.js'
import { sendOtpMail, canSendEmail } from './services/mailer.js'
import { requireHuman, turnstileSiteKey } from './services/turnstile.js'

// Load environment variables from server/.env, whichever folder the server is started from
dotenv.config({ path: fileURLToPath(new URL('.env', import.meta.url)) })

const app = express()
const PORT = process.env.PORT || 5000
const NODE_ENV = process.env.NODE_ENV || 'development'

// Resolve paths for ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Render (and most hosts) sit behind one proxy; without this every visitor
// shares the proxy's IP and the rate limits below would hit everyone at once
app.set('trust proxy', 1)

// Helper to sanitize user object sent over API (strip passwordHash and salt)
// (`rank` is left over from older accounts and was never a real ranking)
const sanitizeUser = (user) => {
  if (!user) return null
  const { passwordHash, salt, rank, ...safeUser } = user
  return { ...safeUser, hasPassword: !!passwordHash, isAdmin: isAdminEmail(user.email) }
}

const isValidTimeZone = (tz) => {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

// solvedQuestions and streak on the user record are derived from their practice
// attempts. The streak lapses with time, so this runs whenever the user is read.
const refreshPracticeStats = (user) => {
  if (!user) return user
  const saved = attemptDb.getUserAttempts(user.id)
  const summary = practiceSummary(saved, dayKey(Date.now(), saved.timeZone))
  if (user.solvedQuestions === summary.solved && user.streak === summary.streak) return user
  return userDb.update(user.id, { solvedQuestions: summary.solved, streak: summary.streak }) || user
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8
const normalizeEmail = (email) => String(email || '').trim().toLowerCase()
const passwordProblem = (password) => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters long.`
  if (password.length > 128) return 'Password is too long.'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'Password must contain at least one letter and one number.'
  return null
}

// 1. Security Headers (Helmet) with Google Identity & YouTube CSP directives
app.use(helmet({
  // Google's sign-in popup needs to talk back to this window, and Google
  // Identity Services needs the page origin in the Referer header
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://accounts.google.com", "https://challenges.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "https://lh3.googleusercontent.com"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com", "https://accounts.google.com", "https://challenges.cloudflare.com"],
      connectSrc: [
        "'self'", 
        "https://accounts.google.com",
        "https://apis.google.com",
        "https://challenges.cloudflare.com",
        "https://examprep-platform.onrender.com", 
        "https://*.onrender.com", 
        "http://localhost:*", 
        "ws://localhost:*", 
        "http://10.*", 
        "http://192.*"
      ]
    }
  }
}))

// 2. Cross-Origin Resource Sharing (CORS)
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === 'null') return callback(null, true)
    if (NODE_ENV === 'development') {
      return callback(null, true)
    }
    const originLower = origin.toLowerCase()
    const isAllowed = 
      origin === corsOrigin || 
      originLower.includes('onrender.com') ||
      originLower.includes('localhost') ||
      originLower.includes('127.0.0.1')
      
    if (isAllowed) {
      return callback(null, true)
    } else {
      console.warn(`[CORS Blocked] Rejecting origin: ${origin}`)
      return callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}))

// 3. Compression (Gzip)
app.use(compression())

// 4. Request Logging (Morgan)
if (NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// 5. Rate Limiting
const isDev = NODE_ENV === 'development'
// Signed-in users are limited per account (so a shared college Wi-Fi IP isn't
// one bucket), everyone else per IP
const userOrIpKey = (req) => {
  const header = req.headers.authorization
  const payload = header?.startsWith('Bearer ') ? verifyToken(header.slice(7)) : null
  return payload?.userId ? `user:${payload.userId}` : `ip:${req.ip}`
}
const limiter = (windowMs, max, error, keyGenerator) => rateLimit({
  windowMs,
  max: isDev ? max * 20 : max,
  message: { error },
  standardHeaders: true,
  legacyHeaders: false,
  ...(keyGenerator ? { keyGenerator } : {})
})

// General API limiter: 100 requests a minute
app.use('/api/', limiter(60 * 1000, 100, 'Too many requests. Please slow down and try again in a minute.', userOrIpKey))

// Password logins and code checks (brute-force protection on top of the per-email lockout)
const authLimiter = limiter(15 * 60 * 1000, 20, 'Too many sign-in attempts. Please try again after 15 minutes.')
// Anything that sends an email
const emailLimiter = limiter(60 * 60 * 1000, 8, 'Too many code requests. Please try again in an hour.')
const reportLimiter = limiter(60 * 60 * 1000, 10, 'You have sent a lot of reports. Please try again in an hour.', userOrIpKey)
const postLimiter = limiter(10 * 60 * 1000, 30, 'You are posting very fast. Please wait a few minutes.', userOrIpKey)

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }))

// Load database questions into memory
const questionsPath = path.join(__dirname, 'data', 'questions.json')
let questions = []
try {
  const fileData = fs.readFileSync(questionsPath, 'utf8')
  questions = JSON.parse(fileData).map(q => ({
    ...q,
    likes: typeof q.likes === 'number' ? q.likes : 0,
    commentsCount: typeof q.commentsCount === 'number' ? q.commentsCount : 0
  }))
  console.log(`Successfully loaded ${questions.length} questions from database.`)
} catch (error) {
  console.error('Failed to load questions database:', error)
  process.exit(1)
}

// --- REST API: SYSTEM & QUESTIONS ---

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', environment: NODE_ENV, timestamp: new Date() })
})

// Get Questions with query parameters (server-side filtering)
app.get('/api/questions', (req, res) => {
  let filtered = [...questions]
  const { year, subject, topic, type, marks } = req.query
  
  if (year) filtered = filtered.filter(q => q.year.toString() === year.toString())
  if (subject) {
    const subjectsList = subject.toString().split(',').map(s => s.trim().toLowerCase())
    filtered = filtered.filter(q => subjectsList.includes(q.subject.toLowerCase()))
  }
  if (topic) {
    // Matches any of the question's topic tags (a question can have several)
    const wanted = topic.toString().toLowerCase()
    filtered = filtered.filter(q => (q.tags || []).some(t => t.topic.toLowerCase() === wanted))
  }
  if (type) filtered = filtered.filter(q => q.type.toLowerCase() === type.toString().toLowerCase())
  if (marks) filtered = filtered.filter(q => q.marks.toString() === marks.toString())
  
  res.status(200).json(filtered)
})

// Get Single Question by ID
app.get('/api/questions/:id', (req, res) => {
  const id = parseInt(req.params.id, 10)
  const question = questions.find(q => q.id === id)
  if (!question) {
    return res.status(404).json({ error: `Question with ID ${id} not found.` })
  }
  res.status(200).json(question)
})

// --- REST API: AUTHENTICATION ---

// What the sign-in pages can offer (the Google client id is public)
app.get('/api/auth/config', (req, res) => {
  res.status(200).json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    devGoogleLogin: !process.env.GOOGLE_CLIENT_ID && NODE_ENV !== 'production',
    emailEnabled: canSendEmail(),
    turnstileSiteKey: turnstileSiteKey()
  })
})

// Where links in emails point. Never taken from the request's Host header, so a
// forged request can't make the reset email link to someone else's site.
const appUrl = () => {
  const url = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || (NODE_ENV === 'production' ? '' : corsOrigin)
  return url ? url.replace(/\/+$/, '') : null
}

// Reset emails also carry a link that opens the reset form with the code filled in.
// The code is in the #fragment, so it never reaches server logs.
const resetLink = (email, code) => {
  const base = appUrl()
  if (!base) return null
  return `${base}/forgot-password#${new URLSearchParams({ email, code })}`
}

// Sends a code, or explains why it couldn't
async function sendCode(res, purpose, email, data) {
  const issued = issueOtp(purpose, email, data)
  if (issued.retryAfter) {
    res.status(429).json({ error: `Please wait ${issued.retryAfter}s before requesting another code.`, retryAfter: issued.retryAfter })
    return false
  }
  try {
    const link = purpose === 'reset' ? resetLink(email, issued.code) : null
    await sendOtpMail(email, issued.code, purpose, OTP_MINUTES, link)
    return true
  } catch (err) {
    console.error(`Failed to send ${purpose} code:`, err.message)
    res.status(503).json({ error: 'Could not send the email right now. Please try again in a few minutes.' })
    return false
  }
}

// 1. Sign Up step 1: check the details and email a verification code.
// The account is only created once the code is confirmed.
app.post('/api/auth/signup/start', emailLimiter, requireHuman, async (req, res) => {
  try {
    const { name, password, website } = req.body
    const email = normalizeEmail(req.body.email)

    // Honeypot: the field is hidden from people, bots fill it in
    if (website) return res.status(400).json({ error: 'Could not create the account.' })
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Full name is required.' })
    }
    if (String(name).trim().length > 60) {
      return res.status(400).json({ error: 'Name must be at most 60 characters.' })
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' })
    }
    const problem = passwordProblem(password)
    if (problem) return res.status(400).json({ error: problem })

    if (userDb.findByEmail(email)) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please log in.' })
    }

    const { hash, salt } = hashPassword(password)
    if (!(await sendCode(res, 'signup', email, { name: String(name).trim(), passwordHash: hash, salt }))) return
    res.status(200).json({ message: `We sent a 6-digit code to ${email}.`, email })
  } catch (err) {
    console.error('Signup error:', err)
    res.status(500).json({ error: 'Internal server error during registration.' })
  }
})

// 2. Sign Up step 2: confirm the code and create the account
app.post('/api/auth/signup/verify', authLimiter, (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    const result = verifyOtp('signup', email, req.body.code)
    if (!result.ok) return res.status(400).json({ error: result.error })

    if (userDb.findByEmail(email)) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please log in.' })
    }

    const newUser = userDb.create({
      name: result.data.name,
      email,
      passwordHash: result.data.passwordHash,
      salt: result.data.salt,
      provider: 'local',
      emailVerified: true,
      profileCompleted: false
    })

    const token = generateToken({ userId: newUser.id, email: newUser.email })
    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: sanitizeUser(newUser)
    })
  } catch (err) {
    console.error('Signup verify error:', err)
    res.status(500).json({ error: 'Internal server error during registration.' })
  }
})

// 3. Log In (Email + Password)
app.post('/api/auth/login', authLimiter, (req, res) => {
  try {
    const { password } = req.body
    const email = normalizeEmail(req.body.email)

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' })
    }

    const lockedMinutes = loginLockedFor(email)
    if (lockedMinutes) {
      return res.status(429).json({
        error: `Too many wrong passwords. Try again in ${lockedMinutes} minute(s), or reset your password.`
      })
    }

    const user = userDb.findByEmail(email)
    if (!user) {
      recordFailedLogin(email)
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        error: 'This account uses Google sign-in. Click "Continue with Google", or use "Forgot password" to add a password.'
      })
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt)
    if (!isValid) {
      recordFailedLogin(email)
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    clearFailedLogins(email)
    const token = generateToken({ userId: user.id, email: user.email })
    res.status(200).json({
      message: 'Login successful.',
      token,
      user: sanitizeUser(refreshPracticeStats(user))
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Internal server error during login.' })
  }
})

// 4. Google Sign-In: the ID token is verified with Google before anything is trusted
app.post('/api/auth/google', authLimiter, async (req, res) => {
  try {
    const googleUser = await verifyGoogleCredential(req.body.credential)

    if (!googleUser || !googleUser.email) {
      return res.status(401).json({ error: 'Google sign-in could not be verified. Please try again.' })
    }

    let user = userDb.findByEmail(googleUser.email)
    if (!user) {
      user = userDb.create({
        name: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email.toLowerCase(),
        ...(googleUser.avatar ? { avatar: googleUser.avatar } : {}),
        googleAvatar: googleUser.avatar || null,
        googleId: googleUser.sub || null,
        avatarSource: 'google',
        provider: 'google',
        emailVerified: true,
        profileCompleted: false
      })
    } else {
      // Keep the Google photo on file, but don't replace an avatar the user picked
      const updates = { googleAvatar: googleUser.avatar || null, emailVerified: true }
      if (googleUser.sub && !user.googleId) updates.googleId = googleUser.sub
      if (googleUser.avatar && user.avatarSource !== 'custom') updates.avatar = googleUser.avatar
      user = userDb.update(user.id, updates)
    }

    const token = generateToken({ userId: user.id, email: user.email })
    res.status(200).json({
      message: 'Google login successful.',
      token,
      user: sanitizeUser(refreshPracticeStats(user))
    })
  } catch (err) {
    console.error('Google Auth error:', err)
    res.status(500).json({ error: 'Internal server error during Google authentication.' })
  }
})

// 5. Forgot password: email a reset code. The reply is the same whether or not
// the account exists, so this can't be used to find out who has signed up.
app.post('/api/auth/password/forgot', emailLimiter, requireHuman, async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' })
    }
    const generic = { message: `If an account exists for ${email}, we sent it a 6-digit code.`, email }
    if (!userDb.findByEmail(email)) return res.status(200).json(generic)
    if (!(await sendCode(res, 'reset', email))) return
    res.status(200).json(generic)
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ error: 'Internal server error.' })
  }
})

// 6. Reset password with the emailed code (also lets Google accounts add a password)
app.post('/api/auth/password/reset', authLimiter, (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    const problem = passwordProblem(req.body.password)
    if (problem) return res.status(400).json({ error: problem })

    const result = verifyOtp('reset', email, req.body.code)
    if (!result.ok) return res.status(400).json({ error: result.error })

    const user = userDb.findByEmail(email)
    if (!user) return res.status(400).json({ error: 'This code has expired. Please request a new one.' })

    const { hash, salt } = hashPassword(req.body.password)
    const updated = userDb.setPassword(user.id, hash, salt)
    clearFailedLogins(email)

    const token = generateToken({ userId: updated.id, email: updated.email })
    res.status(200).json({ message: 'Password updated.', token, user: sanitizeUser(updated) })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Internal server error.' })
  }
})

// 7. Current User Session Check
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = userDb.findById(req.user.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found.' })
  }
  res.status(200).json({ user: sanitizeUser(refreshPracticeStats(user)) })
})

// 8. Update Profile
const MAX_AVATAR_DATA_URL = 300 * 1024
app.put('/api/auth/profile', requireAuth, (req, res) => {
  try {
    const { name, age, phone, targetYear, avatar, completeProfile } = req.body
    const updates = {}

    if (name !== undefined) {
      const trimmed = typeof name === 'string' ? name.trim() : ''
      if (!trimmed || trimmed.length > 60) return res.status(400).json({ error: 'Name must be 1 to 60 characters.' })
      updates.name = trimmed
    }
    if (age !== undefined && age !== null && age !== '') {
      const n = Number(age)
      if (!Number.isInteger(n) || n < 10 || n > 100) return res.status(400).json({ error: 'Please enter a valid age (10 to 100).' })
      updates.age = n
    }
    if (phone !== undefined) {
      const cleaned = typeof phone === 'string' ? phone.trim() : ''
      if (cleaned && !/^\+?[0-9][0-9\s-]{6,15}$/.test(cleaned)) return res.status(400).json({ error: 'Please enter a valid phone number.' })
      updates.phone = cleaned
    }
    if (targetYear !== undefined) {
      const y = targetYear === '' || targetYear === null ? null : Number(targetYear)
      if (y !== null && (!Number.isInteger(y) || y < 2020 || y > 2040)) return res.status(400).json({ error: 'Please pick a valid target year.' })
      updates.targetYear = y
    }
    if (avatar !== undefined) {
      const isUrl = typeof avatar === 'string' && /^https:\/\/\S+$/.test(avatar) && avatar.length <= 500
      const isImage = typeof avatar === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)
      if (!isUrl && !isImage) return res.status(400).json({ error: 'Unsupported profile picture.' })
      if (isImage && avatar.length > MAX_AVATAR_DATA_URL) return res.status(400).json({ error: 'Profile picture is too large.' })
      updates.avatar = avatar
      updates.avatarSource = 'custom'
    }

    if (completeProfile) {
      const current = userDb.findById(req.user.id)
      const finalName = updates.name ?? current?.name
      const finalAge = updates.age ?? current?.age
      if (!finalName || !finalAge) return res.status(400).json({ error: 'Name and age are required.' })
      updates.profileCompleted = true
    }

    const updated = userDb.update(req.user.id, updates)
    res.status(200).json({ message: 'Profile updated successfully.', user: sanitizeUser(updated) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' })
  }
})

// --- REST API: ISSUE REPORTS ---
const REPORT_CATEGORIES = ['question', 'bug', 'suggestion', 'other']
const REPORT_STATUSES = ['open', 'in_progress', 'resolved']

app.post('/api/reports', requireAuth, reportLimiter, (req, res) => {
  try {
    const { category, message, page } = req.body
    if (!REPORT_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Please choose a category.' })
    const text = typeof message === 'string' ? message.trim() : ''
    if (text.length < 10) return res.status(400).json({ error: 'Please describe the issue in at least 10 characters.' })
    if (text.length > 2000) return res.status(400).json({ error: 'Please keep the description under 2000 characters.' })

    let questionId = null
    if (req.body.questionId !== undefined && req.body.questionId !== null && req.body.questionId !== '') {
      questionId = Number(req.body.questionId)
      if (!questions.some(q => q.id === questionId)) return res.status(400).json({ error: 'That question could not be found.' })
    }
    if (category === 'question' && questionId === null) {
      return res.status(400).json({ error: 'Please say which question is wrong.' })
    }

    const report = reportDb.create({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      category,
      questionId,
      page: typeof page === 'string' ? page.slice(0, 200) : '',
      message: text
    })
    res.status(201).json({ message: 'Thanks! Your report has been sent.', report })
  } catch (err) {
    console.error('Report error:', err)
    res.status(500).json({ error: 'Failed to send the report.' })
  }
})

app.get('/api/reports/mine', requireAuth, (req, res) => {
  const reports = reportDb.getByUser(req.user.id).sort((a, b) => b.createdAt - a.createdAt)
  res.status(200).json(reports)
})

app.get('/api/reports', requireAuth, requireAdmin, (req, res) => {
  const reports = reportDb.getAll().sort((a, b) => b.createdAt - a.createdAt)
  res.status(200).json(reports)
})

app.patch('/api/reports/:id', requireAuth, requireAdmin, (req, res) => {
  const { status, adminNote } = req.body
  const updates = {}
  if (status !== undefined) {
    if (!REPORT_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' })
    updates.status = status
  }
  if (adminNote !== undefined) updates.adminNote = String(adminNote).slice(0, 1000)
  const updated = reportDb.update(req.params.id, updates)
  if (!updated) return res.status(404).json({ error: 'Report not found.' })
  res.status(200).json(updated)
})

// --- REST API: DUAL-STORAGE CLOUD SYNCHRONIZATION ---

// 1. Get All User Cloud Data (Bookmarks, Notes, Test Records)
app.get('/api/sync/user-data', requireAuth, (req, res) => {
  try {
    const userId = req.user.id
    const bookmarks = bookmarkDb.getUserBookmarks(userId)
    const notes = noteDb.getUserNotes(userId)
    const testRecords = testRecordDb.getUserRecords(userId)
    const practice = attemptDb.getUserAttempts(userId)

    res.status(200).json({
      attempts: practice.attempts || {},
      days: practice.days || {},
      bookmarks: bookmarks.bookmarks || [],
      bookmarkFolders: bookmarks.bookmarkFolders || { "General": [] },
      questionNotes: notes.questionNotes || {},
      mockHistory: testRecords.mockHistory || [],
      pyqHistory: testRecords.pyqHistory || []
    })
  } catch (err) {
    console.error('Sync error:', err)
    res.status(500).json({ error: 'Failed to retrieve synced user data.' })
  }
})

// 2. Sync Bookmarks & Folders
app.put('/api/sync/bookmarks', requireAuth, (req, res) => {
  try {
    const userId = req.user.id
    const { bookmarks, bookmarkFolders } = req.body
    const saved = bookmarkDb.saveUserBookmarks(userId, { bookmarks, bookmarkFolders })
    res.status(200).json({ success: true, bookmarks: saved })
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync bookmarks.' })
  }
})

// 3. Sync Scratchpad Notes
app.put('/api/sync/notes', requireAuth, (req, res) => {
  try {
    const userId = req.user.id
    const { questionNotes, notes } = req.body
    const payload = questionNotes !== undefined ? questionNotes : notes
    const saved = noteDb.saveUserNotes(userId, payload)
    res.status(200).json({ success: true, notes: saved })
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync scratchpad notes.' })
  }
})

// 4. Sync Test Records (Mock Tests & PYQ Mocks)
app.put('/api/sync/test-records', requireAuth, (req, res) => {
  try {
    const userId = req.user.id
    const { mockHistory, pyqHistory } = req.body
    const saved = testRecordDb.saveUserRecords(userId, { mockHistory, pyqHistory })
    res.status(200).json({ success: true, records: saved })
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync test records.' })
  }
})

// 5. Practice Attempts (every answered question, see shared/practice.js)
const questionIds = new Set(questions.map(q => q.id))

app.get('/api/sync/attempts', requireAuth, (req, res) => {
  try {
    const saved = attemptDb.getUserAttempts(req.user.id)
    const user = refreshPracticeStats(userDb.findById(req.user.id))
    res.status(200).json({
      attempts: saved.attempts || {},
      days: saved.days || {},
      summary: practiceSummary(saved, dayKey(Date.now(), saved.timeZone)),
      user: sanitizeUser(user)
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve practice attempts.' })
  }
})

// Merges (never replaces) so two devices syncing at once can't wipe each other's answers
app.put('/api/sync/attempts', requireAuth, (req, res) => {
  try {
    const userId = req.user.id
    const incoming = sanitizePractice(req.body || {}, id => questionIds.has(id))
    const saved = attemptDb.getUserAttempts(userId)
    const merged = mergePractice(sanitizePractice(saved), incoming)
    const timeZone = isValidTimeZone(req.body?.timeZone) ? req.body.timeZone : (saved.timeZone || null)
    attemptDb.saveUserAttempts(userId, { ...merged, timeZone })
    const user = refreshPracticeStats(userDb.findById(userId))
    res.status(200).json({
      success: true,
      attempts: merged.attempts,
      days: merged.days,
      summary: practiceSummary(merged, dayKey(Date.now(), timeZone)),
      user: sanitizeUser(user)
    })
  } catch (err) {
    console.error('Attempts sync error:', err)
    res.status(500).json({ error: 'Failed to sync practice attempts.' })
  }
})

// 6. Discussion Forum Synchronization & Persistence
app.get('/api/discussions', (req, res) => {
  try {
    res.status(200).json(publicDiscussions(discussionDb.getAll()))
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve discussions.' })
  }
})

// Each change touches one post, and the author is always the signed-in user.
// (There used to be a sync endpoint that replaced every discussion with whatever
// the browser sent, which let any account rewrite or wipe other people's posts.)
const knownQuestion = (req, res) => {
  const qid = Number(req.params.questionId)
  if (!Number.isInteger(qid) || !questions.some(q => q.id === qid)) {
    res.status(404).json({ error: 'Question not found.' })
    return null
  }
  return String(qid)
}

app.post('/api/discussions/:questionId/posts', requireAuth, postLimiter, (req, res) => {
  try {
    const qid = knownQuestion(req, res)
    if (!qid) return
    const all = discussionDb.getAll()
    const author = { ...req.user, avatar: /^https:\/\/\S+$/.test(req.user.avatar || '') ? req.user.avatar : null }
    const result = addPost(all, qid, author, req.body)
    if (result.error) return res.status(result.status).json({ error: result.error })
    discussionDb.saveAll(all)
    res.status(201).json({ post: publicPost(result.post) })
  } catch (err) {
    console.error('Post error:', err)
    res.status(500).json({ error: 'Failed to save your comment.' })
  }
})

app.delete('/api/discussions/:questionId/posts/:postId', requireAuth, (req, res) => {
  try {
    const qid = knownQuestion(req, res)
    if (!qid) return
    const all = discussionDb.getAll()
    const result = deletePost(all, qid, req.params.postId, req.user, req.user.isAdmin)
    if (result.error) return res.status(result.status).json({ error: result.error })
    discussionDb.saveAll(all)
    res.status(200).json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete the comment.' })
  }
})

app.put('/api/discussions/:questionId/posts/:postId/vote', requireAuth, postLimiter, (req, res) => {
  try {
    const qid = knownQuestion(req, res)
    if (!qid) return
    const all = discussionDb.getAll()
    const vote = req.body?.vote === undefined ? null : req.body.vote
    const result = votePost(all, qid, req.params.postId, req.user.id, vote)
    if (result.error) return res.status(result.status).json({ error: result.error })
    discussionDb.saveAll(all)
    const { upvotes, downvotes } = publicPost(result.post)
    res.status(200).json({ upvotes, downvotes })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save your vote.' })
  }
})

// --- STATIC ASSETS & PRODUCTION SERVING ---
const publicPath = path.join(__dirname, '..', 'public')
app.use(express.static(publicPath))
app.use('/diagrams', express.static(path.join(publicPath, 'diagrams')))

if (NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist')
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath))
  }
  
  // React routing fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// --- ERROR HANDLING MIDDLEWARE ---
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message || 'Something went wrong on the server!' })
})

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running in ${NODE_ENV} mode on port ${PORT}`)
})

// Graceful Shutdown
const gracefulShutdown = () => {
  console.log('Received kill signal, shutting down gracefully...')
  server.close(() => {
    console.log('Closed remaining connections.')
    process.exit(0)
  })
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
