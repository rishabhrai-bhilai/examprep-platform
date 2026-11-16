// 16. Student activity tracking
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity as ActivityIcon, Clock, UserX, Users } from 'lucide-react'
import { useCoaching, useWorkspace, fmtMin } from '../api'
import { Load, Panel, PageTitle, BatchSelect, ExportButtons, StudentLink } from '../kit'
import { StatTile, DailyBars, Pill, fmtDate } from '../../components/ui'
import { Heatmap, HourBars } from '../charts'
import { downloadXlsx } from '../reports'

const TONE = { active: ['good', 'Active'], slowing: ['warning', 'Slowing'], inactive: ['critical', 'Inactive'], never: ['muted', 'Never'] }

export default function Activity() {
  const { cid, batchId, info } = useWorkspace()
  const navigate = useNavigate()
  const [days, setDays] = useState(30)
  const [show, setShow] = useState('')
  const state = useCoaching('/activity', { batchId, days })
  return (
    <div className="space-y-6">
      <PageTitle title="Student activity" subtitle="Practice and test time per day, from every answer students give"
        right={<>
          <BatchSelect />
          <select className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 border border-border-light dark:border-border-dark" value={days} onChange={e => setDays(Number(e.target.value))} aria-label="Period"><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option></select>
          {state.data && <ExportButtons onXlsx={() => downloadXlsx([
            { name: 'Daily', rows: [['Date', 'Active students', 'Answers', 'Minutes', 'Tests'], ...state.data.days.map(d => [d.date, d.active, d.answers, d.minutes, d.tests])] },
            { name: 'Students', rows: [['Student', 'Batch', 'Status', 'Last active', 'Active days (7)', ...state.data.days.map(d => d.date)], ...state.data.students.map(s => [s.name, s.batch || '', s.status, s.lastActive ? fmtDate(s.lastActive) : 'Never', s.activeDays7, ...s.minutes])] }
          ], `${info.centre.name}-activity`)} />}
        </>} />
      <Load state={state}>{(d) => {
        const total = d.days.reduce((n, x) => n + x.minutes, 0)
        const avgActive = Math.round(d.days.reduce((n, x) => n + x.active, 0) / Math.max(1, d.days.length))
        const rows = d.students.filter(s => !show || s.status === show)
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile icon={Users} label="Students" value={d.students.length} />
              <StatTile icon={ActivityIcon} label="Active per day" value={avgActive} sub={`Average over ${days} days`} />
              <StatTile icon={Clock} label="Study time" value={fmtMin(total)} sub={`${fmtMin(Math.round(total / Math.max(1, d.students.length)))} per student`} />
              <StatTile icon={UserX} label="Not active (2+ days)" value={d.inactive} sub="Slowing, inactive or never" />
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <Panel title="Active students per day" className="lg:col-span-2">
                <DailyBars days={d.days} valueKey="active" detail={(x) => `${x.active} active · ${x.answers} answers · ${x.minutes} min · ${x.tests} tests`} />
              </Panel>
              <Panel title="Time of day"><HourBars hours={d.hours} /></Panel>
            </div>
            <Panel title="Minutes per student per day" subtitle="Click a name for their report"
              right={<div className="flex flex-wrap gap-1.5">{['', 'active', 'slowing', 'inactive', 'never'].map(s => <button key={s} onClick={() => setShow(s)} className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${show === s ? 'border-primary bg-primary/10 text-primary' : 'border-border-light dark:border-border-dark text-slate-500'}`}>{s ? TONE[s][1] : 'All'} ({s ? d.students.filter(x => x.status === s).length : d.students.length})</button>)}</div>}>
              <Heatmap rows={rows} days={d.days.map(x => x.date)} onRow={(r) => navigate(`/c/${cid}/students/${r.id}`)} />
            </Panel>
            <Panel title="Who to follow up with" subtitle="Not seen in more than 2 days, oldest first">
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
                {d.students.filter(s => s.status !== 'active').sort((a, b) => (a.lastActive || 0) - (b.lastActive || 0)).map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border-light dark:border-border-dark text-xs">
                    <span className="min-w-0 truncate"><StudentLink id={s.id} name={s.name} /> <span className="text-[10px] text-slate-400">{s.batch}</span></span>
                    <Pill tone={TONE[s.status][0]}>{s.lastActive ? fmtDate(s.lastActive) : 'Never'}</Pill>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )
      }}</Load>
    </div>
  )
}
