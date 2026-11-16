// 2. Admin dashboard: the centre at a glance
import { Link } from 'react-router-dom'
import { Users, ClipboardList, Target, Activity, BookOpen, CalendarClock, Megaphone, GraduationCap } from 'lucide-react'
import { useCoaching, useWorkspace } from '../api'
import { Load, Panel, PageTitle, InsightList, AutomatedLabel, StudentLink, pctTone } from '../kit'
import { StatTile, DailyBars, Pill, fmtPct, fmtDateTime, fmtDate } from '../../components/ui'
import { BarList } from '../charts'

const STATUS_TONE = { live: 'critical', scheduled: 'info', completed: 'muted', draft: 'muted' }

export default function Dashboard() {
  const cid = useWorkspace(s => s.cid)
  const state = useCoaching('/overview')
  return (
    <Load state={state}>{(d) => (
      <div className="space-y-6">
        <PageTitle title="Dashboard" subtitle="Students, tests, course progress and what needs attention" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile icon={Users} label="Students" value={d.totals.students} sub={`${d.totals.batches} batches · ${d.totals.faculty} faculty`} />
          <StatTile icon={Target} label="Average test score" value={fmtPct(d.totals.avgPercent)} sub={`${d.totals.testsCompleted} tests held`} />
          <StatTile icon={Activity} label="Active this week" value={d.totals.activeLast7} sub={`${d.totals.inactive} not seen in 2+ days`} />
          <StatTile icon={BookOpen} label="Course covered" value={fmtPct(d.totals.syllabusPercent)} sub="Average across batches" />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="Daily activity" subtitle="Students active per day, last 30 days" className="lg:col-span-2">
            <DailyBars days={d.days} valueKey="active" detail={(x) => `${x.active} active · ${x.answers} answers · ${x.minutes} min · ${x.tests} tests`} />
          </Panel>
          <Panel title="Upcoming and live tests" right={<Link to={`/c/${cid}/tests`} className="text-[11px] font-bold text-primary">All tests</Link>}>
            {d.upcoming.length ? (
              <ul className="space-y-2.5">
                {d.upcoming.map(t => (
                  <li key={t.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/c/${cid}/tests/${t.id}`} className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-primary">{t.title}</Link>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1"><CalendarClock size={11} /> {fmtDateTime(t.scheduledAt)} · {t.durationMin} min · {t.batches.join(', ') || 'All batches'}</p>
                    </div>
                    <Pill tone={STATUS_TONE[t.status]}>{t.status === 'live' ? `Live · ${t.attempts} in` : 'Scheduled'}</Pill>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-slate-400">Nothing scheduled.</p>}
          </Panel>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="Needs attention" right={<AutomatedLabel />} className="lg:col-span-2">
            <InsightList items={d.insights} />
            <Link to={`/c/${cid}/insights`} className="inline-block mt-3 text-[11px] font-bold text-primary">See all insights</Link>
          </Panel>
          <Panel title="Notice board" right={<Link to={`/c/${cid}/notices`} className="text-[11px] font-bold text-primary">Manage</Link>}>
            {d.notices.length ? d.notices.map(n => (
              <div key={n.id} className="py-2 border-b last:border-0 border-border-light dark:border-border-dark">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5"><Megaphone size={12} className="text-primary" /> {n.title} {n.priority === 'important' && <Pill tone="warning">Important</Pill>}</p>
                <p className="text-[11px] text-slate-500 line-clamp-2">{n.body}</p>
              </div>
            )) : <p className="text-xs text-slate-400">No notices.</p>}
          </Panel>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <Panel title="Batches" right={<Link to={`/c/${cid}/compare`} className="text-[11px] font-bold text-primary">Compare</Link>}>
            <BarList rows={d.batches.map(b => ({ key: b.id, label: b.name, value: b.avgPercent }))} right={(r) => `avg · ${d.batches.find(b => b.id === r.key).students} st`} />
            <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Course covered</p>
              <BarList rows={d.batches.map(b => ({ key: b.id, label: b.name, value: b.syllabusPercent }))} tone={() => 'bg-emerald-500'} />
            </div>
          </Panel>
          <Panel title="Top students" subtitle="Average of tests taken" right={<Link to={`/c/${cid}/leaderboard`} className="text-[11px] font-bold text-primary">Leaderboard</Link>}>
            <ol className="space-y-2">
              {d.top.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 min-w-0"><span className="w-5 text-slate-400 font-bold">{i + 1}</span><span className="truncate"><StudentLink id={s.id} name={s.name} /></span></span>
                  <span className="flex items-center gap-2"><span className="text-[10px] text-slate-400 truncate max-w-[7rem]">{s.batch}</span><Pill tone={pctTone(s.avgPercent)}>{fmtPct(s.avgPercent)}</Pill></span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="At risk" subtitle="Inactive, or averaging under 30%">
            <ul className="space-y-2">
              {d.atRisk.map(s => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate"><StudentLink id={s.id} name={s.name} /></span>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">{fmtPct(s.avgPercent)} · seen {s.lastActive ? fmtDate(s.lastActive) : 'never'}</span>
                </li>
              ))}
              {!d.atRisk.length && <li className="text-xs text-slate-400">No one right now.</li>}
            </ul>
          </Panel>
        </div>
        <Panel title="Recent tests" right={<span className="text-[10px] text-slate-400 flex items-center gap-1"><ClipboardList size={12} /> Evaluated automatically</span>}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[520px]">
              <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-400"><th className="py-1.5">Test</th><th>Date</th><th className="text-right">Attempts</th><th className="text-right">Average</th><th className="text-right">Top</th></tr></thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {d.recent.map(t => (
                  <tr key={t.id}>
                    <td className="py-2"><Link to={`/c/${cid}/tests/${t.id}`} className="font-semibold hover:text-primary">{t.title}</Link></td>
                    <td className="text-slate-500">{fmtDate(t.scheduledAt)}</td>
                    <td className="text-right tabular-nums">{t.attempts}/{t.eligible}</td>
                    <td className="text-right"><Pill tone={pctTone(t.avgPercent)}>{fmtPct(t.avgPercent)}</Pill></td>
                    <td className="text-right tabular-nums">{fmtPct(t.topPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <p className="text-[10px] text-slate-400 flex items-center gap-1"><GraduationCap size={12} /> Everything here is computed from the centre&apos;s tests, practice answers, assignments and course log.</p>
      </div>
    )}</Load>
  )
}
