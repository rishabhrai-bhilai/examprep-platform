import React, { useState, useEffect, useRef } from 'react'
import { BookOpen, Clock, Calculator, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Flag, HelpCircle, Send, Award, RefreshCw, TrendingUp, Target, BarChart2, Zap, AlertTriangle, FileText, Brain } from 'lucide-react'
import { dummyMockTests } from '../utils/dummyData'
import { useAppStore } from '../store/useAppStore'
import confetti from 'canvas-confetti'

export default function MockTestsPage() {
  const [view, setView] = useState('list') // 'list' | 'testing' | 'report'
  const [activeTest, setActiveTest] = useState(null)
  const { questions, calculatorOpen, setCalculatorOpen } = useAppStore()
  
  // Testing State variables
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({}) // { questionId: selectedOptionIndex }
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

  // Initialize dummy history if none exists
  useEffect(() => {
    const existing = localStorage.getItem('gate_mock_history')
    if (!existing) {
      const dummyHistory = [
        {
          testId: 'test-1',
          testTitle: 'GATE Computer Science - Mini Mock Test',
          date: '15 May 2026',
          score: 12.0,
          maxScore: 20,
          percentage: '75.0',
          attemptRate: '80.0',
          timeTaken: 540,
          timeTakenFormatted: '09:00',
          timeUtilizationRate: '60.0',
          avgTimeCorrect: 120,
          avgTimeIncorrect: 180,
          avgTimeUnanswered: 30,
          panicZoneErrors: 1,
          estimatedGateScore: 480,
          estimatedRank: 3200,
          subjectStats: {},
          topicStats: {},
          difficultyStats: {}
        },
        {
          testId: 'test-1',
          testTitle: 'GATE Computer Science - Mini Mock Test',
          date: '18 May 2026',
          score: 14.5,
          maxScore: 20,
          percentage: '80.0',
          attemptRate: '100.0',
          timeTaken: 620,
          timeTakenFormatted: '10:20',
          timeUtilizationRate: '68.9',
          avgTimeCorrect: 110,
          avgTimeIncorrect: 160,
          avgTimeUnanswered: 0,
          panicZoneErrors: 0,
          estimatedGateScore: 540,
          estimatedRank: 2400,
          subjectStats: {},
          topicStats: {},
          difficultyStats: {}
        },
        {
          testId: 'test-1',
          testTitle: 'GATE Computer Science - Mini Mock Test',
          date: '22 May 2026',
          score: 11.0,
          maxScore: 20,
          percentage: '60.0',
          attemptRate: '100.0',
          timeTaken: 710,
          timeTakenFormatted: '11:50',
          timeUtilizationRate: '78.9',
          avgTimeCorrect: 130,
          avgTimeIncorrect: 150,
          avgTimeUnanswered: 0,
          panicZoneErrors: 2,
          estimatedGateScore: 450,
          estimatedRank: 4100,
          subjectStats: {},
          topicStats: {},
          difficultyStats: {}
        },
        {
          testId: 'test-1',
          testTitle: 'GATE Computer Science - Mini Mock Test',
          date: '26 May 2026',
          score: 16.0,
          maxScore: 20,
          percentage: '90.0',
          attemptRate: '100.0',
          timeTaken: 580,
          timeTakenFormatted: '09:40',
          timeUtilizationRate: '64.4',
          avgTimeCorrect: 100,
          avgTimeIncorrect: 180,
          avgTimeUnanswered: 0,
          panicZoneErrors: 0,
          estimatedGateScore: 610,
          estimatedRank: 1200,
          subjectStats: {},
          topicStats: {},
          difficultyStats: {}
        }
      ]
      localStorage.setItem('gate_mock_history', JSON.stringify(dummyHistory))
    }
  }, [])

  // Initialize questions inside a test
  const testQuestions = activeTest
    ? questions.filter((q) => activeTest.questions.includes(q.id))
    : []

  const activeQuestion = testQuestions[currentQuestionIndex]

  // Track active question ID for the timer closure
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
            handleSubmitTest() // Auto submit when timer runs out
            return 0
          }
          return prev - 1
        })

        // Track time spent on the active question
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

  const startTest = (test) => {
    setActiveTest(test)
    setAnswers({})
    setFlags({})
    setTimeSpent({})
    setAnswerTimes({})
    
    // Set all questions to not visited, except first
    const initialVisited = { [test.questions[0]]: true }
    setVisited(initialVisited)
    
    setCurrentQuestionIndex(0)
    setTimeLeft(test.durationMinutes * 60)
    setView('testing')
  }

  const handleSelectOption = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
    setAnswerTimes((prev) => ({ ...prev, [questionId]: timeLeft }))
  }

  const toggleFlag = (questionId) => {
    setFlags((prev) => ({ ...prev, [questionId]: !prev[questionId] }))
  }

  const navigateQuestion = (index) => {
    if (index >= 0 && index < testQuestions.length) {
      const targetQ = testQuestions[index]
      setVisited((prev) => ({ ...prev, [targetQ.id]: true }))
      setCurrentQuestionIndex(index)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleTagError = (questionId, tag) => {
    if (!reportData) return

    // Update local state
    const updatedData = {
      ...reportData,
      errorTags: {
        ...(reportData.errorTags || {}),
        [questionId]: tag
      }
    }
    setReportData(updatedData)

    // Update localStorage
    const history = JSON.parse(localStorage.getItem('gate_mock_history') || '[]')
    const updatedHistory = history.map(item => {
      // Find the current run in history
      if (item.testId === reportData.testId && item.score === reportData.score && item.date === reportData.date) {
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
    localStorage.setItem('gate_mock_history', JSON.stringify(updatedHistory))
  }

  const handleSubmitTest = () => {
    if (timerRef.current) clearInterval(timerRef.current)

    // Calculate score
    let correct = 0
    let incorrect = 0
    let unanswered = 0
    let totalScore = 0
    let maxPossibleScore = 0

    // Detailed collections
    const subjectStats = {}
    const topicStats = {}
    const difficultyStats = {}
    const timePerQuestionStatus = { correct: 0, incorrect: 0, unanswered: 0 }
    const timeSpentPerQuestionCount = { correct: 0, incorrect: 0, unanswered: 0 }
    let panicZoneErrors = 0
    const totalDuration = activeTest.durationMinutes * 60
    const panicThreshold = totalDuration * 0.15 // final 15% of time

    testQuestions.forEach((q) => {
      const selected = answers[q.id]
      const qMarks = q.marks || 1
      const qType = q.type || 'MCQ'
      const qSubject = q.subject || 'General Aptitude'
      const qTopic = q.topic || 'General'
      const qDifficulty = q.difficulty || 'Medium'
      const qTimeSpent = timeSpent[q.id] || 0

      maxPossibleScore += qMarks

      // Subject stats initialization
      if (!subjectStats[qSubject]) {
        subjectStats[qSubject] = { totalQs: 0, correctQs: 0, incorrectQs: 0, unansweredQs: 0, marksMax: 0, marksObtained: 0, timeSpent: 0 }
      }
      subjectStats[qSubject].totalQs++
      subjectStats[qSubject].marksMax += qMarks
      subjectStats[qSubject].timeSpent += qTimeSpent

      // Topic stats initialization
      if (!topicStats[qTopic]) {
        topicStats[qTopic] = { subject: qSubject, totalQs: 0, correctQs: 0, incorrectQs: 0, unansweredQs: 0, marksMax: 0, marksObtained: 0, timeSpent: 0 }
      }
      topicStats[qTopic].totalQs++
      topicStats[qTopic].marksMax += qMarks
      topicStats[qTopic].timeSpent += qTimeSpent

      // Difficulty stats initialization
      if (!difficultyStats[qDifficulty]) {
        difficultyStats[qDifficulty] = { totalQs: 0, correctQs: 0, incorrectQs: 0, unansweredQs: 0, marksMax: 0, marksObtained: 0, timeSpent: 0 }
      }
      difficultyStats[qDifficulty].totalQs++
      difficultyStats[qDifficulty].marksMax += qMarks
      difficultyStats[qDifficulty].timeSpent += qTimeSpent

      let status = 'unanswered'
      let gained = 0

      if (selected === undefined || selected === null) {
        unanswered++
        status = 'unanswered'
        timePerQuestionStatus.unanswered += qTimeSpent
        timeSpentPerQuestionCount.unanswered++
      } else if (selected === q.answer) {
        correct++
        status = 'correct'
        gained = qMarks
        totalScore += qMarks
        timePerQuestionStatus.correct += qTimeSpent
        timeSpentPerQuestionCount.correct++
      } else {
        incorrect++
        status = 'incorrect'
        // Negative marking: MCQ has negative marking (1/3 of marks), NAT/MSQ do not
        const penalty = qType === 'MCQ' ? qMarks / 3 : 0
        gained = -penalty
        totalScore -= penalty
        timePerQuestionStatus.incorrect += qTimeSpent
        timeSpentPerQuestionCount.incorrect++

        // Panic zone detection: answered in final 15% of duration
        const timeRemaining = answerTimes[q.id] || 0
        if (timeRemaining <= panicThreshold) {
          panicZoneErrors++
        }
      }

      // Update subject
      subjectStats[qSubject].marksObtained += gained
      if (status === 'correct') subjectStats[qSubject].correctQs++
      else if (status === 'incorrect') subjectStats[qSubject].incorrectQs++
      else subjectStats[qSubject].unansweredQs++

      // Update topic
      topicStats[qTopic].marksObtained += gained
      if (status === 'correct') topicStats[qTopic].correctQs++
      else if (status === 'incorrect') topicStats[qTopic].incorrectQs++
      else topicStats[qTopic].unansweredQs++

      // Update difficulty
      difficultyStats[qDifficulty].marksObtained += gained
      if (status === 'correct') difficultyStats[qDifficulty].correctQs++
      else if (status === 'incorrect') difficultyStats[qDifficulty].incorrectQs++
      else difficultyStats[qDifficulty].unansweredQs++
    })

    // Accuracy percentage (based on attempts)
    const totalAttempted = correct + incorrect
    const accuracy = totalAttempted > 0 ? ((correct / totalAttempted) * 100).toFixed(1) : 0
    const attemptRate = ((totalAttempted / testQuestions.length) * 100).toFixed(1)
    const timeTaken = totalDuration - timeLeft
    const timeUtilizationRate = ((timeTaken / totalDuration) * 100).toFixed(1)

    // Averages
    const avgTimeCorrect = timeSpentPerQuestionCount.correct > 0 ? Math.round(timePerQuestionStatus.correct / timeSpentPerQuestionCount.correct) : 0
    const avgTimeIncorrect = timeSpentPerQuestionCount.incorrect > 0 ? Math.round(timePerQuestionStatus.incorrect / timeSpentPerQuestionCount.incorrect) : 0
    const avgTimeUnanswered = timeSpentPerQuestionCount.unanswered > 0 ? Math.round(timePerQuestionStatus.unanswered / timeSpentPerQuestionCount.unanswered) : 0

    // GATE Score and Rank Estimations
    // Max marks for full GATE is 100. This mock is smaller. Let's scale score to 100 to estimate GATE score.
    const scaledScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0
    // Estimate GATE Score: typically scaled score from 0-100 translates to gate score from 100 to 1000.
    const estimatedGateScore = Math.max(100, Math.min(1000, Math.round(150 + scaledScore * 8.5)))
    // Estimate rank: rank decreases exponentially as score increases
    const estimatedRank = Math.max(1, Math.round(50000 * Math.pow(0.93, Math.max(0, scaledScore - 15))))

    const data = {
      testId: activeTest.id,
      testTitle: activeTest.title,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
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
      errorTags: {}, // to be populated by student
      timeSpentMap: timeSpent // save raw time per question
    }

    setReportData(data)

    // Save to local storage history
    const existingHistory = JSON.parse(localStorage.getItem('gate_mock_history') || '[]')
    const updatedHistory = [data, ...existingHistory]
    localStorage.setItem('gate_mock_history', JSON.stringify(updatedHistory))

    setView('report')
    
    // Trigger confetti celebration!
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    })
  }

  // --- RENDERS ---

  // 1. Tests Selection List View
  if (view === 'list') {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 bg-bg-light dark:bg-bg-dark min-h-screen">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">Mock Tests</h1>
          <p className="text-sm text-slate-500 mt-1">
            Evaluate your knowledge. Practice with self-paced, realistic exam timing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dummyMockTests.map((test) => (
            <div
              key={test.id}
              className="p-5 flex flex-col justify-between rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft hover:shadow-md hover:border-slate-300 dark:hover:border-slate-800 transition-all space-y-4"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 bg-primary/10 rounded">
                  {test.subject}
                </span>
                <h3 className="font-bold text-base text-text-primary-light dark:text-text-primary-dark">{test.title}</h3>
                
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-3 pt-1">
                  <span className="flex items-center gap-1.5">
                    <HelpCircle size={14} />
                    <span>{test.totalQuestions} Questions</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>{test.durationMinutes} Minutes</span>
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <span className="text-xs text-slate-400 font-semibold uppercase">Difficulty: {test.difficulty}</span>
                
                <button
                  onClick={() => startTest(test)}
                  className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-btn transition-all active:scale-95 shadow-sm"
                >
                  Attempt Test
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 2. Fullscreen Timed Testing View
  if (view === 'testing') {
    return (
      <div className="fixed inset-0 z-50 bg-bg-light dark:bg-bg-dark text-slate-800 dark:text-slate-100 flex flex-col">
        {/* Header */}
        <header className="h-16 px-6 border-b border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark flex items-center justify-between shadow-sm">
          <div>
            <h2 className="font-bold text-sm md:text-base text-text-primary-light dark:text-text-primary-dark truncate max-w-xs md:max-w-md">
              {activeTest.title}
            </h2>
            <p className="text-[10px] text-slate-400">Section: {activeQuestion?.subject}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Scientific Calculator Toggle Button */}
            <button
              onClick={() => setCalculatorOpen(!calculatorOpen)}
              className={`p-2 rounded-btn transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                calculatorOpen ? 'text-primary bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-600 dark:text-slate-400'
              }`}
              title="Scientific Calculator"
            >
              <Calculator size={18} />
            </button>

            {/* Timer display */}
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
          
          {/* Main Question Area (Left/Center) */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-8 custom-scrollbar">
            
            {/* Question Statement */}
            <div className="p-6 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card shadow-soft space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800/40 pb-3">
                <span className="font-bold text-primary">Question {currentQuestionIndex + 1} of {testQuestions.length}</span>
                <span className="font-semibold uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                  {activeQuestion?.difficulty}
                </span>
              </div>
              
              <div className="text-sm md:text-base font-medium text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap leading-relaxed">
                {activeQuestion?.question}
              </div>

              {/* Multiple Choice Options */}
              <div className="space-y-2.5 pt-4">
                {activeQuestion?.options.map((option, idx) => {
                  const isSelected = answers[activeQuestion.id] === idx
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(activeQuestion.id, idx)}
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
            </div>

            {/* Bottom Actions Row */}
            <div className="flex justify-between items-center mt-6">
              <div className="flex gap-2">
                <button
                  onClick={() => navigateQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-300 rounded-btn text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => navigateQuestion(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === testQuestions.length - 1}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-300 rounded-btn text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>

              <button
                onClick={() => toggleFlag(activeQuestion.id)}
                className={`px-4 py-2 rounded-btn text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                  flags[activeQuestion.id]
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500'
                    : 'border-slate-200 dark:border-slate-800 bg-card-light dark:bg-card-dark text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                }`}
              >
                <Flag size={14} className={flags[activeQuestion.id] ? 'fill-amber-500' : ''} />
                <span>{flags[activeQuestion.id] ? 'Flagged' : 'Flag Question'}</span>
              </button>
            </div>

          </div>

          {/* Right Panel: Navigator Drawer */}
          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-4 flex flex-col min-h-[180px] md:min-h-0 justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Questions Grid</h3>
              
              {/* Grid buttons */}
              <div className="grid grid-cols-5 gap-2 max-h-40 md:max-h-none overflow-y-auto p-1.5 pr-2">
                {testQuestions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex
                  const isFlagged = flags[q.id]
                  const hasAnswered = answers[q.id] !== undefined
                  const hasVisited = visited[q.id]

                  let btnClass = 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 outline-none focus:outline-none'
                  if (hasAnswered) {
                    btnClass = 'bg-emerald-500 text-white border-emerald-600 outline-none focus:outline-none'
                  } else if (isFlagged) {
                    btnClass = 'bg-amber-500 text-white border-amber-600 outline-none focus:outline-none'
                  } else if (hasVisited) {
                    btnClass = 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 outline-none focus:outline-none'
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

            {/* Status Legend */}
            <div className="border-t border-slate-100 dark:border-slate-800/40 pt-4 mt-4 space-y-2 text-[10px] font-semibold text-slate-500">
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

  // 3. Post-Test Report View
  // 3. Post-Test Report View
  if (view === 'report') {
    const history = JSON.parse(localStorage.getItem('gate_mock_history') || '[]')
    const lastMocks = [...history].slice(0, 8).reverse() // Chronological order, max 8

    // Parse Error tags to render mistake distribution
    const errorDistribution = {
      conceptual: 0,
      calculation: 0,
      time: 0,
      reading: 0,
      guess: 0
    }
    
    // Sum tags from reportData
    if (reportData.errorTags) {
      Object.values(reportData.errorTags).forEach(tag => {
        if (errorDistribution[tag] !== undefined) {
          errorDistribution[tag]++
        }
      })
    }
    const totalTaggedErrors = Object.values(errorDistribution).reduce((a, b) => a + b, 0)

    // Calculate pacing metrics
    const pacers = { quickCorrect: 0, slowCorrect: 0, quickIncorrect: 0, slowIncorrect: 0 }
    testQuestions.forEach(q => {
      const selected = answers[q.id]
      const qTimeSpent = (reportData.timeSpentMap?.[q.id]) || 0
      const isCorrect = selected === q.answer
      const isIncorrect = selected !== undefined && selected !== null && !isCorrect

      if (isCorrect) {
        if (qTimeSpent < 60) pacers.quickCorrect++
        else pacers.slowCorrect++
      } else if (isIncorrect) {
        if (qTimeSpent < 45) pacers.quickIncorrect++
        else pacers.slowIncorrect++
      }
    })

    // Calculate Weak Topics sorted by marks lost potential
    const sortedTopics = Object.entries(reportData.topicStats)
      .map(([topicName, stats]) => {
        const lost = stats.marksMax - stats.marksObtained
        return { topicName, lost, ...stats }
      })
      .sort((a, b) => b.lost - a.lost)

    // AI Revision recommendations based on low accuracy subjects
    const weakSubjects = Object.entries(reportData.subjectStats)
      .map(([subName, stats]) => {
        const accuracy = stats.totalQs - stats.unansweredQs > 0
          ? (stats.correctQs / (stats.totalQs - stats.unansweredQs)) * 100
          : 0
        return { subName, accuracy, ...stats }
      })
      .filter(s => s.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy)

    // Print Handler
    const handlePrint = () => {
      window.print()
    }

    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark min-h-screen print:bg-white print:p-0 print:text-black">
        {/* Print Only Title */}
        <div className="hidden print:block text-center space-y-2 pb-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold">GATE CSE Mock Test Report</h1>
          <p className="text-sm text-slate-500">Test: {activeTest.title} | Taken on: {reportData.date}</p>
          <p className="text-xs font-semibold">Raw Score: {reportData.score} / {reportData.maxScore} | Accuracy: {reportData.percentage}%</p>
        </div>

        {/* Top Header Row (no-print) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-light dark:border-border-dark pb-4 no-print">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Award size={14} />
              <span>Performance Dashboard</span>
            </div>
            <h1 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark mt-1">
              {activeTest.title} Analysis
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Attempted on: {reportData.date}</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-4 py-2 border border-slate-200 dark:border-slate-800 bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-300 rounded-btn text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center justify-center gap-1.5 active:scale-95"
            >
              <FileText size={14} />
              <span>Export PDF Report</span>
            </button>

            <button
              onClick={() => setView('list')}
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
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* --- TAB 1: OVERVIEW PANEL --- */}
        {(activeReportTab === 'overview' || window.matchMedia('print').matches) && (
          <div className="space-y-6">
            
            {/* Core Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Score Donut Card */}
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

              {/* GATE Score Estimator */}
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

              {/* Virtual All-India Rank */}
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

              {/* Attempt & Time utilization statistics */}
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
                  Total Duration: {activeTest.durationMinutes} Minutes
                </div>
              </div>

            </div>

            {/* Progress Chart and AI recommendations Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* SVG Line Chart: Progress Trend */}
              <div className="md:col-span-2 p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Progress Trend</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Mock exam performance trajectory over your last {lastMocks.length} attempts</p>
                </div>

                {/* SVG Chart area */}
                <div className="w-full h-44 flex items-center justify-center">
                  {lastMocks.length > 0 ? (
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150">
                      <defs>
                        <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Y-Axis helper lines */}
                      {[0, 25, 50, 75, 100].map(y => {
                        const valY = 130 - (y / 100) * 100
                        return (
                          <g key={y} className="opacity-40">
                            <line x1="30" y1={valY} x2="470" y2={valY} stroke="#94a3b8" strokeDasharray="3,3" strokeWidth="0.5" />
                            <text x="5" y={valY + 3} className="text-[8px] fill-slate-400 font-mono font-bold">{y}%</text>
                          </g>
                        )
                      })}

                      {/* Chart lines and paths */}
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
                          return { x, y, score: m.score, maxScore: m.maxScore, date: m.date }
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
                            
                            {/* Points and Tooltips */}
                            {points.map((p, idx) => (
                              <g key={idx} className="group cursor-pointer">
                                <circle 
                                  cx={p.x} cy={p.y} r="4" 
                                  fill="#4f46e5" 
                                  className="stroke-white dark:stroke-card-dark hover:r-6 hover:stroke-indigo-300 transition-all" 
                                  strokeWidth="1.5" 
                                />
                                <text x={p.x} y={145} className="text-[7px] fill-slate-400 text-center font-bold" textAnchor="middle">
                                  {p.date}
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
                    <span className="text-xs text-slate-500">Attempt more mock tests to chart progress trends!</span>
                  )}
                </div>
              </div>

              {/* AI Revision and Smart Advice */}
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
                        Your accuracy in **{weakSubjects[0].subName}** was only {Math.round(weakSubjects[0].accuracy)}%. We recommend this 7-day study program:
                      </p>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex gap-2 items-start bg-primary/5 p-2 rounded">
                          <span className="h-4 w-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                          <span className="text-slate-600 dark:text-slate-400">Re-watch core lecture notes for **{weakSubjects[0].subName}**.</span>
                        </div>
                        <div className="flex gap-2 items-start bg-primary/5 p-2 rounded">
                          <span className="h-4 w-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                          <span className="text-slate-600 dark:text-slate-400">Solve 15-20 Subject-wise PYQs at 1-mark level to build confidence.</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 space-y-2">
                      <p className="font-bold text-success">Excellent consistency!</p>
                      <p className="leading-tight">All subjects exceed 70% accuracy. Continue practicing comprehensive mock exams to increase speed and maintain stamina.</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-btn text-[10px] text-slate-500 font-semibold flex justify-between items-center">
                  <span>Current Revision Streak:</span>
                  <span className="text-primary font-bold">🔥 6 Days</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* --- TAB 2: SUBJECT & TOPIC ANALYSIS --- */}
        {activeReportTab === 'subjects' && (
          <div className="space-y-6">
            
            {/* Subject marks comparison and stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Subject Bar Chart */}
              <div className="md:col-span-2 p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Subject Marks Distribution</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Marks Obtained compared to Maximum available marks per subject</p>
                </div>

                {/* SVG bar chart */}
                <div className="space-y-4 pt-4">
                  {Object.entries(reportData.subjectStats).map(([subName, stats]) => {
                    const ratio = Math.max(0, stats.marksObtained) / Math.max(1, stats.marksMax)
                    const percent = Math.round(ratio * 100)
                    return (
                      <div key={subName} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{subName}</span>
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

              {/* Cognitive / Question Type Skill Gaps */}
              <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
                <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Skill Gap Analysis</h3>
                <p className="text-xs text-slate-400">Categorization based on cognitive depth of problems</p>
                
                <div className="space-y-4 pt-2">
                  {[
                    { type: 'Conceptual (1-Mark MCQs)', label: 'Tests basic retention and recall of formulas.', color: 'bg-emerald-500', correct: reportData.correct, total: reportData.correct + reportData.incorrect },
                    { type: 'Numerical (NATs)', label: 'Requires calculation accuracy, prone to decimals.', color: 'bg-indigo-500', correct: Math.round(reportData.correct * 0.4), total: Math.round((reportData.correct + reportData.incorrect) * 0.4) || 2 },
                    { type: 'Application (2-Mark MCQs)', label: 'Evaluates derivation and synthesis ability.', color: 'bg-amber-500', correct: Math.max(0, reportData.correct - Math.round(reportData.correct * 0.4)), total: Math.max(1, (reportData.correct + reportData.incorrect) - Math.round((reportData.correct + reportData.incorrect) * 0.4)) }
                  ].map((skill, idx) => {
                    const pct = skill.total > 0 ? Math.round((skill.correct / skill.total) * 100) : 0
                    return (
                      <div key={idx} className="space-y-1 text-xs">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-600 dark:text-slate-400">{skill.type}</span>
                          <span className="text-text-primary-light dark:text-text-primary-dark">{skill.correct}/{skill.total} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div className={`${skill.color} h-full`} style={{ width: `${pct}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight pt-0.5">{skill.label}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Granular topic analysis list */}
            <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div>
                <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Topic Heatmap & Weak Topics</h3>
                <p className="text-xs text-slate-400">Weak Topics prioritized by **Marks Lost Potential** (Max possible score - Obtained score)</p>
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
                              <span className="text-success font-semibold">0 (Full marks)</span>
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

        {/* --- TAB 3: TIME MANAGEMENT --- */}
        {activeReportTab === 'time' && (
          <div className="space-y-6">
            
            {/* Speed stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Avg Time Spent per Question Status */}
              <div className="md:col-span-2 p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Average Time per Question Status</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Average seconds spent on problems grouped by your final response correctness</p>
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
                          <span className="text-slate-600 dark:text-slate-400">{bar.label}</span>
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

              {/* Panic Zone warning block */}
              <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Panic Zone Warning</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Incorrect answers entered in the final 15% of the exam time limit</p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  {reportData.panicZoneErrors > 0 ? (
                    <div className="space-y-2">
                      <div className="h-12 w-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-500/20">
                        <AlertTriangle size={24} className="animate-pulse" />
                      </div>
                      <h4 className="font-bold text-xs text-text-primary-light dark:text-text-primary-dark uppercase">Pacing Warning Triggered</h4>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        You made **{reportData.panicZoneErrors} errors** in the final 15% of the mock test time. This shows high rush pressure. Consider skipping hard questions earlier to leave time.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="h-12 w-12 bg-emerald-500/10 text-success rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                        <CheckCircle2 size={24} />
                      </div>
                      <h4 className="font-bold text-xs text-text-primary-light dark:text-text-primary-dark uppercase">Pacing is Healthy</h4>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Perfect pacing distribution. You did not submit incorrect answers under rush in the final minutes of the timer!
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-[10px] font-bold text-slate-400 border-t border-slate-100 dark:border-slate-800/40 pt-2">
                  Final 15% duration = {Math.round((activeTest.durationMinutes * 60) * 0.15)} Seconds
                </div>
              </div>

            </div>

            {/* Speed vs Accuracy Quadrant Chart */}
            <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div>
                <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Speed vs. Accuracy Quadrants</h3>
                <p className="text-xs text-slate-400">Visual mapping of questions solved under pacing buckets</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                
                {/* Q1: Quick & Correct */}
                <div className="p-4 rounded border border-emerald-500/15 bg-emerald-500/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-success uppercase">1. Pacesetters (Quick & Correct)</span>
                    <span className="text-xs font-extrabold text-success bg-emerald-500/10 px-2 py-0.5 rounded">{pacers.quickCorrect} Questions</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Correct questions solved in **less than 60 seconds**. This is your peak strength zone — high accuracy and speed.
                  </p>
                </div>

                {/* Q2: Slow & Correct */}
                <div className="p-4 rounded border border-indigo-500/15 bg-indigo-500/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-primary uppercase">2. Diligents (Slow & Correct)</span>
                    <span className="text-xs font-extrabold text-primary bg-indigo-500/10 px-2 py-0.5 rounded">{pacers.slowCorrect} Questions</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Correct questions solved in **60 seconds or more**. Good conceptual understanding but requires practice to increase derivation speed.
                  </p>
                </div>

                {/* Q3: Quick & Wrong */}
                <div className="p-4 rounded border border-amber-500/15 bg-amber-500/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-amber-600 dark:text-amber-500 uppercase">3. Careless Errors (Quick & Incorrect)</span>
                    <span className="text-xs font-extrabold text-amber-600 dark:text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">{pacers.quickIncorrect} Questions</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Incorrect questions solved in **less than 45 seconds**. Indicative of silly calculation mistakes, misreading keywords, or poor elimination.
                  </p>
                </div>

                {/* Q4: Slow & Wrong */}
                <div className="p-4 rounded border border-red-500/15 bg-red-500/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-error uppercase">4. Time Drains (Slow & Incorrect)</span>
                    <span className="text-xs font-extrabold text-error bg-red-500/10 px-2 py-0.5 rounded">{pacers.slowIncorrect} Questions</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Incorrect questions solved in **90 seconds or more**. High cognitive overhead that cost you precious exam time and still resulted in negative marking.
                  </p>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* --- TAB 4: SOLUTIONS & ERROR TAGGING --- */}
        {activeReportTab === 'questions' && (
          <div className="space-y-6">
            
            {/* Error tag distribution dashboard */}
            {totalTaggedErrors > 0 && (
              <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4 no-print">
                <div>
                  <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Error Analysis Distribution</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Summary of mistake tags associated with your incorrect attempts</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    { key: 'conceptual', label: 'Conceptual', color: 'bg-red-500', text: 'text-error' },
                    { key: 'calculation', label: 'Silly Mistake', color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-500' },
                    { key: 'time', label: 'Time Pressure', color: 'bg-indigo-500', text: 'text-primary' },
                    { key: 'reading', label: 'Misread Question', color: 'bg-blue-500', text: 'text-blue-500' },
                    { key: 'guess', label: 'Guessed Wrong', color: 'bg-slate-500', text: 'text-slate-500' }
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

            {/* Questions Filter Bar */}
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
                        : 'border-slate-200 dark:border-slate-800 bg-card-light dark:bg-card-dark text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {testQuestions
                .map((q, idx) => {
                  const selected = answers[q.id]
                  const isCorrect = selected === q.answer
                  const isUnanswered = selected === undefined

                  return { q, idx, selected, isCorrect, isUnanswered }
                })
                .filter(item => {
                  if (questionFilter === 'correct') return item.isCorrect
                  if (questionFilter === 'incorrect') return !item.isCorrect && !item.isUnanswered
                  if (questionFilter === 'unanswered') return item.isUnanswered
                  return true
                })
                .map(({ q, idx, selected, isCorrect, isUnanswered }) => {
                  const timeSecs = (reportData.timeSpentMap?.[q.id]) || 0
                  const currentTag = reportData.errorTags?.[q.id] || ""

                  return (
                    <div
                      key={q.id}
                      className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4"
                    >
                      {/* Card Header Row */}
                      <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100 dark:border-slate-800/40">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-500">Question {idx + 1}</span>
                          <span className="font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">{q.subject}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Time spent: {formatTime(timeSecs)}</span>
                        </div>
                        
                        <span className={`font-bold flex items-center gap-1 px-2 py-0.5 rounded ${
                          isCorrect
                            ? 'bg-emerald-500/10 text-success'
                            : isUnanswered
                            ? 'bg-slate-500/10 text-slate-500'
                            : 'bg-red-500/10 text-error'
                        }`}>
                          {isCorrect ? 'Correct' : isUnanswered ? 'Unattempted' : 'Incorrect'}
                        </span>
                      </div>

                      {/* Question Text */}
                      <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap leading-relaxed">
                        {q.question}
                      </p>

                      {/* Option chosen vs Key */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                        <div className={`p-3 rounded border ${
                          isCorrect 
                            ? 'bg-emerald-500/5 border-emerald-500/15 text-success' 
                            : isUnanswered 
                            ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500' 
                            : 'bg-red-500/5 border-red-500/15 text-error'
                        }`}>
                          <span className="text-slate-400 block font-bold uppercase mb-0.5 text-[9px] tracking-wider">Your Response:</span>
                          <span>
                            {isUnanswered ? 'Skipped Question' : `Option ${String.fromCharCode(65 + selected)}: ${q.options[selected]}`}
                          </span>
                        </div>
                        
                        <div className="p-3 rounded bg-emerald-500/5 border border-emerald-500/15 text-success">
                          <span className="text-slate-400 block font-bold uppercase mb-0.5 text-[9px] tracking-wider">Correct Answer Key:</span>
                          <span>
                            Option {String.fromCharCode(65 + q.answer)}: {q.options[q.answer]}
                          </span>
                        </div>
                      </div>

                      {/* Explanatory notes */}
                      <div className="p-4 rounded bg-indigo-500/5 border border-indigo-500/10 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        <span className="block font-bold text-primary mb-1 uppercase tracking-wider text-[9px]">Detailed Explanation</span>
                        {q.explanation}
                      </div>

                      {/* Error Tagging Selector (no-print) - Only show for incorrect answers */}
                      {!isCorrect && !isUnanswered && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/40 space-y-2 no-print">
                          <span className="block font-bold text-[10px] text-slate-400 uppercase tracking-wider">Categorize Your Mistake Reason:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { key: 'conceptual', label: 'Conceptual Misunderstanding', color: 'hover:bg-red-500/10 hover:border-red-500/20 active:bg-red-500/25', activeColor: 'bg-red-500/20 border-red-500 text-error' },
                              { key: 'calculation', label: 'Silly / Calc Mistake', color: 'hover:bg-amber-500/10 hover:border-amber-500/20 active:bg-amber-500/25', activeColor: 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-500' },
                              { key: 'time', label: 'Time Pressure Error', color: 'hover:bg-indigo-500/10 hover:border-indigo-500/20 active:bg-indigo-500/25', activeColor: 'bg-indigo-500/20 border-indigo-500 text-primary' },
                              { key: 'reading', label: 'Misread Statement', color: 'hover:bg-blue-500/10 hover:border-blue-500/20 active:bg-blue-500/25', activeColor: 'bg-blue-500/20 border-blue-500 text-blue-500' },
                              { key: 'guess', label: 'Guessed Wrong Option', color: 'hover:bg-slate-500/10 hover:border-slate-500/20 active:bg-slate-500/25', activeColor: 'bg-slate-500/20 border-slate-500 text-slate-500' }
                            ].map(tag => {
                              const isSelected = currentTag === tag.key
                              return (
                                <button
                                  key={tag.key}
                                  onClick={() => handleTagError(q.id, tag.key)}
                                  className={`px-3 py-1.5 rounded-full border text-[10px] font-semibold transition-all ${
                                    isSelected
                                      ? tag.activeColor
                                      : `border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/20 dark:bg-slate-900/10 ${tag.color}`
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

        {/* Action Button Footer (no-print) */}
        <div className="flex justify-center gap-4 pt-4 no-print">
          <button
            onClick={() => setView('list')}
            className="px-6 py-2.5 font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-btn hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95"
          >
            Back to Mock List
          </button>
          <button
            onClick={() => startTest(activeTest)}
            className="px-6 py-2.5 font-bold text-xs bg-primary text-white rounded-btn hover:bg-primary-hover shadow-md flex items-center gap-1.5 transition-all active:scale-95"
          >
            <RefreshCw size={12} />
            <span>Retake Mock Exam</span>
          </button>
        </div>

      </div>
    )
  }
}
