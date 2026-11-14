import React, { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Trophy, ArrowUp, ArrowDown, BarChart2, Target, Clock, Globe, Users, Zap, CheckCircle2, XCircle, MinusCircle, AlertTriangle, ArrowUpRight, Compass, BookOpen, Layers, Cpu, Database, Brain, FileText, Info, X, Calendar
} from 'lucide-react'

import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import { LoginToCompare } from '../components/GlobalComparison'
import { fetchPeerAnalytics, fetchMockComparison, isSignedIn } from '../utils/engagementApi'
import { readHistory, buildPersonal, buildPyqCoverage, buildHeatmap, buildHistoryRows } from '../utils/analyticsData'
import originalQuestions from '../../shared/originalQuestions.json'

// Analytics for students: their own tests and practice (Personal), and how they
// compare with everyone else on ExamPrep (Global). Every number is real; sections
// without enough data say so instead of showing placeholders.

const SUBJECT_ICONS = {
  'Algorithms': Layers, 'Programming & Data Structures': Layers, 'Operating Systems': Cpu,
  'Computer Organization & Architecture': Cpu, 'Databases': Database, 'Theory of Computation': Compass,
  'Compiler Design': FileText, 'Engineering Mathematics': BarChart2, 'Discrete Mathematics': BarChart2,
  'General Aptitude': Brain, 'Computer Networks': Globe, 'Digital Logic': Zap
}

function EmptyCard({ icon: Icon = Info, title, text, action }) {
  return (
    <div className="p-8 rounded-3xl border border-dashed border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-center space-y-2">
      <div className="mx-auto h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Icon size={20} /></div>
      <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md mx-auto">{text}</p>
      {action}
    </div>
  )
}

const EmptyNote = ({ children }) => (
  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">{children}</p>
)

