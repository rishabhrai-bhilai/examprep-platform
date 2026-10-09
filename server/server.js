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
import { userDb, bookmarkDb, noteDb, testRecordDb, discussionDb, visitorDb } from './db/index.js'
import { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  verifyToken,
  parseGoogleCredential, 
  requireAuth 
} from './services/auth.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const NODE_ENV = process.env.NODE_ENV || 'development'

// Resolve paths for ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Helper to sanitize user object sent over API (strip passwordHash and salt)
const sanitizeUser = (user) => {
  if (!user) return null
  const { passwordHash, salt, ...safeUser } = user
  return safeUser
}

// 1. Security Headers (Helmet) with Google Identity & YouTube CSP directives
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "https://lh3.googleusercontent.com"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com", "https://accounts.google.com"],
      connectSrc: [
        "'self'", 
        "https://accounts.google.com",
        "https://apis.google.com",
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
// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'development' ? 5000 : 300,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', apiLimiter)

// Strict Auth Limiter (protects against credential stuffing & brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'development' ? 1000 : 25,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/auth/', authLimiter)

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
  if (topic) filtered = filtered.filter(q => q.topic.toLowerCase() === topic.toString().toLowerCase())
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

// 1. Sign Up (Email + Password)
app.post('/api/auth/signup', (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required.' })
    }
    if (!email || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' })
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' })
    }

    const existingUser = userDb.findByEmail(email)
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please log in.' })
    }

    const { hash, salt } = hashPassword(password)
    const newUser = userDb.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash: hash,
      salt,
      provider: 'local'
    })

    const token = generateToken({ userId: newUser.id, email: newUser.email })
    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: sanitizeUser(newUser)
    })
  } catch (err) {
    console.error('Signup error:', err)
    res.status(500).json({ error: 'Internal server error during registration.' })
  }
})

// 2. Log In (Email + Password)
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' })
    }

    const user = userDb.findByEmail(email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    if (user.provider === 'google' && !user.passwordHash) {
      return res.status(400).json({ 
        error: 'This account is linked with Google. Please click "Continue with Google" to sign in.' 
      })
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt)
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const token = generateToken({ userId: user.id, email: user.email })
    res.status(200).json({
      message: 'Login successful.',
      token,
      user: sanitizeUser(user)
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Internal server error during login.' })
  }
})

// 3. Google Sign-In / OAuth
app.post('/api/auth/google', (req, res) => {
  try {
    const { credential, profile } = req.body
    const googleUser = parseGoogleCredential(credential) || profile

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({ error: 'Invalid or missing Google authentication credentials.' })
    }

    let user = userDb.findByEmail(googleUser.email)
    if (!user) {
      // Create new user with Google profile
      user = userDb.create({
        name: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email.toLowerCase(),
        avatar: googleUser.avatar,
        provider: 'google'
      })
    } else {
      // Update avatar if provided
      if (googleUser.avatar && user.avatar !== googleUser.avatar) {
        user = userDb.update(user.id, { avatar: googleUser.avatar })
      }
    }

    const token = generateToken({ userId: user.id, email: user.email })
    res.status(200).json({
      message: 'Google login successful.',
      token,
      user: sanitizeUser(user)
    })
  } catch (err) {
    console.error('Google Auth error:', err)
    res.status(500).json({ error: 'Internal server error during Google authentication.' })
  }
})

// 4. Current User Session Check
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = userDb.findById(req.user.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found.' })
  }
  res.status(200).json({ user: sanitizeUser(user) })
})

// 5. Update Profile
app.put('/api/auth/profile', requireAuth, (req, res) => {
  try {
    const { name, avatar, streak, solvedQuestions, rank } = req.body
    const updates = {}
    if (name && typeof name === 'string') updates.name = name.trim()
    if (avatar && typeof avatar === 'string') updates.avatar = avatar
    if (streak !== undefined) updates.streak = Number(streak)
    if (solvedQuestions !== undefined) updates.solvedQuestions = Number(solvedQuestions)
    if (rank !== undefined) updates.rank = Number(rank)

    const updated = userDb.update(req.user.id, updates)
    res.status(200).json({ message: 'Profile updated successfully.', user: sanitizeUser(updated) })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' })
  }
})

