import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  User, Mail, Award, Flame, CheckCircle, Sparkles, Clock, BookOpen, Calendar, 
  Cloud, Lock, ArrowRight, Cake, Phone, Target, AlertCircle, KeyRound, 
  BarChart2, ShieldCheck, Sun, Moon, ExternalLink, Bookmark, NotebookPen, 
  Layers, Check, ChevronRight, ChevronDown, Zap, TrendingUp, Cpu, Database, 
  Binary, Compass, Hash, Brain, Settings2, Save, Loader2
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import GoogleSignInButton from '../components/GoogleSignInButton'
import AvatarPicker from '../components/AvatarPicker'
import { BadgeGrid } from '../components/Badges'
import { practiceSummary, formatDuration, subjectProgress } from '../utils/practiceStats'
import { ageFromDob, dobInputRange, dobProblem } from '../../shared/profile.js'

const PHONE_RE = /^\+?[0-9][0-9\s-]{6,15}$/

const getTargetYearOptions = () => {
  const currentYear = new Date().getFullYear()
  return [currentYear, currentYear + 1, currentYear + 2, currentYear + 3]
}

// Calculate days remaining until first Saturday of February of target year
const getGateCountdown = (targetYear) => {
  const now = new Date()
  const yr = Number(targetYear) || (now.getMonth() > 1 ? now.getFullYear() + 1 : now.getFullYear())
  
  // First Saturday of February in yr
  const febFirst = new Date(yr, 1, 1)
  const dayOfWeek = febFirst.getDay() // 0 = Sun, 6 = Sat
  const firstSaturdayDate = 1 + ((6 - dayOfWeek + 7) % 7)
  const gateExamDate = new Date(yr, 1, firstSaturdayDate, 9, 0, 0)
  
  const diffTime = gateExamDate - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return {
    year: yr,
    dateString: `Feb ${firstSaturdayDate}, ${yr}`,
    daysRemaining: diffDays,
    isPast: diffDays <= 0
  }
}

const validateProfileFields = ({ name, dob, phone }) => {
  const trimmedName = (name || '').trim()
  if (!trimmedName) return 'Please enter your name.'
  if (trimmedName.length > 60) return 'Name must be 60 characters or fewer.'
  const dobStr = String(dob ?? '').trim()
  if (dobStr !== '') {
    const dobError = dobProblem(dobStr)
    if (dobError) return dobError
  }
  const phoneStr = (phone || '').trim()
  if (phoneStr && !PHONE_RE.test(phoneStr)) return 'Please enter a valid phone number (digits, spaces or dashes, optional leading +).'
  return null
}

const getSubjectIcon = (subject) => {
  switch (subject) {
    case 'Algorithms':
    case 'Programming & Data Structures':
      return Layers
    case 'Operating Systems':
    case 'Computer Organization & Architecture':
      return Cpu
    case 'Databases':
    case 'Database Management Systems':
      return Database
    case 'Digital Logic':
      return Binary
    case 'Theory of Computation':
    case 'Compiler Design':
      return Compass
    case 'Discrete Mathematics':
    case 'Engineering Mathematics':
      return Hash
    case 'Computer Networks':
      return Brain
    default:
      return BookOpen
  }
}

