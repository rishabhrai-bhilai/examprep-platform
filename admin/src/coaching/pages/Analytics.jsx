// 8. Subject-wise and topic (chapter)-wise analytics
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useCoaching, useWorkspace, fmtSec } from '../api'
import { Load, Panel, PageTitle, BatchSelect, ExportButtons, pctTone } from '../kit'
import { Pill, fmtPct } from '../../components/ui'
import { BarList } from '../charts'
import { downloadXlsx, subjectSheet } from '../reports'

export default function Analytics() {
  const { batchId, info } = useWorkspace()
  const state = useCoaching('/analytics', { batchId })
  const [open, setOpen] = useState(null)
  return (
    <div className="space-y-6">
      <PageTitle title="Subjects & chapters" subtitle="Accuracy over every practice and test answer, by subject and chapter"
        right={<><BatchSelect />{state.data && <ExportButtons onXlsx={() => downloadXlsx([subjectSheet(state.data.subjects)], `${info.centre.name}-subjects`)} />}</>} />
      <Load state={state}>{(d) => (
        <div className="grid lg:grid-cols-5 gap-6">
          <Panel title="Accuracy by subject" subtitle={`${d.totalAnswers.toLocaleString('en-IN')} answers · overall ${fmtPct(d.accuracy)}`} className="lg:col-span-2">
            <BarList rows={d.subjects.map(s => ({ key: s.subject, label: s.subject, value: s.accuracy }))} tone={(r) => (r.value < 45 ? 'bg-rose-500' : 'bg-primary')} />
            <p className="text-[10px] text-slate-400 mt-3">Red bars are under 45%.</p>
          </Panel>
          <Panel title="Chapters" subtitle="Open a subject to see its chapters" className="lg:col-span-3" pad="p-0">
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {d.subjects.map(s => (
                <div key={s.subject}>
                  <button className="w-full grid grid-cols-[1rem_1fr_auto_auto_auto] items-center gap-3 px-5 py-3 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40" onClick={() => setOpen(open === s.subject ? null : s.subject)} aria-expanded={open === s.subject}>
                    {open === s.subject ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="font-bold truncate">{s.subject}</span>
                    <span className="text-slate-500 tabular-nums">{s.answers} ans</span>
                    <span className="text-slate-500 tabular-nums w-14 text-right">{fmtSec(s.avgTimeSec)}</span>
                    <Pill tone={pctTone(s.accuracy)}>{fmtPct(s.accuracy)}</Pill>
                  </button>
                  {open === s.subject && (
                    <div className="px-5 pb-4">
                      <table className="w-full text-xs">
                        <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-400"><th className="py-1">Chapter</th><th className="text-right">Answers</th><th className="text-right">Students</th><th className="text-right">Avg time</th><th className="text-right">Accuracy</th></tr></thead>
                        <tbody className="divide-y divide-border-light dark:divide-border-dark">
                          {s.chapters.map(c => (
                            <tr key={c.chapter}>
                              <td className="py-1.5">{c.chapter}</td>
                              <td className="text-right tabular-nums">{c.answers}</td>
                              <td className="text-right tabular-nums">{c.students}</td>
                              <td className="text-right tabular-nums text-slate-500">{fmtSec(c.avgTimeSec)}</td>
                              <td className="text-right"><Pill tone={pctTone(c.accuracy)}>{fmtPct(c.accuracy)}</Pill></td>
                            </tr>
                          ))}
                          <tr><td className="py-1.5 text-slate-500 italic">Subject score in tests (marks gained / available)</td><td colSpan={3} /><td className="text-right font-bold">{fmtPct(s.testScorePct)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}</Load>
    </div>
  )
}
