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

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const NODE_ENV = process.env.NODE_ENV || 'development'

// Resolve paths for ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 1. Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://api.dicebear.com", "https://images.unsplash.com"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com"],
      connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "http://10.*", "http://192.*"]
    }
  }
}))

// 2. Cross-Origin Resource Sharing (CORS)
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    // In dev mode, allow wildcards or local IP prefixes for tablet/mobile testing
    if (NODE_ENV === 'development') {
      return callback(null, true)
    }
    
    if (origin === corsOrigin) {
      return callback(null, true)
    } else {
      return callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

// 3. Compression (Gzip)
app.use(compression())

// 4. Request Logging (Morgan)
if (NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// 5. Rate Limiting (API security)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', apiLimiter)

// Parse JSON request bodies
app.use(express.json())

// Load database questions into memory
const questionsPath = path.join(__dirname, 'data', 'questions.json')
let questions = []
try {
  const fileData = fs.readFileSync(questionsPath, 'utf8')
  questions = JSON.parse(fileData)
  console.log(`Successfully loaded ${questions.length} questions from database.`)
} catch (error) {
  console.error('Failed to load questions database:', error)
  process.exit(1)
}

// --- REST API ENDPOINTS ---

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', environment: NODE_ENV, timestamp: new Date() })
})

// Get Questions with query parameters (server-side filtering)
app.get('/api/questions', (req, res) => {
  let filtered = [...questions]
  
  const { year, subject, topic, type, marks } = req.query
  
  if (year) {
    filtered = filtered.filter(q => q.year.toString() === year.toString())
  }
  
  if (subject) {
    filtered = filtered.filter(q => q.subject.toLowerCase() === subject.toString().toLowerCase())
  }
  
  if (topic) {
    filtered = filtered.filter(q => q.topic.toLowerCase() === topic.toString().toLowerCase())
  }
  
  if (type) {
    filtered = filtered.filter(q => q.type.toLowerCase() === type.toString().toLowerCase())
  }
  
  if (marks) {
    filtered = filtered.filter(q => q.marks.toString() === marks.toString())
  }
  
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

// --- STATIC FILES SERVING IN PRODUCTION ---
if (NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  
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
  
  // Force shutdown after 10s
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
