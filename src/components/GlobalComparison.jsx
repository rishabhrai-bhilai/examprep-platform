import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Users, Trophy, Percent, TrendingUp, Lock, Info } from 'lucide-react'

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

const fmt = (n) => (Number.isInteger(n) ? n : Number(n).toFixed(2))

// How a first attempt at a mock test compares with everyone else's first attempt.
// `comparison` comes from the server (shared/testAnalytics.js compareAttempt).
export default function GlobalComparison({ comparison }) {
  const { participants, rank, percentile, yourScore, maxScore, averageScore, highestScore, distribution, yourBucket, subjects } = comparison
  const tallest = Math.max(1, ...distribution.map(b => b.count))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Trophy} label="Your rank" value={`#${rank}`} hint={`out of ${participants} ${participants === 1 ? 'participant' : 'participants'}`} />
        <Stat icon={Percent} label="Percentile" value={fmt(percentile)} hint="share of others you scored above" />
        <Stat icon={TrendingUp} label="Your score" value={`${fmt(yourScore)} / ${maxScore}`} hint={`Average ${fmt(averageScore)} · Highest ${fmt(highestScore)}`} />
        <Stat icon={Users} label="Participants" value={participants} hint="first attempts only" />
      </div>

      <div className={`${card} space-y-3`}>
        <div>
          <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">Score distribution</h3>
          <p className="text-[11px] text-slate-400">How many participants scored in each range (percent of maximum marks). Your range is highlighted.</p>
        </div>
        <div className="flex items-end gap-1.5 h-36">
          {distribution.map((b, i) => (
            <div key={b.from} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <span className="text-[10px] font-bold text-slate-500">{b.count || ''}</span>
              <div
                className={`w-full rounded-t ${i === yourBucket ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                style={{ height: `${(b.count / tallest) * 100}%`, minHeight: b.count ? 4 : 0 }}
                title={`${b.from}-${b.to}%: ${b.count}`}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          {distribution.map(b => (
            <span key={b.from} className="flex-1 text-center text-[9px] text-slate-400">{b.from}</span>
          ))}
        </div>
      </div>

      {subjects.length > 0 && (
        <div className={`${card} space-y-3`}>
          <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">Subject-wise comparison</h3>
          <div className="space-y-3">
            {subjects.map(s => (
              <div key={s.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300 truncate pr-2">{s.name}</span>
                  <span className="text-slate-500 shrink-0">You {fmt(s.yourPercent)}% · Avg {fmt(s.averagePercent)}%</span>
                </div>
                <div className="space-y-0.5">
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(0, s.yourPercent)}%` }} />
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-slate-400 dark:bg-slate-500 rounded-full" style={{ width: `${Math.max(0, s.averagePercent)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">Thick bar: you. Thin bar: average of all participants. Negative marks show as empty.</p>
        </div>
      )}

      <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
        <Info size={12} className="shrink-0 mt-0.5" />
        <span>Only each student&apos;s first attempt at this test is compared, scored with the same GATE marking. Attempts under a minute don&apos;t count.</span>
      </p>
    </div>
  )
}

// Shown instead of the comparison to guests
export function LoginToCompare({ title = 'Want to know how you did compared to other GATE aspirants?', points = ['Global rank', 'Percentile', 'Comparison with all participants', 'Your personal preparation analytics'] }) {
  const location = useLocation()
  return (
    <div className={`${card} text-center space-y-3 py-8`}>
      <div className="mx-auto h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        <Lock size={20} />
      </div>
      <h3 className="text-base font-bold text-text-primary-light dark:text-text-primary-dark">{title}</h3>
      <ul className="text-xs text-slate-500 space-y-1">
        {points.map(p => <li key={p}>{p}</li>)}
      </ul>
      <p className="text-[11px] text-slate-400">Your results from this browser are added to your account when you log in.</p>
      <Link to="/login" state={{ from: location.pathname }} className="inline-flex px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-btn">
        Log in to unlock
      </Link>
    </div>
  )
}
