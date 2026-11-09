import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Trophy, Calendar, CheckCircle, Clock, BookOpen, ChevronRight, Play, Bookmark, Lock, ArrowRight, Target } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import { questionPreview } from '../utils/questionPreview'
import GoogleSignInButton from '../components/GoogleSignInButton'
import { ProblemOfTheDayCard, DiscussionStatsCard, AnalyticsLinkCard } from '../components/EngagementCards'
import { dayKey } from '../../shared/practice.js'
import { parseSet, pyqPaperId } from '../../shared/pyqPapers.js'
import { findPaperAttempt } from '../utils/testSession'
import { practiceSummary, subjectProgress, topicProgress, weakestTopics, recentActivity, formatDuration, timeAgo } from '../utils/practiceStats'


// Every card below is drawn from the signed-in user's own data: practice
// records (useAppStore().practice) and finished tests (local test history).

// GATE CSE 2027 exam day. Update when the official schedule is announced.
const GATE_EXAM_DATE = new Date(2027, 1, 14) // 14 Feb 2027
const GATE_EXAM_LABEL = 'GATE CSE 2027'
// Questions a day the daily goal asks for
const DAILY_TARGET = 30
// GATE gives 180 minutes for 65 questions: about 2m 45s each
const PACE_BENCHMARK_SEC = 165

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDate = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
const fmtPace = (sec) => (sec >= 60 ? `${Math.floor(sec / 60)}m ${String(Math.round(sec % 60)).padStart(2, '0')}s` : `${Math.round(sec)}s`)
const fmtMarks = (n) => `${Number(n.toFixed(2))}`

