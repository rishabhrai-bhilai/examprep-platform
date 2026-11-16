// 6. Leaderboard: overall (average of tests) or one test, per batch or the whole centre
import { useState } from 'react'
import { Trophy, TrendingUp, Medal } from 'lucide-react'
import { useCoaching, useWorkspace } from '../api'
import { Load, Panel, PageTitle, StudentLink, ExportButtons, pctTone, BatchSelect } from '../kit'
import { inputCls, th, td, Pill, fmtPct } from '../../components/ui'
import { downloadXlsx } from '../reports'

const medal = (rank) => (rank <= 3 ? <Medal size={14} className={rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-slate-400' : 'text-orange-700'} aria-label={`Rank ${rank}`} /> : null)

export default function Leaderboard() {
  const { batchId, info } = useWorkspace()
  const [testId, setTestId] = useState('')
  const tests = useCoaching('/tests')
  const state = useCoaching('/leaderboard', { batchId, testId })
  const done = (tests.data?.tests || []).filter(t => t.attempts > 0)
  return (
    <div className="space-y-6">
      <PageTitle title="Leaderboard" subtitle={testId ? 'Ranked by score; ties broken by time taken' : 'Ranked by the average of every test taken'}
        right={<>
          <BatchSelect />
          <select className={`${inputCls} !w-auto !py-2 text-xs font-semibold`} value={testId} onChange={e => setTestId(e.target.value)} aria-label="Test">
            <option value="">Overall (all tests)</option>
            {done.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </>} />
      <Load state={state}>{(d) => (
        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title={d.test ? d.test.title : 'Overall'} className="lg:col-span-2" pad="p-0"
            right={<ExportButtons onXlsx={() => downloadXlsx([{ name: 'Leaderboard', rows: d.test
              ? [['Rank', 'Student', 'Batch', 'Score', 'Max', '%', 'Percentile', 'Time (min)'], ...d.rows.map(r => [r.rank, r.name, r.batch || '', r.score, r.maxScore, r.percent, r.percentile, Math.round(r.timeTaken / 60)])]
              : [['Rank', 'Student', 'Batch', 'Tests', 'Average %', 'Best %', 'Change (pts)'], ...d.rows.map(r => [r.rank, r.name, r.batch || '', r.tests, r.avgPercent, r.best, r.improvement ?? ''])] }], `${info.centre.name}-leaderboard`)} />}>
            <div className="overflow-x-auto px-1">
              <table className="w-full text-xs min-w-[560px]">
                <thead className="border-b border-border-light dark:border-border-dark">
                  {d.test
                    ? <tr><th className={`${th} pl-5`}>Rank</th><th className={th}>Student</th><th className={th}>Batch</th><th className={`${th} text-right`}>Score</th><th className={`${th} text-right`}>Percentile</th><th className={`${th} text-right pr-5`}>Time</th></tr>
                    : <tr><th className={`${th} pl-5`}>Rank</th><th className={th}>Student</th><th className={th}>Batch</th><th className={`${th} text-right`}>Tests</th><th className={`${th} text-right`}>Average</th><th className={`${th} text-right`}>Best</th><th className={`${th} text-right pr-5`}>Change</th></tr>}
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {d.rows.map(r => (
                    <tr key={r.studentId} className={r.rank <= 3 ? 'bg-amber-500/5' : ''}>
                      <td className={`${td} pl-5 font-black tabular-nums`}><span className="inline-flex items-center gap-1">{r.rank} {medal(r.rank)}</span></td>
                      <td className={td}><StudentLink id={r.studentId} name={r.name} /></td>
                      <td className={`${td} text-slate-500`}>{r.batch}</td>
                      {d.test ? <>
                        <td className={`${td} text-right tabular-nums`}><span className="font-bold">{r.score}</span><span className="text-slate-400">/{r.maxScore}</span> <Pill tone={pctTone(r.percent)}>{fmtPct(r.percent)}</Pill></td>
                        <td className={`${td} text-right tabular-nums`}>{r.percentile}</td>
                        <td className={`${td} text-right tabular-nums pr-5 text-slate-500`}>{Math.round(r.timeTaken / 60)} min</td>
                      </> : <>
                        <td className={`${td} text-right tabular-nums`}>{r.tests}</td>
                        <td className={`${td} text-right`}><Pill tone={pctTone(r.avgPercent)}>{fmtPct(r.avgPercent)}</Pill></td>
                        <td className={`${td} text-right tabular-nums`}>{fmtPct(r.best)}</td>
                        <td className={`${td} text-right tabular-nums pr-5 ${r.improvement > 0 ? 'text-emerald-600' : r.improvement < 0 ? 'text-rose-600' : 'text-slate-400'}`}>{r.improvement === null ? '–' : `${r.improvement > 0 ? '+' : ''}${r.improvement}`}</td>
                      </>}
                    </tr>
                  ))}
                  {!d.rows.length && <tr><td colSpan={7} className="py-10 text-center text-slate-400">No results yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
          <div className="space-y-6">
            <Panel title="Podium">
              <div className="flex items-end justify-center gap-3 h-40">
                {[1, 0, 2].map(i => d.rows[i] && (
                  <div key={i} className="flex flex-col items-center gap-1 w-24">
                    <span className="text-[11px] font-bold text-center line-clamp-2">{d.rows[i].name}</span>
                    <div className={`w-full rounded-t-xl flex items-start justify-center pt-1 text-white font-black ${i === 0 ? 'h-24 bg-amber-500' : i === 1 ? 'h-16 bg-slate-400' : 'h-12 bg-orange-700'}`}>{i + 1}</div>
                    <span className="text-[10px] text-slate-500">{fmtPct(d.test ? d.rows[i].percent : d.rows[i].avgPercent)}</span>
                  </div>
                ))}
              </div>
            </Panel>
            {!d.test && (
              <Panel title="Most improved" subtitle="Later tests minus earlier tests">
                <ul className="space-y-2">
                  {(d.improvers || []).map(r => (
                    <li key={r.studentId} className="flex items-center justify-between text-xs">
                      <StudentLink id={r.studentId} name={r.name} />
                      <span className={`font-bold tabular-nums flex items-center gap-1 ${r.improvement > 0 ? 'text-emerald-600' : 'text-slate-400'}`}><TrendingUp size={12} /> {r.improvement > 0 ? '+' : ''}{r.improvement}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
            <p className="text-[10px] text-slate-400 flex items-center gap-1"><Trophy size={12} /> Students see only their own rank (student-site view is a later step).</p>
          </div>
        </div>
      )}</Load>
    </div>
  )
}
