import React, { useState, useEffect, useRef } from 'react'
import { BookOpen, Clock, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Flag, HelpCircle, Send, Award, RefreshCw } from 'lucide-react'
import { dummyMockTests } from '../utils/dummyData'
import { useAppStore } from '../store/useAppStore'
import confetti from 'canvas-confetti'

export default function MockTestsPage() {
  const [view, setView] = useState('list') // 'list' | 'testing' | 'report'
  const [activeTest, setActiveTest] = useState(null)
  const { questions } = useAppStore()
  
  // Testing State variables
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({}) // { questionId: selectedOptionIndex }
  const [flags, setFlags] = useState({}) // { questionId: boolean }
  const [visited, setVisited] = useState({}) // { questionId: boolean }
  const [timeLeft, setTimeLeft] = useState(0) // seconds
  const timerRef = useRef(null)

  // Report State variables
  const [reportData, setReportData] = useState(null)

  // Initialize questions inside a test
  const testQuestions = activeTest
    ? questions.filter((q) => activeTest.questions.includes(q.id))
    : []

  const activeQuestion = testQuestions[currentQuestionIndex]

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
    
    // Set all questions to not visited, except first
    const initialVisited = { [test.questions[0]]: true }
    setVisited(initialVisited)
    
    setCurrentQuestionIndex(0)
    setTimeLeft(test.durationMinutes * 60)
    setView('testing')
  }

  const handleSelectOption = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
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

  const handleSubmitTest = () => {
    if (timerRef.current) clearInterval(timerRef.current)

    // Calculate score
    let correct = 0
    let incorrect = 0
    let unanswered = 0

    testQuestions.forEach((q) => {
      const selected = answers[q.id]
      if (selected === undefined || selected === null) {
        unanswered++
      } else if (selected === q.answer) {
        correct++
      } else {
        incorrect++
      }
    })

    const score = correct * 4 - incorrect * 1 // Standard markings: +4, -1
    const maxScore = testQuestions.length * 4
    const percentage = ((correct / testQuestions.length) * 100).toFixed(1)

    setReportData({
      correct,
      incorrect,
      unanswered,
      score,
      maxScore,
      percentage
    })

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

          <div className="flex items-center gap-4">
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
              <div className="grid grid-cols-5 gap-2 max-h-40 md:max-h-none overflow-y-auto pr-1">
                {testQuestions.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIndex
                  const isFlagged = flags[q.id]
                  const hasAnswered = answers[q.id] !== undefined
                  const hasVisited = visited[q.id]

                  let btnClass = 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  if (hasAnswered) {
                    btnClass = 'bg-emerald-500 text-white border-emerald-600'
                  } else if (isFlagged) {
                    btnClass = 'bg-amber-500 text-white border-amber-600'
                  } else if (hasVisited) {
                    btnClass = 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }

                  if (isCurrent) {
                    btnClass += ' ring-2 ring-primary ring-offset-2 dark:ring-offset-card-dark font-bold'
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
  if (view === 'report') {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark min-h-screen">
        
        {/* Header Block */}
        <div className="text-center space-y-2 max-w-xl mx-auto py-6">
          <div className="h-16 w-16 bg-indigo-500/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Award size={36} />
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">Test Performance Summary</h1>
          <p className="text-sm text-slate-500">
            Congratulations on finishing the mock test! Review your performance metrics below.
          </p>
        </div>

        {/* Score & Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Score Circle */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex flex-col items-center justify-center text-center space-y-3">
            <span className="text-xs text-slate-400 font-bold uppercase">Your Score</span>
            <div className="relative flex items-center justify-center">
              {/* Outer ring */}
              <div className="h-28 w-28 rounded-full border-[6px] border-primary/20 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-primary">{reportData.score}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">/ {reportData.maxScore}</span>
              </div>
            </div>
            <span className="text-xs font-bold text-primary bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded">
              Accuracy: {reportData.percentage}%
            </span>
          </div>

          {/* Card 2: Correct & Incorrect Counts */}
          <div className="md:col-span-2 p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex flex-col justify-between">
            <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark mb-4">Response Breakdown</h3>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-btn">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Correct</span>
                <span className="text-2xl font-extrabold text-success">{reportData.correct}</span>
              </div>
              <div className="space-y-1 bg-red-500/5 border border-red-500/10 p-3 rounded-btn">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Incorrect</span>
                <span className="text-2xl font-extrabold text-error">{reportData.incorrect}</span>
              </div>
              <div className="space-y-1 bg-slate-500/5 border border-slate-500/10 p-3 rounded-btn">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Unattempted</span>
                <span className="text-2xl font-extrabold text-slate-500">{reportData.unanswered}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-4 flex gap-4 font-semibold border-t border-slate-100 dark:border-slate-800/40 mt-4">
              <span>* Marking Schema: Correct (+4) | Incorrect (-1) | Blank (0)</span>
            </div>
          </div>
        </div>

        {/* Question Solutions List */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-text-primary-light dark:text-text-primary-dark">Answer Explanations</h3>
          
          <div className="space-y-4">
            {testQuestions.map((q, idx) => {
              const selected = answers[q.id]
              const isCorrect = selected === q.answer
              const isUnanswered = selected === undefined

              return (
                <div
                  key={q.id}
                  className="p-5 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-500">Question {idx + 1}</span>
                    <span className={`font-semibold flex items-center gap-1 px-2 py-0.5 rounded ${
                      isCorrect
                        ? 'bg-emerald-500/10 text-success'
                        : isUnanswered
                        ? 'bg-slate-500/10 text-slate-500'
                        : 'bg-red-500/10 text-error'
                    }`}>
                      {isCorrect ? 'Correct' : isUnanswered ? 'Unattempted' : 'Incorrect'}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap leading-relaxed">{q.question}</p>

                  {/* Answers chosen vs key */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-medium pt-2">
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-400 block font-bold uppercase mb-0.5">Your Option:</span>
                      <span className={isCorrect ? 'text-success' : 'text-error'}>
                        {isUnanswered ? 'None' : `Option ${String.fromCharCode(65 + selected)}: ${q.options[selected]}`}
                      </span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60">
                      <span className="text-slate-400 block font-bold uppercase mb-0.5">Correct Key:</span>
                      <span className="text-success font-semibold">
                        Option {String.fromCharCode(65 + q.answer)}: {q.options[q.answer]}
                      </span>
                    </div>
                  </div>

                  {/* Explanation statement */}
                  <div className="p-4 rounded bg-indigo-500/5 border border-indigo-500/10 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    <span className="block font-bold text-primary mb-1 uppercase tracking-wider text-[9px]">Detailed Explanation</span>
                    {q.explanation}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action Button Footer */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setView('list')}
            className="px-6 py-2.5 font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-btn hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Back to Mock list
          </button>
          <button
            onClick={() => startTest(activeTest)}
            className="px-6 py-2.5 font-bold text-xs bg-primary text-white rounded-btn hover:bg-primary-hover shadow-md flex items-center gap-1.5 transition-all active:scale-95"
          >
            <RefreshCw size={12} />
            <span>Retake Exam</span>
          </button>
        </div>

      </div>
    )
  }
}
