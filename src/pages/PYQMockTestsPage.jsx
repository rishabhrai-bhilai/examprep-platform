import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, Clock, Calculator, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, 
  ChevronUp, ChevronDown, Play, Flag, HelpCircle, Send, Award, RefreshCw, TrendingUp, 
  Target, BarChart2, Zap, AlertTriangle, FileText, Brain, Calendar, Layers, Shuffle, 
  Settings2, ArrowLeft, ArrowRight, Check, X
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import confetti from 'canvas-confetti'

export default function PYQMockTestsPage() {
  const { questions, calculatorOpen, setCalculatorOpen } = useAppStore()
  
  // Selection Hub State
  const [view, setView] = useState('list') // 'list' | 'testing' | 'report'
  const [subView, setSubView] = useState('hub') // 'hub' | 'year' | 'subject' | 'topic' | 'wizard'
  
  // Selection state
  const [selectedSubjects, setSelectedSubjects] = useState([])
  const [selectedTopics, setSelectedTopics] = useState([])
  const [expandedSubject, setExpandedSubject] = useState(null)
  const [expandedWizardSubject, setExpandedWizardSubject] = useState(null)
  const [showQuestionLimitModal, setShowQuestionLimitModal] = useState(false)
  const [limitQuestionsCount, setLimitQuestionsCount] = useState(15)
  const [maxAvailableQuestions, setMaxAvailableQuestions] = useState(0)
  const [randomPracticePending, setRandomPracticePending] = useState(false)
  const [selectedYear, setSelectedYear] = useState(null)

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardConfig, setWizardConfig] = useState({
    topics: [],
    types: ['MCQ', 'MSQ', 'NAT'],
    marks: [1, 2],
    limit: 15
  })

  // Testing State variables
  const [activeTestQuestions, setActiveTestQuestions] = useState([])
  const [activeTestTitle, setActiveTestTitle] = useState('')
  const [activeTestModeInfo, setActiveTestModeInfo] = useState('')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({}) // { questionId: selectedIndex (MCQ) or [indices] (MSQ) or string (NAT) }
  const [flags, setFlags] = useState({}) // { questionId: boolean }
  const [visited, setVisited] = useState({}) // { questionId: boolean }
  const [timeLeft, setTimeLeft] = useState(0) // seconds
  const [timeSpent, setTimeSpent] = useState({}) // { questionId: seconds }
  const [answerTimes, setAnswerTimes] = useState({}) // { questionId: timeLeftWhenAnswered }
  
  const timerRef = useRef(null)
  const activeQuestionIdRef = useRef(null)

  // Report State variables
  const [reportData, setReportData] = useState(null)
  const [activeReportTab, setActiveReportTab] = useState('overview')
  const [questionFilter, setQuestionFilter] = useState('all')

  // Subject Configurations for Styling
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
          icon: Brain,
          colorClass: 'text-teal-500 bg-teal-500/10 dark:bg-teal-500/20 border-teal-500/20',
          gradientClass: 'from-teal-500/5 to-emerald-500/5 hover:border-teal-500 dark:hover:border-teal-500',
          badgeColor: 'bg-teal-500/10 text-teal-650 dark:text-teal-400',
          label: 'Paging, CPU scheduling, threads, sync'
        }
      case 'Databases (DBMS)':
        return {
          icon: Target,
          colorClass: 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20',
          gradientClass: 'from-blue-500/5 to-cyan-500/5 hover:border-blue-500 dark:hover:border-blue-500',
          badgeColor: 'bg-blue-500/10 text-blue-650 dark:text-blue-400',
          label: 'Normalization, SQL, indexing, transactions'
        }
      case 'Computer Networks':
        return {
          icon: Zap,
          colorClass: 'text-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/20',
          gradientClass: 'from-cyan-500/5 to-sky-500/5 hover:border-cyan-500 dark:hover:border-cyan-500',
          badgeColor: 'bg-cyan-500/10 text-cyan-650 dark:text-cyan-400',
          label: 'Routing, IP protocols, layers, MAC tables'
        }
      case 'Theory of Computation':
        return {
          icon: BarChart2,
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
          icon: Brain,
          colorClass: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20',
          gradientClass: 'from-amber-500/5 to-orange-500/5 hover:border-amber-500 dark:hover:border-amber-500',
          badgeColor: 'bg-amber-500/10 text-amber-650 dark:text-amber-400',
          label: 'Pipelining, caches, mapping, addressing'
        }
      case 'Digital Logic':
        return {
          icon: Settings2,
          colorClass: 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20',
          gradientClass: 'from-rose-500/5 to-red-500/5 hover:border-rose-500 dark:hover:border-rose-500',
          badgeColor: 'bg-rose-500/10 text-rose-650 dark:text-rose-400',
          label: 'Multiplexers, boolean algebra, registers'
        }
      case 'Discrete Mathematics':
        return {
          icon: Award,
          colorClass: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20',
          gradientClass: 'from-emerald-500/5 to-green-500/5 hover:border-emerald-500 dark:hover:border-emerald-500',
          badgeColor: 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400',
          label: 'Graph coloring, logic, combinatorics'
        }
      case 'Engineering Mathematics':
        return {
          icon: HelpCircle,
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

  // --- STATS COMPILING ---
  const years = Array.from(new Set(questions.map(q => q.year))).sort().reverse()
  
  const subjectsMap = questions.reduce((acc, q) => {
    acc[q.subject] = (acc[q.subject] || 0) + 1
    return acc
  }, {})
  
  const topicsMap = questions.reduce((acc, q) => {
    if (!acc[q.subject]) acc[q.subject] = {}
    acc[q.subject][q.topic] = (acc[q.subject][q.topic] || 0) + 1
    return acc
  }, {})

  const flatTopicsList = Object.keys(topicsMap).reduce((acc, sub) => {
    Object.keys(topicsMap[sub]).forEach(topic => {
      acc.push({
        topicName: topic,
        subjectName: sub,
        questionCount: topicsMap[sub][topic]
      })
    })
    return acc
  }, []).sort((a, b) => b.questionCount - a.questionCount)

  // Track active question ID for the timer closure
  const activeQuestion = activeTestQuestions[currentQuestionIndex]
  useEffect(() => {
    if (activeQuestion) {
      activeQuestionIdRef.current = activeQuestion.id
    }
  }, [activeQuestion])

  // Setup countdown timer
  useEffect(() => {
    if (view === 'testing' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleSubmitTest() // Auto submit
            return 0
          }
          return prev - 1
        })

        const currentQId = activeQuestionIdRef.current
        if (currentQId) {
          setTimeSpent((prev) => ({
            ...prev,
            [currentQId]: (prev[currentQId] || 0) + 1
          }))
        }
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [view, timeLeft])

  // --- INITIALIZE TEST FLOW ---
  const startMockTestSession = (questionsList, title, modeInfo) => {
    if (questionsList.length === 0) {
      alert("No questions found matching your selections!")
      return
    }
    
    // Shuffle test questions
    const shuffled = [...questionsList].sort(() => Math.random() - 0.5)
    
    setActiveTestQuestions(shuffled)
    setActiveTestTitle(title)
    setActiveTestModeInfo(modeInfo)
    setAnswers({})
    setFlags({})
    setTimeSpent({})
    setAnswerTimes({})
    
    const initialVisited = { [shuffled[0].id]: true }
    setVisited(initialVisited)
    setCurrentQuestionIndex(0)
    
    // 1.5 minutes per question
    const totalDurationSeconds = Math.round(shuffled.length * 1.5) * 60
    setTimeLeft(totalDurationSeconds)
    setView('testing')

    // Request fullscreen mode
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn("Could not enter fullscreen automatically:", err)
      })
    }
  }

  const handleConfirmStartPractice = () => {
    setShowQuestionLimitModal(false)
    let filtered = []
    let title = ''
    let modeInfo = ''

    if (randomPracticePending) {
      setRandomPracticePending(false)
      filtered = [...questions]
      title = 'PYQ Random Mock Test'
      modeInfo = 'Random mode questions'
    } else if (subView === 'subject') {
      filtered = questions.filter(q => selectedSubjects.includes(q.subject))
      title = `PYQ Subject Mock Test`
      modeInfo = `${selectedSubjects.join(', ')}`
    } else if (subView === 'topic') {
      filtered = questions.filter(q => selectedTopics.includes(q.topic))
      title = `PYQ Topic Mock Test`
      modeInfo = `${selectedTopics.slice(0, 3).join(', ')}${selectedTopics.length > 3 ? '...' : ''}`
    }

    // Limit questions count
    if (limitQuestionsCount > 0 && limitQuestionsCount < filtered.length) {
      filtered = filtered.sort(() => Math.random() - 0.5).slice(0, limitQuestionsCount)
    }

    startMockTestSession(filtered, title, modeInfo)
  }

  const handleStartYearMock = (year) => {
    const filtered = questions.filter(q => q.year === year)
    startMockTestSession(filtered, `PYQ Year Mock Test (${year})`, `Exam year ${year}`)
  }

  const handleStartWizardMock = () => {
    let filtered = questions.filter(q => {
      if (wizardConfig.topics.length > 0 && !wizardConfig.topics.includes(q.topic)) return false
      if (wizardConfig.types.length > 0 && !wizardConfig.types.includes(q.type)) return false
      if (wizardConfig.marks.length > 0 && !wizardConfig.marks.includes(q.marks)) return false
      return true
    })

    if (wizardConfig.limit && wizardConfig.limit < filtered.length) {
      filtered = filtered.sort(() => Math.random() - 0.5).slice(0, wizardConfig.limit)
    }

    let modeInfo = 'Custom selection builder'
    startMockTestSession(filtered, 'PYQ Custom Mock Test', modeInfo)
  }

  // --- WIZARD LOGIC ---
  const handleToggleWizardItem = (field, value) => {
    setWizardConfig(prev => {
      const list = prev[field] || []
      const updatedList = list.includes(value) 
        ? list.filter(item => item !== value)
        : [...list, value]
      
      return { ...prev, [field]: updatedList }
    })
  }

  const handleToggleAllSubjectTopics = (sub) => {
    const subTopics = Object.keys(topicsMap[sub] || {})
    const allSelected = subTopics.length > 0 && subTopics.every(t => wizardConfig.topics.includes(t))
    
    if (allSelected) {
      setWizardConfig(prev => ({
        ...prev,
        topics: prev.topics.filter(t => !subTopics.includes(t))
      }))
    } else {
      setWizardConfig(prev => ({
        ...prev,
        topics: Array.from(new Set([...prev.topics, ...subTopics]))
      }))
    }
  }

  const getWizardAvailableQuestionsCount = () => {
    return questions.filter(q => {
      if (wizardConfig.topics.length > 0 && !wizardConfig.topics.includes(q.topic)) return false
      if (wizardConfig.types.length > 0 && !wizardConfig.types.includes(q.type)) return false
      if (wizardConfig.marks.length > 0 && !wizardConfig.marks.includes(q.marks)) return false
      return true
    }).length
  }

  // --- ANSWERS HANDLING DURING EXAM ---
  const handleMCQSelect = (qId, optionIdx) => {
    setAnswers(prev => ({ ...prev, [qId]: optionIdx }))
    setAnswerTimes(prev => ({ ...prev, [qId]: timeLeft }))
  }

  const handleMSQToggle = (qId, optionIdx) => {
    setAnswers(prev => {
      const current = prev[qId] || []
      const updated = current.includes(optionIdx)
        ? current.filter(i => i !== optionIdx)
        : [...current, optionIdx]
      return { ...prev, [qId]: updated }
    })
    setAnswerTimes(prev => ({ ...prev, [qId]: timeLeft }))
  }

  const handleNATChange = (qId, val) => {
    setAnswers(prev => ({ ...prev, [qId]: val }))
    setAnswerTimes(prev => ({ ...prev, [qId]: timeLeft }))
  }

  const toggleFlag = (qId) => {
    setFlags(prev => ({ ...prev, [qId]: !prev[qId] }))
  }

  const navigateQuestion = (index) => {
    if (index >= 0 && index < activeTestQuestions.length) {
      const targetQ = activeTestQuestions[index]
      setVisited(prev => ({ ...prev, [targetQ.id]: true }))
      setCurrentQuestionIndex(index)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // --- CORRECTNESS HELPERS FOR REPORT ---
  const isMSQCorrect = (selected, correctList) => {
    if (!selected || selected.length !== correctList.length) return false
    return selected.every(val => correctList.includes(val))
  }

  const isNATCorrect = (userAns, correctAns) => {
    if (userAns === undefined || userAns === '') return false
    return parseFloat(userAns) === parseFloat(correctAns)
  }

  // --- EXAM SUBMISSION & STORAGE ---
  const handleSubmitTest = () => {
    if (timerRef.current) clearInterval(timerRef.current)

    // Release Fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => {
        console.warn("Could not release fullscreen mode:", err)
      })
    }

    let correct = 0
    let incorrect = 0
    let unanswered = 0
    let totalScore = 0
    let maxPossibleScore = 0

    const subjectStats = {}
    const topicStats = {}
    const difficultyStats = {}
    const timePerQuestionStatus = { correct: 0, incorrect: 0, unanswered: 0 }
    const timeSpentPerQuestionCount = { correct: 0, incorrect: 0, unanswered: 0 }
    
    let panicZoneErrors = 0
    const totalDurationSeconds = Math.round(activeTestQuestions.length * 1.5) * 60
    const panicThreshold = totalDurationSeconds * 0.15

    activeTestQuestions.forEach(q => {
      const userAns = answers[q.id]
      const qMarks = q.marks || 1
      const qType = q.type || 'MCQ'
      const qSubject = q.subject || 'General Aptitude'
      const qTopic = q.topic || 'General'
      const qDifficulty = q.difficulty || 'Medium'
      const qTimeSpent = timeSpent[q.id] || 0

      maxPossibleScore += qMarks

      // Subject stats
      if (!subjectStats[qSubject]) {
        subjectStats[qSubject] = { totalQs: 0, correctQs: 0, incorrectQs: 0, unansweredQs: 0, marksMax: 0, marksObtained: 0, timeSpent: 0 }
      }
      subjectStats[qSubject].totalQs++
      subjectStats[qSubject].marksMax += qMarks
      subjectStats[qSubject].timeSpent += qTimeSpent

      // Topic stats
      if (!topicStats[qTopic]) {
        topicStats[qTopic] = { subject: qSubject, totalQs: 0, correctQs: 0, incorrectQs: 0, unansweredQs: 0, marksMax: 0, marksObtained: 0, timeSpent: 0 }
      }
      topicStats[qTopic].totalQs++
      topicStats[qTopic].marksMax += qMarks
      topicStats[qTopic].timeSpent += qTimeSpent

      // Difficulty stats
      if (!difficultyStats[qDifficulty]) {
        difficultyStats[qDifficulty] = { totalQs: 0, correctQs: 0, incorrectQs: 0, unansweredQs: 0, marksMax: 0, marksObtained: 0, timeSpent: 0 }
      }
      difficultyStats[qDifficulty].totalQs++
      difficultyStats[qDifficulty].marksMax += qMarks
      difficultyStats[qDifficulty].timeSpent += qTimeSpent

      let isCorrect = false
      let isUnanswered = false

      if (userAns === undefined || userAns === '' || (qType === 'MSQ' && userAns.length === 0)) {
        isUnanswered = true
      } else {
        if (qType === 'MCQ') {
          isCorrect = userAns === q.answer
        } else if (qType === 'MSQ') {
          isCorrect = isMSQCorrect(userAns, q.answer)
        } else if (qType === 'NAT') {
          isCorrect = isNATCorrect(userAns, q.answer)
        }
      }

      let gained = 0
      if (isUnanswered) {
        unanswered++
        timePerQuestionStatus.unanswered += qTimeSpent
        timeSpentPerQuestionCount.unanswered++
        subjectStats[qSubject].unansweredQs++
        topicStats[qTopic].unansweredQs++
        difficultyStats[qDifficulty].unansweredQs++
      } else if (isCorrect) {
        correct++
        gained = qMarks
        totalScore += qMarks
        timePerQuestionStatus.correct += qTimeSpent
        timeSpentPerQuestionCount.correct++
        subjectStats[qSubject].correctQs++
        topicStats[qTopic].correctQs++
        difficultyStats[qDifficulty].correctQs++
      } else {
        incorrect++
        // Negative marks: MCQ has 1/3 negative marking penalty, NAT & MSQ do not
        const penalty = qType === 'MCQ' ? qMarks / 3 : 0
        gained = -penalty
        totalScore -= penalty
        timePerQuestionStatus.incorrect += qTimeSpent
        timeSpentPerQuestionCount.incorrect++
        subjectStats[qSubject].incorrectQs++
        topicStats[qTopic].incorrectQs++
        difficultyStats[qDifficulty].incorrectQs++

        // Panic Zone: final 15% of timer
        const remaining = answerTimes[q.id] || 0
        if (remaining <= panicThreshold) {
          panicZoneErrors++
        }
      }

      subjectStats[qSubject].marksObtained += gained
      topicStats[qTopic].marksObtained += gained
      difficultyStats[qDifficulty].marksObtained += gained
    })

    const attemptRate = (((correct + incorrect) / activeTestQuestions.length) * 100).toFixed(1)
    const timeTaken = totalDurationSeconds - timeLeft
    const accuracy = (correct + incorrect) > 0 ? (((correct) / (correct + incorrect)) * 100).toFixed(1) : 0
    const timeUtilizationRate = ((timeTaken / totalDurationSeconds) * 100).toFixed(1)

    const avgTimeCorrect = timeSpentPerQuestionCount.correct > 0 ? Math.round(timePerQuestionStatus.correct / timeSpentPerQuestionCount.correct) : 0
    const avgTimeIncorrect = timeSpentPerQuestionCount.incorrect > 0 ? Math.round(timePerQuestionStatus.incorrect / timeSpentPerQuestionCount.incorrect) : 0
    const avgTimeUnanswered = timeSpentPerQuestionCount.unanswered > 0 ? Math.round(timePerQuestionStatus.unanswered / timeSpentPerQuestionCount.unanswered) : 0

    const scaledScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0
    const estimatedGateScore = Math.max(100, Math.min(1000, Math.round(150 + scaledScore * 8.5)))
    const estimatedRank = Math.max(1, Math.round(50000 * Math.pow(0.93, Math.max(0, scaledScore - 15))))

    // Save to local storage under gate_pyq_mock_history
    const existing = JSON.parse(localStorage.getItem('gate_pyq_mock_history') || '[]')
    const testNum = existing.length + 1

    const data = {
      testId: `pyq-mock-${Date.now()}`,
      testTitle: activeTestTitle,
      displayName: `PYQ Mock Test ${testNum}`,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      timestamp: Date.now(),
      questionsCount: activeTestQuestions.length,
      correct,
      incorrect,
      unanswered,
      score: Number(totalScore.toFixed(2)),
      maxScore: maxPossibleScore,
      percentage: accuracy,
      attemptRate,
      timeTaken,
      timeTakenFormatted: formatTime(timeTaken),
      timeUtilizationRate,
      avgTimeCorrect,
      avgTimeIncorrect,
      avgTimeUnanswered,
      panicZoneErrors,
      estimatedGateScore,
      estimatedRank,
      subjectStats,
      topicStats,
      difficultyStats,
      errorTags: {},
      timeSpentMap: timeSpent,
      modeInfo: activeTestModeInfo
    }

    setReportData(data)
    
    const updatedHistory = [data, ...existing]
    localStorage.setItem('gate_pyq_mock_history', JSON.stringify(updatedHistory))

    setView('report')

    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    })
  }

  const handleTagError = (questionId, tag) => {
    if (!reportData) return

    const updatedData = {
      ...reportData,
      errorTags: {
        ...(reportData.errorTags || {}),
        [questionId]: tag
      }
    }
    setReportData(updatedData)

    const history = JSON.parse(localStorage.getItem('gate_pyq_mock_history') || '[]')
    const updatedHistory = history.map(item => {
      if (item.testId === reportData.testId) {
        return {
          ...item,
          errorTags: {
            ...(item.errorTags || {}),
            [questionId]: tag
          }
        }
      }
      return item
    })
    localStorage.setItem('gate_pyq_mock_history', JSON.stringify(updatedHistory))
  }

  // --- RENDERS ---

  // 1. SELECTION LIST/HUB VIEW
  if (view === 'list') {
    return (
      <div className="flex-1 overflow-y-auto bg-bg-light dark:bg-bg-dark min-h-screen relative transition-colors duration-200">
        
        {/* Hub Main */}
        {subView === 'hub' && (
          <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
                <Clock className="text-primary" size={32} />
                <span>PYQ Mock Exams</span>
              </h1>
              <p className="text-sm text-slate-500 mt-1">Select a mock configurations to launch a timed, realistic exam experience.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Year-wise card */}
              <div 
                onClick={() => setSubView('year')}
                className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft hover:border-primary dark:hover:border-primary hover:shadow-md cursor-pointer transition-all flex gap-4"
              >
                <div className="h-12 w-12 rounded-btn bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <Calendar size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Year Wise Exam Mock</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Simulate a complete test paper from a specific year (2026, 2025...).</p>
                </div>
              </div>

              {/* Subject-wise card */}
              <div 
                onClick={() => {
                  setSubView('subject')
                  setSelectedSubjects([])
                }}
                className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft hover:border-primary dark:hover:border-primary hover:shadow-md cursor-pointer transition-all flex gap-4"
              >
                <div className="h-12 w-12 rounded-btn bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <BookOpen size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Subject Wise Exam Mock</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Choose core subjects and build a timed questions test set.</p>
                </div>
              </div>

              {/* Topic-wise card */}
              <div 
                onClick={() => {
                  setSubView('topic')
                  setSelectedTopics([])
                }}
                className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft hover:border-primary dark:hover:border-primary hover:shadow-md cursor-pointer transition-all flex gap-4"
              >
                <div className="h-12 w-12 rounded-btn bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <Layers size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Topic Wise Exam Mock</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Combine chapters and test your focus speed on targeted topics.</p>
                </div>
              </div>

              {/* Random Mode card */}
              <div 
                onClick={() => {
                  const total = questions.length
                  setMaxAvailableQuestions(total)
                  setLimitQuestionsCount(Math.min(15, total))
                  setRandomPracticePending(true)
                  setShowQuestionLimitModal(true)
                }}
                className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft hover:border-primary dark:hover:border-primary hover:shadow-md cursor-pointer transition-all flex gap-4"
              >
                <div className="h-12 w-12 rounded-btn bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                  <Shuffle size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Random Exam Mock</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Take a randomized timed test pulled from all categories in the database.</p>
                </div>
              </div>

              {/* Custom Builder card */}
              <div 
                onClick={() => {
                  setWizardStep(1)
                  setWizardConfig({ topics: [], types: ['MCQ', 'MSQ', 'NAT'], marks: [1, 2], limit: 15 })
                  setExpandedWizardSubject(null)
                  setSubView('wizard')
                }}
                className="md:col-span-2 p-6 rounded-card border border-primary/20 bg-indigo-500/5 dark:bg-indigo-950/20 shadow-soft hover:border-primary dark:hover:border-primary hover:shadow-md cursor-pointer transition-all flex gap-4"
              >
                <div className="h-12 w-12 rounded-btn bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Settings2 size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Set Own Mock Paper</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">Customize a mock paper exactly by selecting chapters, weight marks, types, and question bounds.</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. Year-wise List */}
        {subView === 'year' && (
          <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Practice Year Mock</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">Select an exam year to generate a complete mock test.</p>
              </div>
              <button 
                onClick={() => setSubView('hub')} 
                className="h-10 px-4.5 border border-border-light dark:border-border-dark text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold text-xs rounded-btn flex items-center gap-2 shadow-sm transition-all shrink-0"
              >
                <ArrowLeft size={14} />
                <span>Back to Options</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {years.map(year => {
                const count = questions.filter(q => q.year === year).length
                return (
                  <div
                    key={year}
                    onClick={() => handleStartYearMock(year)}
                    className="p-5 rounded-btn border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:border-primary dark:hover:border-primary hover:shadow-md cursor-pointer transition-all flex justify-between items-center"
                  >
                    <span className="font-bold text-sm text-slate-855 dark:text-slate-100">{year} Exam Paper</span>
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
        {subView === 'subject' && (
          <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Subject Wise Mock</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">Select subjects to bundle into your customized mock test.</p>
              </div>
              
              <div className="flex items-center gap-3 shrink-0">
                {selectedSubjects.length > 0 && (
                  <button
                    onClick={() => {
                      const totalAvailable = selectedSubjects.reduce((sum, s) => sum + (subjectsMap[s] || 0), 0)
                      setMaxAvailableQuestions(totalAvailable)
                      setLimitQuestionsCount(Math.min(15, totalAvailable))
                      setShowQuestionLimitModal(true)
                    }}
                    className="h-10 px-5 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-btn shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Configure Mock ({selectedSubjects.length})</span>
                    <ArrowRight size={12} />
                  </button>
                )}
                <button 
                  onClick={() => setSubView('hub')} 
                  className="h-10 px-4.5 border border-border-light dark:border-border-dark text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold text-xs rounded-btn flex items-center gap-2 shadow-sm transition-all"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Options</span>
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
                    onClick={() => {
                      setSelectedSubjects(prev => 
                        prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
                      )
                    }}
                    className={`relative p-4.5 rounded-card border bg-card-light dark:bg-card-dark bg-gradient-to-br ${config.gradientClass} hover:shadow-md cursor-pointer transition-all duration-300 flex flex-col justify-between h-[135px] group hover:-translate-y-1 ${
                      isSelected ? 'border-primary ring-1 ring-primary/40' : 'border-border-light dark:border-border-dark'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center border border-primary z-10 shadow-sm animate-fade-in">
                        <Check size={12} strokeWidth={3.5} />
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-btn flex items-center justify-center shrink-0 border ${config.colorClass} group-hover:scale-105 transition-transform duration-300`}>
                        <SubjectIcon size={16} />
                      </div>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-855 dark:text-slate-100 group-hover:text-primary transition-colors line-clamp-2 leading-tight flex-1">{sub}</h3>
                    </div>
                    
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

        {/* 4. Topic-wise List */}
        {subView === 'topic' && (
          <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Topic Wise Mock</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">Select topics to bundle. Sorted by question counts (highest first).</p>
              </div>
              
              <div className="flex items-center gap-3 shrink-0">
                {selectedTopics.length > 0 && (
                  <button
                    onClick={() => {
                      const totalAvailable = selectedTopics.reduce((sum, topic) => {
                        let count = 0
                        Object.keys(topicsMap).forEach(sub => {
                          if (topicsMap[sub][topic]) count += topicsMap[sub][topic]
                        })
                        return sum + count
                      }, 0)
                      setMaxAvailableQuestions(totalAvailable)
                      setLimitQuestionsCount(Math.min(15, totalAvailable))
                      setShowQuestionLimitModal(true)
                    }}
                    className="h-10 px-5 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-btn shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Configure Mock ({selectedTopics.length})</span>
                    <ArrowRight size={12} />
                  </button>
                )}
                <button 
                  onClick={() => setSubView('hub')} 
                  className="h-10 px-4.5 border border-border-light dark:border-border-dark text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold text-xs rounded-btn flex items-center gap-2 shadow-sm transition-all"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Options</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {flatTopicsList.map(({ topicName, subjectName, questionCount }) => {
                const config = getSubjectConfig(subjectName)
                const SubjectIcon = config.icon
                const isSelected = selectedTopics.includes(topicName)
                return (
                  <div
                    key={topicName}
                    onClick={() => {
                      setSelectedTopics(prev =>
                        prev.includes(topicName) ? prev.filter(t => t !== topicName) : [...prev, topicName]
                      )
                    }}
                    className={`relative p-5 rounded-card border bg-card-light dark:bg-card-dark bg-gradient-to-br ${config.gradientClass} hover:shadow-md cursor-pointer transition-all duration-300 flex flex-col justify-between h-[140px] group hover:-translate-y-1 ${
                      isSelected ? 'border-primary ring-1 ring-primary/40' : 'border-border-light dark:border-border-dark'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3.5 right-3.5 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center border border-primary z-10 shadow-sm animate-fade-in">
                        <Check size={12} strokeWidth={3.5} />
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-6 w-6 rounded-btn flex items-center justify-center shrink-0 border ${config.colorClass}`}>
                          <SubjectIcon size={12} />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wide truncate max-w-[180px]">
                          {subjectName}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-855 dark:text-slate-100 group-hover:text-primary transition-colors leading-snug line-clamp-2 pr-4">
                        {topicName}
                      </h3>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-855 flex justify-between items-center shrink-0">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Weight: Core</span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded shrink-0 ${config.badgeColor} border border-black/5 dark:border-white/5`}>
                        {questionCount} Questions
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 5. Set Your Own Mock Paper (Wizard) */}
        {subView === 'wizard' && (
          <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border-light dark:border-border-dark">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Set Own Mock Paper</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">Design your exam mock paper step-by-step.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-xs font-bold text-primary bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-2 rounded shadow-sm">
                  Step {wizardStep} of 3
                </div>
                <button 
                  onClick={() => setSubView('hub')} 
                  className="h-10 px-4.5 border border-border-light dark:border-border-dark text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold text-xs rounded-btn flex items-center gap-2 shadow-sm transition-all"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Options</span>
                </button>
              </div>
            </div>

            {/* STEP 1: SELECT TOPICS (COLLAPSED SUBJECTS ACCODRION) */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">1. Select Topics</h3>
                  <p className="text-xs text-slate-550">Click on any subject to expand and choose topics.</p>
                </div>
                
                <div className="space-y-3 pt-2">
                  {Object.keys(topicsMap).map(sub => {
                    const isExpanded = expandedWizardSubject === sub
                    const config = getSubjectConfig(sub)
                    const SubjectIcon = config.icon
                    const subTopics = Object.keys(topicsMap[sub] || {})
                    const selectedInSub = subTopics.filter(t => wizardConfig.topics.includes(t)).length
                    const allSelected = subTopics.length > 0 && subTopics.every(t => wizardConfig.topics.includes(t))
                    
                    return (
                      <div key={sub} className="border border-border-light dark:border-border-dark rounded-card bg-card-light dark:bg-card-dark overflow-hidden shadow-soft">
                        <div
                          onClick={() => setExpandedWizardSubject(isExpanded ? null : sub)}
                          className={`p-4 flex justify-between items-center bg-card-light dark:bg-card-dark cursor-pointer border-l-4 ${
                            isExpanded ? 'border-primary bg-slate-50/50 dark:bg-slate-900/30' : 'border-transparent hover:bg-slate-50/30 dark:hover:bg-slate-900/10'
                          } transition-all select-none`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-btn flex items-center justify-center shrink-0 border ${config.colorClass}`}>
                              <SubjectIcon size={15} />
                            </div>
                            <span className="font-bold text-sm text-slate-855 dark:text-slate-100">{sub}</span>
                            {selectedInSub > 0 && (
                              <span className="text-[10px] font-extrabold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {selectedInSub} selected
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5">
                            {isExpanded && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleAllSubjectTopics(sub)
                                }}
                                className="text-[10px] font-extrabold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded transition-all active:scale-95 z-10"
                              >
                                {allSelected ? 'Deselect All' : 'Select All'}
                              </button>
                            )}
                            <span className="text-slate-400">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 bg-slate-50/30 dark:bg-slate-900/10 border-t border-border-light dark:border-border-dark grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-fade-in">
                            {subTopics.map(topic => {
                              const isChecked = wizardConfig.topics.includes(topic)
                              const count = topicsMap[sub][topic]
                              return (
                                <div
                                  key={topic}
                                  onClick={() => handleToggleWizardItem('topics', topic)}
                                  className={`flex items-center justify-between gap-3 p-3 rounded-btn border text-xs font-semibold cursor-pointer transition-all duration-200 select-none ${
                                    isChecked 
                                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                      : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:border-primary/55 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-700 dark:text-slate-350'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {isChecked ? (
                                      <Check size={12} className="shrink-0 text-primary" strokeWidth={3} />
                                    ) : (
                                      <div className="h-3 w-3 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                                    )}
                                    <span className="truncate">{topic}</span>
                                  </div>
                                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                                    isChecked ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                  }`}>
                                    {count} Qs
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-end pt-6 border-t border-border-light dark:border-border-dark">
                  <button
                    onClick={() => setWizardStep(2)}
                    disabled={wizardConfig.topics.length === 0}
                    className="h-10 px-5 bg-primary text-white font-bold text-xs rounded-btn hover:bg-primary-hover disabled:opacity-40 shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Next Step</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: QUESTION TYPES & MARKS */}
            {wizardStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">2. Select Question Types</h3>
                  <p className="text-xs text-slate-500">Choose question formats (MCQ, MSQ, NAT numerical answers).</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {['MCQ', 'MSQ', 'NAT'].map(type => {
                      const isChecked = wizardConfig.types.includes(type)
                      const label = type === 'MCQ' ? 'Multiple Choice (MCQ)' : type === 'MSQ' ? 'Multiple Select (MSQ)' : 'Numerical Answer (NAT)'
                      return (
                        <label
                          key={type}
                          className={`p-4 rounded-btn border text-xs font-semibold flex flex-col justify-between items-center text-center cursor-pointer transition-all space-y-4 select-none ${
                            isChecked 
                              ? 'border-primary bg-indigo-50/50 dark:bg-indigo-950/20 text-primary' 
                              : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-350'
                          }`}
                        >
                          <span>{label}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleWizardItem('types', type)}
                            className="h-4 w-4 rounded border-slate-300 text-primary accent-primary"
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">3. Select Marks Weightage</h3>
                  <p className="text-xs text-slate-550">Configure weight marks (1 Mark, 2 Marks, or both).</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {[1, 2].map(mark => {
                      const isChecked = wizardConfig.marks.includes(mark)
                      return (
                        <label
                          key={mark}
                          className={`p-4 rounded-btn border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all select-none ${
                            isChecked 
                              ? 'border-primary bg-indigo-50/50 dark:bg-indigo-950/20 text-primary' 
                              : 'border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-700 dark:text-slate-350'
                          }`}
                        >
                          <span>{mark} Mark Question</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleWizardItem('marks', mark)}
                            className="h-4 w-4 rounded border-slate-300 text-primary accent-primary"
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-border-light dark:border-border-dark">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="h-10 px-5 border border-border-light dark:border-border-dark text-slate-655 dark:text-slate-400 font-bold text-xs rounded-btn hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setWizardStep(3)}
                    disabled={wizardConfig.types.length === 0 || wizardConfig.marks.length === 0}
                    className="h-10 px-5 bg-primary text-white font-bold text-xs rounded-btn hover:bg-primary-hover disabled:opacity-40 shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Next Step</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PRACTICE LIMIT */}
            {wizardStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">4. Select Mock Exam Limit</h3>
                  <p className="text-xs text-slate-500">Choose how many questions to attempt. Duration will adjust based on length (1.5 mins/Q).</p>
                </div>

                {(() => {
                  const availableCount = getWizardAvailableQuestionsCount()
                  const displayLimit = Math.min(wizardConfig.limit, availableCount)
                  
                  return (
                    <>
                      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-btn border border-border-light/60 dark:border-border-dark/60 flex justify-between items-center">
                        <div className="min-w-0 flex-1 mr-2">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide">Selected Chapters</span>
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {wizardConfig.topics.join(', ')}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Matched Questions</span>
                          <div className="text-sm font-black text-primary">
                            {availableCount} Qs
                          </div>
                        </div>
                      </div>

                      {availableCount > 0 ? (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500 uppercase">Question Limit</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={1}
                                max={availableCount}
                                value={displayLimit}
                                onChange={(e) => {
                                  let val = parseInt(e.target.value, 10)
                                  if (isNaN(val)) val = 1
                                  if (val > availableCount) val = availableCount
                                  if (val < 1) val = 1
                                  setWizardConfig(prev => ({ ...prev, limit: val }))
                                }}
                                className="w-14 h-8 text-center text-xs font-extrabold bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100"
                              />
                              <span className="text-xs font-bold text-slate-400">Questions</span>
                            </div>
                          </div>

                          <input
                            type="range"
                            min={1}
                            max={availableCount}
                            value={displayLimit}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10)
                              setWizardConfig(prev => ({ ...prev, limit: val }))
                            }}
                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                          />

                          <div className="space-y-2 pt-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Quick Select</span>
                            <div className="flex flex-wrap gap-2">
                              {[5, 10, 15, 20, 25].filter(num => num <= availableCount).map(num => (
                                <button
                                  key={num}
                                  onClick={() => setWizardConfig(prev => ({ ...prev, limit: num }))}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-btn transition-all border ${
                                    wizardConfig.limit === num
                                      ? 'bg-primary border-primary text-white'
                                      : 'bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark text-slate-650 dark:text-slate-400 hover:bg-slate-100'
                                  }`}
                                >
                                  {num} Qs
                                </button>
                              ))}
                              <button
                                onClick={() => setWizardConfig(prev => ({ ...prev, limit: availableCount }))}
                                className={`px-3.5 py-1.5 text-xs font-bold rounded-btn transition-all border ${
                                  wizardConfig.limit === availableCount ? 'bg-primary border-primary text-white' : 'bg-slate-50 dark:bg-slate-900 border-border-light'
                                }`}
                              >
                                All ({availableCount})
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 border border-warning/20 bg-warning/5 rounded-btn text-warning text-xs font-semibold flex items-center gap-2">
                          <AlertCircle size={16} />
                          <span>No questions match your current combination of filters. Please go back.</span>
                        </div>
                      )}

                      <div className="flex justify-between pt-6 border-t border-border-light">
                        <button
                          onClick={() => setWizardStep(2)}
                          className="h-10 px-5 border border-border-light text-slate-600 font-bold text-xs rounded-btn hover:bg-slate-50"
                        >
                          Back
                        </button>
                        <button
                          onClick={handleStartWizardMock}
                          disabled={availableCount === 0}
                          className="h-10 px-6 bg-success text-white font-extrabold text-xs rounded-btn hover:bg-success/90 disabled:opacity-40 shadow-sm transition-all active:scale-95 flex items-center gap-1"
                        >
                          <Play size={12} className="fill-white text-white" />
                          <span>Start Custom Mock</span>
                        </button>
                      </div>
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Question Limit Selector Modal */}
        <AnimatePresence>
          {showQuestionLimitModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowQuestionLimitModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="relative w-full max-w-md bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card shadow-soft-lg p-6 space-y-6 z-10"
              >
                <div className="space-y-1.5">
                  <h3 className="text-lg font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                    <Clock size={20} className="text-primary" />
                    <span>Configure Mock Length</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Select the number of questions to attempt in this timed mock test.</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-btn border border-border-light/60 dark:border-border-dark/60 flex justify-between items-center">
                  <div className="min-w-0 flex-1 mr-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      {randomPracticePending ? 'Mode' : subView === 'topic' ? 'Selected Topics' : 'Selected Subjects'}
                    </span>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {randomPracticePending ? 'Random Question Mock' : subView === 'topic' ? selectedTopics.join(', ') : selectedSubjects.join(', ')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Total Pool</span>
                    <div className="text-sm font-black text-primary">
                      {maxAvailableQuestions} Qs
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase">Question Limit</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={maxAvailableQuestions}
                        value={limitQuestionsCount}
                        onChange={(e) => {
                          let val = parseInt(e.target.value, 10)
                          if (isNaN(val)) val = 1
                          if (val > maxAvailableQuestions) val = maxAvailableQuestions
                          if (val < 1) val = 1
                          setLimitQuestionsCount(val)
                        }}
                        className="w-14 h-8 text-center text-xs font-extrabold bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100"
                      />
                      <span className="text-xs font-bold text-slate-400">Questions</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={maxAvailableQuestions}
                    value={limitQuestionsCount}
                    onChange={(e) => setLimitQuestionsCount(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide block">Quick Select</span>
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 15, 20, 25].filter(q => q <= maxAvailableQuestions).map(num => (
                      <button
                        key={num}
                        onClick={() => setLimitQuestionsCount(num)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-btn transition-all border ${
                          limitQuestionsCount === num ? 'bg-primary border-primary text-white' : 'bg-slate-50 dark:bg-slate-900 border-border-light text-slate-655 hover:bg-slate-105'
                        }`}
                      >
                        {num} Qs
                      </button>
                    ))}
                    <button
                      onClick={() => setLimitQuestionsCount(maxAvailableQuestions)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-btn transition-all border ${
                        limitQuestionsCount === maxAvailableQuestions ? 'bg-primary border-primary text-white' : 'bg-slate-50 dark:bg-slate-900 border-border-light text-slate-655'
                      }`}
                    >
                      All ({maxAvailableQuestions})
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center gap-3 pt-3 border-t border-border-light">
                  <button
                    onClick={() => setShowQuestionLimitModal(false)}
                    className="flex-1 h-10 border border-border-light text-slate-600 font-bold text-xs rounded-btn hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmStartPractice}
                    className="flex-grow h-10 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-btn shadow-sm transition-all active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <Play size={12} className="fill-white text-white" />
                    <span>Start Mock Exam</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    )
  }

  // 2. TIMED TESTING VIEWPORT
  if (view === 'testing') {
    return (
      <div className="fixed inset-0 z-50 bg-bg-light dark:bg-bg-dark text-slate-800 dark:text-slate-100 flex flex-col">
        {/* Header */}
        <header className="h-16 px-6 border-b border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark flex items-center justify-between shadow-sm">
          <div>
            <h2 className="font-bold text-sm md:text-base text-text-primary-light dark:text-text-primary-dark truncate max-w-xs md:max-w-md">
              {activeTestTitle}
            </h2>
            <p className="text-[10px] text-slate-400">Pacing: 1.5 min per question | Section: {activeQuestion?.subject}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Scientific Calculator Toggle */}
            <button
              onClick={() => setCalculatorOpen(!calculatorOpen)}
              className={`p-2 rounded-btn transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                calculatorOpen ? 'text-primary bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-600 dark:text-slate-400'
              }`}
              title="Scientific Calculator"
            >
              <Calculator size={18} />
            </button>

            {/* Timer */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-btn bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-mono text-sm font-bold">
              <Clock size={16} />
              <span>{formatTime(timeLeft)}</span>
            </div>

            <button
              onClick={handleSubmitTest}
              className="px-4 py-2 bg-success text-white text-xs font-bold rounded-btn hover:bg-success/90 flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <Send size={12} />
              <span>Submit Test</span>
            </button>
          </div>
        </header>

        {/* Content Pane */}
        <div className="flex-1 flex min-h-0 relative flex-col md:flex-row">
          
          {/* Question View (Left Pane) */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-8 custom-scrollbar">
            
            <div className="p-6 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card shadow-soft space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                <span className="font-bold text-primary">Question {currentQuestionIndex + 1} of {activeTestQuestions.length}</span>
                <div className="flex gap-2">
                  <span className="font-bold text-[9px] uppercase tracking-wide text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                    {activeQuestion?.type}
                  </span>
                  <span className="font-bold text-[9px] uppercase tracking-wide text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    {activeQuestion?.marks} Marks
                  </span>
                  <span className="font-semibold uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                    {activeQuestion?.difficulty}
                  </span>
                </div>
              </div>
              
              <div className="text-sm md:text-base font-medium text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap leading-relaxed">
                {activeQuestion?.question}
              </div>

              {/* MCQ Options */}
              {activeQuestion?.type === 'MCQ' && (
                <div className="space-y-2.5 pt-4">
                  {activeQuestion?.options.map((option, idx) => {
                    const isSelected = answers[activeQuestion.id] === idx
                    return (
                      <button
                        key={idx}
                        onClick={() => handleMCQSelect(activeQuestion.id, idx)}
                        className={`w-full p-4 text-left text-sm rounded-btn border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-primary bg-indigo-50/50 dark:bg-indigo-950/20 text-primary font-medium'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <span className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold ${
                          isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-700 text-slate-500'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* MSQ Options */}
              {activeQuestion?.type === 'MSQ' && (
                <div className="space-y-2.5 pt-4">
                  {activeQuestion?.options.map((option, idx) => {
                    const isSelected = (answers[activeQuestion.id] || []).includes(idx)
                    return (
                      <button
                        key={idx}
                        onClick={() => handleMSQToggle(activeQuestion.id, idx)}
                        className={`w-full p-4 text-left text-sm rounded-btn border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-primary bg-indigo-50/50 dark:bg-indigo-950/20 text-primary font-medium'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <span className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 text-xs font-bold ${
                          isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-700 text-slate-500'
                        }`}>
                          {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                        </span>
                        <span>{option}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* NAT Option */}
              {activeQuestion?.type === 'NAT' && (
                <div className="space-y-3 pt-4">
                  <span className="text-xs font-bold text-slate-500 block uppercase tracking-wide">Enter Numerical Answer:</span>
                  <input
                    type="text"
                    placeholder="Type numerical value (e.g. 5 or 2.33)..."
                    value={answers[activeQuestion.id] || ''}
                    onChange={(e) => handleNATChange(activeQuestion.id, e.target.value)}
                    className="w-full h-12 px-4 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-slate-800 dark:text-slate-100"
                  />
                </div>
              )}

            </div>

            {/* Previous / Next buttons */}
            <div className="flex justify-between items-center mt-6">
              <div className="flex gap-2">
                <button
                  onClick={() => navigateQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-300 rounded-btn text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => navigateQuestion(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === activeTestQuestions.length - 1}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-300 rounded-btn text-xs font-semibold hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>

              <button
                onClick={() => toggleFlag(activeQuestion.id)}
                className={`px-4 py-2 rounded-btn text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                  flags[activeQuestion.id]
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500'
                    : 'border-slate-200 dark:border-slate-800 bg-card-light dark:bg-card-dark text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                <Flag size={14} className={flags[activeQuestion.id] ? 'fill-amber-500' : ''} />
                <span>{flags[activeQuestion.id] ? 'Flagged' : 'Flag Question'}</span>
              </button>
            </div>

          </div>

          {/* Questions Grid Panel (Right Panel) */}
          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Questions Grid</h3>
              
              <div className="grid grid-cols-5 gap-2 max-h-40 md:max-h-none overflow-y-auto p-1.5 pr-2">
                {activeTestQuestions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex
                  const isFlagged = flags[q.id]
                  const userAns = answers[q.id]
                  const hasAnswered = userAns !== undefined && userAns !== '' && (q.type !== 'MSQ' || userAns.length > 0)
                  const hasVisited = visited[q.id]

                  let btnClass = 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-400'
                  if (hasAnswered) {
                    btnClass = 'bg-emerald-500 text-white border-emerald-600'
                  } else if (isFlagged) {
                    btnClass = 'bg-amber-500 text-white border-amber-600'
                  } else if (hasVisited) {
                    btnClass = 'bg-slate-200 dark:bg-slate-800 border-slate-300 text-slate-700 dark:text-slate-350'
                  }

                  if (isCurrent) {
                    btnClass += ' ring-2 ring-primary font-bold'
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => navigateQuestion(idx)}
                      className={`h-9 w-9 rounded-btn flex items-center justify-center text-xs font-semibold border transition-all ${btnClass}`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800/40 pt-4 mt-4 space-y-2 text-[10px] font-semibold text-slate-555">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded bg-emerald-500 shrink-0"></span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded bg-amber-500 shrink-0"></span>
                <span>Flagged</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-300 dark:border-slate-700"></span>
                <span>Visited but unanswered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0"></span>
                <span>Not Visited</span>
              </div>
            </div>

          </div>

        </div>
      </div>
    )
  }

  // 3. POST-TEST ANALYTICS DASHBOARD
  if (view === 'report') {
    const history = JSON.parse(localStorage.getItem('gate_pyq_mock_history') || '[]')
    const lastMocks = [...history].slice(0, 8).reverse() // Chronological, max 8

    // Parse Error tags
    const errorDistribution = { conceptual: 0, calculation: 0, time: 0, reading: 0, guess: 0 }
    if (reportData.errorTags) {
      Object.values(reportData.errorTags).forEach(tag => {
        if (errorDistribution[tag] !== undefined) errorDistribution[tag]++
      })
    }
    const totalTaggedErrors = Object.values(errorDistribution).reduce((a, b) => a + b, 0)

    // Pacing metrics
    const pacers = { quickCorrect: 0, slowCorrect: 0, quickIncorrect: 0, slowIncorrect: 0 }
    activeTestQuestions.forEach(q => {
      const userAns = answers[q.id]
      const qTimeSpent = (reportData.timeSpentMap?.[q.id]) || 0
      
      let isCorrect = false
      if (userAns !== undefined && userAns !== '' && (q.type !== 'MSQ' || userAns.length > 0)) {
        if (q.type === 'MCQ' && userAns === q.answer) isCorrect = true
        else if (q.type === 'MSQ' && isMSQCorrect(userAns, q.answer)) isCorrect = true
        else if (q.type === 'NAT' && isNATCorrect(userAns, q.answer)) isCorrect = true

        if (isCorrect) {
          if (qTimeSpent < 60) pacers.quickCorrect++
          else pacers.slowCorrect++
        } else {
          if (qTimeSpent < 45) pacers.quickIncorrect++
          else pacers.slowIncorrect++
        }
      }
    })

    const sortedTopics = Object.entries(reportData.topicStats)
      .map(([topicName, stats]) => {
        const lost = stats.marksMax - stats.marksObtained
        return { topicName, lost, ...stats }
      })
      .sort((a, b) => b.lost - a.lost)

    const weakSubjects = Object.entries(reportData.subjectStats)
      .map(([subName, stats]) => {
        const accuracy = stats.totalQs - stats.unansweredQs > 0
          ? (stats.correctQs / (stats.totalQs - stats.unansweredQs)) * 100
          : 0
        return { subName, accuracy, ...stats }
      })
      .filter(s => s.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)

    const handlePrint = () => {
      window.print()
    }

    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark min-h-screen print:bg-white print:p-0 print:text-black">
        {/* Print Title */}
        <div className="hidden print:block text-center space-y-2 pb-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold">GATE CSE PYQ Mock Exam Report</h1>
          <p className="text-sm text-slate-500">Test: {activeTestTitle} | Taken on: {reportData.date}</p>
          <p className="text-xs font-semibold">Raw Score: {reportData.score} / {reportData.maxScore} | Accuracy: {reportData.percentage}%</p>
        </div>

        {/* Header (No-print) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-light dark:border-border-dark pb-4 no-print">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Award size={14} />
              <span>PYQ Performance Dashboard</span>
            </div>
            <h1 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark mt-1">
              {reportData.displayName} Analysis
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Attempted on: {reportData.date} | Mode: {reportData.testTitle}</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-4 py-2 border border-slate-200 dark:border-slate-800 bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-350 rounded-btn text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 active:scale-95"
            >
              <FileText size={14} />
              <span>Export PDF Report</span>
            </button>

            <button
              onClick={() => {
                setView('list')
                setSubView('hub')
              }}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-btn hover:bg-primary-hover shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={14} />
              <span>Done Reviewing</span>
            </button>
          </div>
        </div>

        {/* Tab Controls (no-print) */}
        <div className="flex overflow-x-auto border-b border-border-light dark:border-border-dark no-print scrollbar-none gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'subjects', label: 'Subjects & Topics', icon: Target },
            { id: 'time', label: 'Time Management', icon: Clock },
            { id: 'questions', label: 'Solutions Review', icon: BookOpen }
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeReportTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReportTab(tab.id)}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeReportTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Raw Score Gauge */}
              <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex flex-col items-center justify-center text-center space-y-4">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Raw Test Score</span>
                <div className="relative flex items-center justify-center">
                  <svg className="h-28 w-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="45" fill="transparent" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="8" />
                    <circle 
                      cx="56" cy="56" r="45" fill="transparent" 
                      className="stroke-primary" strokeWidth="8"
                      strokeDasharray="282.7"
                      strokeDashoffset={282.7 - (282.7 * Math.max(0, Math.min(1, reportData.score / reportData.maxScore)))}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-primary leading-none">{reportData.score}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">/ {reportData.maxScore} Marks</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-success bg-emerald-500/10 px-2.5 py-1 rounded">
                  Attempt Accuracy: {reportData.percentage}%
                </span>
              </div>

              {/* GATE Score */}
              <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex flex-col items-center justify-center text-center space-y-3">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Brain size={20} />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estimated GATE Score</span>
                <span className="text-4xl font-black text-text-primary-light dark:text-text-primary-dark">
                  {reportData.estimatedGateScore}
                </span>
                <span className="text-[10px] text-slate-500 max-w-[140px] leading-tight">
                  Normalized relative to previous year cutoff weightage.
                </span>
              </div>

              {/* Rank Estimator */}
              <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex flex-col items-center justify-center text-center space-y-3">
                <div className="h-10 w-10 bg-success/10 rounded-full flex items-center justify-center text-success">
                  <Award size={20} />
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Virtual Rank Predictor</span>
                <span className="text-4xl font-black text-success">
                  #{reportData.estimatedRank}
                </span>
                <span className="text-[10px] text-slate-500 max-w-[140px] leading-tight">
                  Based on simulated 50k GATE CSE participants.
                </span>
              </div>

              {/* Pacing Stats */}
              <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex flex-col justify-between space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Pacing Statistics</h3>
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-500">Attempt Rate:</span>
                      <span className="text-text-primary-light dark:text-text-primary-dark">{reportData.attemptRate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-primary h-full" style={{ width: `${reportData.attemptRate}%` }}></div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-500">Time Utilized:</span>
                      <span className="text-text-primary-light dark:text-text-primary-dark">{reportData.timeTakenFormatted}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full" style={{ width: `${reportData.timeUtilizationRate}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                  Total Questions: {activeTestQuestions.length} | Duration: {Math.round(activeTestQuestions.length * 1.5)} Min
                </div>
              </div>

            </div>

            {/* Trend Graph & Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Line graph */}
              <div className="md:col-span-2 p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Progress Trend</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Mock exam performance trajectory over your last {lastMocks.length} attempts</p>
                </div>

                <div className="w-full h-44 flex items-center justify-center">
                  {lastMocks.length > 0 ? (
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
                      <defs>
                        <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {[0, 25, 50, 75, 100].map(y => {
                        const valY = 130 - (y / 100) * 100
                        return (
                          <g key={y} className="opacity-40">
                            <line x1="30" y1={valY} x2="470" y2={valY} stroke="#94a3b8" strokeDasharray="3,3" strokeWidth="0.5" />
                            <text x="5" y={valY + 3} className="text-[8px] fill-slate-400 font-mono font-bold">{y}%</text>
                          </g>
                        )
                      })}

                      {(() => {
                        const width = 500
                        const height = 150
                        const padding = 30
                        const points = lastMocks.map((m, i) => {
                          const x = lastMocks.length > 1
                            ? padding + (i / (lastMocks.length - 1)) * (width - padding * 2)
                            : width / 2
                          const scoreRatio = m.score / Math.max(1, m.maxScore)
                          const y = height - padding - scoreRatio * (height - padding * 2)
                          return { x, y, score: m.score, maxScore: m.maxScore, date: m.date, name: m.displayName }
                        })

                        const pathD = points.length > 1
                          ? points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, "")
                          : ""
                        const areaD = points.length > 1
                          ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
                          : ""

                        return (
                          <>
                            {points.length > 1 && (
                              <>
                                <path d={areaD} fill="url(#chart-glow)" />
                                <path d={pathD} fill="transparent" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" />
                              </>
                            )}
                            {points.map((p, idx) => (
                              <g key={idx} className="group cursor-pointer">
                                <circle 
                                  cx={p.x} cy={p.y} r="4" 
                                  fill="#4f46e5" 
                                  className="stroke-white dark:stroke-card-dark hover:r-6" 
                                  strokeWidth="1.5" 
                                />
                                <text x={p.x} y={145} className="text-[7px] fill-slate-400 text-center font-bold font-mono" textAnchor="middle">
                                  {p.name}
                                </text>
                                <text x={p.x} y={p.y - 8} className="text-[8px] fill-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity" textAnchor="middle">
                                  {p.score}/{p.maxScore}
                                </text>
                              </g>
                            ))}
                          </>
                        )
                      })()}
                    </svg>
                  ) : (
                    <span className="text-xs text-slate-500">Attempt more PYQ mock tests to chart progress!</span>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark flex items-center gap-1.5">
                    <Brain className="text-primary" size={16} />
                    <span>AI Revision Roadmap</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Personalized study plan derived from topic gaps</p>
                </div>

                <div className="space-y-3 flex-1 pt-2">
                  {weakSubjects.length > 0 ? (
                    <>
                      <p className="text-xs text-slate-500 leading-tight">
                        Your accuracy in **{weakSubjects[0].subName}** was only {Math.round(weakSubjects[0].accuracy)}%. We recommend this study schedule:
                      </p>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex gap-2 items-start bg-primary/5 p-2 rounded">
                          <span className="h-4 w-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                          <span className="text-slate-650 dark:text-slate-400">Review core formulas of **{weakSubjects[0].subName}**.</span>
                        </div>
                        <div className="flex gap-2 items-start bg-primary/5 p-2 rounded">
                          <span className="h-4 w-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                          <span className="text-slate-655 dark:text-slate-400">Solve 20+ topic-specific practice questions in reels mode.</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 space-y-2">
                      <p className="font-bold text-success">Excellent consistency!</p>
                      <p className="leading-tight">All subjects exceed 70% accuracy. Continue practicing mock exams to build endurance and speed.</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-btn text-[10px] text-slate-500 font-semibold flex justify-between items-center">
                  <span>Practice Streak:</span>
                  <span className="text-primary font-bold">🔥 6 Days</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: SUBJECTS & TOPICS */}
        {activeReportTab === 'subjects' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-2 p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Subject Marks Distribution</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Marks Obtained compared to Maximum available marks per subject</p>
                </div>

                <div className="space-y-4 pt-4">
                  {Object.entries(reportData.subjectStats).map(([subName, stats]) => {
                    const ratio = Math.max(0, stats.marksObtained) / Math.max(1, stats.marksMax)
                    const percent = Math.round(ratio * 100)
                    return (
                      <div key={subName} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-650 dark:text-slate-400 truncate max-w-[200px]">{subName}</span>
                          <span className="text-text-primary-light dark:text-text-primary-dark font-mono">
                            {stats.marksObtained.toFixed(2)} / {stats.marksMax} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded overflow-hidden relative flex">
                          <div className="bg-primary/20 h-full w-full absolute top-0 left-0"></div>
                          <div className="bg-primary h-full transition-all duration-500 z-10" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
                <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Cognitive Performance</h3>
                <p className="text-xs text-slate-400">Analysis based on question formats</p>
                
                <div className="space-y-4 pt-2">
                  {['MCQ', 'MSQ', 'NAT'].map(type => {
                    const questionsOfType = activeTestQuestions.filter(q => q.type === type)
                    const total = questionsOfType.length
                    
                    let correctCount = 0
                    questionsOfType.forEach(q => {
                      const ans = answers[q.id]
                      if (ans !== undefined && ans !== '') {
                        if (q.type === 'MCQ' && ans === q.answer) correctCount++
                        else if (q.type === 'MSQ' && isMSQCorrect(ans, q.answer)) correctCount++
                        else if (q.type === 'NAT' && isNATCorrect(ans, q.answer)) correctCount++
                      }
                    })

                    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0
                    return (
                      <div key={type} className="space-y-1 text-xs">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-650 dark:text-slate-400">{type === 'MCQ' ? 'Multiple Choice (MCQ)' : type === 'MSQ' ? 'Multiple Select (MSQ)' : 'Numerical Inputs (NAT)'}</span>
                          <span className="text-text-primary-light dark:text-text-primary-dark">{correctCount}/{total} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div className={`h-full ${type === 'MCQ' ? 'bg-emerald-500' : type === 'MSQ' ? 'bg-indigo-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

            <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div>
                <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Topic Gaps heatmap</h3>
                <p className="text-xs text-slate-400">Weak Topics prioritized by Marks Lost Potential</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/40 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="py-2.5 font-bold">Topic</th>
                      <th className="py-2.5 font-bold">Subject</th>
                      <th className="py-2.5 font-bold text-center">Correct / Total</th>
                      <th className="py-2.5 font-bold text-center">Accuracy</th>
                      <th className="py-2.5 font-bold text-center">Marks Lost Potential</th>
                      <th className="py-2.5 font-bold text-right">Time Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTopics.map(({ topicName, lost, subject, totalQs, correctQs, incorrectQs, timeSpent }) => {
                      const acc = totalQs > 0 ? Math.round((correctQs / totalQs) * 100) : 0
                      return (
                        <tr key={topicName} className="border-b border-slate-50 dark:border-slate-800/20 hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                          <td className="py-3 font-bold text-text-primary-light dark:text-text-primary-dark">{topicName}</td>
                          <td className="py-3 text-slate-500">{subject}</td>
                          <td className="py-3 text-center font-semibold">{correctQs} / {totalQs}</td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold ${
                              acc >= 80 ? 'bg-emerald-500/10 text-success' : acc >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-error'
                            }`}>
                              {acc}%
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            {lost > 0 ? (
                              <span className="text-error font-extrabold flex items-center justify-center gap-1">
                                <AlertTriangle size={12} />
                                <span>-{lost.toFixed(2)} Marks</span>
                              </span>
                            ) : (
                              <span className="text-success font-semibold">0 (Full)</span>
                            )}
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-slate-500">{formatTime(timeSpent)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: TIME MANAGEMENT */}
        {activeReportTab === 'time' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-2 p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Average Time per Question Status</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Average seconds spent on problems grouped by response correctness</p>
                </div>

                <div className="space-y-6 pt-4">
                  {[
                    { label: 'Correct Answers', time: reportData.avgTimeCorrect, color: 'bg-emerald-500', timeFormatted: formatTime(reportData.avgTimeCorrect) },
                    { label: 'Incorrect Answers', time: reportData.avgTimeIncorrect, color: 'bg-red-500', timeFormatted: formatTime(reportData.avgTimeIncorrect) },
                    { label: 'Skipped / Unanswered', time: reportData.avgTimeUnanswered, color: 'bg-slate-400', timeFormatted: formatTime(reportData.avgTimeUnanswered) }
                  ].map((bar, idx) => {
                    const maxTime = Math.max(reportData.avgTimeCorrect, reportData.avgTimeIncorrect, reportData.avgTimeUnanswered, 120)
                    const percent = Math.round((bar.time / maxTime) * 100)
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-655 dark:text-slate-400">{bar.label}</span>
                          <span className="text-text-primary-light dark:text-text-primary-dark font-mono">{bar.timeFormatted} / q</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded overflow-hidden relative flex items-center">
                          <div className={`${bar.color} h-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Panic Zone Warning</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Incorrect answers entered in final 15% of mock time limits</p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  {reportData.panicZoneErrors > 0 ? (
                    <div className="space-y-2">
                      <div className="h-12 w-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                        <AlertTriangle size={24} className="animate-pulse" />
                      </div>
                      <h4 className="font-bold text-xs text-text-primary-light dark:text-text-primary-dark uppercase">Pacing Warning Triggered</h4>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        You made **{reportData.panicZoneErrors} errors** in the final 15% of the mock exam. You might be rushing. Optimize pacing or skip hard questions early.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="h-12 w-12 bg-emerald-500/10 text-success rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                        <CheckCircle2 size={24} />
                      </div>
                      <h4 className="font-bold text-xs text-text-primary-light dark:text-text-primary-dark uppercase">Pacing is Healthy</h4>
                      <p className="text-[11px] text-slate-555 leading-tight">
                        Perfect time management. No rushed incorrect answers were logged in the final minutes!
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-[10px] font-bold text-slate-450 border-t border-slate-100 dark:border-slate-800/40 pt-2">
                  Final 15% duration = {Math.round(totalDurationSeconds * 0.15)} Seconds
                </div>
              </div>

            </div>

            <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div>
                <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Speed vs. Accuracy Quadrants</h3>
                <p className="text-xs text-slate-400">Visual mapping of questions solved under pacing buckets</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded border border-emerald-500/15 bg-emerald-500/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-success uppercase">1. Pacesetters (Quick & Correct)</span>
                    <span className="text-xs font-extrabold text-success bg-emerald-500/10 px-2 py-0.5 rounded">{pacers.quickCorrect} Questions</span>
                  </div>
                  <p className="text-[10px] text-slate-655 dark:text-slate-450 leading-relaxed">
                    Correct questions solved in **less than 60 seconds**. Peak strength zone.
                  </p>
                </div>

                <div className="p-4 rounded border border-indigo-500/15 bg-indigo-500/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-primary uppercase">2. Diligents (Slow & Correct)</span>
                    <span className="text-xs font-extrabold text-primary bg-indigo-500/10 px-2 py-0.5 rounded">{pacers.slowCorrect} Questions</span>
                  </div>
                  <p className="text-[10px] text-slate-655 dark:text-slate-450 leading-relaxed">
                    Correct questions solved in **60 seconds or more**. Concepts are sound, but execution speed could improve.
                  </p>
                </div>

                <div className="p-4 rounded border border-amber-500/15 bg-amber-500/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-amber-600 dark:text-amber-500 uppercase">3. Careless Errors (Quick & Incorrect)</span>
                    <span className="text-xs font-extrabold text-amber-600 dark:text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">{pacers.quickIncorrect} Questions</span>
                  </div>
                  <p className="text-[10px] text-slate-655 dark:text-slate-450 leading-relaxed">
                    Incorrect questions solved in **less than 45 seconds**. Likely caused by arithmetic errors or misreading statement details.
                  </p>
                </div>

                <div className="p-4 rounded border border-red-500/15 bg-red-500/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-error uppercase">4. Time Drains (Slow & Incorrect)</span>
                    <span className="text-xs font-extrabold text-error bg-red-500/10 px-2 py-0.5 rounded">{pacers.slowIncorrect} Questions</span>
                  </div>
                  <p className="text-[10px] text-slate-655 dark:text-slate-450 leading-relaxed">
                    Incorrect questions solved in **90 seconds or more**. High overhead cognitive efforts that still resulted in a wrong attempt.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: SOLUTIONS & SOLUTIONS REVIEW */}
        {activeReportTab === 'questions' && (
          <div className="space-y-6 animate-fade-in">
            {totalTaggedErrors > 0 && (
              <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4 no-print">
                <div>
                  <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Error Analysis Distribution</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Summary of mistake tags associated with your incorrect attempts</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    { key: 'conceptual', label: 'Conceptual', color: 'bg-red-500' },
                    { key: 'calculation', label: 'Silly Mistake', color: 'bg-amber-500' },
                    { key: 'time', label: 'Time Pressure', color: 'bg-indigo-500' },
                    { key: 'reading', label: 'Misread Question', color: 'bg-blue-500' },
                    { key: 'guess', label: 'Guessed Wrong', color: 'bg-slate-500' }
                  ].map(item => {
                    const count = errorDistribution[item.key]
                    const pct = Math.round((count / totalTaggedErrors) * 100)
                    return (
                      <div key={item.key} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded text-center space-y-1">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">{item.label}</span>
                        <span className="text-xl font-black block">{count}</span>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div className={`${item.color} h-full`} style={{ width: `${pct}%` }}></div>
                        </div>
                        <span className="text-[8px] text-slate-400">{pct}% of errors</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 no-print">
              <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Detailed Question Explanations</h3>
              
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'correct', label: 'Correct' },
                  { id: 'incorrect', label: 'Incorrect' },
                  { id: 'unanswered', label: 'Unattempted' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setQuestionFilter(f.id)}
                    className={`px-3 py-1.5 rounded-btn text-xs font-bold transition-all border whitespace-nowrap ${
                      questionFilter === f.id
                        ? 'bg-primary border-primary text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-card-light dark:bg-card-dark text-slate-655 hover:bg-slate-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {activeTestQuestions
                .map((q, idx) => {
                  const selected = answers[q.id]
                  let isCorrect = false
                  let isUnanswered = false

                  if (selected === undefined || selected === '' || (q.type === 'MSQ' && selected.length === 0)) {
                    isUnanswered = true
                  } else {
                    if (q.type === 'MCQ') isCorrect = selected === q.answer
                    else if (q.type === 'MSQ') isCorrect = isMSQCorrect(selected, q.answer)
                    else if (q.type === 'NAT') isCorrect = isNATCorrect(selected, q.answer)
                  }

                  return { q, idx, selected, isCorrect, isUnanswered }
                })
                .filter(item => {
                  if (questionFilter === 'correct') return item.isCorrect
                  if (questionFilter === 'incorrect') return !item.isCorrect && !item.isUnanswered
                  if (questionFilter === 'unanswered') return item.isUnanswered
                  return true
                })
                .map(({ q, idx, selected, isCorrect, isUnanswered }) => {
                  const timeSecs = timeSpent[q.id] || 0
                  const currentTag = reportData.errorTags?.[q.id] || ""

                  return (
                    <div
                      key={q.id}
                      className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4"
                    >
                      <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800/40">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-500">Question {idx + 1}</span>
                          <span className="font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">{q.subject}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Time: {formatTime(timeSecs)}</span>
                        </div>
                        <span className={`font-bold px-2 py-0.5 rounded ${
                          isCorrect ? 'bg-emerald-500/10 text-success' : isUnanswered ? 'bg-slate-500/10 text-slate-500' : 'bg-red-500/10 text-error'
                        }`}>
                          {isCorrect ? 'Correct' : isUnanswered ? 'Unattempted' : 'Incorrect'}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap leading-relaxed">
                        {q.question}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                        <div className={`p-3 rounded border ${
                          isCorrect ? 'bg-emerald-500/5 border-emerald-500/15 text-success' : isUnanswered ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 text-slate-500' : 'bg-red-500/5 border-red-500/15 text-error'
                        }`}>
                          <span className="text-slate-450 block font-bold uppercase mb-0.5 text-[9px] tracking-wider">Your Response:</span>
                          <span>
                            {isUnanswered 
                              ? 'Skipped Question' 
                              : q.type === 'MCQ' 
                              ? `Option ${String.fromCharCode(65 + selected)}: ${q.options[selected]}` 
                              : q.type === 'MSQ' 
                              ? selected.map(idx => String.fromCharCode(65 + idx)).join(', ') 
                              : `Value: ${selected}`}
                          </span>
                        </div>
                        
                        <div className="p-3 rounded bg-emerald-500/5 border border-emerald-500/15 text-success">
                          <span className="text-slate-455 block font-bold uppercase mb-0.5 text-[9px] tracking-wider">Correct Answer Key:</span>
                          <span>
                            {q.type === 'MCQ' 
                              ? `Option ${String.fromCharCode(65 + q.answer)}: ${q.options[q.answer]}`
                              : q.type === 'MSQ' 
                              ? q.answer.map(idx => String.fromCharCode(65 + idx)).join(', ')
                              : `Value: ${q.answer}`}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded bg-indigo-500/5 border border-indigo-500/10 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        <span className="block font-bold text-primary mb-1 uppercase tracking-wider text-[9px]">Detailed Explanation</span>
                        {q.explanation}
                      </div>

                      {!isCorrect && !isUnanswered && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/40 space-y-2 no-print">
                          <span className="block font-bold text-[10px] text-slate-400 uppercase tracking-wider">Categorize Your Mistake Reason:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { key: 'conceptual', label: 'Conceptual Misunderstanding', activeColor: 'bg-red-500/20 border-red-500 text-error' },
                              { key: 'calculation', label: 'Silly / Calc Mistake', activeColor: 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-500' },
                              { key: 'time', label: 'Time Pressure Error', activeColor: 'bg-indigo-500/20 border-indigo-500 text-primary' },
                              { key: 'reading', label: 'Misread Statement', activeColor: 'bg-blue-500/20 border-blue-500 text-blue-500' },
                              { key: 'guess', label: 'Guessed Wrong Option', activeColor: 'bg-slate-500/20 border-slate-500 text-slate-555' }
                            ].map(tag => {
                              const isSelected = currentTag === tag.key
                              return (
                                <button
                                  key={tag.key}
                                  onClick={() => handleTagError(q.id, tag.key)}
                                  className={`px-3 py-1.5 rounded-full border text-[10px] font-semibold transition-all ${
                                    isSelected
                                      ? tag.activeColor
                                      : 'border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/20 hover:bg-slate-100'
                                  }`}
                                >
                                  {tag.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Footer (no-print) */}
        <div className="flex justify-center gap-4 pt-4 no-print">
          <button
            onClick={() => {
              setView('list')
              setSubView('hub')
            }}
            className="px-6 py-2.5 font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-btn hover:bg-slate-200 transition-colors"
          >
            Back to Mocks List
          </button>
          <button
            onClick={() => startMockTestSession(activeTestQuestions, activeTestTitle, activeTestModeInfo)}
            className="px-6 py-2.5 font-bold text-xs bg-primary text-white rounded-btn hover:bg-primary-hover shadow-md flex items-center gap-1.5 transition-all"
          >
            <RefreshCw size={12} />
            <span>Retake Mock Exam</span>
          </button>
        </div>

      </div>
    )
  }
}
