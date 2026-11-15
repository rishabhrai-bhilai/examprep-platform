/* eslint-disable react-refresh/only-export-components */
// Shared look of the admin app: cards, buttons, pills, stat tiles and two small charts
import { useState } from 'react'
import { TrendingDown, Loader2, AlertCircle } from 'lucide-react'

export const card = 'rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft'
export const inputCls = 'w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/60 border border-border-light dark:border-border-dark focus:outline-none focus:border-primary'
export const btn = 'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50'
export const btnPrimary = `${btn} bg-primary text-white hover:opacity-90`
export const btnGhost = `${btn} border border-border-light dark:border-border-dark text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary`
export const btnDanger = `${btn} bg-rose-600 text-white hover:bg-rose-700`
export const th = 'py-2.5 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400'
export const td = 'py-2.5 px-3'

export const TONES = {
  good: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
  critical: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
  info: 'bg-primary/10 text-primary border-primary/25',
  muted: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
}
export const accuracyTone = (a) => (a === null || a === undefined ? 'muted' : a >= 70 ? 'good' : a >= 45 ? 'warning' : 'critical')
export const fmtPct = (v) => (v === null || v === undefined ? '–' : `${v}%`)
export const fmtDate = (t) => (t ? new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–')
export const fmtDateTime = (t) => (t ? new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '–')
export const shortDay = (key) => new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
// ₹499, or ₹99.50 when there are paise
export const rupees = (paise) => {
  const p = paise || 0
  return `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 })}`
}

export function Pill({ tone = 'muted', children }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${TONES[tone]}`}>{children}</span>
}

export function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark space-y-1 min-w-0">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-[10px] font-bold uppercase tracking-wider truncate">{label}</span>
        <Icon size={15} className="text-primary shrink-0" />
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-slate-100 truncate">{value}</div>
      {sub && <p className="text-[11px] text-slate-500 truncate">{sub}</p>}
    </div>
  )
}

export function SectionTitle({ title, subtitle, right }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
      <div>
        <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function PageHeader({ icon: Icon, title, subtitle, right }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && <div className="h-11 w-11 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Icon size={22} /></div>}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

export const Spinner = () => <div className="flex items-center justify-center py-24 text-slate-400"><Loader2 className="animate-spin" /></div>
export const ErrorBox = ({ children }) => children
  ? <div className="p-3 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2"><AlertCircle size={14} className="shrink-0" />{children}</div>
  : null

// One value per day: thin bars anchored to the baseline, hover for the numbers
export function DailyBars({ days, valueKey = 'attempts', detail, height = 'h-28' }) {
  const max = Math.max(1, ...days.map(d => d[valueKey]))
  const [hover, setHover] = useState(null)
  const shown = hover !== null ? days[hover] : null
  if (!days.length) return null
  return (
    <div>
      <div className="h-5 text-[11px] text-slate-600 dark:text-slate-300 font-semibold truncate">
        {shown ? `${shortDay(shown.date)}: ${detail(shown)}` : <span className="text-slate-400 font-normal">Hover a bar for the day&apos;s numbers</span>}
      </div>
      <div className={`flex items-end ${height} gap-[2px] border-b border-slate-200 dark:border-slate-700`} onMouseLeave={() => setHover(null)}>
        {days.map((d, i) => (
          <div key={d.date} className="flex-1 h-full flex items-end cursor-default" onMouseEnter={() => setHover(i)} title={`${shortDay(d.date)}: ${detail(d)}`}>
            <div
              className={`w-full rounded-t-[4px] transition-colors ${hover === i ? 'bg-primary' : 'bg-primary/60'}`}
              style={{ height: d[valueKey] ? `${Math.max(4, (d[valueKey] / max) * 100)}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>{shortDay(days[0].date)}</span>
        <span>Today</span>
      </div>
    </div>
  )
}

// Subject accuracy as a bar per row (the numbers are printed, so colour is never needed to read it)
export function SubjectBars({ rows, weak = [] }) {
  if (!rows.length) return <p className="text-xs text-slate-400 py-6 text-center">No answers yet.</p>
  return (
    <div className="space-y-2.5">
      {rows.map(r => {
        const isWeak = weak.includes(r.subject)
        return (
          <div key={r.subject} className="grid grid-cols-[minmax(0,14rem)_1fr_auto] items-center gap-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate flex items-center gap-1" title={r.subject}>
              {isWeak && <TrendingDown size={12} className="shrink-0 text-rose-500" aria-label="Weak subject" />}
              {r.subject}
            </span>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full ${isWeak ? 'bg-rose-500' : 'bg-primary'}`} style={{ width: `${r.accuracy ?? 0}%` }} />
            </div>
            <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300 w-28 text-right">
              <span className="font-bold">{fmtPct(r.accuracy)}</span> <span className="text-slate-400">· {r.answers} ans</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// A student's mock tests, newest first
export function MockTable({ mocks }) {
  if (!mocks.length) return <p className="text-xs text-slate-400 py-6 text-center">No mock tests taken yet.</p>
  return (
    <div className="max-h-72 overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="text-left text-[10px] uppercase tracking-wider text-slate-400">
          <tr><th className="py-1.5 pr-2">Test</th><th className="py-1.5 pr-2 text-right">Score</th><th className="py-1.5 text-right">Right / wrong</th></tr>
        </thead>
        <tbody className="divide-y divide-border-light dark:divide-border-dark">
          {mocks.map(m => (
            <tr key={`${m.testId}-${m.submittedAt}`}>
              <td className="py-1.5 pr-2">
                <div className="font-semibold text-slate-800 dark:text-slate-200">{m.title}</div>
                <div className="text-[10px] text-slate-400">{fmtDate(m.submittedAt)} · {Math.round(m.timeTaken / 60)} min</div>
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums whitespace-nowrap">
                <span className="font-bold">{m.score}</span><span className="text-slate-400">/{m.maxScore}</span>
                <div><Pill tone={accuracyTone(m.percent)}>{fmtPct(m.percent)}</Pill></div>
              </td>
              <td className="py-1.5 text-right tabular-nums text-slate-500">{m.correct} / {m.incorrect}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Ask before doing something that can't be undone
export function Confirm({ text, label = 'Confirm', onConfirm, onCancel, busy }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-500">{text}</span>
      <button className="font-bold text-rose-600" disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : label}</button>
      <button className="text-slate-500" onClick={onCancel}>Cancel</button>
    </span>
  )
}