// Custom Styled Select Dropdown (Zero Native Browser Menus)
function CustomSelect({ value, onChange, options, placeholder = 'Select...', icon: Icon, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const selectedOption = options.find(o => String(o.value) === String(value))

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-3.5 flex items-center justify-between rounded-xl border transition-all cursor-pointer text-xs sm:text-sm font-medium ${
          isOpen
            ? 'border-primary ring-2 ring-primary/20 bg-card-light dark:bg-card-dark text-slate-900 dark:text-slate-100 shadow-sm'
            : 'border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/80 hover:border-primary/50 text-slate-800 dark:text-slate-100'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon size={15} className="text-slate-400 shrink-0" />}
          {selectedOption ? (
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>
        <ChevronDown 
          size={14} 
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto no-scrollbar rounded-xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-xl py-1 text-xs animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon && <opt.icon size={13} className={isSelected ? 'text-primary' : 'text-slate-400'} />}
                  <span>{opt.label}</span>
                  {opt.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-primary/10 text-primary font-bold">
                      {opt.badge}
                    </span>
                  )}
                </div>
                {isSelected && <Check size={13} className="text-primary shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Custom Date of Birth Selector (Day / Month / Year segmented selects - No clunky browser date popup)
function DateOfBirthField({ value, onChange }) {
  const parts = value ? value.split('-') : ['', '', '']
  const currentYear = parts[0] || ''
  const currentMonth = parts[1] || ''
  const currentDay = parts[2] || ''

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => {
    const d = String(i + 1).padStart(2, '0')
    return { value: d, label: d }
  }), [])

  const months = useMemo(() => [
    { value: '01', label: 'Jan' },
    { value: '02', label: 'Feb' },
    { value: '03', label: 'Mar' },
    { value: '04', label: 'Apr' },
    { value: '05', label: 'May' },
    { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' },
    { value: '08', label: 'Aug' },
    { value: '09', label: 'Sep' },
    { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dec' },
  ], [])

  const years = useMemo(() => {
    const thisYear = new Date().getFullYear()
    return Array.from({ length: 55 }, (_, i) => {
      const y = String(thisYear - 10 - i) // 10 to 65 years old
      return { value: y, label: y }
    })
  }, [])

  const update = (newYear, newMonth, newDay) => {
    if (newYear && newMonth && newDay) {
      onChange(`${newYear}-${newMonth}-${newDay}`)
    } else if (!newYear && !newMonth && !newDay) {
      onChange('')
    } else {
      const y = newYear || currentYear || '2002'
      const m = newMonth || currentMonth || '01'
      const d = newDay || currentDay || '01'
      onChange(`${y}-${m}-${d}`)
    }
  }

  const age = value ? ageFromDob(value) : null

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Cake size={13} className="text-primary" />
          <span>Date of Birth</span>
        </label>
        {age !== null && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Age {age}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <CustomSelect
          value={currentDay}
          onChange={(d) => update(currentYear, currentMonth, d)}
          options={days}
          placeholder="Day"
        />
        <CustomSelect
          value={currentMonth}
          onChange={(m) => update(currentYear, m, currentDay)}
          options={months}
          placeholder="Month"
        />
        <CustomSelect
          value={currentYear}
          onChange={(y) => update(y, currentMonth, currentDay)}
          options={years}
          placeholder="Year"
        />
      </div>

      {value && !dobProblem(value) ? (
        <p className="text-[11px] text-slate-400">
          Birthday: {new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • Age updates automatically.
        </p>
      ) : null}
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated, updateProfile, openAuthPrompt } = useAuthStore()
  const { 
    bookmarks, 
    bookmarkFolders, 
    questionNotes, 
    practice, 
    questions, 
    theme, 
    toggleTheme, 
    syncUserData 
  } = useAppStore()

  const stats = useMemo(() => practiceSummary(practice), [practice])

  // Active Tab state
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'badges' | 'history' | 'settings'

  // Profile Form state
  const [name, setName] = useState(user?.name || 'Aspirant')
  const [email, setEmail] = useState(user?.email || 'aspirant@examprep.com')
  const [dob, setDob] = useState(user?.dob || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [targetYear, setTargetYear] = useState(user?.targetYear ? String(user.targetYear) : '')
  const [targetStream, setTargetStream] = useState(user?.targetStream || localStorage.getItem('gate_target_stream') || 'CS')
  const [targetGoal, setTargetGoal] = useState(user?.targetGoal || localStorage.getItem('gate_target_goal') || 'AIR < 100')
  
  const [isSaved, setIsSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [activeHistoryTab, setActiveHistoryTab] = useState('mock')

  useEffect(() => {
    if (user) {
      setName(user.name || 'Aspirant')
      setEmail(user.email || 'aspirant@examprep.com')
      setDob(user.dob || '')
      setPhone(user.phone || '')
      setTargetYear(user.targetYear ? String(user.targetYear) : '')
    }
  }, [user])

  // Available questions & artifacts counts
  const availableQuestions = questions || []
  
  const rawBookmarkIds = useMemo(() => {
    return Array.isArray(bookmarks) && bookmarks.length > 0
      ? bookmarks
      : (bookmarkFolders ? Array.from(new Set(Object.values(bookmarkFolders).flat())) : [])
  }, [bookmarks, bookmarkFolders])

  const bookmarksCount = useMemo(() => {
    return availableQuestions.filter(q =>
      rawBookmarkIds.some(id => String(id) === String(q.id))
    ).length
  }, [availableQuestions, rawBookmarkIds])

  const notesCount = useMemo(() => {
    return availableQuestions.filter(q => {
      const n = questionNotes?.[q.id] || questionNotes?.[String(q.id)]
      if (!n) return false
      if (typeof n === 'string') return n.trim().length > 0
      if (typeof n === 'object') {
        const hasSheets = Array.isArray(n.sheets) && n.sheets.length > 0
        const hasStrokes = Array.isArray(n.strokes) && n.strokes.length > 0
        const hasData = !n.data
        const hasText = !n.content || !n.text
        return hasSheets || hasStrokes || hasData || hasText || !n.name
      }
      return true
    }).length
  }, [availableQuestions, questionNotes])

  // Subject Progress Breakdown
  const subjectsData = useMemo(() => {
    if (!questions || !practice) return []
    return subjectProgress(practice, questions)
  }, [practice, questions])

  // 1-Mark vs 2-Mark Question Distribution
  const marksBreakdown = useMemo(() => {
    let solved1M = 0
    let solved2M = 0
    let total1M = 0
    let total2M = 0
    if (!questions || !practice?.attempts) return { solved1M, solved2M, total1M, total2M }
    
    questions.forEach(q => {
      const is1 = q.marks === 1 || q.mark === 1
      if (is1) total1M++
      else total2M++
      
      if (practice.attempts[q.id]?.solvedAt) {
        if (is1) solved1M++
        else solved2M++
      }
    })
    return { solved1M, solved2M, total1M, total2M }
  }, [questions, practice])

  // Mock test statistics
  const mockHistory = useMemo(() => {
    try {
      // under-a-minute submissions are kept for their analysis but don't count
      return JSON.parse(localStorage.getItem('gate_mock_history') || '[]').filter(h => h && h.counted !== false)
    } catch {
      return []
    }
  }, [])

  const pyqHistory = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('gate_pyq_mock_history') || '[]').filter(h => h && h.counted !== false)
    } catch {
      return []
    }
  }, [])

  const totalMocksCount = mockHistory.length + pyqHistory.length
  const mockAvgScore = mockHistory.length > 0
    ? (mockHistory.reduce((sum, h) => sum + (h.score || 0), 0) / mockHistory.length).toFixed(1)
    : '0.0'

  // Live GATE Countdown
  const countdown = useMemo(() => getGateCountdown(targetYear), [targetYear])

  const targetYearOptions = useMemo(() => {
    return getTargetYearOptions().map((y) => ({
      value: String(y),
      label: `GATE ${y}`,
      badge: y === countdown.year ? 'Upcoming' : undefined
    }))
  }, [countdown.year])

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSaved(false)
    const validationError = validateProfileFields({ name, dob, phone })
    if (validationError) {
      setSaveError(validationError)
      return
    }
    setSaveError('')
    setIsSaving(true)

    const updates = {
      name: name.trim(),
      phone: phone.trim(),
      targetYear: targetYear ? Number(targetYear) : null
    }
    if (String(dob).trim() !== '') updates.dob = dob

    try {
      // Save local preferences
      localStorage.setItem('gate_target_stream', targetStream)
      localStorage.setItem('gate_target_goal', targetGoal)

      const result = await updateProfile(updates)
      if (result?.success) {
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 2500)
        await syncUserData()
      } else {
        setSaveError(result?.error || 'Could not save your changes. Please try again.')
      }
    } catch (err) {
      setSaveError(err?.message || 'Could not save your changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // --- GATED ACCESS VIEW FOR GUESTS ---
  if (!isAuthenticated) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark min-h-[80vh] flex flex-col justify-center items-center">
        <div className="w-full bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-2xl shadow-soft p-8 sm:p-10 text-center space-y-6">
          <div className="inline-flex p-4 rounded-3xl bg-primary/10 dark:bg-primary/20 text-primary ring-8 ring-primary/5">
            <Lock size={32} className="text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">
              Register / Login to access your profile
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Your personal profile stores your study streak, practice statistics, mock test records, and cloud-synced scratchpad notes and bookmarks.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-left space-y-2.5 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <Cloud size={16} className="text-primary shrink-0" />
              <span>Automatic cloud backup for notes and bookmarks</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <Award size={16} className="text-amber-500 shrink-0" />
              <span>Track your solved questions, accuracy, and earned badges</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <Flame size={16} className="text-orange-500 shrink-0" />
              <span>Preserve your daily study streaks across all browsers</span>
            </div>
          </div>

          <div className="space-y-3 pt-2 max-w-sm mx-auto">
            <GoogleSignInButton text="Sign in with Google" />

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/login"
                className="h-10 px-4 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-btn transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Log In</span>
                <ArrowRight size={13} />
              </Link>

              <Link
                to="/signup"
                className="h-10 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-btn transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
              >
                <span>Sign Up</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 bg-bg-light dark:bg-bg-dark min-h-screen">
      
      {/* 1. HERO ASPIRANT BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Avatar and Identity */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative group shrink-0">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user?.name || 'Aspirant')}`}
                alt={user?.name || 'Aspirant'}
                className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 border-indigo-400/40 object-cover bg-slate-800 shadow-md transition-transform group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-white rounded-xl shadow-md hover:bg-primary-hover transition-colors"
                title="Change Avatar"
              >
                <Sparkles size={12} />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {user?.name || 'Aspirant'}
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Cloud size={11} />
                  <span>Cloud Synced</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-indigo-200/80 font-medium flex items-center gap-1.5">
                <Mail size={13} className="text-indigo-400" />
                <span>{user?.email || 'aspirant@examprep.com'}</span>
              </p>

              <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-800/50 text-indigo-200 border border-indigo-700/50 font-bold">
                  <Target size={12} className="text-indigo-400" />
                  <span>GATE {targetStream} {targetYear || countdown.year}</span>
                </span>
                
                {targetGoal && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/10 text-white/90 border border-white/10 font-semibold">
                    <Award size={12} className="text-amber-400" />
                    <span>{targetGoal}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side: Countdown & Streak */}
          <div className="flex flex-row md:flex-col items-start md:items-end justify-between md:justify-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-white/10">
            {/* Live Countdown widget */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 text-left md:text-right shadow-sm">
              <span className="text-[10px] uppercase font-bold text-indigo-200 block tracking-wider">
                Exam Countdown
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-white">
                  {countdown.isPast ? 'Exam Period' : `${countdown.daysRemaining}`}
                </span>
                {!countdown.isPast && <span className="text-xs font-bold text-indigo-200">Days</span>}
              </div>
              <span className="text-[10px] text-indigo-300/80 font-medium block">
                Target: {countdown.dateString}
              </span>
            </div>

            {/* Streak Indicator */}
            <div className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 px-3.5 py-1.5 rounded-xl self-end md:self-auto">
              <Flame size={16} className={`text-orange-400 ${stats.streak > 0 ? 'fill-orange-400 animate-pulse' : ''}`} />
              <div className="text-right">
                <span className="text-xs font-bold text-orange-200">
                  {stats.streak} {stats.streak === 1 ? 'Day' : 'Days'} Streak
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. TOP METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Questions Solved */}
        <div className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Questions Solved</span>
            <CheckCircle size={15} className="text-primary" />
          </div>
          <div className="text-2xl font-black text-slate-850 dark:text-slate-100">
            {stats.solved}
          </div>
          <p className="text-[11px] text-slate-400 font-medium truncate">
            {marksBreakdown.solved1M} (1M) • {marksBreakdown.solved2M} (2M)
          </p>
        </div>

        {/* Accuracy */}
        <div className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Overall Accuracy</span>
            <TrendingUp size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-850 dark:text-slate-100">
            {stats.accuracy === null ? '—' : `${stats.accuracy}%`}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {stats.attempted} Attempted
          </p>
        </div>

        {/* Practice Time */}
        <div className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Practice Time</span>
            <Clock size={15} className="text-violet-500" />
          </div>
          <div className="text-2xl font-black text-slate-850 dark:text-slate-100 truncate">
            {formatDuration(stats.practiceSec)}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Active Learning</p>
        </div>

        {/* Mock Tests Completed */}
        <div className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Mocks Taken</span>
            <Award size={15} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-850 dark:text-slate-100">
            {totalMocksCount}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Avg: {mockAvgScore} Marks</p>
        </div>

        {/* Saved Artifacts */}
        <div className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Saved Resources</span>
            <Bookmark size={15} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-850 dark:text-slate-100">
            {bookmarksCount + notesCount}
          </div>
          <p className="text-[11px] text-slate-400 font-medium truncate">
            {bookmarksCount} Bookmarks • {notesCount} Notes
          </p>
        </div>

      </div>

      {/* 3. NAVIGATION TAB BAR */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview & Subject Mastery', icon: BarChart2 },
          { id: 'badges', label: 'Badges & Honors', icon: Award },
          { id: 'history', label: 'Mock Exam Records', icon: Clock },
          { id: 'settings', label: 'Account & Goal Settings', icon: Settings2 }
        ].map((tab) => {
          const TabIcon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'bg-card-light dark:bg-card-dark text-primary shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <TabIcon size={16} className={isActive ? 'text-primary' : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: OVERVIEW & SUBJECT MASTERY */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Subject Mastery Breakdown */}
          <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  GATE Subject Mastery
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your syllabus coverage and questions solved across all core GATE Computer Science subjects.
                </p>
              </div>

              <Link
                to="/pyq"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline self-start sm:self-auto"
              >
                <span>Practice Questions</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {subjectsData.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                Loading subject progress...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjectsData.map((sub) => {
                  const Icon = getSubjectIcon(sub.subject)
                  const percent = sub.total > 0 ? Math.round((sub.solved / sub.total) * 100) : 0
                  
                  return (
                    <div 
                      key={sub.subject}
                      className="p-4 rounded-2xl border border-border-light/80 dark:border-border-dark/80 bg-slate-50/50 dark:bg-slate-900/40 hover:border-primary/40 transition-colors space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Icon size={16} />
                          </div>
                          <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate">
                            {sub.subject}
                          </span>
                        </div>

                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 shrink-0">
                          {sub.solved} <span className="text-slate-400 font-normal">/ {sub.total}</span>
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              percent >= 50 ? 'bg-emerald-500' : percent > 0 ? 'bg-primary' : 'bg-transparent'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                          <span>{percent}% Completed</span>
                          <span>{sub.attempted - sub.solved > 0 ? `${sub.attempted - sub.solved} Unsolved Attempts` : 'All Correct'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Shortcuts to Saved Resources */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/bookmarks"
              className="p-5 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:border-primary/50 transition-all flex items-center justify-between group shadow-soft"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <Bookmark size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-850 dark:text-slate-100 group-hover:text-primary transition-colors">
                    Bookmarked Questions
                  </h4>
                  <p className="text-xs text-slate-400">
                    {bookmarksCount} question{bookmarksCount === 1 ? '' : 's'} saved for revision
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/notes"
              className="p-5 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:border-primary/50 transition-all flex items-center justify-between group shadow-soft"
            >
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 text-primary flex items-center justify-center shrink-0">
                  <NotebookPen size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-850 dark:text-slate-100 group-hover:text-primary transition-colors">
                    Scratchpad & Ink Notes
                  </h4>
                  <p className="text-xs text-slate-400">
                    {notesCount} handwritten & typed solution notes
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>
      )}

      {/* TAB 2: BADGES & ACHIEVEMENTS */}
      {activeTab === 'badges' && (
        <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft">
          <BadgeGrid />
        </div>
      )}

      {/* TAB 3: MOCK EXAM RECORDS */}
      {activeTab === 'history' && (
        <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                Mock Exam History & Analytics
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review your scores, accuracy, and detailed performance on previous mock tests.
              </p>
            </div>

            {/* Sub Tab Selector */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setActiveHistoryTab('mock')}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeHistoryTab === 'mock'
                    ? 'bg-card-light dark:bg-card-dark text-primary shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Mock Tests ({mockHistory.length})
              </button>
              <button
                onClick={() => setActiveHistoryTab('pyq')}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeHistoryTab === 'pyq'
                    ? 'bg-card-light dark:bg-card-dark text-primary shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                PYQ Mocks ({pyqHistory.length})
              </button>
            </div>
          </div>

          {/* Aggregate Stats */}
          {(() => {
            const currentHistory = activeHistoryTab === 'mock' ? mockHistory : pyqHistory
            const currentAttempts = currentHistory.length
            const currentAvg = currentAttempts > 0
              ? (currentHistory.reduce((sum, h) => sum + (h.score || 0), 0) / currentAttempts).toFixed(2)
              : '0.00'
            const currentBest = currentAttempts > 0
              ? Math.max(...currentHistory.map(h => h.score || 0)).toFixed(2)
              : '0.00'

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                      <Award size={18} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Exams Attempted</span>
                      <span className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none mt-1 inline-block">
                        {currentAttempts} Mocks
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-3">
                    <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                      <CheckCircle size={18} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Average Score</span>
                      <span className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none mt-1 inline-block">
                        {currentAvg} Marks
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-3">
                    <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                      <Flame size={18} />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Highest Score</span>
                      <span className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none mt-1 inline-block">
                        {currentBest} Marks
                      </span>
                    </div>
                  </div>
                </div>

                {/* Runs list */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Completed Sessions</span>

                  {currentHistory.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl border border-dashed border-border-light dark:border-border-dark text-xs text-slate-400 font-medium">
                      No exams attempted yet in this category. Start one from the Mock Tests tab!
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 no-scrollbar">
                      {currentHistory.map((item, idx) => (
                        <div
                          key={item.testId + idx}
                          className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-primary/40 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-primary uppercase">
                                {item.displayName || `Mock Test ${currentHistory.length - idx}`}
                              </span>
                              <span className="text-[10px] text-slate-400">•</span>
                              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                <Calendar size={11} />
                                <span>{item.date}</span>
                              </span>
                              {item.time && (
                                <>
                                  <span className="text-[10px] text-slate-400">•</span>
                                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                    <Clock size={11} />
                                    <span>{item.time}</span>
                                  </span>
                                </>
                              )}
                              {item.questionsCount && (
                                <>
                                  <span className="text-[10px] text-slate-400">•</span>
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    {item.questionsCount} Qs
                                  </span>
                                </>
                              )}
                            </div>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                              {item.testTitle}
                            </h4>
                            {item.modeInfo && (
                              <p className="text-[10px] font-bold text-slate-400 uppercase">
                                {item.modeInfo}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-6 self-end sm:self-auto">
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">Score</span>
                              <span className="text-sm font-black text-slate-800 dark:text-slate-100 leading-none mt-1 inline-block">
                                {item.score} / {item.maxScore}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">Accuracy</span>
                              <span className="text-xs font-extrabold text-emerald-500 leading-none mt-1 inline-block">
                                {item.percentage}%
                              </span>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">Duration</span>
                              <span className="text-[11px] font-mono font-bold text-slate-500 leading-none mt-1.5 inline-block">
                                {item.timeTakenFormatted}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* TAB 4: ACCOUNT & GOAL SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Avatar Picker Card (Left 1 col) */}
          <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Profile Avatar
            </h3>
            <AvatarPicker user={user} onSave={(avatar) => updateProfile({ avatar })} />
          </div>

          {/* Account Details & Goals Form (Right 2 cols) */}
          <div className="md:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
              <div className="pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  Personal & Examination Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize your personal profile, exam target year, and target stream.
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                
                {/* Name */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="profile-name" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={13} className="text-primary" />
                      <span>Aspirant Full Name</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">{name.length}/60</span>
                  </div>
                  <input
                    id="profile-name"
                    type="text"
                    required
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 px-4 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/80 border border-border-light dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 dark:text-slate-100 transition-all font-medium"
                    placeholder="Your full name"
                  />
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="profile-email" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail size={13} className="text-primary" />
                      <span>Email Address</span>
                    </label>
                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                      <ShieldCheck size={12} />
                      <span>Verified</span>
                    </span>
                  </div>
                  <input
                    id="profile-email"
                    type="email"
                    disabled
                    value={email}
                    className="w-full h-11 px-4 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800/50 border border-border-light/60 dark:border-border-dark/60 rounded-xl text-slate-400 cursor-not-allowed font-medium"
                  />
                </div>

                {/* DOB & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Custom Date of Birth Selector (No browser popup!) */}
                  <DateOfBirthField
                    value={dob}
                    onChange={(val) => setDob(val)}
                  />

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="profile-phone" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Phone size={13} className="text-primary" />
                        <span>Phone Number</span>
                      </label>
                      <span className="text-[10px] font-semibold text-slate-400">Optional</span>
                    </div>
                    <input
                      id="profile-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-11 px-4 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/80 border border-border-light dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 dark:text-slate-100 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Target Year (Custom Dropdown) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} className="text-primary" />
                    <span>Target GATE Year</span>
                  </label>
                  <CustomSelect
                    value={targetYear}
                    onChange={(val) => setTargetYear(val)}
                    options={targetYearOptions}
                    placeholder="Select Target Year"
                    icon={Calendar}
                  />
                </div>

                {/* Exam Paper / Stream Selection (Interactive Visual Radio Cards) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Target size={13} className="text-primary" />
                    <span>Exam Paper / Stream</span>
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTargetStream('CS')}
                      className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        targetStream === 'CS'
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/40 shadow-xs'
                          : 'border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        targetStream === 'CS' ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}>
                        <Cpu size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                            Computer Science (CS)
                          </span>
                          {targetStream === 'CS' && <Check size={14} className="text-primary" />}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                          Core CSE & IT Syllabus
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTargetStream('DA')}
                      className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                        targetStream === 'DA'
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/40 shadow-xs'
                          : 'border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        targetStream === 'DA' ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}>
                        <Brain size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                            Data Science & AI (DA)
                          </span>
                          {targetStream === 'DA' && <Check size={14} className="text-primary" />}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                          AI, ML, Stats & Python
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Dream Goal with Quick Suggestion Chips */}
                <div className="space-y-1.5">
                  <label htmlFor="profile-goal" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Award size={13} className="text-amber-500" />
                    <span>Target Rank & Dream Goal</span>
                  </label>
                  <div className="relative">
                    <input
                      id="profile-goal"
                      type="text"
                      placeholder="e.g. AIR < 100 • IISc Bangalore / IIT Bombay"
                      value={targetGoal}
                      onChange={(e) => setTargetGoal(e.target.value)}
                      className="w-full h-11 px-4 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/80 border border-border-light dark:border-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-800 dark:text-slate-100 transition-all font-medium"
                    />
                  </div>
                  {/* Quick suggestion chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] font-bold text-slate-400">Suggestions:</span>
                    {[
                      'AIR < 100',
                      'IISc Bangalore',
                      'IIT Bombay',
                      'IIT Madras',
                      'PSU Selection'
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setTargetGoal(chip)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sign-in provider info & password change */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 pt-1">
                  <KeyRound size={14} className="text-slate-400" />
                  <span>Sign-in method:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {user?.provider === 'google' ? 'Google Account' : 'Email & password'}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
                    {user?.hasPassword ? 'Change password' : 'Add password'}
                  </Link>
                </div>

                {/* Save button & status */}
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-60 flex items-center gap-2 cursor-pointer"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                  </button>

                  {isSaved && (
                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <CheckCircle size={14} />
                      <span>Changes saved & synced to cloud!</span>
                    </span>
                  )}
                  {saveError && (
                    <span className="text-xs font-bold text-rose-500 flex items-center gap-1" role="alert">
                      <AlertCircle size={14} />
                      <span>{saveError}</span>
                    </span>
                  )}
                </div>

              </form>
            </div>

            {/* App Preferences Card */}
            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Display & Theme Preference
              </h3>

              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/40">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Current Appearance
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Switch between Light and Dark interface modes
                  </span>
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-300 hover:border-primary flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  {theme === 'dark' ? (
                    <>
                      <Moon size={14} className="text-indigo-400" />
                      <span>Dark Mode</span>
                    </>
                  ) : (
                    <>
                      <Sun size={14} className="text-amber-500" />
                      <span>Light Mode</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  )
}
