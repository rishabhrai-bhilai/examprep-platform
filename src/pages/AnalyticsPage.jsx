import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, Target, Clock, TrendingUp, CheckCircle2, XCircle, MinusCircle, Award, History, Globe } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { mockTests } from '../../shared/mockTests.js'
import { fetchMyMockAttempts, fetchMockComparison } from '../utils/engagementApi'
import GlobalComparison, { LoginToCompare } from '../components/GlobalComparison'
import { formatDuration } from '../utils/practiceStats'

// Personal analytics for mock tests and PYQ tests (kept separate), plus the global
// comparison for mock tests. Personal numbers come from the test history in this
// browser, which is the account's history when signed in. Attempts under a minute
// were never saved, so they are not here.

const HISTORY_KEYS = { mock: 'gate_mock_history', pyq: 'gate_pyq_mock_history' }

const readHistory = (kind) => {
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEYS[kind]) || '[]')
    return list.filter(h => h && h.counted !== false && h.maxScore > 0).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
  } catch {
    return []
  }
}

const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0)
const round1 = (n) => Math.round(n * 10) / 10

function summarise(history) {
  if (!history.length) return null
  const totals = history.reduce((t, h) => ({
    correct: t.correct + (h.correct || 0),
    incorrect: t.incorrect + (h.incorrect || 0),
    unanswered: t.unanswered + (h.unanswered || 0),
    questions: t.questions + (h.questionsCount || 0),
    time: t.time + (h.timeTaken || 0),
    scorePct: t.scorePct + pct(h.score, h.maxScore)
  }), { correct: 0, incorrect: 0, unanswered: 0, questions: 0, time: 0, scorePct: 0 })

  const subjects = {}
  history.forEach(h => Object.entries(h.subjectStats || {}).forEach(([name, s]) => {
    const agg = subjects[name] || (subjects[name] = { obtained: 0, max: 0, correct: 0, attempted: 0 })
    agg.obtained += s.marksObtained || 0
    agg.max += s.marksMax || 0
    agg.correct += s.correctQs || 0
    agg.attempted += (s.correctQs || 0) + (s.incorrectQs || 0)
  }))

  const attempted = totals.correct + totals.incorrect
  return {
    attempts: history.length,
    averageScore: round1(totals.scorePct / history.length),
    bestScore: round1(Math.max(...history.map(h => pct(h.score, h.maxScore)))),
    accuracy: round1(pct(totals.correct, attempted)),
    totals,
    secondsPerQuestion: totals.questions ? Math.round(totals.time / totals.questions) : 0,
    subjects: Object.entries(subjects)
      .map(([name, s]) => ({ name, scorePct: round1(pct(s.obtained, s.max)), accuracy: round1(pct(s.correct, s.attempted)) }))
      .sort((a, b) => a.scorePct - b.scorePct),
    progression: history.map(h => ({ label: h.date, value: round1(pct(h.score, h.maxScore)) }))
  }
}

const card = 'p-4 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card'

const Stat = ({ icon: Icon, label, value, hint }) => (
  <div className={card}>
    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
      <Icon size={13} />
      <span>{label}</span>
    </div>
    <p className="mt-1.5 text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">{value}</p>
    {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
  </div>
)

// Score % per attempt, oldest first
function ProgressionChart({ points }) {
  const w = 600, h = 160, pad = 24
  const xs = (i) => pad + (points.length === 1 ? (w - 2 * pad) / 2 : (i * (w - 2 * pad)) / (points.length - 1))
  const ys = (v) => h - pad - (Math.max(-33, Math.min(100, v)) / 100) * (h - 2 * pad)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${xs(i)},${ys(p.value)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40" role="img" aria-label="Score progression">
      {[0, 50, 100].map(v => (
        <g key={v}>
          <line x1={pad} x2={w - pad} y1={ys(v)} y2={ys(v)} className="stroke-slate-200 dark:stroke-slate-800" strokeDasharray="3 4" />
          <text x={2} y={ys(v) + 3} className="fill-slate-400 text-[10px]">{v}%</text>
        </g>
      ))}
      <path d={line} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={xs(i)} cy={ys(p.value)} r="3.5" className="fill-primary">
          <title>{`${p.label}: ${p.value}%`}</title>
        </circle>
      ))}
    </svg>
  )
}