export default function AnalyticsPage() {
  // Primary space: 'mock' for Mock Tests, 'pyq' for PYQ Mocks
  const [activeSpace, setActiveSpace] = useState('mock')

  // Bifurcation: 'personal' for Personal Analytics, 'global' for Peer Comparison
  const [activeBifurcation, setActiveBifurcation] = useState('personal')

  // History table filters
  const [historyFilter, setHistoryFilter] = useState('all') // 'all' | 'Mock' | 'PYQ'
  const [sortField, setSortField] = useState('date') // 'date' | 'score' | 'accuracy'
  const [sortAsc, setSortAsc] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)

  // Review modal state
  const [selectedReviewTest, setSelectedReviewTest] = useState(null)

  // Global comparison interactive states
  const [leaderboardView, setLeaderboardView] = useState('top10') // 'top10' | 'around'
  const [crowdQuestionTab, setCrowdQuestionTab] = useState('easyMissed') // 'easyMissed' | 'beatCrowd'

  // Floating tooltip state
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, title: '', subtitle: '', hoveredCellKey: null })

  const showTooltip = (e, title, subtitle, hoveredCellKey = null) => {
    const cx = e.clientX
    const cy = e.clientY
    let x = cx + 14
    let y = cy - 64
    if (x + 220 > window.innerWidth - 8) x = cx - 220
    if (x < 8) x = 8
    if (y < 8) y = cy + 18

    setTooltip({
      visible: true,
      x,
      y,
      title,
      subtitle,
      hoveredCellKey
    })
  }

  const moveTooltip = (e) => {
    const cx = e.clientX
    const cy = e.clientY
    let x = cx + 14
    let y = cy - 64
    if (x + 220 > window.innerWidth - 8) x = cx - 220
    if (x < 8) x = 8
    if (y < 8) y = cy + 18
    setTooltip(prev => ({ ...prev, x, y }))
  }

  const hideTooltip = () => {
    setTooltip({ visible: false, x: 0, y: 0, title: '', subtitle: '', hoveredCellKey: null })
  }

  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const { questions, practice } = useAppStore()
  const questionsById = useMemo(() => new Map([...(questions || []), ...originalQuestions].map(q => [q.id, q])), [questions])

  // Finished tests in this browser (the account's history when signed in)
  const mockHistory = useMemo(() => readHistory('mock'), [])
  const pyqHistory = useMemo(() => readHistory('pyq'), [])
  const spaceHistory = activeSpace === 'mock' ? mockHistory : pyqHistory
  const personal = useMemo(() => buildPersonal(spaceHistory, questionsById), [spaceHistory, questionsById])
  const coverage = useMemo(() => buildPyqCoverage(questions, pyqHistory), [questions, pyqHistory])
  const historyRows = useMemo(() => buildHistoryRows(mockHistory, pyqHistory), [mockHistory, pyqHistory])
  const coverageDone = coverage.filter(p => p.done).length
  const coveragePct = coverage.length ? Math.round((coverageDone / coverage.length) * 100) : 0
  const nextPaper = [...coverage].sort((a, b) => b.year - a.year || a.set - b.set).find(p => !p.done)

  // How this student compares with everyone (needs an account)
  const [peerState, setPeerState] = useState({ status: 'idle' })
  useEffect(() => {
    if (!isAuthenticated || !isSignedIn()) { setPeerState({ status: 'guest' }); return }
    let cancelled = false
    setPeerState({ status: 'loading' })
    fetchPeerAnalytics(activeSpace)
      .then(data => { if (!cancelled) setPeerState({ status: 'ready', data }) })
      .catch(err => { if (!cancelled) setPeerState({ status: 'error', message: err.message }) })
    return () => { cancelled = true }
  }, [activeSpace, isAuthenticated])
  const peers = peerState.status === 'ready' ? peerState.data : null
  const global = peers
  const ranked = Boolean(peers?.leaderboard?.user)
  const weeklyMax = useMemo(() => {
    const top = Math.max(10, ...((peers?.weeklyEffort || []).flatMap(d => [d.you, d.median, d.top10])))
    const step = Math.pow(10, Math.floor(Math.log10(top)))
    return Math.ceil(top / step) * step
  }, [peers])
  const effortGap = useMemo(() => {
    const weeks = (peers?.weeklyEffort || []).filter(d => d.activeLearners > 0)
    const you = weeks.reduce((a, d) => a + d.you, 0)
    const med = weeks.reduce((a, d) => a + d.median, 0)
    return med > 0 ? Math.round(((you - med) / med) * 100) : null
  }, [peers])
  const bellMax = Math.max(1, ...((peers?.bellCurveBuckets || []).map(b => b.percentage)))

  // Rank on the test opened in the review dialog
  const [reviewRank, setReviewRank] = useState(null)
  useEffect(() => {
    setReviewRank(null)
    if (!selectedReviewTest?.testId || !isSignedIn()) return
    let cancelled = false
    fetchMockComparison(selectedReviewTest.testId)
      .then(c => { if (!cancelled && c) setReviewRank(c) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [selectedReviewTest])

  // Filtered & sorted history records
  const filteredHistory = useMemo(() => {
    let list = historyRows.filter(h => historyFilter === 'all' || h.type === historyFilter)
    list.sort((a, b) => {
      const field = sortField === 'date' ? 'timestamp' : sortField
      let valA = a[field]
      let valB = b[field]
      if (typeof valA === 'string') return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
      return sortAsc ? valA - valB : valB - valA
    })
    return showAllHistory ? list : list.slice(0, 6)
  }, [historyRows, historyFilter, sortField, sortAsc, showAllHistory])
  const historyTotal = historyRows.filter(h => historyFilter === 'all' || h.type === historyFilter).length

  // Questions answered per day over the last 26 weeks
  const heatmapData = useMemo(() => buildHeatmap(practice?.days || {}), [practice])

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark min-h-screen">
      
      {/* Page Header (No prototype warning banner & no Rahul greeting banner, per instructions) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <BarChart2 className="text-primary" size={28} />
            <span>Exam Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Your own performance in mock tests and PYQ papers, and how you compare with everyone on ExamPrep.
          </p>
        </div>

        {/* BIFURCATION SWITCHER (Personal vs Global) */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl shrink-0 self-start md:self-auto shadow-xs border border-border-light dark:border-border-dark">
          <button
            onClick={() => setActiveBifurcation('personal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeBifurcation === 'personal'
                ? 'bg-card-light dark:bg-card-dark text-primary shadow-sm font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Target size={15} className={activeBifurcation === 'personal' ? 'text-primary' : 'text-slate-400'} />
            <span>Personal Analytics</span>
          </button>

          <button
            onClick={() => setActiveBifurcation('global')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeBifurcation === 'global'
                ? 'bg-card-light dark:bg-card-dark text-primary shadow-sm font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Globe size={15} className={activeBifurcation === 'global' ? 'text-primary' : 'text-slate-400'} />
            <span>Global Peer Comparison</span>
          </button>
        </div>
      </div>

      {/* SPACE SELECTOR (Mock Tests vs PYQ Tests) */}
      <div className="flex items-center gap-2 border-b border-border-light dark:border-border-dark pb-2">
        <button
          onClick={() => setActiveSpace('mock')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all flex items-center gap-2 border cursor-pointer ${
            activeSpace === 'mock'
              ? 'bg-primary text-white border-primary shadow-md shadow-indigo-500/10'
              : 'bg-card-light dark:bg-card-dark text-slate-600 dark:text-slate-400 border-border-light dark:border-border-dark hover:border-primary/40'
          }`}
        >
          <BookOpen size={15} />
          <span>Mock Tests Analytics</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeSpace === 'mock' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            {mockHistory.length} {mockHistory.length === 1 ? 'Test' : 'Tests'}
          </span>
        </button>

        <button
          onClick={() => setActiveSpace('pyq')}
          className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide uppercase transition-all flex items-center gap-2 border cursor-pointer ${
            activeSpace === 'pyq'
              ? 'bg-primary text-white border-primary shadow-md shadow-indigo-500/10'
              : 'bg-card-light dark:bg-card-dark text-slate-600 dark:text-slate-400 border-border-light dark:border-border-dark hover:border-primary/40'
          }`}
        >
          <FileText size={15} />
          <span>PYQ Mock Tests Analytics</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeSpace === 'pyq' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            {pyqHistory.length} {pyqHistory.length === 1 ? 'Paper' : 'Papers'}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* BIFURCATION 1: PERSONAL ANALYTICS (CURRENT BOXES)         */}
      {/* ========================================================= */}
      {activeBifurcation === 'personal' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {!personal ? (
            <EmptyCard
              icon={activeSpace === 'mock' ? BookOpen : FileText}
              title={activeSpace === 'mock' ? 'No mock tests yet' : 'No PYQ tests yet'}
              text={activeSpace === 'mock'
                ? 'Finish a mock test to see your scores, subject breakdown, pacing and weakest topics here.'
                : 'Finish a PYQ paper or a custom PYQ test to see your scores, subject breakdown, pacing and weakest topics here.'}
              action={<Link to={activeSpace === 'mock' ? '/mock-tests' : '/pyq-mock'} className="inline-block mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover">{activeSpace === 'mock' ? 'Take a mock test' : 'Take a PYQ test'}</Link>}
            />
          ) : (<>
          {/* Top Score & Projection Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Average Score</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{personal.overview.averageScore}</span>
                <span className="text-xs text-slate-400 font-bold">/ {personal.overview.maxMarks}</span>
              </div>
              <p className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1 mt-1">
                <ArrowUpRight size={13} />
                <span>Peak: {personal.overview.bestScore} Marks</span>
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Overall Accuracy</span>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {personal.overview.accuracy}%
              </div>
              <p className="text-[11px] font-medium text-slate-400">
                Attempt Rate: {personal.overview.attemptRate}% ({personal.overview.totalQuestionsAttempted} Qs)
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Negative Marks Penalty</span>
              <div className="text-3xl font-black text-rose-500">
                -{personal.overview.negativeMarksLost}
              </div>
              <p className="text-[11px] font-medium text-rose-400">
                Marks lost to wrong MCQ attempts
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20 shadow-soft space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">Standing on ExamPrep</span>
              <div className="text-2xl font-black text-primary truncate">
                {ranked ? `Rank #${peers.cohort.userRank}` : peerState.status === 'loading' ? '…' : '—'}
              </div>
              <p className="text-[11px] font-bold text-indigo-400">
                {ranked
                  ? `${peers.cohort.percentile}th percentile of ${peers.cohort.totalParticipants} students`
                  : peerState.status === 'guest' ? 'Sign in to compare with others' : `${personal.overview.totalTimeSpent} in ${personal.overview.testsTaken} test${personal.overview.testsTaken === 1 ? '' : 's'}`}
              </p>
            </div>

          </div>

          {/* Row 2: Score Progression SVG Chart & Question Type Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                    Score Progression Over Tests
                  </h3>
                    <p className="text-xs text-slate-500">Score out of 100 in your last {personal.progression.length} test{personal.progression.length === 1 ? '' : 's'}.</p>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                  {personal.overview.testsTaken} Tests Analyzed
                </span>
              </div>

              <div className="py-2">
                <svg viewBox="0 0 650 180" className="w-full h-44 overflow-visible">
                  {[0, 25, 50, 75, 100].map((v) => {
                    const y = 160 - (v / 100) * 140
                    return (
                      <g key={v}>
                        <line x1="30" x2="630" y1={y} y2={y} className="stroke-slate-200 dark:stroke-slate-800" strokeDasharray="3 3" />
                        <text x="5" y={y + 3} className="fill-slate-400 text-[10px] font-mono">{v}</text>
                      </g>
                    )
                  })}

                  {(() => {
                    const pts = personal.progression.map((p, i) => {
                      const x = personal.progression.length > 1 ? 50 + (i * (560 / (personal.progression.length - 1))) : 330
                      const y = 160 - (p.score / 100) * 140
                      return { x, y, score: p.score, label: p.test }
                    })
                    const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                    
                    return (
                      <>
                        <path d={pathD} fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        {pts.map((p, i) => (
                          <g key={i}>
                            <circle cx={p.x} cy={p.y} r="5" className="fill-primary stroke-white dark:stroke-slate-900 stroke-2" />
                            <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[11px] font-black">
                              {p.score}
                            </text>
                            <text x={p.x} y="175" textAnchor="middle" className="fill-slate-400 text-[9px] font-semibold">
                              {p.label}
                            </text>
                          </g>
                        ))}
                      </>
                    )
                  })()}
                </svg>
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  Question Format Accuracy
                </h3>
                <p className="text-xs text-slate-500">Performance across MCQ, MSQ & NAT formats.</p>
              </div>

              <div className="space-y-3.5">
                {personal.questionTypes.map((q) => (
                  <div key={q.type} className="space-y-1.5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-border-light/60 dark:border-border-dark/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{q.type}</span>
                      <span className="font-extrabold text-primary">{q.accuracy}% Correct</span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${q.accuracy >= 80 ? 'bg-emerald-500' : 'bg-primary'}`}
                        style={{ width: `${q.accuracy}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>{q.correct} Correct • {q.incorrect} Wrong</span>
                      <span>{q.negativePenalty < 0 ? `${q.negativePenalty} Penalty` : 'No Negative'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Row 3: Subject Mastery Efficiency & Error Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="lg:col-span-2 p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                    Subject Scoring Efficiency
                  </h3>
                  <p className="text-xs text-slate-500">Detailed breakdown of marks conversion per core subject.</p>
                </div>
                <span className="text-xs text-slate-400 font-semibold">{personal.subjectMastery.length} Subjects</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {personal.subjectMastery.map((sub) => {
                  const SubIcon = SUBJECT_ICONS[sub.name] || BookOpen
                  return (
                    <div key={sub.name} className="p-3.5 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <SubIcon size={14} />
                          </div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{sub.name}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          sub.status === 'Strength' ? 'bg-emerald-500/10 text-emerald-500' :
                          sub.status === 'Solid' ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {sub.status}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${sub.scorePct >= 80 ? 'bg-emerald-500' : sub.scorePct >= 65 ? 'bg-primary' : 'bg-rose-500'}`}
                            style={{ width: `${sub.scorePct}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold">
                          <span>Score: {sub.scorePct}%</span>
                          <span>Accuracy: {sub.accuracy}% ({sub.correct}/{sub.attempted})</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  {personal.errorsTagged ? 'Why You Lose Marks' : 'Where Marks Are Lost'}
                </h3>
                <p className="text-xs text-slate-500">{personal.errorsTagged ? 'From the mistakes you tagged in test reviews.' : 'Share of the marks you missed, by cause.'}</p>
              </div>

              <div className="space-y-4">
                {personal.errorAnalysis.length === 0 && <EmptyNote>No marks lost yet. Nice.</EmptyNote>}
                {personal.errorAnalysis.map((err) => (
                  <div key={err.reason} className="p-3.5 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-800 dark:text-slate-200">{err.reason}</span>
                      <span className="text-rose-500">{err.percentage}%{err.marks !== undefined ? ` · ${err.marks} M` : ` · ${err.count}`}</span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-rose-500" style={{ width: `${err.percentage}%` }} />
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      💡 <span className="font-semibold text-slate-700 dark:text-slate-300">Tip:</span> {err.tip}
                    </p>
                  </div>
                ))}
                {!personal.errorsTagged && personal.errorAnalysis.length > 0 && (
                  <p className="text-[11px] text-slate-400">Tag your mistakes (conceptual, silly slip, time pressure...) in a test's review to see why they happen.</p>
                )}
              </div>
            </div>

          </div>

          {/* PERSONAL PERFORMANCE ANALYTICS & DIAGNOSTICS */}
          {/* SECTION 1: SPEED AGAINST ACCURACY (SCATTER QUADRANT) */}
      <section className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Zap size={18} className="text-primary" />
              <span>Speed Against Accuracy (Quadrant Map)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Each point is a subject from your tests. The GATE pace is about <strong>2.7 minutes per question</strong> (180 min / 65 Qs).
            </p>
          </div>

          {personal.scatter.some(sub => sub.timePerQ < 2.7 && sub.accuracy < 65) && (
            <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20">
                Rushing: {personal.scatter.filter(sub => sub.timePerQ < 2.7 && sub.accuracy < 65).map(sub => sub.short).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Responsive Scatter Plot Canvas */}
        <div className="py-2 overflow-x-auto no-scrollbar">
          {personal.scatter.length === 0 ? (
            <EmptyNote>Answer at least 3 questions in a subject to place it on this map.</EmptyNote>
          ) : (() => {
            // x: minutes per question (0.5 to 5), y: accuracy (0 to 100%)
            const sx = (t) => 50 + (Math.min(5, Math.max(0.5, t)) - 0.5) / 4.5 * 630
            const sy = (acc) => 280 - (Math.min(100, Math.max(0, acc)) / 100) * 250
            const paceX = sx(2.7)
            const targetY = sy(65)
            return (
          <svg viewBox="0 0 720 320" className="w-full min-w-[560px] h-64 overflow-visible">
            <rect x="50" y={targetY} width={paceX - 50} height={280 - targetY} className="fill-rose-500/10 dark:fill-rose-950/20" />
            <text x="60" y="270" className="fill-rose-500 text-[10px] font-bold uppercase tracking-wider">Rushing Zone (Fast but Low Acc)</text>
            <rect x={paceX} y={targetY} width={680 - paceX} height={280 - targetY} className="fill-slate-500/10 dark:fill-slate-800/30" />
            <text x="670" y="270" textAnchor="end" className="fill-slate-400 text-[10px] font-bold uppercase tracking-wider">Concept Gaps (Slow & Low Acc)</text>
            <text x="670" y="45" textAnchor="end" className="fill-emerald-500 text-[10px] font-bold uppercase tracking-wider">Mastery & Optimal Zone</text>
            {[20, 40, 60, 80, 100].map((acc) => (
              <g key={acc}>
                <line x1="50" x2="680" y1={sy(acc)} y2={sy(acc)} className="stroke-slate-200 dark:stroke-slate-800" strokeDasharray="3 3" />
                <text x="40" y={sy(acc) + 3} textAnchor="end" className="fill-slate-400 text-[10px] font-mono">{acc}%</text>
              </g>
            ))}
            <line x1="50" x2="680" y1={targetY} y2={targetY} className="stroke-rose-500/40" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="55" y={targetY - 5} className="fill-rose-500 text-[9px] font-bold">Target: 65% accuracy</text>
            <line x1={paceX} x2={paceX} y1="20" y2="280" className="stroke-primary/50" strokeWidth="2" strokeDasharray="5 4" />
            <text x={paceX + 5} y="32" className="fill-primary text-[10px] font-bold">GATE pace: 2.7 min/Q</text>
            {[1, 2, 3, 4, 5].map((time) => (
              <g key={time}>
                <line x1={sx(time)} x2={sx(time)} y1="280" y2="285" className="stroke-slate-300 dark:stroke-slate-700" />
                <text x={sx(time)} y="298" textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">{time.toFixed(1)}m</text>
              </g>
            ))}
            <text x="365" y="315" textAnchor="middle" className="fill-slate-500 text-[11px] font-bold">Average Time per Question (Minutes)</text>
            {personal.scatter.map((sub) => {
              const cx = sx(sub.timePerQ)
              const cy = sy(sub.accuracy)
              const isRushing = sub.timePerQ < 2.7 && sub.accuracy < 65
              return (
                <g
                  key={sub.name}
                  className="cursor-pointer group"
                  onMouseEnter={(e) => showTooltip(e, sub.name, `${sub.accuracy}% Accuracy • ${sub.timePerQ} min/Q • ${sub.questionsSeen} Questions Seen`)}
                  onMouseMove={moveTooltip}
                  onMouseLeave={hideTooltip}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r="7"
                    className={`transition-all duration-200 group-hover:scale-125 stroke-white dark:stroke-slate-900 stroke-2 ${
                      isRushing ? 'fill-rose-500 animate-pulse' : sub.accuracy >= 75 ? 'fill-emerald-500' : 'fill-primary'
                    }`}
                  />
                  <text x={cx + 10} y={cy + 4} className="fill-slate-800 dark:fill-slate-200 text-[11px] font-bold pointer-events-none group-hover:fill-primary">
                    {sub.short}
                  </text>
                </g>
              )
            })}
          </svg>
            )
          })()}
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-border-light/60 dark:border-border-dark/60 flex items-center gap-3 text-xs">
          <span className="p-1 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
            <AlertTriangle size={15} />
          </span>
          <p className="text-slate-600 dark:text-slate-300">
            <strong>Key Pacing Insight:</strong> {personal.pacingInsight ? personal.pacingInsight.text : 'Take a few more tests to get a pacing insight.'}
          </p>
        </div>
      </section>

      {/* SECTION 2: WEAK TOPICS PRIORITY & ACTION LIST */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Practice These Next Card */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border-light/60 dark:border-border-dark/60">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <Target size={18} className="text-rose-500" />
                <span>Practice These Next (Weakest Topics)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Topics with the lowest accuracy across your {activeSpace === 'mock' ? 'mock tests' : 'PYQ tests'} (2 or more questions each).
              </p>
            </div>
            <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg">
              Immediate Impact
            </span>
          </div>

          <div className="space-y-3">
            {personal.weakTopics.length === 0 && <EmptyNote>No weak topics so far: every topic with 2 or more questions is at 70% accuracy or better.</EmptyNote>}
            {personal.weakTopics.map((t) => (
              <div 
                key={t.topic}
                className="p-3.5 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-850 dark:text-slate-100 block truncate">
                    {t.topic}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {t.subject} • {t.attempts} attempts
                  </span>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                  <div className="w-28 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">Accuracy</span>
                      <span className="text-rose-500">{t.accuracy}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-rose-500" style={{ width: `${t.accuracy}%` }} />
                    </div>
                  </div>

                  <Link
                    to="/pyq"
                    className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95"
                  >
                    Practice
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Strongest Topics Ribbon */}
          <div className="pt-3 border-t border-border-light/60 dark:border-border-dark/60 flex items-center gap-2 flex-wrap text-xs">
            <span className="font-extrabold text-slate-700 dark:text-slate-300">Strongest Topics:</span>
            {personal.strongTopics.length === 0 && <span className="text-slate-400">None yet (75%+ accuracy over 2 or more questions)</span>}
            {personal.strongTopics.map(t => (
              <span key={t.topic} className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                {t.topic} ({t.accuracy}%)
              </span>
            ))}
          </div>
        </div>

        {/* Actionable Diagnostic Performance Insights */}
        <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
          <div className="pb-2 border-b border-border-light/60 dark:border-border-dark/60">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Compass size={18} className="text-primary" />
              <span>Diagnostic Insights</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">What your test results point to.</p>
          </div>

          <div className="space-y-3.5">
            {personal.insights.length === 0 && <EmptyNote>No warnings from your results so far. Insights appear as you take more tests.</EmptyNote>}
            {personal.insights.map((ins) => (
              <div 
                key={ins.title}
                className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                    ins.color === 'rose' ? 'bg-rose-500/10 text-rose-500' :
                    ins.color === 'amber' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {ins.tag}
                  </span>
                  <ArrowUpRight size={14} className="text-slate-400" />
                </div>

                <h3 className="font-extrabold text-xs sm:text-sm text-slate-850 dark:text-slate-100">
                  {ins.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {ins.description}
                </p>
              </div>
            ))}
          </div>
        </div>

      </section>

      </>)}

      {/* SECTION 3: PYQ PAPER COVERAGE GRID & STUDY HEATMAP */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PYQ Papers Syllabus Coverage Grid */}
        <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
          <div className="pb-2 border-b border-border-light/60 dark:border-border-dark/60">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              <span>Official PYQ Paper Coverage</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {coverageDone} of {coverage.length} full GATE CS papers taken ({coveragePct}%).
            </p>
          </div>

          {/* Large Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-black">
              <span className="text-slate-700 dark:text-slate-300">Completion</span>
              <span className="text-primary">{coveragePct}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${coveragePct}%` }} />
            </div>
          </div>

          {/* Interactive Year Badges */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
            {coverage.map((y) => (
              <div
                key={y.id}
                onMouseEnter={(e) => showTooltip(
                  e,
                  y.title,
                  y.done ? `Completed on ${y.date} • Scored ${y.score} Marks` : 'Paper not attempted yet'
                )}
                onMouseMove={moveTooltip}
                onMouseLeave={hideTooltip}
                className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                  y.done
                    ? 'border-primary/40 bg-primary/10 text-primary font-extrabold shadow-2xs'
                    : 'border-dashed border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/20 text-slate-400'
                }`}
              >
                <span className="text-xs block font-mono">{y.label}</span>
                <span className="text-[9px] block font-semibold truncate mt-0.5">
                  {y.done ? `${y.score}M` : 'Pending'}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{nextPaper ? <>Next recommended: <strong>{nextPaper.title}</strong></> : 'Every paper taken.'}</span>
            <Link to="/pyq-mock" className="font-bold text-primary hover:underline">{nextPaper ? 'Start Paper →' : 'Open →'}</Link>
          </div>
        </div>

        {/* Study Activity Heatmap (Exact HTML Dashboard layout & logic) */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Study activity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Questions answered per day, last 26 weeks
            </p>
          </div>

          {/* Interactive CSS Grid Heatmap */}
          <div className="overflow-x-auto no-scrollbar py-1">
            <div
              className="min-w-[620px] grid"
              style={{
                gridTemplateColumns: '28px repeat(26, minmax(0, 1fr))',
                columnGap: '3px',
                rowGap: '3px'
              }}
            >
              {/* Day Labels on Column 1 */}
              <span
                className="font-mono text-[10.5px] text-slate-400 dark:text-slate-500 self-center leading-none pr-1 select-none"
                style={{ gridColumn: 1, gridRow: 2 }}
              >
                Mon
              </span>
              <span
                className="font-mono text-[10.5px] text-slate-400 dark:text-slate-500 self-center leading-none pr-1 select-none"
                style={{ gridColumn: 1, gridRow: 4 }}
              >
                Wed
              </span>
              <span
                className="font-mono text-[10.5px] text-slate-400 dark:text-slate-500 self-center leading-none pr-1 select-none"
                style={{ gridColumn: 1, gridRow: 6 }}
              >
                Fri
              </span>

              {/* Month Labels on Row 1 */}
              {heatmapData.monthLabels.map((m, idx) => (
                <span
                  key={idx}
                  className="font-mono text-[10.5px] text-slate-400 dark:text-slate-500 whitespace-nowrap leading-none pb-1 select-none"
                  style={{ gridColumn: m.col, gridRow: 1 }}
                >
                  {m.label}
                </span>
              ))}

              {/* Day Cells */}
              {heatmapData.cells.map((cell) => {
                const isHovered = tooltip.visible && tooltip.hoveredCellKey === cell.key
                const cellBg =
                  cell.lv === 0
                    ? 'bg-[#e6ebf2] dark:bg-slate-800'
                    : cell.lv === 1
                    ? 'bg-[#b7d3f6] dark:bg-blue-900/60'
                    : cell.lv === 2
                    ? 'bg-[#86b6ef] dark:bg-blue-700/80'
                    : cell.lv === 3
                    ? 'bg-[#3987e5] dark:bg-blue-600'
                    : 'bg-[#1c5cab] dark:bg-blue-500'

                return (
                  <span
                    key={cell.key}
                    style={{ gridColumn: cell.col, gridRow: cell.row }}
                    onMouseEnter={(e) => showTooltip(e, cell.dateStr, cell.tipText, cell.key)}
                    onMouseMove={moveTooltip}
                    onMouseLeave={hideTooltip}
                    className={`w-full aspect-square rounded-[3px] cursor-pointer transition-all duration-75 ${cellBg} ${
                      isHovered
                        ? 'outline outline-2 outline-slate-900 dark:outline-white outline-offset-1 z-10'
                        : 'hover:outline hover:outline-2 hover:outline-slate-900 dark:hover:outline-white hover:outline-offset-1'
                    }`}
                  />
                )
              })}
            </div>
          </div>

          {/* Footer matching Image 2 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-border-light/60 dark:border-border-dark/60">
            <div>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{heatmapData.days}</span> active days ·{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{heatmapData.total.toLocaleString()}</span> questions · longest streak{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{heatmapData.longest}</span> days
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono self-end sm:self-auto">
              <span>Less</span>
              <span className="w-3 h-3 rounded-[3px] bg-[#e6ebf2] dark:bg-slate-800 inline-block" />
              <span className="w-3 h-3 rounded-[3px] bg-[#b7d3f6] dark:bg-blue-900/60 inline-block" />
              <span className="w-3 h-3 rounded-[3px] bg-[#86b6ef] dark:bg-blue-700/80 inline-block" />
              <span className="w-3 h-3 rounded-[3px] bg-[#3987e5] dark:bg-blue-600 inline-block" />
              <span className="w-3 h-3 rounded-[3px] bg-[#1c5cab] dark:bg-blue-500 inline-block" />
              <span>More</span>
            </div>
          </div>
        </div>

      </section>

      {/* SECTION 4: TEST HISTORY TABLE WITH SORTING & REVIEW DIALOG */}
      <section className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              <span>Comprehensive Test History</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Every test you've finished. Click "Review" for its summary.</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start sm:self-auto">
            {['all', 'Mock', 'PYQ'].map((f) => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  historyFilter === f
                    ? 'bg-card-light dark:bg-card-dark text-primary shadow-xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {f === 'all' ? 'All Tests' : `${f} Tests`}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Test Name</th>
                <th className="py-3 px-3">Type</th>
                <th 
                  className="py-3 px-3 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    setSortField('date')
                    setSortAsc(!sortAsc)
                  }}
                >
                  Date {sortField === 'date' && (sortAsc ? '↑' : '↓')}
                </th>
                <th 
                  className="py-3 px-3 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    setSortField('score')
                    setSortAsc(!sortAsc)
                  }}
                >
                  Score {sortField === 'score' && (sortAsc ? '↑' : '↓')}
                </th>
                <th 
                  className="py-3 px-3 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    setSortField('accuracy')
                    setSortAsc(!sortAsc)
                  }}
                >
                  Accuracy {sortField === 'accuracy' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-3 px-3">Time Taken</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light/60 dark:divide-border-dark/60 font-medium">
              {filteredHistory.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-xs text-slate-400">No tests here yet.</td></tr>
              )}
              {filteredHistory.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-850 dark:text-slate-100">
                    {t.title}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      t.type === 'PYQ' ? 'bg-indigo-500/10 text-primary' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono">
                    {t.date}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono">
                        {t.score} / {t.maxScore}
                      </span>
                      <div className="w-12 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(t.score / t.maxScore) * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-extrabold text-emerald-500 font-mono">
                    {t.accuracy}%
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono">
                    {t.timeTaken}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedReviewTest(t)}
                      className="px-3 py-1 bg-slate-100 hover:bg-primary hover:text-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2 border-t border-border-light/60 dark:border-border-dark/60 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredHistory.length} of {historyTotal} recorded test{historyTotal === 1 ? '' : 's'}</span>
          <button
            onClick={() => setShowAllHistory(!showAllHistory)}
            className="font-bold text-primary hover:underline cursor-pointer"
          >
            {showAllHistory ? 'Show Fewer' : 'View All Tests'}
          </button>
        </div>
      </section>

        </div>
      )}

      {/* ========================================================= */}
      {/* BIFURCATION 2: GLOBAL PEER COMPARISON (CURRENT BOXES)      */}
      {/* ========================================================= */}
      {activeBifurcation === 'global' && peerState.status === 'guest' && <LoginToCompare />}
      {activeBifurcation === 'global' && (peerState.status === 'loading' || peerState.status === 'idle') && <EmptyNote>Comparing with other students...</EmptyNote>}
      {activeBifurcation === 'global' && peerState.status === 'error' && <EmptyNote>Could not load the comparison: {peerState.message}</EmptyNote>}
      {activeBifurcation === 'global' && peerState.status === 'ready' && !ranked && (
        <EmptyCard
          icon={Users}
          title={activeSpace === 'mock' ? 'Take a mock test to get ranked' : 'Take a full PYQ year paper to get ranked'}
          text={`Rankings use everyone's first attempt at each ${activeSpace === 'mock' ? 'mock test' : 'full year paper'}. ${peers?.cohort ? `${peers.cohort.totalParticipants} student${peers.cohort.totalParticipants === 1 ? ' has' : 's have'} taken one so far.` : 'Nobody has taken one yet.'}`}
          action={<Link to={activeSpace === 'mock' ? '/mock-tests' : '/pyq-mock'} className="inline-block mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover">{activeSpace === 'mock' ? 'Take a mock test' : 'Take a PYQ paper'}</Link>}
        />
      )}
      {activeBifurcation === 'global' && ranked && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Cohort Benchmarks Banner */}
          <div className="p-6 sm:p-8 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 block">
                  Your Standing ({global.cohort.totalParticipants.toLocaleString()} Students)
                </span>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-4xl sm:text-5xl font-black text-white">
                    {global.cohort.percentile}th
                  </span>
                  <span className="text-xl font-bold text-indigo-200">Percentile</span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Rank #{global.cohort.userRank}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-indigo-200/80 max-w-lg leading-relaxed">
                  Your average is ahead of <strong>{(global.cohort.totalParticipants - global.cohort.userRank).toLocaleString()}</strong> of {global.cohort.totalParticipants.toLocaleString()} students on ExamPrep in {activeSpace === 'mock' ? 'mock tests' : 'PYQ year papers'}.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 block">Your Average</span>
                  <span className="text-xl font-black text-white">{global.cohort.userScore}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 block">Batch Average</span>
                  <span className="text-xl font-black text-indigo-200">{global.cohort.cohortAverage}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-300 block">Top Average</span>
                  <span className="text-xl font-black text-amber-300">{global.cohort.topperScore}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Component 3: Leaderboard (Image 1) */}
          <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  <Trophy size={20} className="text-amber-500" />
                  <span>Leaderboard</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Average score across {activeSpace === 'mock' ? 'mock tests' : 'PYQ year papers'} (first attempts) · all learners
                </p>
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setLeaderboardView('top10')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    leaderboardView === 'top10'
                      ? 'bg-card-light dark:bg-card-dark text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Top 10
                </button>
                <button
                  onClick={() => setLeaderboardView('around')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    leaderboardView === 'around'
                      ? 'bg-card-light dark:bg-card-dark text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Around you
                </button>
              </div>
            </div>

            {/* Rank Status Pill Banner matching Image 1 */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-border-light dark:border-border-dark">
                You are #{global.leaderboard.userRank} of {global.leaderboard.totalLearners.toLocaleString()}
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                {global.leaderboard.behindPrev !== null && <><strong>{global.leaderboard.behindPrev}</strong> {global.leaderboard.behindPrev === 1 ? 'mark' : 'marks'} behind #{global.leaderboard.prevRank}</>}
                {global.leaderboard.behindPrev !== null && global.leaderboard.aheadNext !== null && ' · '}
                {global.leaderboard.aheadNext !== null && <><strong>{global.leaderboard.aheadNext}</strong> {global.leaderboard.aheadNext === 1 ? 'mark' : 'marks'} ahead of #{global.leaderboard.nextRank}</>}
              </span>
            </div>

            {/* Leaderboard Table View */}
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs min-w-[620px]">
                <thead>
                  <tr className="border-b border-border-light dark:border-border-dark text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Learner</th>
                    <th className="py-2.5 px-3 font-mono">Score</th>
                    <th className="py-2.5 px-3 font-mono">Accuracy</th>
                    <th className="py-2.5 px-3 font-mono">Tests Taken</th>
                    <th className="py-2.5 px-3 font-mono">Streak</th>
                    <th className="py-2.5 px-3 font-mono text-right">Rank Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light/60 dark:divide-border-dark/60">
                  {(leaderboardView === 'top10' ? global.leaderboard.top10 : global.leaderboard.aroundYou).map((row) => {
                    const isUserRow = row.isUser
                    return (
                      <tr
                        key={row.rank}
                        className={`transition-colors ${
                          isUserRow
                            ? 'bg-primary/10 dark:bg-primary/15 font-bold border-y-2 border-primary/30'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/40'
                        }`}
                      >
                        <td className="py-3 px-3">
                          {row.rank === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-500 font-black inline-flex items-center justify-center border border-amber-400/30">1</span>
                          ) : row.rank === 2 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-300/40 text-slate-600 dark:text-slate-300 font-black inline-flex items-center justify-center border border-slate-400/30">2</span>
                          ) : row.rank === 3 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-700 dark:text-amber-400 font-black inline-flex items-center justify-center border border-amber-700/30">3</span>
                          ) : (
                            <span className="font-mono font-bold text-slate-600 dark:text-slate-400 pl-1.5">{row.rank}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-7 h-7 rounded-full text-[11px] font-black inline-flex items-center justify-center ${
                              isUserRow
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                              {row.initials}
                            </span>
                            <span className={isUserRow ? 'text-primary font-black' : 'font-semibold text-slate-800 dark:text-slate-200'}>
                              {row.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {row.score.toFixed(1)}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {row.accuracy.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {row.tests}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {row.streak} days
                        </td>
                        <td className="py-3 px-3 font-mono text-right">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            row.up ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {row.change ? (row.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null}
                            <span>{row.isNew ? 'New' : row.change || '—'}</span>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Gap separator and sticky user row when in Top 10 view */}
              {leaderboardView === 'top10' && global.leaderboard.user.rank > 10 && (
                <div className="border-t border-border-light dark:border-border-dark">
                  <div className="py-2.5 text-center text-xs text-slate-400 font-mono bg-slate-50/50 dark:bg-slate-900/30">
                    {Math.max(0, global.leaderboard.user.rank - 11)} learner{global.leaderboard.user.rank - 11 === 1 ? '' : 's'} between rank 10 and you
                  </div>
                  <table className="w-full text-left text-xs min-w-[620px]">
                    <tbody>
                      <tr className="bg-primary/10 dark:bg-primary/15 font-bold border-y border-primary/30">
                        <td className="py-3 px-3 w-16">
                          <span className="font-mono font-bold text-primary pl-1.5">{global.leaderboard.user.rank}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full text-[11px] font-black inline-flex items-center justify-center bg-primary text-white shadow-xs">
                              {global.leaderboard.user.initials}
                            </span>
                            <span className="text-primary font-black">
                              {global.leaderboard.user.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-primary">
                          {global.leaderboard.user.score.toFixed(1)}
                        </td>
                        <td className="py-3 px-3 font-mono text-primary font-bold">
                          {global.leaderboard.user.accuracy.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-mono text-primary font-bold">
                          {global.leaderboard.user.tests}
                        </td>
                        <td className="py-3 px-3 font-mono text-primary font-bold">
                          {global.leaderboard.user.streak} days
                        </td>
                        <td className="py-3 px-3 font-mono text-right">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-500">
                            {global.leaderboard.user.change ? <ArrowUp size={12} /> : null}
                            <span>{global.leaderboard.user.isNew ? 'New' : global.leaderboard.user.change || '—'}</span>
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Normal Bell Curve / Score Distribution View */}
          <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-light/60 dark:border-border-dark/60">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  Score Distribution
                </h3>
                <p className="text-xs text-slate-500">{global.cohort.totalParticipants.toLocaleString()} students by average score.</p>
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                Median: {global.cohort.cohortMedian}
              </span>
            </div>

            <div className="pt-6 pb-2">
              <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-48 border-b border-slate-200 dark:border-slate-800 pb-2">
                {global.bellCurveBuckets.map((b) => (
                  <div key={b.range} className="flex flex-col items-center gap-2 h-full justify-end group">
                    {b.hasUser && (
                      <span className="text-[10px] font-black text-primary bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-primary/30 animate-bounce">
                        You ({global.cohort.userScore})
                      </span>
                    )}

                    <div 
                      className={`w-full rounded-t-xl transition-all duration-300 relative ${
                        b.hasUser 
                          ? 'bg-gradient-to-t from-primary to-indigo-400 shadow-lg shadow-indigo-500/20' 
                          : 'bg-slate-200 dark:bg-slate-800 group-hover:bg-slate-300 dark:group-hover:bg-slate-700'
                      }`}
                      style={{ height: `${Math.max(2, (b.percentage / bellMax) * 140)}px` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
                        {b.percentage}%
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">{b.range}</span>
                      <span className="text-[9px] text-slate-400 block">{b.count} student{b.count === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subject Benchmarking vs Average & Topper */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  Subjects vs Average & Top 10%
                </h3>
                <p className="text-xs text-slate-500">Your score in each subject vs every student's average vs the top 10% of students.</p>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 no-scrollbar">
                {global.subjectBenchmark.length === 0 && <EmptyNote>No subject data yet.</EmptyNote>}
                {global.subjectBenchmark.map((s) => (
                  <div key={s.name} className="p-3.5 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{s.name}</span>
                      <span className={`font-extrabold ${s.above ? 'text-emerald-500' : 'text-rose-500'}`}>{s.gap}</span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-12 text-slate-400 font-semibold">You</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${s.userScore}%` }} />
                        </div>
                        <span className="w-8 font-bold text-slate-800 dark:text-slate-200 text-right">{s.userScore}%</span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-12 text-slate-400 font-semibold">Average</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-slate-400 rounded-full" style={{ width: `${s.cohortAvg}%` }} />
                        </div>
                        <span className="w-8 font-semibold text-slate-400 text-right">{s.cohortAvg}%</span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="w-12 text-slate-400 font-semibold">Top 10%</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${s.topperAvg}%` }} />
                        </div>
                        <span className="w-8 font-bold text-amber-500 text-right">{s.topperAvg}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">
                  Your Tests vs Everyone
                </h3>
                <p className="text-xs text-slate-500">Your rank on each recent test among everyone's first attempts.</p>
              </div>

              <div className="space-y-3">
                {global.testStanding.length === 0 && <EmptyNote>No ranked tests yet.</EmptyNote>}
                {global.testStanding.map((t) => (
                  <div key={t.testId} className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-slate-850 dark:text-slate-100 block truncate">
                        {t.title}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Score {t.score} / {t.maxScore} · {t.participants} student{t.participants === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-base font-black block ${t.percentile >= 75 ? 'text-emerald-500' : t.percentile >= 40 ? 'text-blue-500' : 'text-amber-500'}`}>
                        #{t.rank}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {t.percentile}th pct
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <Info size={16} className="text-primary shrink-0" />
                <span>Ranks update as more students take each test.</span>
              </div>
            </div>

          </div>

          {/* GLOBAL COMPARISON ANALYTICS: WEEKLY EFFORT & QUESTIONS TO LEARN FROM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Component 1: Weekly Effort vs Cohort & Top 10% (Image 3) */}
            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    <BarChart2 size={18} className="text-primary" />
                    <span>Weekly effort</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Questions answered per week, last 8 weeks
                  </p>
                </div>

                {/* Legend matching Image 3 */}
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-[3px] bg-primary inline-block" />
                    <span>You</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-1 bg-slate-800 dark:bg-slate-200 rounded-full inline-block" />
                    <span>Cohort median</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 border-b-2 border-dashed border-slate-400 inline-block relative -top-0.5" />
                    <span>Top 10%</span>
                  </span>
                </div>
              </div>

              {/* SVG Chart */}
              <div className="pt-2">
                <svg viewBox="0 0 600 220" className="w-full h-56 overflow-visible select-none">
                  {/* Horizontal Gridlines & Y-Axis Ticks */}
                  {[0, weeklyMax / 3, (2 * weeklyMax) / 3, weeklyMax].map((val) => {
                    const y = 20 + (1 - val / weeklyMax) * 165
                    return (
                      <g key={val}>
                        <line
                          x1="38"
                          y1={y}
                          x2="590"
                          y2={y}
                          className="stroke-slate-100 dark:stroke-slate-800/80"
                          strokeWidth="1"
                          strokeDasharray={val === 0 ? '0' : '4,4'}
                        />
                        <text
                          x="30"
                          y={y + 4}
                          textAnchor="end"
                          className="fill-slate-400 font-mono text-[10px]"
                        >
                          {Math.round(val)}
                        </text>
                      </g>
                    )
                  })}

                  {/* Top 10% Benchmark Dashed Trendline */}
                  <polyline
                    points={global.weeklyEffort.map((d, i) => {
                      const x = 40 + i * (540 / 8) + (540 / 8) / 2
                      const y = 20 + (1 - d.top10 / weeklyMax) * 165
                      return `${x.toFixed(1)},${y.toFixed(1)}`
                    }).join(' ')}
                    fill="none"
                    className="stroke-slate-400 dark:stroke-slate-500"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />

                  {/* Top 10% Circle Nodes */}
                  {global.weeklyEffort.map((d, i) => {
                    const x = 40 + i * (540 / 8) + (540 / 8) / 2
                    const y = 20 + (1 - d.top10 / weeklyMax) * 165
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="3.5"
                        className="fill-white dark:fill-slate-900 stroke-slate-500 dark:stroke-slate-400"
                        strokeWidth="2"
                      />
                    )
                  })}

                  {/* Bars (You) & Median Bars */}
                  {global.weeklyEffort.map((d, i) => {
                    const x = 40 + i * (540 / 8) + (540 / 8) / 2
                    const barH = (d.you / weeklyMax) * 165
                    const barY = 20 + (1 - d.you / weeklyMax) * 165
                    const medY = 20 + (1 - d.median / weeklyMax) * 165

                    return (
                      <g
                        key={d.week}
                        className="cursor-pointer group"
                        onMouseEnter={(e) => showTooltip(
                          e,
                          `Week of ${d.week}`,
                          `You ${d.you} questions · Cohort median ${d.median} · top 10% ${d.top10}`
                        )}
                        onMouseMove={moveTooltip}
                        onMouseLeave={hideTooltip}
                      >
                        {/* Transparent Hover Hit Area */}
                        <rect
                          x={x - 26}
                          y="15"
                          width="52"
                          height="180"
                          fill="transparent"
                        />

                        {/* Bar (You) */}
                        <rect
                          x={x - 14}
                          y={barY}
                          width="28"
                          height={barH}
                          rx="5"
                          className="fill-primary group-hover:fill-primary-hover transition-all duration-150"
                        />

                        {/* Cohort Median Line */}
                        <line
                          x1={x - 18}
                          y1={medY}
                          x2={x + 18}
                          y2={medY}
                          className="stroke-slate-900 dark:stroke-slate-100"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />

                        {/* X-Axis Week Label */}
                        <text
                          x={x}
                          y="205"
                          textAnchor="middle"
                          className="fill-slate-400 group-hover:fill-slate-800 dark:group-hover:fill-slate-200 font-mono text-[11px] transition-colors"
                        >
                          {d.week}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-border-light/60 dark:border-border-dark/60 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>{effortGap === null ? 'Not enough activity from other students yet to compare.' : <>Over these weeks you answered <strong>{Math.abs(effortGap)}% {effortGap >= 0 ? 'more' : 'fewer'}</strong> questions than the median student.</>}</span>
                {peers.weeklyEffort.some(d => d.top10 > 0) && (
                  <span className="font-bold text-primary">Top 10% average: {Math.round(peers.weeklyEffort.reduce((a, d) => a + d.top10, 0) / peers.weeklyEffort.length)} Qs/wk</span>
                )}
              </div>
            </div>

            {/* Component 2: Questions to Learn From (Image 2) */}
            <div className="p-6 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    <Target size={18} className="text-primary" />
                    <span>Questions to learn from</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    How the crowd did on questions you answered
                  </p>
                </div>

                {/* Segmented Filter Pills */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start sm:self-auto">
                  <button
                    onClick={() => setCrowdQuestionTab('easyMissed')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      crowdQuestionTab === 'easyMissed'
                        ? 'bg-card-light dark:bg-card-dark text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Easy ones you missed
                  </button>
                  <button
                    onClick={() => setCrowdQuestionTab('beatCrowd')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      crowdQuestionTab === 'beatCrowd'
                        ? 'bg-card-light dark:bg-card-dark text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Where you beat the crowd
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="divide-y divide-border-light/60 dark:divide-border-dark/60">
                {(crowdQuestionTab === 'easyMissed' ? global.crowdQuestions.easyMissed : global.crowdQuestions.beatCrowd).length === 0 && (
                  <EmptyNote>{`Nothing here yet. A question shows up once ${global.crowdQuestions.minAttempters}+ students have answered it.`}</EmptyNote>
                )}
                {(crowdQuestionTab === 'easyMissed' ? global.crowdQuestions.easyMissed : global.crowdQuestions.beatCrowd).map((item) => {
                  const isMissed = crowdQuestionTab === 'easyMissed'
                  return (
                    <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                            {item.paper}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isMissed ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          }`}>
                            {item.marks}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {item.subject} · {item.topic}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block">
                            {isMissed ? `${item.crowdPct}% got it right` : `Only ${item.crowdPct}% got it right`}
                          </span>
                          <div className="w-28 sm:w-32 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isMissed ? 'bg-orange-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${item.crowdPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footnote matching Image 2 */}
              <div className="pt-2 text-xs text-slate-500 dark:text-slate-400">
                {crowdQuestionTab === 'easyMissed' ? (
                  <p>Most learners solved these and you did not. They are the cheapest marks to win back.</p>
                ) : (
                  <p>You solved these difficult questions while most learners stumbled. High-leverage competitive edge.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}


      {/* TEST REVIEW MODAL DIALOG                                  */}
      {/* ========================================================= */}
      {selectedReviewTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-2xl p-6 sm:p-7 space-y-5">
            
            <div className="flex items-start justify-between gap-4 pb-2 border-b border-border-light/60 dark:border-border-dark/60">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                  {selectedReviewTest.type} Paper Review
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {selectedReviewTest.title}
                </h3>
                <p className="text-xs text-slate-400">Attempted on {selectedReviewTest.date}</p>
              </div>

              <button
                onClick={() => setSelectedReviewTest(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Test KPI Ribbon */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border-light dark:border-border-dark text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Score</span>
                <span className="text-xl font-black text-primary">{selectedReviewTest.score} / {selectedReviewTest.maxScore}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border-light dark:border-border-dark text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Rank on ExamPrep</span>
                <span className="text-xl font-black text-amber-500">{reviewRank ? `#${reviewRank.rank} of ${reviewRank.participants}` : '—'}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border-light dark:border-border-dark text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Duration</span>
                <span className="text-xl font-black text-slate-800 dark:text-slate-200">{selectedReviewTest.timeTaken}</span>
              </div>
            </div>

            {/* Correct vs Wrong vs Skipped Stack */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Question Outcome</span>
              <div className="flex h-3.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                <div className="bg-emerald-500" style={{ width: `${(selectedReviewTest.correct / Math.max(1, selectedReviewTest.total)) * 100}%` }} />
                <div className="bg-rose-500" style={{ width: `${(selectedReviewTest.wrong / Math.max(1, selectedReviewTest.total)) * 100}%` }} />
                <div className="bg-slate-400" style={{ width: `${(selectedReviewTest.skipped / Math.max(1, selectedReviewTest.total)) * 100}%` }} />
              </div>
              <div className="flex justify-between items-center text-xs font-bold pt-1">
                <span className="text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 size={13} /> {selectedReviewTest.correct} Correct
                </span>
                <span className="text-rose-500 flex items-center gap-1">
                  <XCircle size={13} /> {selectedReviewTest.wrong} Incorrect
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <MinusCircle size={13} /> {selectedReviewTest.skipped} Skipped
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-border-light/60 dark:border-border-dark/60">
              <Link
                to={selectedReviewTest.type === 'PYQ' ? '/pyq-mock' : '/mock-tests'}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-xl text-center shadow-md transition-all active:scale-95"
              >
                {selectedReviewTest.type === 'PYQ' ? 'Go to PYQ Tests' : 'Go to Mock Tests'}
              </Link>
              <button
                onClick={() => setSelectedReviewTest(null)}
                className="px-5 py-2.5 border border-border-light dark:border-border-dark bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING HOVER TOOLTIP (Matching Image 2 & HTML dashboard) */}
      {tooltip.visible && (
        <div
          style={{ transform: `translate(${tooltip.x}px, ${tooltip.y}px)` }}
          className="fixed left-0 top-0 z-50 pointer-events-none px-3 py-2 rounded-xl bg-slate-900 text-white text-xs shadow-2xl border border-slate-700/60 max-w-[260px] leading-relaxed transition-opacity duration-75 select-none"
        >
          <div className="font-bold text-[13px] text-white leading-tight mb-0.5">{tooltip.title}</div>
          {tooltip.subtitle && (
            <div className="text-slate-300 text-xs font-normal whitespace-nowrap">{tooltip.subtitle}</div>
          )}
        </div>
      )}

    </div>
  )
}