// ==========================================
// EXAM COUNTDOWN & FOCUS CARD
// ==========================================
function GateExamTargetFocusCard({ solved, bankSize, weakTopics, nextPaper }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((GATE_EXAM_DATE - today) / 864e5)
  const solvedPct = bankSize ? (solved / bankSize) * 100 : 0

  // Up to three suggestions: the weakest topics first, then the next paper and a mock
  const focus = weakTopics.slice(0, 3).map(t => ({
    key: `${t.subject}::${t.topic}`,
    label: t.subject,
    title: t.topic,
    note: `${t.solved}/${t.attempted} solved`,
    to: '/pyq',
    tone: 'text-rose-500'
  }))
  if (focus.length < 3 && nextPaper) {
    focus.push({ key: 'paper', label: 'Full PYQ paper', title: nextPaper.title, note: 'Next unattempted', to: '/pyq-mock', tone: 'text-purple-500' })
  }
  if (focus.length < 3) {
    focus.push({ key: 'mock', label: 'Mock tests', title: 'Sectional or full mock', note: 'Test yourself', to: '/mock-tests', tone: 'text-teal-500' })
  }
  if (focus.length < 3) {
    focus.push({ key: 'topic', label: 'Practice', title: 'Topic-wise PYQs', note: 'Pick a chapter', to: '/pyq', tone: 'text-indigo-500' })
  }

  return (
    <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-gradient-to-r from-card-light via-card-light to-primary/5 dark:from-card-dark dark:via-card-dark dark:to-primary/10 shadow-soft">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: countdown and question-bank progress */}
        <div className="lg:col-span-5 space-y-3.5 border-b lg:border-b-0 lg:border-r border-border-light/60 dark:border-border-dark/60 pb-5 lg:pb-0 lg:pr-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Exam Countdown
            </span>
            <span className="text-xs text-slate-400 font-semibold">{GATE_EXAM_LABEL}</span>
          </div>

          <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-baseline gap-2 flex-wrap">
            {daysLeft > 0 ? (
              <>
                <span>{daysLeft} {daysLeft === 1 ? 'Day' : 'Days'}</span>
                <span className="text-xs font-semibold text-slate-400">until {fmtDate(GATE_EXAM_DATE)}</span>
              </>
            ) : daysLeft === 0 ? (
              <span>Exam day</span>
            ) : (
              <span className="text-lg">Exam date passed</span>
            )}
          </h3>

          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-baseline text-xs gap-2">
              <span className="text-slate-500 font-medium">PYQs solved: <strong className="text-slate-800 dark:text-slate-200">{solved} of {bankSize}</strong></span>
              <span className="text-primary font-bold">{Math.round(solvedPct)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${solvedPct}%` }} />
            </div>
          </div>
        </div>

        {/* Right: what to work on next */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today&apos;s Focus</span>
            <span className="text-[11px] text-primary font-semibold">{weakTopics.length ? 'Topics you miss most' : 'Where to start'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {focus.map(f => (
              <Link
                key={f.key}
                to={f.to}
                className="p-3 rounded-xl border border-border-light dark:border-border-dark bg-card-light/60 dark:bg-card-dark/60 hover:border-primary/50 hover:bg-primary/5 transition-all group block"
              >
                <span className={`text-[10px] uppercase font-bold block truncate ${f.tone}`}>{f.label}</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors line-clamp-1 mt-0.5">
                  {f.title}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>{f.note}</span>
                  <span className="text-primary font-bold group-hover:translate-x-0.5 transition-transform">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// DAILY GOAL & PACE CARD
// ==========================================
function DailyStudyGoalCard({ answeredToday, avgSec }) {
  const pct = Math.min(100, (answeredToday / DAILY_TARGET) * 100)
  const left = Math.max(0, DAILY_TARGET - answeredToday)
  const status = answeredToday >= DAILY_TARGET
    ? { label: 'Goal met', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' }
    : answeredToday > 0
      ? { label: 'In progress', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' }
      : { label: 'Not started', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' }
  const fast = avgSec !== null && avgSec <= PACE_BENCHMARK_SEC

  return (
    <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
      <div className="flex justify-between items-baseline gap-3">
        <div className="space-y-0.5">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Daily Goal &amp; Pace</h3>
          <p className="text-xs text-slate-500">Questions answered today and your average time per question.</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${status.cls}`}>{status.label}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/60 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Daily Target</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{answeredToday} / {DAILY_TARGET}</span>
            <span className="text-xs font-bold text-primary">{Math.round(pct)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] text-slate-400 block">
            {left > 0 ? `${left} question${left === 1 ? '' : 's'} left today` : 'Done for today'}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/60 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Avg Time / Q</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{avgSec === null ? '—' : fmtPace(avgSec)}</span>
            {avgSec !== null && (
              <span className={`text-xs font-bold ${fast ? 'text-emerald-500' : 'text-amber-500'}`}>{fast ? 'On pace' : 'Slow'}</span>
            )}
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${fast ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${avgSec === null ? 0 : Math.min(100, (avgSec / PACE_BENCHMARK_SEC) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            {avgSec === null ? 'Answer a question to see it' : `GATE pace is about ${fmtPace(PACE_BENCHMARK_SEC)}`}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 dark:bg-primary/10 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-primary block tracking-wider">Quick Practice</span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">Pick a topic and keep going</p>
          </div>
          <Link
            to="/pyq"
            className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95 text-center"
          >
            <span>Practice PYQs</span>
            <Play size={12} className="fill-white" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// The newest year's first paper not taken yet
const nextPaperToTake = (papers) =>
  [...papers].sort((a, b) => Number(b.year) - Number(a.year) || a.set - b.set).find(p => !p.attempt)

// ==========================================
// PYQ YEAR-PAPER COVERAGE CARD
// ==========================================
function OfficialPyqCoverageCard({ papers }) {
  const done = papers.filter(p => p.attempt).length
  const pct = papers.length ? Math.round((done / papers.length) * 100) : 0
  const next = nextPaperToTake(papers)

  return (
    <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Calendar size={16} />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">PYQ Paper Coverage</h3>
          </div>
          <p className="text-xs text-slate-500">
            {done} of {papers.length} full GATE CS papers taken ({pct}%).
          </p>
        </div>

        <div className="w-full sm:w-64 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-500">Completion</span>
            <span className="text-primary font-black">{pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-2.5 pt-1">
        {papers.map((p) => (
          <div
            key={p.id}
            title={p.attempt ? `${p.title}: ${fmtMarks(p.attempt.score)} / ${p.attempt.maxScore} marks` : `${p.title}: not taken yet`}
            className={`p-2.5 rounded-xl text-center border transition-all ${
              p.attempt
                ? 'bg-primary/5 dark:bg-primary/10 border-primary/25 hover:border-primary text-slate-900 dark:text-slate-100 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 text-slate-400'
            }`}
          >
            <span className="block text-xs font-extrabold leading-tight">
              {p.year}{p.multi ? <span className="text-[10px] font-bold opacity-70"> S{p.set}</span> : null}
            </span>
            <span className={`block text-[11px] mt-1 font-bold ${p.attempt ? 'text-primary' : 'text-slate-400'}`}>
              {p.attempt ? `${fmtMarks(p.attempt.score)}M` : 'Pending'}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-border-light/60 dark:border-border-dark/60 flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-500 truncate">
          {next
            ? <>Next recommended: <strong className="text-slate-700 dark:text-slate-300">{next.title}</strong></>
            : 'Every paper taken. Review them on the PYQ mock page.'}
        </span>
        <Link to="/pyq-mock" className="text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0">
          <span>{next ? 'Start Paper' : 'Open'}</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}

// ==========================================
// STUDY ACTIVITY HEATMAP (last 26 weeks)
// ==========================================
const HEATMAP_WEEKS = 26

function StudyActivityHeatmapCard({ days, longestStreak }) {
  const [hoveredCell, setHoveredCell] = useState(null)

  const heatmap = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const mondayOffset = (today.getDay() + 6) % 7 // Monday = 0
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset - (HEATMAP_WEEKS - 1) * 7)

    const weeks = []
    let total = 0
    let active = 0
    for (let w = 0; w < HEATMAP_WEEKS; w++) {
      const col = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)
        if (date > today) {
          col.push(null)
          continue
        }
        const count = days[dayKey(date.getTime())]?.attempts || 0
        total += count
        if (count > 0) active++
        col.push({ dateStr: fmtDate(date), count })
      }
      const first = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7)
      weeks.push({ cells: col, month: first.getMonth() })
    }
    // Month name over the first week that starts in that month
    weeks.forEach((wk, i) => { wk.label = i === 0 || wk.month !== weeks[i - 1].month ? MONTHS[wk.month] : '' })
    return { weeks, total, active }
  }, [days])

  const getColorClass = (count) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800/80'
    if (count <= 4) return 'bg-blue-200 dark:bg-blue-950/70'
    if (count <= 9) return 'bg-blue-400 dark:bg-blue-700'
    if (count <= 15) return 'bg-blue-600 dark:bg-blue-500'
    return 'bg-blue-800 dark:bg-blue-400'
  }

  return (
    <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-1">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Study activity</h3>
          <p className="text-xs text-slate-500">Questions answered per day, last {HEATMAP_WEEKS} weeks</p>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border-light dark:border-border-dark self-start sm:self-auto min-h-[32px] flex items-center">
          {hoveredCell ? (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <strong className="text-primary">{hoveredCell.count} question{hoveredCell.count === 1 ? '' : 's'}</strong> on {hoveredCell.dateStr}
            </span>
          ) : (
            <span className="text-slate-400 text-[11px]">Hover over any square to see details</span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto pt-2 pb-2 scrollbar-none">
        <div className="min-w-[620px]">
          {/* Month labels, one slot per week */}
          <div className="flex gap-3 mb-2">
            <div className="w-[26px] shrink-0" />
            <div className="flex-1 flex gap-2">
              {heatmap.weeks.map((wk, i) => (
                <span key={i} className="flex-1 text-[11px] font-semibold text-slate-400 whitespace-nowrap overflow-visible">{wk.label}</span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-[26px] shrink-0 flex flex-col justify-between text-[10px] font-semibold text-slate-400 py-0.5 h-[112px]">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            <div className="flex-1 flex gap-2">
              {heatmap.weeks.map((wk, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-2 flex-1">
                  {wk.cells.map((cell, dIdx) => (
                    cell === null ? (
                      <div key={dIdx} className="h-3.5 w-full" />
                    ) : (
                      <div
                        key={dIdx}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${cell.count} question${cell.count === 1 ? '' : 's'} on ${cell.dateStr}`}
                        className="cursor-pointer"
                      >
                        <div className={`h-3.5 w-full rounded-[3px] transition-all hover:scale-125 hover:ring-2 hover:ring-primary ${getColorClass(cell.count)}`} />
                      </div>
                    )
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-border-light/60 dark:border-border-dark/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
        <div>
          <strong className="text-slate-800 dark:text-slate-200">{heatmap.active} active day{heatmap.active === 1 ? '' : 's'}</strong> · <strong className="text-slate-800 dark:text-slate-200">{heatmap.total.toLocaleString()} question{heatmap.total === 1 ? '' : 's'}</strong> · longest streak <strong className="text-slate-800 dark:text-slate-200">{longestStreak} day{longestStreak === 1 ? '' : 's'}</strong>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>Less</span>
          <span className="h-2.5 w-2.5 rounded-[2px] bg-slate-100 dark:bg-slate-800" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-blue-200 dark:bg-blue-950/70" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-blue-400 dark:bg-blue-700" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-blue-600 dark:bg-blue-500" />
          <span className="h-2.5 w-2.5 rounded-[2px] bg-blue-800 dark:bg-blue-400" />
          <span>More</span>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// TEST HISTORY CARD
// ==========================================
function ComprehensiveTestHistoryCard({ tests }) {
  const [filter, setFilter] = useState('all')
  const [showAll, setShowAll] = useState(false)

  const filtered = tests.filter(t => filter === 'all' || t.type === (filter === 'mock' ? 'Mock' : 'PYQ'))
  const shown = showAll ? filtered : filtered.slice(0, 6)

  return (
    <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Clock size={16} />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">Test History</h3>
          </div>
          <p className="text-xs text-slate-500">Every mock and PYQ test you&apos;ve submitted, newest first.</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-border-light dark:border-border-dark self-start sm:self-auto">
          {[
            { id: 'all', label: 'All Tests' },
            { id: 'mock', label: 'Mock Tests' },
            { id: 'pyq', label: 'PYQ Tests' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 space-y-2">
          <p>No {filter === 'mock' ? 'mock ' : filter === 'pyq' ? 'PYQ ' : ''}tests submitted yet.</p>
          <Link to={filter === 'pyq' ? '/pyq-mock' : '/mock-tests'} className="text-primary font-semibold hover:underline">Take a test</Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-4">Test Name</th>
                <th className="pb-3 px-3">Type</th>
                <th className="pb-3 px-3">Date</th>
                <th className="pb-3 px-3">Score</th>
                <th className="pb-3 px-3">Accuracy</th>
                <th className="pb-3 px-3">Time Taken</th>
                <th className="pb-3 pl-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light/60 dark:divide-border-dark/60 text-xs">
              {shown.map(t => (
                <tr key={t.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="py-3.5 pr-4 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">{t.name}</td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide ${
                      t.type === 'PYQ'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">{t.date}</td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{fmtMarks(t.score)} / {t.maxScore}</span>
                      <div className="h-1.5 w-12 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${t.maxScore ? Math.max(0, (t.score / t.maxScore) * 100) : 0}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-bold text-emerald-500 whitespace-nowrap">{t.accuracy}</td>
                  <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">{t.time}</td>
                  <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                    <Link
                      to={t.link}
                      title="The analysis opens from the test's card"
                      className="px-3 py-1 rounded-lg border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-300 font-bold hover:bg-primary hover:text-white hover:border-primary transition-all text-xs inline-flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <span>Open</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="pt-3 border-t border-border-light/60 dark:border-border-dark/60 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {shown.length} of {filtered.length} test{filtered.length === 1 ? '' : 's'}</span>
          {filtered.length > 6 && (
            <button onClick={() => setShowAll(v => !v)} className="font-bold text-primary hover:underline cursor-pointer">
              {showAll ? 'Show fewer' : 'Show all'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore()
  const { bookmarks, questions, practice } = useAppStore()

  const summary = useMemo(() => practiceSummary(practice), [practice])
  const subjects = useMemo(() => subjectProgress(practice, questions), [practice, questions])
  const weakTopics = useMemo(() => weakestTopics(topicProgress(practice, questions)), [practice, questions])
  // Finished tests (under-a-minute submissions don't count)
  const testHistory = useMemo(() => {
    const read = (key) => {
      try {
        const list = JSON.parse(localStorage.getItem(key) || '[]')
        return Array.isArray(list) ? list.filter(h => h && h.counted !== false) : []
      } catch (e) {
        return []
      }
    }
    return { mock: read('gate_mock_history'), pyq: read('gate_pyq_mock_history') }
  }, [practice])
  const activity = useMemo(
    () => recentActivity(practice, questions, [...testHistory.mock, ...testHistory.pyq]),
    [practice, questions, testHistory]
  )
  const testRows = useMemo(() => [
    ...testHistory.mock.map(h => ({ ...h, type: 'Mock', link: '/mock-tests' })),
    ...testHistory.pyq.map(h => ({ ...h, type: 'PYQ', link: '/pyq-mock' }))
  ]
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .map(h => ({
      key: `${h.type}-${h.timestamp}-${h.testTitle}`,
      name: h.testTitle || h.displayName || 'Test',
      type: h.type,
      date: h.date || (h.timestamp ? new Date(h.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'),
      score: Number(h.score) || 0,
      maxScore: Number(h.maxScore) || 0,
      accuracy: h.percentage !== undefined && h.percentage !== null ? `${h.percentage}%` : '—',
      time: h.timeTakenFormatted || '—',
      link: h.link
    })), [testHistory])
  // Full year papers, oldest first, with the user's attempt if taken (one attempt each)
  const yearPapers = useMemo(() => {
    const map = new Map()
    questions.forEach(q => {
      if (!q.year) return
      const key = `${q.year}_${parseSet(q.set)}`
      if (!map.has(key)) map.set(key, { year: String(q.year), set: parseSet(q.set) })
    })
    const list = [...map.values()].sort((a, b) => Number(a.year) - Number(b.year) || a.set - b.set)
    return list.map(p => {
      const multi = list.filter(o => o.year === p.year).length > 1
      const id = pyqPaperId(p.year, p.set)
      return {
        ...p,
        id,
        multi,
        title: multi ? `GATE ${p.year} (Set ${p.set})` : `GATE ${p.year}`,
        attempt: findPaperAttempt(id, `PYQ Mock: GATE ${p.year} Set ${p.set}`)
      }
    })
  }, [questions, testHistory])

  // --- GATED ACCESS VIEW FOR GUESTS ---
  if (!isAuthenticated) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark min-h-[80vh] flex flex-col justify-center items-center">
        <div className="w-full bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card shadow-soft p-8 sm:p-10 text-center space-y-6">
          <div className="inline-flex p-4 rounded-3xl bg-primary/10 dark:bg-primary/20 text-primary ring-8 ring-primary/5">
            <Lock size={32} className="text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">
              Register / Login to access your Dashboard
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Your personal dashboard tracks your preparation momentum, daily study streaks, subject-wise analytics, and custom recommendations.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-left space-y-2.5 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <Flame size={16} className="text-orange-500 shrink-0" />
              <span>Track your daily study streak and active learning momentum</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
              <span>Real-time accuracy and solved questions breakdown by subject</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <BookOpen size={16} className="text-primary shrink-0" />
              <span>Personalized topic suggestions and recent practice history</span>
            </div>
          </div>

          <div className="space-y-3 pt-2 max-w-sm mx-auto">
            <GoogleSignInButton text="Sign in with Google" />

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/login"
                state={{ from: '/dashboard' }}
                className="h-10 px-4 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-btn transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Log In</span>
                <ArrowRight size={13} />
              </Link>

              <Link
                to="/signup"
                state={{ from: '/dashboard' }}
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

  const { solved, attempted, accuracy, practiceSec } = summary
  // The server's streak also counts Problem of the Day and discussion days
  const streak = Math.max(summary.streak, user?.streak || 0)
  const longestStreak = Math.max(summary.longestStreak, user?.longestStreak || 0)
  const hasPractice = attempted > 0
  const answeredToday = practice.days[dayKey()]?.attempts || 0

  // Find bookmarked questions details
  const bookmarkedItems = questions.filter(q => bookmarks.some(id => String(id) === String(q.id)))

  const statCards = [
    { label: 'Questions Solved', value: solved, sub: hasPractice ? `of ${attempted} attempted` : 'None yet', icon: CheckCircle, tone: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Accuracy', value: accuracy === null ? '—' : `${accuracy}%`, sub: hasPractice ? 'of all answers' : 'Answer a question to see it', icon: Target, tone: 'bg-amber-500/10 text-amber-500' },
    { label: 'Practice Time', value: formatDuration(practiceSec), sub: hasPractice ? 'on answered questions' : 'Starts with your first answer', icon: Clock, tone: 'bg-blue-500/10 text-blue-500' },
    { label: 'Saved Bookmarks', value: bookmarkedItems.length, sub: bookmarkedItems.length ? 'questions saved' : 'None yet', icon: Bookmark, tone: 'bg-indigo-500/10 text-indigo-500', to: '/bookmarks' }
  ]

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark">

      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">
            Welcome back, {user?.name || 'Aspirant'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {!hasPractice
              ? 'Answer your first question to start tracking your progress.'
              : answeredToday > 0
                ? `You've answered ${answeredToday} question${answeredToday === 1 ? '' : 's'} today. Keep your momentum going.`
                : streak > 0
                  ? 'Answer a question today to keep your streak alive.'
                  : 'Answer a question today to start a new streak.'}
          </p>
        </div>

        {/* Streak Counter */}
        <div
          className={`flex items-center gap-3 px-4 py-2.5 rounded-btn border self-start md:self-auto ${
            streak > 0
              ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-500'
              : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
          title={longestStreak > 0 ? `Longest streak: ${longestStreak} day${longestStreak === 1 ? '' : 's'}` : 'Days in a row with study activity: answering questions, the Problem of the Day or posting in discussions'}
        >
          <Flame size={20} className={streak > 0 ? 'fill-orange-500' : ''} />
          <div className="text-left">
            <span className="block text-xs font-bold leading-none uppercase">Daily Streak</span>
            <span className="text-lg font-extrabold leading-none mt-1 inline-block">{streak} {streak === 1 ? 'Day' : 'Days'}</span>
          </div>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map(({ label, value, sub, icon: Icon, tone, to }) => {
          const Card = to ? Link : 'div'
          return (
          <Card key={label} {...(to ? { to } : {})} className={`p-5 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex items-center gap-4 ${to ? 'hover:border-primary/40 transition-colors' : ''}`}>
            <div className={`h-12 w-12 rounded-btn flex items-center justify-center shrink-0 ${tone}`}>
              <Icon size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-400 font-bold uppercase">{label}</span>
              <p className="text-2xl font-extrabold mt-0.5">{value}</p>
              <p className="text-[10px] text-slate-400 truncate">{sub}</p>
            </div>
          </Card>
          )
        })}
      </div>

      {/* Exam countdown and what to work on next */}
      <GateExamTargetFocusCard
        solved={solved}
        bankSize={questions.length}
        weakTopics={weakTopics}
        nextPaper={nextPaperToTake(yearPapers)}
      />

      {/* Full PYQ papers taken */}
      <OfficialPyqCoverageCard papers={yearPapers} />

      {/* Questions answered per day */}
      <StudyActivityHeatmapCard days={practice.days || {}} longestStreak={longestStreak} />

      {/* Progress & Activities Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Subject Progress & Practice Actions */}
        <div className="lg:col-span-2 space-y-6">
          


          {/* Today's goal and average pace */}
          <DailyStudyGoalCard answeredToday={answeredToday} avgSec={summary.totalAnswers > 0 ? practiceSec / summary.totalAnswers : null} />

          {/* Subject Completion Rates */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
            <div className="flex justify-between items-baseline gap-3">
              <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Subject-wise Completion</h3>
              {hasPractice && (
                <span className="text-[10px] text-slate-400 font-semibold">Solved / questions in the bank</span>
              )}
            </div>

            {!hasPractice ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 space-y-2">
                <p>No questions answered yet. Your progress in each subject will show up here.</p>
                <Link to="/pyq" className="text-primary font-semibold hover:underline">Start practising PYQs</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {subjects.map((sub) => {
                  const solvedPct = sub.total ? (sub.solved / sub.total) * 100 : 0
                  const attemptedPct = sub.total ? (sub.attempted / sub.total) * 100 : 0
                  return (
                    <div key={sub.subject} className="space-y-1.5">
                      <div className="flex justify-between gap-3 text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-400 truncate">{sub.subject}</span>
                        <span className="text-text-primary-light dark:text-text-primary-dark shrink-0">
                          {sub.solved}/{sub.total} ({Math.round(solvedPct)}%)
                        </span>
                      </div>
                      {/* Solved drawn over attempted */}
                      <div
                        className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
                        title={`${sub.attempted} attempted, ${sub.solved} solved`}
                      >
                        <div className="absolute inset-y-0 left-0 bg-primary/25 rounded-full" style={{ width: `${attemptedPct}%` }}></div>
                        <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${solvedPct}%` }}></div>
                      </div>
                    </div>
                  )
                })}
                <div className="flex gap-4 pt-1 text-[10px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-full bg-primary"></span>Solved</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-full bg-primary/25"></span>Attempted</span>
                </div>
              </div>
            )}
          </div>

          {/* Topics that need work */}
          {weakTopics.length > 0 && (
            <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="flex justify-between items-baseline gap-3">
                <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Topics to Revisit</h3>
                <span className="text-[10px] text-slate-400 font-semibold">Most misses among what you tried</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {weakTopics.map((t) => (
                  <div key={`${t.subject}::${t.topic}`} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary-light dark:text-text-primary-dark truncate">{t.topic}</p>
                      <p className="text-[10px] text-slate-400 truncate">{t.subject}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-text-primary-light dark:text-text-primary-dark">{t.solved}/{t.attempted} solved</p>
                      <p className="text-[10px] text-slate-400">{t.total} in bank</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Col: Recent Activity & Saved Bookmarks */}
        <div className="space-y-6">
          <ProblemOfTheDayCard />
          <AnalyticsLinkCard />
          <DiscussionStatsCard />

          {/* Recent Activity */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
            <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Recent Activity</h3>
            
            {activity.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                Nothing yet. Questions you answer and mock tests you finish will appear here.
              </div>
            ) : (
              <div className="space-y-3.5">
                {activity.map((act) => (
                  <div key={`${act.kind}-${act.time}-${act.title}`} className="flex items-start gap-3 text-xs border-b border-slate-100 dark:border-slate-800/40 pb-3 last:border-b-0 last:pb-0">
                    <div className={`h-6 w-1 rounded-full shrink-0 mt-0.5 ${act.kind === 'mock' ? 'bg-primary' : act.correct ? 'bg-success' : 'bg-error'}`}></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-text-primary-light dark:text-text-primary-dark truncate">{act.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 min-w-0">
                        {act.detail && <span className="truncate">{act.detail}</span>}
                        {act.detail && <span>•</span>}
                        <span className="shrink-0">{timeAgo(act.time)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bookmarked Questions Preview */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Bookmarked PYQs</h3>
              <Link to="/bookmarks" className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-0.5">
                <span>View All</span>
                <ChevronRight size={14} />
              </Link>
            </div>
            
            <div className="space-y-2">
              {bookmarkedItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                  No bookmarked questions yet.
                </div>
              ) : (
                bookmarkedItems.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    to="/pyq"
                    className="p-2.5 block rounded-btn bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-text-primary-light dark:text-text-primary-dark font-medium truncate"
                  >
                    {questionPreview(item.question)}
                  </Link>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Submitted tests */}
      <ComprehensiveTestHistoryCard tests={testRows} />
    </div>
  )
}
