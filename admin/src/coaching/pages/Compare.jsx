// 13. Batch comparison
import { useCoaching, useWorkspace } from '../api'
import { Load, Panel, PageTitle, ExportButtons, pctTone } from '../kit'
import { Pill, fmtPct } from '../../components/ui'
import { GroupedBars, Legend, SERIES } from '../charts'
import { downloadXlsx } from '../reports'

const METRICS = [
  ['avgPercent', 'Average test score', '%'],
  ['accuracy', 'Practice accuracy', '%'],
  ['activeRate', 'Active in last 2 days', '%'],
  ['minutesPerStudent7', 'Minutes per student (7 days)', ' min'],
  ['syllabusPercent', 'Course covered', '%'],
  ['assignmentRate', 'Assignments submitted', '%']
]

export default function Compare() {
  const info = useWorkspace(s => s.info)
  const state = useCoaching('/compare')
  return (
    <Load state={state}>{(d) => {
      const best = Object.fromEntries(METRICS.map(([k]) => [k, Math.max(...d.batches.map(b => b[k] ?? -1))]))
      const exportXlsx = () => downloadXlsx([
        { name: 'Batches', rows: [['Metric', ...d.batches.map(b => b.name)], ['Students', ...d.batches.map(b => b.students)], ...METRICS.map(([k, label]) => [label, ...d.batches.map(b => b[k] ?? '')])] },
        { name: 'Subjects', rows: [['Subject', ...d.batches.map(b => b.name)], ...d.subjects.map(s => [s, ...d.batches.map(b => b.subjects[s] ?? '')])] },
        { name: 'Common tests', rows: [['Test', ...d.batches.map(b => b.name)], ...d.tests.map(t => [t.title, ...d.batches.map(b => t.perBatch[b.id] ?? '')])] }
      ], `${info.centre.name}-batch-comparison`)
      return (
        <div className="space-y-6">
          <PageTitle title="Batch comparison" subtitle="The same numbers side by side for every batch" right={<ExportButtons onXlsx={exportXlsx} />} />
          {d.batches.length < 2 && <p className="text-xs text-slate-400">Needs at least two batches.</p>}
          <Panel title="Key numbers" subtitle="Bold = best batch on that row" pad="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[560px]">
                <thead className="border-b border-border-light dark:border-border-dark">
                  <tr><th className="py-2.5 pl-5 text-left text-[10px] uppercase tracking-wider text-slate-400">Metric</th>{d.batches.map((b, i) => <th key={b.id} className="py-2.5 px-3 text-right text-[11px]"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[i] }} />{b.name}</span></th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  <tr><td className="py-2 pl-5 text-slate-500">Students</td>{d.batches.map(b => <td key={b.id} className="py-2 px-3 text-right tabular-nums">{b.students}</td>)}</tr>
                  {METRICS.map(([k, label, unit]) => (
                    <tr key={k}>
                      <td className="py-2 pl-5 text-slate-500">{label}</td>
                      {d.batches.map(b => <td key={b.id} className={`py-2 px-3 text-right tabular-nums ${b[k] === best[k] && d.batches.length > 1 ? 'font-black text-slate-900 dark:text-white' : ''}`}>{b[k] ?? '–'}{b[k] !== null && b[k] !== undefined ? unit : ''}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Accuracy by subject" right={<Legend items={d.batches.map(b => b.name)} />}>
            <GroupedBars categories={d.subjects} series={d.batches} valueOf={(subject, b) => b.subjects[subject] ?? null} />
          </Panel>
          <Panel title="Tests taken by more than one batch" subtitle="Average % per batch" pad="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[560px]">
                <thead className="border-b border-border-light dark:border-border-dark"><tr><th className="py-2.5 pl-5 text-left text-[10px] uppercase tracking-wider text-slate-400">Test</th>{d.batches.map(b => <th key={b.id} className="py-2.5 px-3 text-right text-[11px]">{b.name}</th>)}</tr></thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {d.tests.map(t => (
                    <tr key={t.id}><td className="py-2 pl-5 font-semibold">{t.title}</td>{d.batches.map(b => <td key={b.id} className="py-2 px-3 text-right">{t.perBatch[b.id] === null ? '–' : <Pill tone={pctTone(t.perBatch[b.id])}>{fmtPct(t.perBatch[b.id])}</Pill>}</td>)}</tr>
                  ))}
                  {!d.tests.length && <tr><td colSpan={d.batches.length + 1} className="py-8 text-center text-slate-400">No common tests yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )
    }}</Load>
  )
}
