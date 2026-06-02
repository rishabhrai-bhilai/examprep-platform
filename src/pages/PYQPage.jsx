import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ThumbsUp, ThumbsDown, MessageSquare, Bookmark, Play, ChevronUp, ChevronDown, 
  ChevronLeft, ChevronRight,
  Check, X, AlertCircle, Calendar, BookOpen, Layers, Shuffle, Settings2, ArrowLeft, ArrowRight,
  Edit3, Cpu, Database, Globe, Binary, Compass, Hash, Brain
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import DiscussionDrawer from '../components/DiscussionDrawer'
import VideoSolutionModal from '../components/VideoSolutionModal'
import ScratchpadDrawer from '../components/ScratchpadDrawer'

export default function PYQPage() {
  const {
    activeQuestionIndex,
    setActiveQuestionIndex,
    bookmarks,
    toggleBookmark,
    votes,
    upvoteQuestion,
    downvoteQuestion,
    setActiveDiscussionQuestionId,
    setActiveVideoSolutionUrl,
    scratchpadOpenQuestionId,
    setScratchpadOpenQuestionId,
    questionNotes,
    questions
  } = useAppStore()

  const getSubjectConfig = (subject) => {
    switch (subject) {
      case 'Algorithms & Data Structures':
        return {
          icon: Layers,
          colorClass: 'text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/20',
          gradientClass: 'from-indigo-500/5 to-violet-500/5 hover:border-indigo-500 dark:hover:border-indigo-500',
          badgeColor: 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400',
          label: 'Data structures, complexity, sorting, graphs'
        }
      case 'Operating Systems':
        return {
          icon: Cpu,
          colorClass: 'text-teal-500 bg-teal-500/10 dark:bg-teal-500/20 border-teal-500/20',
          gradientClass: 'from-teal-500/5 to-emerald-500/5 hover:border-teal-500 dark:hover:border-teal-500',
          badgeColor: 'bg-teal-500/10 text-teal-650 dark:text-teal-400',
          label: 'Paging, CPU scheduling, threads, sync'
        }
      case 'Databases (DBMS)':
        return {
          icon: Database,
          colorClass: 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20',
          gradientClass: 'from-blue-500/5 to-cyan-500/5 hover:border-blue-500 dark:hover:border-blue-500',
          badgeColor: 'bg-blue-500/10 text-blue-650 dark:text-blue-400',
          label: 'Normalization, SQL, indexing, transactions'
        }
      case 'Computer Networks':
        return {
          icon: Globe,
          colorClass: 'text-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/20',
          gradientClass: 'from-cyan-500/5 to-sky-500/5 hover:border-cyan-500 dark:hover:border-cyan-500',
          badgeColor: 'bg-cyan-500/10 text-cyan-650 dark:text-cyan-400',
          label: 'Routing, IP protocols, layers, MAC tables'
        }
      case 'Theory of Computation':
        return {
          icon: Binary,
          colorClass: 'text-purple-500 bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/20',
          gradientClass: 'from-purple-500/5 to-pink-500/5 hover:border-purple-500 dark:hover:border-purple-500',
          badgeColor: 'bg-purple-500/10 text-purple-650 dark:text-purple-400',
          label: 'Finite automata, Turing machines, closure'
        }
      case 'Compiler Design':
        return {
          icon: Settings2,
          colorClass: 'text-violet-500 bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/20',
          gradientClass: 'from-violet-500/5 to-fuchsia-500/5 hover:border-violet-500 dark:hover:border-violet-500',
          badgeColor: 'bg-violet-500/10 text-violet-650 dark:text-violet-400',
          label: 'Parsers, syntax trees, optimization'
        }
      case 'Computer Organization & Architecture':
        return {
          icon: Cpu,
          colorClass: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20',
          gradientClass: 'from-amber-500/5 to-orange-500/5 hover:border-amber-500 dark:hover:border-amber-500',
          badgeColor: 'bg-amber-500/10 text-amber-650 dark:text-amber-400',
          label: 'Pipelining, caches, mapping, addressing'
        }
      case 'Digital Logic':
        return {
          icon: Binary,
          colorClass: 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20',
          gradientClass: 'from-rose-500/5 to-red-500/5 hover:border-rose-500 dark:hover:border-rose-500',
          badgeColor: 'bg-rose-500/10 text-rose-650 dark:text-rose-400',
          label: 'Multiplexers, boolean algebra, registers'
        }
      case 'Discrete Mathematics':
        return {
          icon: Compass,
          colorClass: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20',
          gradientClass: 'from-emerald-500/5 to-green-500/5 hover:border-emerald-500 dark:hover:border-emerald-500',
          badgeColor: 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400',
          label: 'Graph coloring, logic, combinatorics'
        }
      case 'Engineering Mathematics':
        return {
          icon: Hash,
          colorClass: 'text-fuchsia-500 bg-fuchsia-500/10 dark:bg-fuchsia-500/20 border-fuchsia-500/20',
          gradientClass: 'from-fuchsia-500/5 to-pink-500/5 hover:border-fuchsia-500 dark:hover:border-fuchsia-500',
          badgeColor: 'bg-fuchsia-500/10 text-fuchsia-650 dark:text-fuchsia-400',
          label: 'Probability, statistics, calculus'
        }
      case 'General Aptitude':
      default:
        return {
          icon: Brain,
          colorClass: 'text-orange-500 bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/20',
          gradientClass: 'from-orange-500/5 to-yellow-500/5 hover:border-orange-500 dark:hover:border-orange-500',
          badgeColor: 'bg-orange-500/10 text-orange-650 dark:text-orange-400',
          label: 'Quantitative aptitude, spatial reasoning'
        }
    }
  }

  const location = useLocation()

  const [fetching, setFetching] = useState(false)

  // State Management for selection flow
  // view: 'hub' | 'year' | 'subject' | 'topic' | 'wizard' | 'reels'
  const [view, setView] = useState('hub')
  const [activeQuestions, setActiveQuestions] = useState([])
  
  // MCQ/MSQ/NAT answer states
  // selectedOptions: { [questionId]: index (for MCQ) or [indices] (for MSQ) or string (for NAT) }
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [direction, setDirection] = useState('next')
  const [cooldown, setCooldown] = useState(false)

  // Custom Mock Wizard State
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardConfig, setWizardConfig] = useState({
    subjects: [],
    topics: [],
    types: [], // MCQ, MSQ, NAT
    marks: []  // 1, 2
  })

  // Accordion state for Topic hierarchy
  const [expandedSubject, setExpandedSubject] = useState(null)
  const [isNavigatorCollapsed, setIsNavigatorCollapsed] = useState(() => window.innerWidth < 768)
  const [selectedSubjects, setSelectedSubjects] = useState([])

  const scrollContainerRef = useRef(null)
  const touchStartRef = useRef(0)
  const wheelAccumulatorRef = useRef(0)

  const currentQuestion = activeQuestions[activeQuestionIndex]
  const totalQuestions = activeQuestions.length

  // --- STATS COMPILING ---
  // Get all unique years
  const years = Array.from(new Set(questions.map(q => q.year))).sort().reverse()
  
  // Get all unique subjects with counts
  const subjectsMap = questions.reduce((acc, q) => {
    acc[q.subject] = (acc[q.subject] || 0) + 1
    return acc
  }, {})
  
  // Get all unique topics grouped by subjects with counts
  const topicsMap = questions.reduce((acc, q) => {
    if (!acc[q.subject]) acc[q.subject] = {}
    acc[q.subject][q.topic] = (acc[q.subject][q.topic] || 0) + 1
    return acc
  }, {})

  // All unique topics across all subjects
  const allTopics = Array.from(new Set(questions.map(q => q.topic)))

  // --- NAVIGATION ACTIONS ---
  const goToNextQuestion = () => {
    if (activeQuestionIndex < totalQuestions - 1 && !cooldown) {
      setDirection('next')
      setCooldown(true)
      setActiveQuestionIndex(activeQuestionIndex + 1)
      setTimeout(() => setCooldown(false), 600)
    }
  }

  const goToPrevQuestion = () => {
    if (activeQuestionIndex > 0 && !cooldown) {
      setDirection('prev')
      setCooldown(true)
      setActiveQuestionIndex(activeQuestionIndex - 1)
      setTimeout(() => setCooldown(false), 600)
    }
  }

  // Handle direct navigation to reels from Bookmarks Page
  useEffect(() => {
    if (location.state?.startReels && location.state?.questionId) {
      const questionId = location.state.questionId
      const targetIdx = questions.findIndex((q) => q.id === questionId)
      if (targetIdx !== -1) {
        setActiveQuestions(questions)
        setActiveQuestionIndex(targetIdx)
        setView('reels')
        
        // Clear history state to avoid re-triggering on back navigations
        window.history.replaceState({}, document.title)
      }
    }
  }, [location.state, setActiveQuestionIndex, questions])

  // Keyboard navigation
  useEffect(() => {
    if (view !== 'reels') return

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        const el = scrollContainerRef.current
        if (el) {
          const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 2
          if (isAtBottom) goToNextQuestion()
        }
      } else if (e.key === 'ArrowUp') {
        const el = scrollContainerRef.current
        if (el) {
          const isAtTop = el.scrollTop === 0
          if (isAtTop) goToPrevQuestion()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeQuestionIndex, cooldown, view, activeQuestions])

  // Mouse wheel scroll boundary logic
  const handleWheel = (e) => {
    const el = scrollContainerRef.current
    if (!el || cooldown) {
      wheelAccumulatorRef.current = 0
      return
    }

    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 4
    const isAtTop = el.scrollTop <= 2

    // If we are at the bottom and scrolling down
    if (e.deltaY > 0 && isAtBottom) {
      e.preventDefault()
      wheelAccumulatorRef.current += e.deltaY
      if (wheelAccumulatorRef.current >= 350) {
        wheelAccumulatorRef.current = 0
        goToNextQuestion()
      }
    } 
    // If we are at the top and scrolling up
    else if (e.deltaY < 0 && isAtTop) {
      e.preventDefault()
      wheelAccumulatorRef.current += Math.abs(e.deltaY)
      if (wheelAccumulatorRef.current >= 350) {
        wheelAccumulatorRef.current = 0
        goToPrevQuestion()
      }
    } 
    // Reset accumulator when scrolling inside boundaries
    else {
      wheelAccumulatorRef.current = 0
    }
  }

  // Touch Swiping logic
  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    const el = scrollContainerRef.current
    if (!el || cooldown) return

    const touchEnd = e.changedTouches[0].clientY
    const deltaY = touchStartRef.current - touchEnd
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 2
    const isAtTop = el.scrollTop === 0

    if (deltaY > 60 && isAtBottom) {
      goToNextQuestion()
    } else if (deltaY < -60 && isAtTop) {
      goToPrevQuestion()
    }
  }

  // Start a reels session with specific questions
  // Start a reels session with specific filter
  const startReelsSession = async (filterFunc, filterName, queryParams = '') => {
    setFetching(true)
    try {
      const url = queryParams ? `/api/questions?${queryParams}` : '/api/questions'
      const response = await fetch(url)
      const allQs = await response.json()
      let filtered = allQs.filter(filterFunc)
      
      if (filterName === "Random Mode") {
        filtered = filtered.sort(() => Math.random() - 0.5)
      }

      setTimeout(() => {
        if (filtered.length === 0) {
          alert(`No questions found matching ${filterName}!`)
          setFetching(false)
          return
        }
        setActiveQuestions(filtered)
        setActiveQuestionIndex(0)
        setSelectedAnswers({})
        setView('reels')
        setFetching(false)
      }, 500)
    } catch (err) {
      console.error(err)
      alert("Error contacting the backend database!")
      setFetching(false)
    }
  }

  // Reset selected subjects when leaving the subject view
  useEffect(() => {
    if (view !== 'subject') {
      setSelectedSubjects([])
    }
  }, [view])

  const toggleSubjectSelection = (sub) => {
    setSelectedSubjects(prev =>
      prev.includes(sub)
        ? prev.filter(s => s !== sub)
        : [...prev, sub]
    )
  }

  const handleStartSelectedSubjectsPractice = () => {
    if (selectedSubjects.length === 0) return
    const filterFn = q => selectedSubjects.includes(q.subject)
    const title = selectedSubjects.length === 1 ? selectedSubjects[0] : `${selectedSubjects.length} Subjects`
    const path = `subject=${encodeURIComponent(selectedSubjects.join(','))}`
    startReelsSession(filterFn, title, path)
  }

  // --- MOCK BUILDER GENERATOR ---
  const handleGenerateCustomMock = () => {
    const filterFunc = q => {
      // 1. Subject filter
      if (wizardConfig.subjects.length > 0 && !wizardConfig.subjects.includes(q.subject)) return false
      // 2. Topic filter
      if (wizardConfig.topics.length > 0 && !wizardConfig.topics.includes(q.topic)) return false
      // 3. Type filter
      if (wizardConfig.types.length > 0 && !wizardConfig.types.includes(q.type)) return false
      // 4. Marks filter
      if (wizardConfig.marks.length > 0 && !wizardConfig.marks.includes(q.marks)) return false
      
      return true
    }

    startReelsSession(filterFunc, "Custom Mock")
  }

  const handleToggleWizardItem = (field, value) => {
    setWizardConfig(prev => {
      const list = prev[field]
      const updatedList = list.includes(value) 
        ? list.filter(item => item !== value)
        : [...list, value]
      
      // If we are modifying subjects, reset topics that are no longer in scope
      let updatedTopics = prev.topics
      if (field === 'subjects') {
        updatedTopics = prev.topics.filter(t => {
          // Find if topic's subject is in the updated subjects list
          const q = questions.find(dq => dq.topic === t)
          return q ? updatedList.includes(q.subject) : false
        })
      }

      return {
        ...prev,
        [field]: updatedList,
        topics: updatedTopics
      }
    })
  }

  // --- MC/MS/NAT VALUE HANDLING ---
  const handleSelectMCQ = (idx) => {
    if (selectedAnswers[currentQuestion.id] !== undefined) return
    setSelectedAnswers(prev => ({ ...prev, [currentQuestion.id]: idx }))
  }

  const handleToggleMSQ = (idx) => {
    if (selectedAnswers[currentQuestion.id]?.submitted) return
    
    setSelectedAnswers(prev => {
      const currentList = prev[currentQuestion.id]?.selected || []
      const newList = currentList.includes(idx)
        ? currentList.filter(item => item !== idx)
        : [...currentList, idx]
      
      return {
        ...prev,
        [currentQuestion.id]: { selected: newList, submitted: false }
      }
    })
  }

  const handleSubmitMSQ = () => {
    setSelectedAnswers(prev => {
      const currentVal = prev[currentQuestion.id] || { selected: [], submitted: false }
      return {
        ...prev,
        [currentQuestion.id]: { ...currentVal, submitted: true }
      }
    })
  }

  const handleNATSubmit = (val) => {
    if (selectedAnswers[currentQuestion.id] !== undefined) return
    setSelectedAnswers(prev => ({ ...prev, [currentQuestion.id]: val.trim() }))
  }

  // --- TRANSITION ANIMATIONS ---
  const variants = {
    initial: (dir) => ({
      y: dir === 'next' ? '100%' : '-100%',
      opacity: 0
    }),
    animate: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 220, damping: 24, mass: 0.8 }
    },
    exit: (dir) => ({
      y: dir === 'next' ? '-100%' : '100%',
      opacity: 0,
      transition: { duration: 0.25 }
    })
  }

  // Helper check correctness
  const isMSQCorrect = (selected, correctList) => {
    if (!selected || selected.length !== correctList.length) return false
    return selected.every(val => correctList.includes(val))
  }

  const isNATCorrect = (userAns, correctAns) => {
    if (userAns === undefined) return false
    return parseFloat(userAns) === parseFloat(correctAns)
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-bg-light dark:bg-bg-dark relative flex flex-col md:flex-row transition-colors duration-200">
      {fetching && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md text-white">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-slate-700/50"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
            </div>
            <div className="space-y-1 text-center font-sans">
              <h3 className="text-lg font-bold tracking-tight text-white/90">Contacting Backend</h3>
              <p className="text-xs text-indigo-200/70 font-medium">Fetching previous year questions...</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 1. Practice Hub Selection View */}
      {view === 'hub' && (
        <div className="flex-1 p-6 md:p-10 overflow-y-auto no-scrollbar max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Practice PYQs</h1>
            <p className="text-sm text-slate-500 mt-1">Select your preferred study workflow to begin practicing.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Year-wise card */}
            <div 
              onClick={() => setView('year')}
              className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft hover:border-primary dark:hover:border-primary hover:shadow-md cursor-pointer transition-all flex gap-4"
            >
              <div className="h-12 w-12 rounded-btn bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                <Calendar size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Practice Year Wise</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Filter questions by exam years (2026, 2025, 2024...) and sets.</p>
              </div>
            </div>

            {/* Subject-wise card */}
            <div 
              onClick={() => setView('subject')}
              className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft hover:border-primary dark:hover:border-primary hover:shadow-md cursor-pointer transition-all flex gap-4"
            >
              <div className="h-12 w-12 rounded-btn bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <BookOpen size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Practice Subject Wise</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Drill down into core subjects like Computer Science, Mathematics, etc.</p>
              </div>
            </div>

            {/* Topic-wise card */}
            <div 
              onClick={() => setView('topic')}
              className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft hover:border-primary dark:hover:border-primary hover:shadow-md cursor-pointer transition-all flex gap-4"
            >
              <div className="h-12 w-12 rounded-btn bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <Layers size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Practice Topic Wise</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Practice specific topics in a structured hierarchy (Algorithms, Calculus...).</p>
              </div>
            </div>

            {/* Random Mode card */}
            <div 
              onClick={() => {
                startReelsSession(() => true, "Random Mode")
              }}
              className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft hover:border-primary dark:hover:border-primary hover:shadow-md cursor-pointer transition-all flex gap-4"
            >
              <div className="h-12 w-12 rounded-btn bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                <Shuffle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Random Question Mode</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Launch a randomized mixed sequence of questions across all categories.</p>
              </div>
            </div>

            {/* Custom Builder card */}
            <div 
              onClick={() => {
                setWizardStep(1)
                setWizardConfig({ subjects: [], topics: [], types: [], marks: [] })
                setView('wizard')
              }}
              className="md:col-span-2 p-6 rounded-card border border-primary/20 bg-indigo-500/5 dark:bg-indigo-950/20 shadow-soft hover:border-primary dark:hover:border-primary hover:shadow-md cursor-pointer transition-all flex gap-4"
            >
              <div className="h-12 w-12 rounded-btn bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Settings2 size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Set Own Mock Paper</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Create a custom study set by choosing specific subjects, topics, question types, and weight marks.</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. Year-wise List */}
      {view === 'year' && (
        <div className="flex-1 p-6 md:p-10 overflow-y-auto no-scrollbar max-w-4xl mx-auto space-y-6">
          <button 
            onClick={() => setView('hub')} 
            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <ArrowLeft size={16} />
            <span>Back to Categories</span>
          </button>
          
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Practice Year Wise</h2>
            <p className="text-sm text-slate-500 mt-1">Select a year to load its complete set of questions.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {years.map(year => {
              const count = questions.filter(q => q.year === year).length
              return (
                <div
                  key={year}
                  onClick={() => startReelsSession(q => q.year === year, `Year ${year}`, `year=${year}`)}
                  className="p-5 rounded-btn border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:border-primary dark:hover:border-primary hover:shadow-md cursor-pointer transition-all flex justify-between items-center"
                >
                  <span className="font-bold text-sm text-slate-850 dark:text-slate-100">{year}</span>
                  <span className="text-[10px] font-bold text-primary bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                    {count} Questions
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 3. Subject-wise List */}
      {view === 'subject' && (
        <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto space-y-6 overflow-y-auto no-scrollbar bg-bg-light dark:bg-bg-dark min-h-screen">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Practice Subject Wise</h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">Select one or more core subjects to start practicing.</p>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              {selectedSubjects.length > 0 && (
                <button
                  onClick={handleStartSelectedSubjectsPractice}
                  className="flex items-center gap-1.5 h-10 px-5 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-btn transition-all shadow-md active:scale-95 shrink-0"
                >
                  <Play size={12} className="fill-white text-white" />
                  <span>Start Practice ({selectedSubjects.length})</span>
                </button>
              )}
              
              <button 
                onClick={() => setView('hub')} 
                className="flex items-center gap-1.5 h-10 px-4 border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-slate-650 dark:text-slate-350 hover:text-primary dark:hover:text-primary font-bold text-xs rounded-btn hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm active:scale-95 shrink-0"
              >
                <ArrowLeft size={14} />
                <span>Back to Categories</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Object.keys(subjectsMap).map(sub => {
              const config = getSubjectConfig(sub)
              const SubjectIcon = config.icon
              const isSelected = selectedSubjects.includes(sub)
              return (
                <div
                  key={sub}
                  onClick={() => toggleSubjectSelection(sub)}
                  className={`p-4.5 rounded-card border bg-white dark:bg-slate-900 bg-gradient-to-br ${config.gradientClass} hover:shadow-md cursor-pointer transition-all duration-300 flex flex-col justify-between h-[135px] group hover:-translate-y-1 relative ${
                    isSelected 
                      ? 'border-primary dark:border-primary ring-2 ring-primary/20 bg-primary/[0.03] dark:bg-primary/[0.08]' 
                      : 'border-slate-200 dark:border-slate-800/80 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-btn flex items-center justify-center shrink-0 border ${config.colorClass} group-hover:scale-105 transition-transform duration-300`}>
                      <SubjectIcon size={16} />
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-850 dark:text-slate-100 group-hover:text-primary transition-colors line-clamp-2 leading-tight flex-1 pr-5">{sub}</h3>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center shadow-sm shrink-0">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center shrink-0">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Weight: Core</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded shrink-0 ${config.badgeColor} border border-black/5 dark:border-white/5`}>
                      {subjectsMap[sub]} Qs
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. Topic-wise nested hierarchy */}
      {view === 'topic' && (
        <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto space-y-6 overflow-y-auto no-scrollbar bg-bg-light dark:bg-bg-dark min-h-screen">
          <button 
            onClick={() => setView('hub')} 
            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline transition-all"
          >
            <ArrowLeft size={14} />
            <span>Back to Categories</span>
          </button>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Practice Topic Wise</h2>
            <p className="text-sm text-slate-500 mt-1">Explore subject chapters and select individual topics.</p>
          </div>

          <div className="space-y-4">
            {Object.keys(topicsMap).map(sub => {
              const isExpanded = expandedSubject === sub
              const config = getSubjectConfig(sub)
              const SubjectIcon = config.icon
              return (
                <div key={sub} className="border border-border-light dark:border-border-dark rounded-card bg-card-light dark:bg-card-dark overflow-hidden shadow-soft">
                  {/* Subject Accordion Header */}
                  <div
                    onClick={() => setExpandedSubject(isExpanded ? null : sub)}
                    className={`p-4 flex justify-between items-center bg-card-light dark:bg-card-dark cursor-pointer border-l-4 ${
                      isExpanded 
                        ? 'border-primary bg-slate-50/50 dark:bg-slate-900/30' 
                        : 'border-transparent hover:bg-slate-50/30 dark:hover:bg-slate-900/10'
                    } transition-all`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-btn flex items-center justify-center shrink-0 border ${config.colorClass}`}>
                        <SubjectIcon size={16} />
                      </div>
                      <span className="font-bold text-sm text-slate-850 dark:text-slate-100">{sub}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-450 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {Object.keys(topicsMap[sub]).length} Chapters
                      </span>
                      <span className="text-slate-450 transition-transform duration-200">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </div>
                  </div>

                  {/* Accordion Topics List */}
                  {isExpanded && (
                    <div className="p-5 bg-slate-50/30 dark:bg-slate-900/10 border-t border-border-light dark:border-border-dark relative pl-10 sm:pl-12 space-y-4">
                      {/* Vertical Connecting Line */}
                      <div className="absolute left-[31px] sm:left-[35px] top-6 bottom-8 w-[1.5px] border-l-2 border-dashed border-slate-200 dark:border-slate-800" />
                      
                      {Object.keys(topicsMap[sub]).map((topic, index) => (
                        <div
                          key={topic}
                          onClick={() => startReelsSession(q => q.topic === topic, topic, `topic=${encodeURIComponent(topic)}`)}
                          className="relative flex items-center justify-between p-3.5 rounded-btn border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:border-primary dark:hover:border-primary hover:shadow-sm cursor-pointer transition-all duration-200 group hover:-translate-x-1"
                        >
                          {/* Timeline Node Bullet */}
                          <div className="absolute -left-[24px] sm:-left-[28px] h-4.5 w-4.5 rounded-full border-2 border-slate-200 dark:border-slate-800 bg-bg-light dark:bg-bg-dark flex items-center justify-center z-10 group-hover:border-primary transition-colors">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400 group-hover:bg-primary transition-colors" />
                          </div>
                          
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-750 dark:text-slate-250 group-hover:text-primary transition-colors break-words">
                              {topic}
                            </span>
                            <span className="text-[9px] text-slate-455 block mt-0.5 font-medium">Chapter #{index + 1}</span>
                          </div>
                          
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded shrink-0 ${config.badgeColor}`}>
                            {topicsMap[sub][topic]} Questions
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 5. Custom Mock Builder Wizard */}
      {view === 'wizard' && (
        <div className="flex-1 p-6 md:p-10 overflow-y-auto no-scrollbar max-w-3xl mx-auto space-y-6">
          <button 
            onClick={() => setView('hub')} 
            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <ArrowLeft size={16} />
            <span>Back to Categories</span>
          </button>

          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-border-light dark:border-border-dark">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Set Own Mock Paper</h2>
              <p className="text-sm text-slate-500 mt-1">Configure your paper filters step-by-step.</p>
            </div>
            <div className="text-xs font-bold text-primary bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded">
              Step {wizardStep} of 4
            </div>
          </div>

          {/* STEP 1: SELECT SUBJECTS */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">1. Select Subjects</h3>
              <p className="text-xs text-slate-500">Pick one or more subjects to fetch questions from.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {Object.keys(subjectsMap).map(sub => {
                  const isChecked = wizardConfig.subjects.includes(sub)
                  return (
                    <label
                      key={sub}
                      className={`p-4 rounded-btn border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                        isChecked 
                          ? 'border-primary bg-indigo-50/50 dark:bg-indigo-950/20 text-primary' 
                          : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{sub}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleWizardItem('subjects', sub)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary accent-primary"
                      />
                    </label>
                  )
                })}
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={() => setWizardStep(2)}
                  disabled={wizardConfig.subjects.length === 0}
                  className="h-10 px-5 bg-primary text-white font-bold text-xs rounded-btn hover:bg-primary-hover disabled:opacity-40 shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span>Next Step</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT TOPICS */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">2. Select Topics</h3>
              <p className="text-xs text-slate-500">Select specific topics within your chosen subjects (leave all empty to select all topics).</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {questions
                  .filter(q => wizardConfig.subjects.includes(q.subject))
                  .reduce((acc, q) => {
                    if (!acc.includes(q.topic)) acc.push(q.topic)
                    return acc
                  }, [])
                  .map(topic => {
                    const isChecked = wizardConfig.topics.includes(topic)
                    return (
                      <label
                        key={topic}
                        className={`p-4 rounded-btn border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                          isChecked 
                            ? 'border-primary bg-indigo-50/50 dark:bg-indigo-950/20 text-primary' 
                            : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{topic}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleWizardItem('topics', topic)}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary accent-primary"
                        />
                      </label>
                    )
                  })}
              </div>

              <div className="flex justify-between pt-6 border-t border-border-light dark:border-border-dark">
                <button
                  onClick={() => setWizardStep(1)}
                  className="h-10 px-5 border border-border-light dark:border-border-dark text-slate-600 dark:text-slate-400 font-bold text-xs rounded-btn hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Back
                </button>
                <button
                  onClick={() => setWizardStep(3)}
                  className="h-10 px-5 bg-primary text-white font-bold text-xs rounded-btn hover:bg-primary-hover shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span>Next Step</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SELECT QUESTION TYPES */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">3. Select Question Types</h3>
              <p className="text-xs text-slate-500">Filter by format types (MCQ, MSQ, or NAT numerical inputs).</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {['MCQ', 'MSQ', 'NAT'].map(type => {
                  const isChecked = wizardConfig.types.includes(type)
                  const label = type === 'MCQ' ? 'Multiple Choice (MCQ)' : type === 'MSQ' ? 'Multiple Select (MSQ)' : 'Numerical Answer (NAT)'
                  return (
                    <label
                      key={type}
                      className={`p-4 rounded-btn border text-xs font-semibold flex flex-col justify-between items-center text-center cursor-pointer transition-all space-y-4 ${
                        isChecked 
                          ? 'border-primary bg-indigo-50/50 dark:bg-indigo-950/20 text-primary' 
                          : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleWizardItem('types', type)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary accent-primary"
                      />
                    </label>
                  )
                })}
              </div>

              <div className="flex justify-between pt-6 border-t border-border-light dark:border-border-dark">
                <button
                  onClick={() => setWizardStep(2)}
                  className="h-10 px-5 border border-border-light dark:border-border-dark text-slate-600 dark:text-slate-400 font-bold text-xs rounded-btn hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Back
                </button>
                <button
                  onClick={() => setWizardStep(4)}
                  className="h-10 px-5 bg-primary text-white font-bold text-xs rounded-btn hover:bg-primary-hover shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span>Next Step</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SELECT MARKS WEIGHTAGE */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">4. Select Marks weightage</h3>
              <p className="text-xs text-slate-500">Filter questions by weight score marks (1 Mark, 2 Marks, or both).</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[1, 2].map(mark => {
                  const isChecked = wizardConfig.marks.includes(mark)
                  return (
                    <label
                      key={mark}
                      className={`p-4 rounded-btn border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                        isChecked 
                          ? 'border-primary bg-indigo-50/50 dark:bg-indigo-950/20 text-primary' 
                          : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{mark} Mark Question</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleWizardItem('marks', mark)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary accent-primary"
                      />
                    </label>
                  )
                })}
              </div>

              <div className="flex justify-between pt-6 border-t border-border-light dark:border-border-dark">
                <button
                  onClick={() => setWizardStep(3)}
                  className="h-10 px-5 border border-border-light dark:border-border-dark text-slate-600 dark:text-slate-400 font-bold text-xs rounded-btn hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerateCustomMock}
                  className="h-10 px-6 bg-success text-white font-extrabold text-xs rounded-btn hover:bg-success/90 shadow-sm transition-all active:scale-95 flex items-center gap-1"
                >
                  <Play size={12} className="fill-white text-white" />
                  <span>Generate & Start</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Active practice reels viewport */}
      {view === 'reels' && (
        <div className="flex-grow w-full h-full flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-50 dark:bg-slate-955">
          
          {/* Main Question Viewport */}
          <div className="flex-1 h-full relative overflow-hidden flex items-center justify-center p-2 sm:p-4 md:pl-24 lg:pl-28">
          
          <div className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl h-full flex flex-col justify-center relative select-none">
            
            {/* Reels indicators */}
            <div className="absolute -left-16 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-6">
              <button
                onClick={goToPrevQuestion}
                disabled={activeQuestionIndex === 0}
                className="p-2.5 rounded-full border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 shadow-sm text-slate-500 transition-colors"
              >
                <ChevronUp size={20} />
              </button>
              <button
                onClick={goToNextQuestion}
                disabled={activeQuestionIndex === totalQuestions - 1}
                className="p-2.5 rounded-full border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 shadow-sm text-slate-500 transition-colors"
              >
                <ChevronDown size={20} />
              </button>
            </div>

            {/* Questions Sliding Container */}
            <div className="w-full md:w-[calc(100%-4.5rem)] h-[92%] sm:h-[95%] relative rounded-card overflow-hidden">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentQuestion.id}
                  custom={direction}
                  variants={variants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute inset-0 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark shadow-soft rounded-card flex flex-col"
                >
                  <div
                    ref={scrollContainerRef}
                    onWheel={handleWheel}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="flex-1 overflow-y-auto p-4 sm:p-7 pr-14 md:pr-6 custom-scrollbar space-y-4 sm:space-y-6"
                  >
                    {/* Header tags */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-primary font-bold">{currentQuestion.subject}</span>
                        <span>•</span>
                        <span className="truncate max-w-[100px] sm:max-w-none">{currentQuestion.topic}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-500">{currentQuestion.year}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="font-bold text-[9px] uppercase tracking-wide text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          {currentQuestion.type}
                        </span>
                        <span className="font-bold text-[9px] uppercase tracking-wide text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          {currentQuestion.marks} Marks
                        </span>
                        <span className="hidden sm:inline-block font-semibold uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                          {currentQuestion.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Question text */}
                    <div className="text-sm sm:text-base font-semibold leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                      {currentQuestion.question}
                    </div>

                    {/* --- TYPE 1: MCQ UI --- */}
                    {currentQuestion.type === 'MCQ' && (
                      <div className="space-y-2 pt-1 sm:space-y-2.5 sm:pt-2">
                        {currentQuestion.options.map((option, idx) => {
                          const ansState = selectedAnswers[currentQuestion.id]
                          const isSelected = ansState === idx
                          const isCorrect = currentQuestion.answer === idx
                          const hasAnswered = ansState !== undefined

                          let btnStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200'
                          let prefixStyle = 'border-slate-300 dark:border-slate-700 text-slate-500'

                          if (hasAnswered) {
                            if (isCorrect) {
                              btnStyle = 'border-success bg-emerald-500/10 text-success font-medium'
                              prefixStyle = 'bg-success border-success text-white'
                            } else if (isSelected) {
                              btnStyle = 'border-error bg-red-500/10 text-error font-medium'
                              prefixStyle = 'bg-error border-error text-white'
                            } else {
                              btnStyle = 'border-slate-100 dark:border-slate-800 opacity-60 text-slate-400'
                            }
                          }

                          return (
                            <button
                              key={idx}
                              onClick={() => handleSelectMCQ(idx)}
                              disabled={hasAnswered}
                              className={`w-full py-2.5 sm:py-3.5 px-4 rounded-btn border text-left text-xs sm:text-sm flex items-start gap-3 transition-all ${
                                !hasAnswered ? 'active:scale-99' : ''
                              } ${btnStyle}`}
                            >
                              <span className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold ${prefixStyle}`}>
                                {hasAnswered && isCorrect ? (
                                  <Check size={12} strokeWidth={3} />
                                ) : hasAnswered && isSelected ? (
                                  <X size={12} strokeWidth={3} />
                                ) : (
                                  String.fromCharCode(65 + idx)
                                )}
                              </span>
                              <span className="flex-1 min-w-0 break-words">{option}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* --- TYPE 2: MSQ UI --- */}
                    {currentQuestion.type === 'MSQ' && (
                      <div className="space-y-4 pt-1 sm:pt-2">
                        <div className="space-y-2 sm:space-y-2.5">
                          {currentQuestion.options.map((option, idx) => {
                            const ansState = selectedAnswers[currentQuestion.id] || { selected: [], submitted: false }
                            const isSelected = ansState.selected.includes(idx)
                            const isCorrect = currentQuestion.answer.includes(idx)
                            const hasSubmitted = ansState.submitted

                            let btnStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200'
                            let checkStyle = 'border-slate-300 dark:border-slate-700'

                            if (hasSubmitted) {
                              if (isCorrect) {
                                btnStyle = 'border-success bg-emerald-500/10 text-success font-medium'
                                checkStyle = 'bg-success border-success text-white'
                              } else if (isSelected) {
                                btnStyle = 'border-error bg-red-500/10 text-error font-medium'
                                checkStyle = 'bg-error border-error text-white'
                              } else {
                                btnStyle = 'border-slate-100 dark:border-slate-800 opacity-60 text-slate-400'
                              }
                            } else if (isSelected) {
                              btnStyle = 'border-primary bg-indigo-50/50 dark:bg-indigo-950/20 text-primary font-medium'
                              checkStyle = 'border-primary bg-primary text-white'
                            }

                            return (
                              <button
                                key={idx}
                                onClick={() => handleToggleMSQ(idx)}
                                disabled={hasSubmitted}
                                className={`w-full py-2.5 sm:py-3.5 px-4 rounded-btn border text-left text-xs sm:text-sm flex items-start gap-3 transition-all ${btnStyle}`}
                              >
                                <span className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 text-xs font-bold ${checkStyle}`}>
                                  {isSelected || (hasSubmitted && isCorrect) ? <Check size={12} strokeWidth={3} /> : null}
                                </span>
                                <span className="flex-1 min-w-0 break-words">{option}</span>
                              </button>
                            )
                          })}
                        </div>

                        {!(selectedAnswers[currentQuestion.id]?.submitted) && (
                          <button
                            onClick={handleSubmitMSQ}
                            disabled={(selectedAnswers[currentQuestion.id]?.selected || []).length === 0}
                            className="w-full h-10 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn disabled:opacity-40 transition-all active:scale-95 shadow-sm"
                          >
                            Submit Answer
                          </button>
                        )}
                      </div>
                    )}

                    {/* --- TYPE 3: NAT UI --- */}
                    {currentQuestion.type === 'NAT' && (
                      <div className="space-y-4 pt-1 sm:pt-2">
                        {selectedAnswers[currentQuestion.id] === undefined ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              id={`nat-input-${currentQuestion.id}`}
                              placeholder="Type your numerical answer..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleNATSubmit(e.target.value)
                                }
                              }}
                              className="flex-1 h-10 px-4 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-100"
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById(`nat-input-${currentQuestion.id}`)
                                if (input) handleNATSubmit(input.value)
                              }}
                              className="h-10 px-5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn transition-all active:scale-95 shadow-sm shrink-0"
                            >
                              Submit
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3 font-medium">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div className={`p-3 rounded border ${
                                isNATCorrect(selectedAnswers[currentQuestion.id], currentQuestion.answer)
                                  ? 'border-success bg-emerald-500/10 text-success'
                                  : 'border-error bg-red-500/10 text-error'
                              }`}>
                                <span className="text-[10px] block font-bold text-slate-400 uppercase mb-1">Your Answer:</span>
                                <span>{selectedAnswers[currentQuestion.id]}</span>
                              </div>
                              <div className="p-3 rounded border border-success bg-emerald-500/5 text-success">
                                <span className="text-[10px] block font-bold text-slate-400 uppercase mb-1">Correct Key:</span>
                                <span>{currentQuestion.answer}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Explanation */}
                    {((currentQuestion.type === 'MCQ' && selectedAnswers[currentQuestion.id] !== undefined) ||
                      (currentQuestion.type === 'MSQ' && selectedAnswers[currentQuestion.id]?.submitted) ||
                      (currentQuestion.type === 'NAT' && selectedAnswers[currentQuestion.id] !== undefined)) && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 sm:p-5 rounded-btn bg-indigo-500/5 border border-indigo-500/10 space-y-2 mt-4"
                      >
                        <div className="flex items-center gap-1.5 text-xs text-primary font-bold uppercase tracking-wide">
                          <AlertCircle size={14} />
                          <span>
                            {currentQuestion.type === 'MSQ' 
                              ? isMSQCorrect(selectedAnswers[currentQuestion.id]?.selected, currentQuestion.answer) ? 'Correct Answer!' : 'Incorrect Answer!'
                              : currentQuestion.type === 'NAT'
                              ? isNATCorrect(selectedAnswers[currentQuestion.id], currentQuestion.answer) ? 'Correct Answer!' : 'Incorrect Answer!'
                              : selectedAnswers[currentQuestion.id] === currentQuestion.answer ? 'Correct Answer!' : 'Incorrect Answer!'}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                          {currentQuestion.explanation}
                        </p>
                      </motion.div>
                    )}

                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Reels Floating Buttons Panel */}
            <div className="absolute right-2 md:right-0 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 sm:gap-3.5 z-20">
              
              {/* Back to practice menu */}
              <button
                onClick={() => setView('hub')}
                className="group relative h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center shadow-md text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-90"
              >
                <ArrowLeft size={16} className="sm:size-[18px]" />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                  Exit Practice
                </span>
              </button>

              <div className="h-px w-5 sm:w-6 bg-slate-200 dark:bg-slate-800"></div>

              {/* Upvote Button */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => upvoteQuestion(currentQuestion.id)}
                  className={`group relative h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 ${
                    votes[currentQuestion.id] === 'up'
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <ThumbsUp size={16} className={votes[currentQuestion.id] === 'up' ? 'fill-white text-white' : 'text-slate-500'} />
                  <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                    Upvote
                  </span>
                </button>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                  {currentQuestion.likes + (votes[currentQuestion.id] === 'up' ? 1 : 0)}
                </span>
              </div>

              {/* Downvote Button */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => downvoteQuestion(currentQuestion.id)}
                  className={`group relative h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 ${
                    votes[currentQuestion.id] === 'down'
                      ? 'bg-error border-error text-white'
                      : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <ThumbsDown size={16} className={votes[currentQuestion.id] === 'down' ? 'fill-white text-white' : 'text-slate-500'} />
                  <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                    Downvote
                  </span>
                </button>
              </div>

              {/* Discussion Drawer Toggle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setActiveDiscussionQuestionId(currentQuestion.id)}
                  className="group relative h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center shadow-md text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-90"
                >
                  <MessageSquare size={16} className="sm:size-[18px]" />
                  <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                    Discussion
                  </span>
                </button>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                  {currentQuestion.commentsCount}
                </span>
              </div>

              {/* Bookmark Button */}
              <button
                onClick={() => toggleBookmark(currentQuestion.id)}
                className={`group relative h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 ${
                  bookmarks.includes(currentQuestion.id)
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Bookmark size={16} className={bookmarks.includes(currentQuestion.id) ? 'fill-white text-white' : 'text-slate-500'} />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                  Bookmark
                </span>
              </button>

              {/* Scratchpad & Notes Button */}
              <button
                onClick={() => setScratchpadOpenQuestionId(currentQuestion.id)}
                className={`group relative h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 relative ${
                  questionNotes[currentQuestion.id]
                    ? 'bg-success/15 border-success text-success hover:bg-success/20'
                    : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Edit3 size={16} className="sm:size-[18px]" />
                {questionNotes[currentQuestion.id] && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-white dark:border-slate-900 animate-pulse" />
                )}
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                  Scratchpad
                </span>
              </button>

              {/* Video Solution Button */}
              <button
                onClick={() => setActiveVideoSolutionUrl(currentQuestion.videoSolutionUrl)}
                className="group relative h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center shadow-md text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-90"
              >
                <Play size={16} className="fill-slate-500 text-slate-500 sm:size-[18px]" />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                  Video Solution
                </span>
              </button>

            </div>

          </div> {/* Closes Wrapper div */}

          </div> {/* Closes Main Question Viewport */}

          {/* Right Panel: Question Navigator Grid Wrapper */}
          <div className={`relative flex flex-col shrink-0 border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark transition-all duration-300 ${
            isNavigatorCollapsed 
              ? 'h-0 border-t-0 md:h-full md:w-0 md:border-l-0' 
              : 'h-64 border-t md:h-full md:w-64 md:border-t-0 md:border-l'
          }`}>
            
            {/* Collapse Toggle Button */}
            <button
              onClick={() => setIsNavigatorCollapsed(!isNavigatorCollapsed)}
              className={`absolute -top-3 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:top-8 h-6 w-6 rounded-full border border-border-light dark:border-border-dark bg-white dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-center text-slate-500 hover:text-primary shadow-sm hover:scale-110 transition-all z-30 ${
                isNavigatorCollapsed ? 'md:-left-7' : 'md:-left-3'
              }`}
              title={isNavigatorCollapsed ? "Expand Questions Grid" : "Collapse Questions Grid"}
            >
              <span className="md:hidden flex items-center justify-center">
                {isNavigatorCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </span>
              <span className="hidden md:flex items-center justify-center">
                {isNavigatorCollapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
              </span>
            </button>

            {/* Content Container (collapsible) */}
            <div className={`w-full md:w-64 p-5 flex flex-col overflow-y-auto custom-scrollbar h-full ${
              isNavigatorCollapsed ? 'hidden md:hidden' : 'flex'
            }`}>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-450 dark:text-slate-500 mb-4">Questions Grid</h3>
              
              <div className="grid grid-cols-5 gap-2 p-1">
                {activeQuestions.map((q, idx) => {
                  const isCurrent = idx === activeQuestionIndex
                  const ansState = selectedAnswers[q.id]
                  const hasAnswered = ansState !== undefined

                  let btnClass = 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 outline-none focus:outline-none'
                  if (hasAnswered) {
                    const isMSQSubmitted = q.type === 'MSQ' && ansState?.submitted
                    const isMCQAnswered = q.type === 'MCQ'
                    const isNATAnswered = q.type === 'NAT'
                    
                    if (isMCQAnswered || isNATAnswered || isMSQSubmitted) {
                      const isMCQCorrect = q.type === 'MCQ' && ansState === q.answer
                      const isMSQCorrectVal = q.type === 'MSQ' && isMSQCorrect(ansState?.selected, q.answer)
                      const isNATCorrectVal = q.type === 'NAT' && isNATCorrect(ansState, q.answer)
                      
                      const correct = q.type === 'MSQ' ? isMSQCorrectVal : q.type === 'NAT' ? isNATCorrectVal : isMCQCorrect
                      
                      btnClass = correct
                        ? 'bg-success text-white border-success outline-none focus:outline-none'
                        : 'bg-error text-white border-error outline-none focus:outline-none'
                    } else {
                      btnClass = 'bg-primary/20 border-primary text-primary outline-none focus:outline-none'
                    }
                  }

                  if (isCurrent) {
                    btnClass += ' ring-2 ring-primary font-bold scale-105'
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setActiveQuestionIndex(idx)}
                      className={`h-9 w-9 rounded-btn flex items-center justify-center text-xs font-bold border transition-all hover:bg-slate-100 dark:hover:bg-slate-800 ${btnClass}`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <DiscussionDrawer
            currentQuestion={currentQuestion}
            selectedAnswers={selectedAnswers}
            setSelectedAnswers={setSelectedAnswers}
            isMSQCorrect={isMSQCorrect}
            isNATCorrect={isNATCorrect}
            handleSelectMCQ={handleSelectMCQ}
            handleToggleMSQ={handleToggleMSQ}
            handleSubmitMSQ={handleSubmitMSQ}
            handleNATSubmit={handleNATSubmit}
          />
          <VideoSolutionModal />
          <ScratchpadDrawer
            currentQuestion={currentQuestion}
            selectedAnswers={selectedAnswers}
            setSelectedAnswers={setSelectedAnswers}
            isMSQCorrect={isMSQCorrect}
            isNATCorrect={isNATCorrect}
            handleSelectMCQ={handleSelectMCQ}
            handleToggleMSQ={handleToggleMSQ}
            handleSubmitMSQ={handleSubmitMSQ}
            handleNATSubmit={handleNATSubmit}
          />
        </div>
      )}
    </div>
  )
}
