// 12. Weakness detection: chapters well under the group's own average
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useCoaching, useWorkspace } from '../api'
import { Load, Panel, PageTitle, BatchSelect, ExportButtons, StudentLink } from '../kit'
import { Pill, fmtPct } from '../../components/ui'
import { BarList } from '../charts'
import { downloadXlsx, weakSheet } from '../reports'

const Trend = ({ v }) => (v === null ? <span className="text-slate-400 text-[10px]">–</span>
  : v > 2 ? <span className="text-emerald-600 text-[10px] font-bold inline-flex items-center gap-0.5"><TrendingUp size={11} /> +{v}</span>
    : v < -2 ? <span className="text-rose-600 text-[10px] font-bold inline-flex items-center gap-0.5"><TrendingDown size={11} /> {v}</span>
      : <span className="text-slate-400 text-[10px] inline-flex items-center gap-0.5"><Minus size={11} /> flat</span>)

export default function Weaknesses() {
  const { batchId, info } = useWorkspace()
  const state = useCoaching('/weaknesses', { batchId })
  return (
    <div className="space-y-6">
      <PageTitle title="Weakness detection" subtitle="A chapter is flagged when its accuracy is under 45%, or 12+ points under the group's overall accuracy, with enough answers to trust it"
        right={<><BatchSelect />{state.data && <ExportButtons onXlsx={() => downloadXlsx([weakSheet(state.data.weak)], `${info.centre.name}-weak-chapters`)} />}</>} />
      <Load state={state}>{(d) => (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <Panel title="Weakest chapters" subtitle={`Group accuracy overall: ${fmtPct(d.overallAccuracy)}`} className="lg:col-span-2">
              <BarList rows={d.weak.slice(0, 12).map(w => ({ key: `${w.subject}|${w.chapter}`, label: `${w.chapter}`, value: w.accuracy, w }))} tone={() => 'bg-rose-500'} right={(r) => `· −${r.w.gap} pts`} empty="No weak chapters. Nice." />
            </Panel>
            <Panel title="Strongest chapters">
              <BarList rows={d.strong.map(w => ({ key: `${w.subject}|${w.chapter}`, label: w.chapter, value: w.accuracy }))} tone={() => 'bg-emerald-500'} empty="Not enough data yet." />
            </Panel>
          </div>
          <Panel title="Details" subtitle="Trend: last 14 days against earlier answers. Struggling: students under 40% with 3+ answers there." pad="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[760px]">
                <thead className="border-b border-border-light dark:border-border-dark"><tr className="text-left text-[10px] uppercase tracking-wider text-slate-400"><th className="py-2 pl-5">Chapter</th><th>Subject</th><th className="text-right">Accuracy</th><th className="text-right">Under avg</th><th className="text-right">Answers</th><th className="text-right">Trend</th><th className="pl-4">Struggling students</th></tr></thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {d.weak.map(w => (
                    <tr key={`${w.subject}|${w.chapter}`} className="align-top">
                      <td className="py-2 pl-5 font-semibold">{w.chapter}</td>
                      <td className="py-2 text-slate-500">{w.subject}</td>
                      <td className="py-2 text-right"><Pill tone={w.accuracy < 35 ? 'critical' : 'warning'}>{fmtPct(w.accuracy)}</Pill></td>
                      <td className="py-2 text-right tabular-nums">{w.gap}</td>
                      <td className="py-2 text-right tabular-nums">{w.answers}</td>
                      <td className="py-2 text-right"><Trend v={w.trend} /></td>
                      <td className="py-2 pl-4 pr-5">
                        <span className="font-bold">{w.strugglingStudents}</span>{' '}
                        <span className="text-slate-500">{w.struggling.map((s, i) => <span key={s.id}>{i ? ', ' : ''}<StudentLink id={s.id} name={s.name} /></span>)}{w.strugglingStudents > w.struggling.length ? ' …' : ''}</span>
                      </td>
                    </tr>
                  ))}
                  {!d.weak.length && <tr><td colSpan={7} className="py-10 text-center text-slate-400">No weak chapters detected.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
          {info.centre.demo && <p className="text-[10px] text-slate-400">Per-student weaknesses are on each student&apos;s report.</p>}
        </div>
      )}</Load>
    </div>
  )
}
