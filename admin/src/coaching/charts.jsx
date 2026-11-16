/* eslint-disable react-refresh/only-export-components */
// Small charts for the coaching pages. Every value is also printed or shown on
// hover, so colour is never the only way to read them.
import { useState } from 'react'
import { shortDay } from '../components/ui'

export const SERIES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)']

// Labelled horizontal bars (0–100 by default): label and value on one line, the bar under them
export function BarList({ rows, max = 100, unit = '%', tone = () => 'bg-primary', right, empty = 'No data yet.' }) {
  if (!rows.length) return <p className="text-xs text-slate-400 py-6 text-center">{empty}</p>
  return (
    <div className="space-y-2.5">
      {rows.map(r => (
        <div key={r.key || r.label} title={`${r.label}: ${r.value ?? '–'}${unit}`}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{r.label}</span>
            <span className="tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <span className="font-bold">{r.value ?? '–'}{r.value !== null && r.value !== undefined ? unit : ''}</span>
              {right ? <span className="text-slate-400"> {right(r)}</span> : null}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className={`h-full rounded-full ${tone(r)}`} style={{ width: `${Math.max(0, Math.min(100, ((r.value ?? 0) / max) * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Legend for 2+ series
export function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
      {items.map((label, i) => (
        <span key={label} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i % SERIES.length] }} />{label}</span>
      ))}
    </div>
  )
}

// One group per category, one bar per series (e.g. subjects × batches)
export function GroupedBars({ categories, series, valueOf, unit = '%', max = 100 }) {
  const [hover, setHover] = useState(null)
  return (
    <div>
      <div className="h-5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
        {hover ? `${hover.category} · ${hover.series}: ${hover.value ?? '–'}${hover.value != null ? unit : ''}` : <span className="font-normal text-slate-400">Hover a bar for its value</span>}
      </div>
      <div className="overflow-x-auto">
        <div className="flex items-end gap-3 h-44 border-b border-slate-200 dark:border-slate-700 min-w-max px-1" onMouseLeave={() => setHover(null)}>
          {categories.map(c => (
            <div key={c} className="flex items-end gap-[2px] h-full">
              {series.map((s, i) => {
                const v = valueOf(c, s)
                return (
                  <div key={s.id || s} className="w-3 h-full flex items-end" onMouseEnter={() => setHover({ category: c, series: s.name || s, value: v })}>
                    <div className="w-full rounded-t-[3px]" style={{ height: v ? `${Math.max(2, (v / max) * 100)}%` : 0, background: SERIES[i % SERIES.length], opacity: hover && (hover.category !== c || hover.series !== (s.name || s)) ? 0.45 : 1 }} />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex gap-3 min-w-max px-1 mt-1">
          {categories.map(c => (
            <div key={c} className="text-[9px] text-slate-500 text-center leading-tight" style={{ width: `${series.length * 14 - 2}px` }} title={c}>
              <span className="block truncate">{c.split(/[ &]/)[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Line of percentages over time (a student's test scores), with an optional comparison line
export function TrendLine({ points, compare, height = 140 }) {
  const [hover, setHover] = useState(null)
  if (points.length < 2) return <p className="text-xs text-slate-400 py-6 text-center">Needs at least two tests.</p>
  const W = 600
  const H = height
  const pad = 18
  const x = (i) => pad + (i / (points.length - 1)) * (W - pad * 2)
  const y = (v) => H - pad - ((v ?? 0) / 100) * (H - pad * 2)
  const line = (key) => points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[key])}`).join(' ')
  return (
    <div>
      <div className="h-5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
        {hover !== null ? `${points[hover].label}: ${points[hover].value}%${compare ? ` (centre ${points[hover].compare ?? '–'}%)` : ''}` : <span className="font-normal text-slate-400">Hover the line for each test</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} onMouseLeave={() => setHover(null)}>
        {[0, 50, 100].map(v => <line key={v} x1={pad} x2={W - pad} y1={y(v)} y2={y(v)} className="stroke-slate-200 dark:stroke-slate-700" strokeDasharray={v === 50 ? '3 3' : undefined} />)}
        {compare && <path d={line('compare')} fill="none" stroke="var(--series-2)" strokeWidth="2" strokeDasharray="5 4" />}
        <path d={line('value')} fill="none" stroke="var(--series-1)" strokeWidth="2" />
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <rect x={x(i) - 20} y={0} width={40} height={H} fill="transparent" />
            <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 5 : 4} fill="var(--series-1)" className="stroke-white dark:stroke-slate-900" strokeWidth="2" />
          </g>
        ))}
      </svg>
    </div>
  )
}

// Students × days, darker = more minutes
export function Heatmap({ rows, days, onRow }) {
  const max = Math.max(30, ...rows.flatMap(r => r.minutes))
  const [hover, setHover] = useState(null)
  return (
    <div>
      <div className="h-5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
        {hover ? `${hover.name} · ${shortDay(hover.date)}: ${hover.minutes} min` : <span className="font-normal text-slate-400">Darker = more minutes that day. Hover a cell.</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="text-[10px] border-separate" style={{ borderSpacing: 2 }} onMouseLeave={() => setHover(null)}>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="pr-2 whitespace-nowrap max-w-[9rem] truncate">
                  <button className="font-semibold text-slate-700 dark:text-slate-300 hover:text-primary" onClick={() => onRow?.(r)}>{r.name}</button>
                </td>
                {r.minutes.map((m, i) => (
                  <td key={i} onMouseEnter={() => setHover({ name: r.name, date: days[i], minutes: m })}
                    className="w-3 h-3 min-w-3 rounded-[3px]"
                    style={{ background: m ? `color-mix(in srgb, var(--series-1) ${Math.round(35 + (m / max) * 65)}%, transparent)` : 'rgba(148,163,184,0.10)', outline: m ? 'none' : '1px solid rgba(148,163,184,0.12)', outlineOffset: '-1px' }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-slate-400 mt-1">Columns run from {days[0] ? shortDay(days[0]) : ''} (left) to today (right).</p>
    </div>
  )
}

// 24 bars, one per hour of the day
export function HourBars({ hours }) {
  const max = Math.max(1, ...hours)
  const [hover, setHover] = useState(null)
  const label = (h) => `${(h % 12) || 12} ${h < 12 ? 'am' : 'pm'}`
  return (
    <div>
      <div className="h-5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{hover !== null ? `${label(hover)}: ${hours[hover]} answers` : <span className="font-normal text-slate-400">When students practise (IST)</span>}</div>
      <div className="flex items-end h-24 gap-[2px] border-b border-slate-200 dark:border-slate-700" onMouseLeave={() => setHover(null)}>
        {hours.map((n, h) => (
          <div key={h} className="flex-1 h-full flex items-end" onMouseEnter={() => setHover(h)}>
            <div className={`w-full rounded-t-[3px] ${hover === h ? 'bg-primary' : 'bg-primary/60'}`} style={{ height: n ? `${Math.max(3, (n / max) * 100)}%` : 0 }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>12 am</span><span>6 am</span><span>12 pm</span><span>6 pm</span><span>11 pm</span></div>
    </div>
  )
}
