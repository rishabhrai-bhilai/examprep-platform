// 7. Course completion tracking: chapters taught per batch, and how many students practised them
import { useState } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react'
import { capi, useCoaching, useWorkspace } from '../api'
import { Load, Panel, PageTitle, BatchSelect, ExportButtons } from '../kit'
import { Pill, ErrorBox, fmtPct, fmtDate } from '../../components/ui'
import { downloadXlsx } from '../reports'

export default function Syllabus() {
  const { cid, info, batchId } = useWorkspace()
  const [refresh, setRefresh] = useState(0)
  const [open, setOpen] = useState({})
  const [error, setError] = useState('')
  const state = useCoaching('/syllabus', { batchId }, refresh)
  const toggle = async (b, s, c) => {
    setError('')
    try {
      await capi(cid, '/syllabus', { method: 'PUT', body: { batchId: b.batchId, subject: s.subject, chapter: c.chapter, done: !c.done } })
      setRefresh(n => n + 1)
    } catch (err) { setError(err.message) }
  }
  return (
    <div className="space-y-6">
      <PageTitle title="Course progress" subtitle="Tick chapters as they're taught. 'Practised' is the share of the batch with 3+ answers in that chapter."
        right={<>
          <BatchSelect />
          {state.data && <ExportButtons onXlsx={() => downloadXlsx([{ name: 'Course progress', rows: [['Batch', 'Subject', 'Chapter', 'Taught', 'Taught on', 'By', 'Practised %'], ...state.data.batches.flatMap(b => b.subjects.flatMap(s => s.chapters.map(c => [b.batch, s.subject, c.chapter, c.done ? 'Yes' : 'No', c.doneAt ? fmtDate(c.doneAt) : '', c.by || '', c.practicedPct ?? ''])))] }], `${info.centre.name}-course-progress`)} />}
        </>} />
      <ErrorBox>{error}</ErrorBox>
      <Load state={state}>{(d) => (
        <div className="space-y-6">
          {!d.batches.length && <p className="text-xs text-slate-400">Create a batch first.</p>}
          {d.batches.map(b => (
            <Panel key={b.batchId} title={b.batch} subtitle={`${b.done} of ${b.total} chapters taught`}
              right={<div className="w-48"><div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${b.percent || 0}%` }} /></div><p className="text-[11px] font-bold text-right mt-1">{fmtPct(b.percent)}</p></div>}>
              <div className="grid md:grid-cols-2 gap-2">
                {b.subjects.map(s => {
                  const key = `${b.batchId}|${s.subject}`
                  return (
                    <div key={s.subject} className="rounded-2xl border border-border-light dark:border-border-dark">
                      <button className="w-full flex items-center gap-2 p-3 text-left" onClick={() => setOpen(o => ({ ...o, [key]: !o[key] }))} aria-expanded={!!open[key]}>
                        {open[key] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className="text-xs font-bold flex-1 truncate">{s.subject}</span>
                        <span className="text-[11px] text-slate-500 tabular-nums">{s.done}/{s.total}</span>
                        <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${s.percent || 0}%` }} /></div>
                      </button>
                      {open[key] && (
                        <ul className="px-3 pb-3 space-y-1">
                          {s.chapters.map(c => (
                            <li key={c.chapter} className="flex items-center gap-2 text-xs">
                              <button onClick={() => toggle(b, s, c)} aria-label={`${c.done ? 'Untick' : 'Tick'} ${c.chapter}`} className={c.done ? 'text-emerald-600' : 'text-slate-300 hover:text-primary'}>
                                {c.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                              </button>
                              <span className="flex-1 min-w-0 truncate">{c.chapter}</span>
                              {c.done && <span className="text-[10px] text-slate-400 whitespace-nowrap">{fmtDate(c.doneAt)}{c.by ? ` · ${c.by}` : ''}</span>}
                              <Pill tone={c.practicedPct >= 60 ? 'good' : c.practicedPct >= 30 ? 'warning' : 'muted'}>{fmtPct(c.practicedPct)} practised</Pill>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </Panel>
          ))}
        </div>
      )}</Load>
    </div>
  )
}
