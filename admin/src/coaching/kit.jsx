/* eslint-disable react-refresh/only-export-components */
// Shared pieces of the coaching pages
import { Link } from 'react-router-dom'
import { FlaskConical, Download, FileSpreadsheet, AlertTriangle, AlertCircle, Info, ThumbsUp, Sparkles } from 'lucide-react'
import { useWorkspace } from './api'
import { card, inputCls, btnGhost, Spinner, ErrorBox, Pill } from '../components/ui'

export const DemoBadge = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider bg-amber-400/15 text-amber-700 dark:text-amber-300 border-amber-500/40 ${className}`} title="Made-up data for showing the app. Not real students.">
    <FlaskConical size={11} /> Demo data
  </span>
)

export function BatchSelect({ allLabel = 'All batches', value, onChange, className = '' }) {
  const info = useWorkspace(s => s.info)
  const batchId = useWorkspace(s => s.batchId)
  const setBatch = useWorkspace(s => s.setBatch)
  const current = value !== undefined ? value : batchId
  return (
    <select aria-label="Batch" className={`${inputCls} !w-auto !py-2 text-xs font-semibold ${className}`} value={current} onChange={e => (onChange || setBatch)(e.target.value)}>
      <option value="">{allLabel}</option>
      {(info?.batches || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
    </select>
  )
}

// Loading / error / content
export function Load({ state, children }) {
  if (state.error) return <ErrorBox>{state.error}</ErrorBox>
  if (!state.data) return <Spinner />
  return children(state.data)
}

export function Panel({ title, subtitle, right, children, className = '', pad = 'p-5' }) {
  return (
    <section className={`${card} ${pad} ${className}`}>
      {(title || right) && (
        <div className={`flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4 ${pad === 'p-0' ? 'px-5 pt-5' : ''}`}>
          <div className="min-w-0">
            {title && <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{title}</h3>}
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {right && <div className="flex flex-wrap items-center gap-2 shrink-0">{right}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function PageTitle({ title, subtitle, right }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  )
}

export const ExportButtons = ({ onPdf, onXlsx, busy }) => (
  <>
    {onPdf && <button className={btnGhost} onClick={onPdf} disabled={busy}><Download size={13} /> PDF</button>}
    {onXlsx && <button className={btnGhost} onClick={onXlsx} disabled={busy}><FileSpreadsheet size={13} /> Excel</button>}
  </>
)

export const Empty = ({ children }) => <p className="text-xs text-slate-400 py-8 text-center">{children}</p>

export const StudentLink = ({ id, name }) => {
  const cid = useWorkspace(s => s.cid)
  return <Link to={`/c/${cid}/students/${id}`} className="font-semibold text-slate-900 dark:text-slate-100 hover:text-primary">{name}</Link>
}

const SEVERITY = {
  critical: { icon: AlertCircle, tone: 'critical', label: 'Act now' },
  warning: { icon: AlertTriangle, tone: 'warning', label: 'Watch' },
  info: { icon: Info, tone: 'info', label: 'To do' },
  good: { icon: ThumbsUp, tone: 'good', label: 'Good news' }
}
export function InsightList({ items, compact = false }) {
  if (!items.length) return <Empty>Nothing stands out right now.</Empty>
  return (
    <ul className="space-y-2.5">
      {items.map(i => {
        const s = SEVERITY[i.severity] || SEVERITY.info
        const Icon = s.icon
        return (
          <li key={i.id} className="flex gap-3 p-3 rounded-2xl border border-border-light dark:border-border-dark bg-slate-50/60 dark:bg-slate-800/30">
            <Icon size={16} className={`shrink-0 mt-0.5 ${s.tone === 'critical' ? 'text-rose-600' : s.tone === 'warning' ? 'text-amber-600' : s.tone === 'good' ? 'text-emerald-600' : 'text-primary'}`} aria-hidden />
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{i.title}</span>
                <Pill tone={s.tone}>{s.label}</Pill>
              </div>
              {!compact && <p className="text-[11px] text-slate-600 dark:text-slate-400">{i.detail}</p>}
              {i.action && <p className="text-[11px] text-primary font-semibold">{i.action}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export const AutomatedLabel = () => (
  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500" title="Generated by rules from the centre's data. No AI model is called yet.">
    <Sparkles size={12} className="text-primary" /> Automated insights · rule-based
  </span>
)

export const pctTone = (v) => (v === null || v === undefined ? 'muted' : v >= 65 ? 'good' : v >= 45 ? 'warning' : 'critical')

// Same thresholds as the server (analytics.js activityStatus)
export const activityOf = (lastActive, now = Date.now()) => {
  if (!lastActive) return 'never'
  const d = (now - lastActive) / 86400000
  return d <= 2 ? 'active' : d <= 7 ? 'slowing' : 'inactive'
}
