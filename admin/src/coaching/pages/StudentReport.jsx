// 9. Individual student report (with PDF / Excel download)
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Target, Trophy, BookOpen, ClipboardCheck } from 'lucide-react'
import { capi, useCoaching, useWorkspace, fmtMin } from '../api'
import { Load, Panel, PageTitle, ExportButtons, InsightList, AutomatedLabel, pctTone, DemoBadge } from '../kit'
import { StatTile, Pill, DailyBars, fmtPct, fmtDate } from '../../components/ui'
import { BarList, TrendLine } from '../charts'
import { studentPdf, studentWorkbook } from '../reports'

export default function StudentReport() {
  const { sid } = useParams()
  const { cid, info } = useWorkspace()
  const state = useCoaching(`/students/${sid}/report`)
  const ins = useCoaching('/insights', { studentId: sid })
  const pdf = async () => {
    const extra = await capi(cid, `/insights?studentId=${sid}`)
    studentPdf({ ...state.data, insights: extra.items }, info.centre)
  }
  return (
    <Load state={state}>{(r) => (
      <div className="space-y-6">
        <Link to={`/c/${cid}/students`} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-primary"><ArrowLeft size={12} /> Students</Link>
        <PageTitle
          title={<span className="flex flex-wrap items-center gap-2">{r.student.name} {info.centre.demo && <DemoBadge />}</span>}
          subtitle={`${r.student.batch || 'No batch'} · ${r.student.email || ''} · joined ${fmtDate(r.student.joinedAt)}`}
          right={<ExportButtons onPdf={pdf} onXlsx={() => studentWorkbook(r)} />}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile icon={Trophy} label="Batch rank" value={r.summary.rank ? `${r.summary.rank} / ${r.summary.batchSize}` : '–'} sub={`${r.summary.testsTaken} tests · ${r.summary.testsMissed} missed`} />
          <StatTile icon={Target} label="Average test" value={fmtPct(r.summary.avgPercent)} sub={`Last: ${fmtPct(r.summary.lastPercent)}`} />
          <StatTile icon={BookOpen} label="Practice" value={r.summary.answers} sub={`${fmtPct(r.summary.accuracy)} right · ${fmtMin(r.summary.minutes)}`} />
          <StatTile icon={ClipboardCheck} label="Assignments" value={`${r.summary.assignmentsDone}/${r.summary.assignmentsDue}`} sub={r.syllabus ? `Batch course: ${fmtPct(r.syllabus.percent)} covered` : ''} />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="Test scores" subtitle="Their % (solid) and the centre average (dashed)" className="lg:col-span-2">
            <TrendLine points={r.tests.map(t => ({ label: t.title, value: t.percent, compare: t.centreAvg }))} compare />
          </Panel>
          <Panel title="Automated insights" right={<AutomatedLabel />}>
            {ins.data ? <InsightList items={ins.data.items} /> : null}
          </Panel>
        </div>
        <Panel title="Tests">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-400"><th className="py-1.5">Test</th><th>Date</th><th className="text-right">Score</th><th className="text-right">%</th><th className="text-right">Right / wrong / skipped</th><th className="text-right">Batch rank</th><th className="text-right">Percentile</th><th className="text-right">Centre avg</th></tr></thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {r.tests.slice().reverse().map(t => (
                  <tr key={t.testId}>
                    <td className="py-2"><Link to={`/c/${cid}/tests/${t.testId}`} className="font-semibold hover:text-primary">{t.title}</Link></td>
                    <td className="text-slate-500">{fmtDate(t.submittedAt)}</td>
                    <td className="text-right tabular-nums">{t.score}/{t.maxScore}</td>
                    <td className="text-right"><Pill tone={pctTone(t.percent)}>{fmtPct(t.percent)}</Pill></td>
                    <td className="text-right tabular-nums text-slate-500">{t.correct} / {t.incorrect} / {t.unanswered}</td>
                    <td className="text-right tabular-nums">{t.batchRank ? `${t.batchRank}/${t.batchSize}` : '–'}</td>
                    <td className="text-right tabular-nums">{t.percentile ?? '–'}</td>
                    <td className="text-right tabular-nums text-slate-500">{fmtPct(t.centreAvg)}</td>
                  </tr>
                ))}
                {!r.tests.length && <tr><td colSpan={8} className="py-6 text-center text-slate-400">No tests yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Subject-wise accuracy" subtitle="Practice and test answers; batch average on the right">
            <BarList rows={r.subjects.map(s => ({ key: s.subject, label: s.subject, value: s.accuracy, batch: s.batchAccuracy }))} tone={(x) => (x.value < 45 ? 'bg-rose-500' : 'bg-primary')} right={(x) => `· batch ${fmtPct(x.batch)}`} />
          </Panel>
          <Panel title="Weak and strong chapters">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Weak</p>
            <BarList rows={r.weaknesses.weak.slice(0, 6).map(w => ({ key: w.chapter, label: `${w.chapter}`, value: w.accuracy, n: w.answers }))} tone={() => 'bg-rose-500'} right={(x) => `· ${x.n} ans`} empty="No weak chapters detected." />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-4 mb-2">Strong</p>
            <BarList rows={r.weaknesses.strong.map(w => ({ key: w.chapter, label: w.chapter, value: w.accuracy, n: w.answers }))} tone={() => 'bg-emerald-500'} right={(x) => `· ${x.n} ans`} empty="Not enough answers yet." />
          </Panel>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Study time" subtitle="Minutes per day, last 30 days">
            <DailyBars days={r.activity.days} valueKey="minutes" detail={(d) => `${d.minutes} min`} />
          </Panel>
          <Panel title="Assignments">
            <ul className="divide-y divide-border-light dark:divide-border-dark">
              {r.assignments.map(a => (
                <li key={a.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0"><p className="font-semibold truncate">{a.title}</p><p className="text-[10px] text-slate-400">Due {fmtDate(a.dueAt)}</p></div>
                  {a.submittedAt ? <Pill tone={a.late ? 'warning' : 'good'}>{a.marks !== null ? `${a.marks}/${a.maxMarks}` : 'Submitted'}{a.late ? ' · late' : ''}</Pill> : <Pill tone={a.status === 'open' ? 'muted' : 'critical'}>{a.status === 'open' ? 'Pending' : 'Missed'}</Pill>}
                </li>
              ))}
              {!r.assignments.length && <li className="py-6 text-center text-slate-400 text-xs">No assignments.</li>}
            </ul>
          </Panel>
        </div>
      </div>
    )}</Load>
  )
}
