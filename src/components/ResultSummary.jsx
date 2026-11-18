import { Brain, Target, Clock, Users } from 'lucide-react'
import { estimateGateScore, ordinal } from '../utils/gateScore'

// Top of a test's result page. Every number here is real: the student's own
// score, and a standing only when the server has compared the attempt with
// other ExamPrep students who took the same paper.
export default function ResultSummary({ report, comparisonState, durationMinutes }) {
  const standing = comparisonState?.status === 'ready' ? comparisonState.comparison : null
  const counted = report.counted !== false
  const gate = estimateGateScore(report.score, report.maxScore)

  let standingNote
  if (standing) {
    standingNote = standing.participants > 1
      ? `Rank ${standing.rank} of ${standing.participants} ExamPrep students who took this paper. Average ${fmt(standing.averageScore)}, highest ${fmt(standing.highestScore)}.`
      : 'You are the first ExamPrep student to take this paper, so there is no one to compare with yet.'
  } else if (!counted) {
    standingNote = "This attempt doesn't count toward rankings, so it isn't compared with other students."
  } else if (comparisonState?.status === 'not-year') {
    standingNote = 'Only full year papers are compared with other students.'
  } else if (comparisonState?.status === 'guest') {
    standingNote = 'Sign in to see how you compare with other students.'
  } else {
    standingNote = 'Comparison with other students appears in the Global Comparison tab.'
  }

  return (
    <div className="space-y-4">
      <div className="p-6 sm:p-8 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 block">Your result</span>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-4xl sm:text-5xl font-black tracking-tight">{fmt(report.score)}</span>
              <span className="text-xl font-bold text-indigo-200">/ {report.maxScore} marks</span>
              {standing && standing.participants > 1 && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {ordinal(standing.percentile)} percentile
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-indigo-200/80 max-w-lg leading-relaxed flex items-start gap-1.5">
              <Users size={14} className="mt-0.5 shrink-0" />
              <span>{standingNote}</span>
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:gap-6 bg-white/10 p-4 sm:p-5 rounded-2xl border border-white/10 shrink-0 text-center">
            <Mini label="Correct" value={report.correct} tone="text-emerald-300" />
            <Mini label="Incorrect" value={report.incorrect} tone="text-rose-300" />
            <Mini label="Skipped" value={report.unanswered} tone="text-indigo-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card icon={Brain} tone="bg-primary/10 text-primary" label="Estimated GATE score"
          value={gate.value}
          suffix={gate.value !== '—' ? '/ 1000' : ''}
          note={gate.note} />
        <Card icon={Target} tone="bg-emerald-500/10 text-emerald-500" label="Accuracy"
          value={`${report.percentage}%`}
          suffix={`of ${report.correct + report.incorrect} answered`}
          note={`${report.incorrect} incorrect · ${report.unanswered} skipped`} />
        <Card icon={Clock} tone="bg-amber-500/10 text-amber-500" label="Time used"
          value={report.timeTakenFormatted}
          suffix={`(${report.attemptRate}% attempted)`}
          note={durationMinutes ? `Time allowed: ${durationMinutes} minutes` : ''} />
      </div>
    </div>
  )
}

const fmt = (n) => (Number.isFinite(Number(n)) ? `${Number(Number(n).toFixed(2))}`.replace(/^-0$/, '0') : n)

function Mini({ label, value, tone }) {
  return (
    <div>
      <span className="text-[10px] uppercase font-bold text-indigo-300 block">{label}</span>
      <span className={`text-xl sm:text-2xl font-black ${tone}`}>{value}</span>
    </div>
  )
}

function Card({ icon: Icon, tone, label, value, suffix, note }) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
        <Icon size={24} />
      </div>
      <div className="space-y-0.5 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{label}</span>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{value}</span>
          {suffix && <span className="text-[10px] text-slate-400 font-semibold">{suffix}</span>}
        </div>
        {note && <span className="text-[10px] text-slate-500 block leading-tight">{note}</span>}
      </div>
    </div>
  )
}