function PersonalAnalytics({ kind, history }) {
  const s = useMemo(() => summarise(history), [history])
  if (!s) {
    return (
      <div className={`${card} text-center py-10 space-y-2`}>
        <p className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">No {kind === 'mock' ? 'mock tests' : 'PYQ tests'} yet</p>
        <p className="text-xs text-slate-500">Finish one and your analytics will show up here.</p>
        <Link to={kind === 'mock' ? '/mock-tests' : '/pyq-mock'} className="inline-flex mt-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-btn">
          {kind === 'mock' ? 'Take a mock test' : 'Take a PYQ test'}
        </Link>
      </div>
    )
  }
  const { totals } = s
  const totalQs = totals.correct + totals.incorrect + totals.unanswered || 1

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={TrendingUp} label="Average score" value={`${s.averageScore}%`} hint={`Best ${s.bestScore}%`} />
        <Stat icon={Target} label="Accuracy" value={`${s.accuracy}%`} hint="correct out of attempted" />
        <Stat icon={History} label="Tests taken" value={s.attempts} />
        <Stat icon={Clock} label="Time per question" value={`${s.secondsPerQuestion}s`} hint={`${formatDuration(totals.time)} in total`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className={`${card} space-y-2`}>
          <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">Score progression</h3>
          <ProgressionChart points={s.progression} />
        </div>

        <div className={`${card} space-y-3`}>
          <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">Correct, incorrect and unattempted</h3>
          <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <div className="bg-success" style={{ width: `${pct(totals.correct, totalQs)}%` }} />
            <div className="bg-error" style={{ width: `${pct(totals.incorrect, totalQs)}%` }} />
            <div className="bg-slate-300 dark:bg-slate-600" style={{ width: `${pct(totals.unanswered, totalQs)}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <p className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-success" /> {totals.correct} correct</p>
            <p className="flex items-center gap-1.5"><XCircle size={14} className="text-error" /> {totals.incorrect} incorrect</p>
            <p className="flex items-center gap-1.5"><MinusCircle size={14} className="text-slate-400" /> {totals.unanswered} unattempted</p>
          </div>
        </div>
      </div>

      {s.subjects.length > 0 && (
        <div className={`${card} space-y-3`}>
          <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">Subject-wise performance <span className="font-normal text-slate-400 text-xs">(weakest first)</span></h3>
          <div className="space-y-2.5">
            {s.subjects.map(sub => (
              <div key={sub.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300 truncate pr-2">{sub.name}</span>
                  <span className="text-slate-500 shrink-0">Score {sub.scorePct}% · Accuracy {sub.accuracy}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${sub.scorePct >= 60 ? 'bg-success' : sub.scorePct >= 35 ? 'bg-warning' : 'bg-error'}`} style={{ width: `${Math.max(0, sub.scorePct)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`${card} space-y-3`}>
        <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">Previous attempts</h3>
        <div className="divide-y divide-border-light dark:divide-border-dark">
          {[...history].reverse().map(h => (
            <div key={h.timestamp} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <p className="font-semibold text-text-primary-light dark:text-text-primary-dark truncate">{h.testTitle}</p>
                <p className="text-slate-400">{h.date} · {h.timeTakenFormatted || formatDuration(h.timeTaken || 0)}{h.attemptNo ? ` · Attempt #${h.attemptNo}` : ''}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-text-primary-light dark:text-text-primary-dark">{h.score} / {h.maxScore}</p>
                <p className="text-slate-400">{h.correct}/{h.questionsCount} correct</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MockGlobal() {
  const { isAuthenticated } = useAuthStore()
  const [state, setState] = useState({ status: 'loading' })
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) return
    let active = true
    fetchMyMockAttempts()
      .then(async (attempts) => {
        const testIds = [...new Set(attempts.filter(a => a.attemptNo === 1).map(a => a.testId))]
        const comparisons = await Promise.all(testIds.map(id => fetchMockComparison(id).then(c => [id, c])))
        if (!active) return
        const byTest = Object.fromEntries(comparisons.filter(([, c]) => c))
        setState({ status: 'ready', byTest })
        setSelected(Object.keys(byTest)[0] || null)
      })
      .catch(err => active && setState({ status: 'error', message: err.message }))
    return () => { active = false }
  }, [isAuthenticated])

  if (!isAuthenticated) return <LoginToCompare />
  if (state.status === 'loading') return <p className="text-sm text-slate-500 py-6 text-center">Loading your comparison...</p>
  if (state.status === 'error') return <p className="text-sm text-error py-6 text-center">Could not load the comparison: {state.message}</p>

  const testIds = Object.keys(state.byTest)
  if (!testIds.length) {
    return <p className={`${card} text-sm text-slate-500 text-center py-8`}>Take a mock test while logged in to see how you compare.</p>
  }
  const comparisons = Object.values(state.byTest)
  const avgPercentile = round1(comparisons.reduce((sum, c) => sum + c.percentile, 0) / comparisons.length)
  const title = (id) => mockTests.find(t => t.id === id)?.title || id

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Award} label="Average percentile" value={avgPercentile} hint={`across ${comparisons.length} ${comparisons.length === 1 ? 'test' : 'tests'}`} />
        <Stat icon={Globe} label="Best rank" value={`#${Math.min(...comparisons.map(c => c.rank))}`} hint="your best position in any test" />
      </div>
      <div className="flex flex-wrap gap-2">
        {testIds.map(id => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${selected === id ? 'bg-primary text-white border-primary' : 'border-border-light dark:border-border-dark text-slate-500 hover:text-primary'}`}
          >
            {title(id)}
          </button>
        ))}
      </div>
      {selected && state.byTest[selected] && <GlobalComparison comparison={state.byTest[selected]} />}
    </div>
  )
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState('mock')
  const history = useMemo(() => readHistory(tab), [tab])

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
          <BarChart2 className="text-primary" size={24} /> Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-1">Mock tests and PYQ tests are tracked separately.</p>
      </div>

      <div className="flex gap-2 border-b border-border-light dark:border-border-dark">
        {[['mock', 'Mock Tests'], ['pyq', 'PYQ Tests']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px ${tab === id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">Personal analytics</h2>
        <PersonalAnalytics kind={tab} history={history} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">Global comparison</h2>
        {tab === 'mock' ? (
          <MockGlobal />
        ) : (
          <p className={`${card} text-sm text-slate-500 text-center py-8`}>Comparison with other students for PYQ tests is coming later.</p>
        )}
      </section>
    </div>
  )
}