// 6. Temporary Quick Login by Name
app.post('/api/auth/quick-login', (req, res) => {
  try {
    const { name } = req.body || {}
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please enter your name.' })
    }

    const cleanName = name.trim()
    const isSuper = cleanName.toLowerCase() === 'super'
    const role = isSuper ? 'super' : 'user'
    const email = isSuper ? 'super@examprep.local' : `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}@examprep.local`

    // Find existing or create user
    let user = userDb.findByEmail(email)
    if (!user) {
      user = userDb.create({
        name: cleanName,
        email,
        role,
        provider: 'quick'
      })
    } else {
      user = userDb.update(user.id, { role, name: cleanName })
    }

    // Record visit in visitor tracking database
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const userAgent = req.headers['user-agent']
    const stats = visitorDb.recordVisit(cleanName, { ip: clientIp, userAgent })

    const token = generateToken({ userId: user.id, email: user.email, role: user.role })
    res.status(200).json({
      message: 'Quick login successful.',
      token,
      user: { ...sanitizeUser(user), role: user.role, isSuper },
      visitorStats: stats
    })
  } catch (err) {
    console.error('Quick login error:', err)
    res.status(500).json({ error: 'Failed to process quick login.' })
  }
})

// --- REST API: VISITOR TRACKING & ANALYTICS ---

// 1. Get Visitor Stats & Logs (Super User only)
app.get('/api/visitors', (req, res) => {
  try {
    const authHeader = req.headers.authorization
    let isSuper = false

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1]
        const decoded = verifyToken(token)
        if (decoded) {
          const user = userDb.findById(decoded.userId)
          if (user && (user.role === 'super' || (user.name && user.name.trim().toLowerCase() === 'super'))) {
            isSuper = true
          }
        }
      } catch (_) {}
    }

    const stats = visitorDb.getStats()
    if (!isSuper) {
      return res.status(403).json({ error: 'Access restricted to Super User.' })
    }

    res.status(200).json(stats)
  } catch (err) {
    console.error('Error fetching visitor stats:', err)
    res.status(500).json({ error: 'Failed to fetch visitor stats.' })
  }
})

// 2. Ping Visitor (counts anonymous or logged-in visit)
app.post('/api/visitors/ping', (req, res) => {
  try {
    const { name } = req.body || {}
    if (!name || name === 'Guest') {
      const stats = visitorDb.getStats()
      return res.status(200).json({
        totalUniqueUsers: stats.totalUniqueUsers,
        totalVisits: stats.totalVisits
      })
    }
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const userAgent = req.headers['user-agent']
    const stats = visitorDb.recordVisit(name, { ip: clientIp, userAgent })
    res.status(200).json({
      totalUniqueUsers: stats.totalUniqueUsers,
      totalVisits: stats.totalVisits
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to record visitor ping.' })
  }
})

// --- REST API: DUAL-STORAGE CLOUD SYNCHRONIZATION ---

// 1. Get All User Cloud Data (Bookmarks, Notes, Test Records)
app.get('/api/sync/user-data', requireAuth, (req, res) => {
  try {
    const userId = req.user.id
    const bookmarks = bookmarkDb.getUserBookmarks(userId)
    const notes = noteDb.getUserNotes(userId)
    const testRecords = testRecordDb.getUserRecords(userId)

    res.status(200).json({
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

// 5. Discussion Forum Synchronization & Persistence
app.get('/api/discussions', (req, res) => {
  try {
    const discussions = discussionDb.getAll()
    res.status(200).json(discussions)
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve discussions.' })
  }
})

app.post('/api/discussions/sync', requireAuth, (req, res) => {
  try {
    const { discussions } = req.body
    if (discussions && typeof discussions === 'object') {
      discussionDb.saveAll(discussions)
    }
    res.status(200).json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to persist discussions.' })
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
