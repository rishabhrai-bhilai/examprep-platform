import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, Download, ChevronDown, ChevronUp, Flame, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import { studentsCsv, SITE_CSV_COLUMNS, downloadText, STUDENT_SORTS, sortStudents, activityStatus } from '../lib/instituteStats'
import { card, inputCls, btnPrimary, btnGhost, th, td, PageHeader, Spinner, ErrorBox, Pill, accuracyTone, fmtPct, fmtDate, rupees } from '../components/ui'
import { timeAgo } from '../../../src/utils/practiceStats'

const FILTERS = [
  ['all', 'Everyone'],
  ['paid', 'Has a series'],
  ['free', 'Free only'],
  ['centre', 'In a centre'],
  ['active', 'Active this week'],
  ['inactive', 'Inactive 30+ days']
]
const WEEK = 7 * 24 * 3600 * 1000
const matches = (s, filter, now) => {
  if (filter === 'paid') return s.activeSeries > 0
  if (filter === 'free') return !s.activeSeries
  if (filter === 'centre') return !!s.centre
  if (filter === 'active') return s.lastActive && now - s.lastActive <= WEEK
  if (filter === 'inactive') return !s.lastActive || now - s.lastActive > 30 * 24 * 3600 * 1000
  return true
}

const COLUMNS = [
  ['name', 'Student'], ['signedUp', 'Signed up'], ['solved', 'Solved'], ['accuracy', 'Accuracy'], ['streak', 'Streak'],
  ['mocks', 'Mocks'], [null, 'Weakest'], ['spent', 'Paid'], ['lastActive', 'Last active']
]

export default function StudentsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortKey, setSortKey] = useState('lastActive')
  const [sortDesc, setSortDesc] = useState(true)

  const load = () => {
    setLoading(true)
    api('/api/admin/students').then(d => { setData(d); setError('') }).catch(err => setError(err.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const students = useMemo(() => {
    const now = Date.now()
    const q = query.trim().toLowerCase()
    const list = (data?.students || []).filter(s => matches(s, filter, now) &&
      (!q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.centre || '').toLowerCase().includes(q)))
    return sortStudents(list, sortKey, sortDesc)
  }, [data, query, filter, sortKey, sortDesc])

  const setSort = (key) => {
    if (key === sortKey) setSortDesc(d => !d)
    else { setSortKey(key); setSortDesc(!STUDENT_SORTS[key].asc) }
  }

  if (!data) return error ? <ErrorBox>{error}</ErrorBox> : <Spinner />
  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        title="Students"
        subtitle={`${data.students.length} accounts · showing ${students.length}`}
        right={<>
          <button className={btnGhost} onClick={load} disabled={loading}><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh</button>
          <button className={btnPrimary} disabled={!students.length} onClick={() => downloadText(`examprep-students-${new Date().toISOString().slice(0, 10)}.csv`, studentsCsv(students, SITE_CSV_COLUMNS))}>
            <Download size={13} /> Export CSV
          </button>
        </>}
      />
      <ErrorBox>{error}</ErrorBox>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative lg:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} !pl-9 !py-2 text-xs`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, email or centre" aria-label="Search students" />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter students">
          {FILTERS.map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${filter === key ? 'bg-primary text-white border-primary' : 'border-border-light dark:border-border-dark text-slate-600 dark:text-slate-300 hover:border-primary'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-xs min-w-[980px]">
          <thead className="border-b border-border-light dark:border-border-dark">
            <tr>
              {COLUMNS.map(([key, label]) => (
                <th key={label} className={`${th} ${key && !['name', 'signedUp'].includes(key) ? 'text-right' : ''} first:pl-6`}>
                  {key ? (
                    <button onClick={() => setSort(key)} className={`inline-flex items-center gap-0.5 uppercase tracking-wider hover:text-primary ${sortKey === key ? 'text-primary' : ''}`}>
                      {label}{sortKey === key && (sortDesc ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
                    </button>
                  ) : label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {students.map(s => {
              const status = activityStatus(s.lastActive)
              return (
                <tr key={s.id} onClick={() => navigate(`/students/${s.id}`)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className={`${td} pl-6`}>
                    <div className="flex items-center gap-2.5">
                      {s.avatar ? <img src={s.avatar} alt="" className="h-8 w-8 rounded-full bg-slate-100 object-cover" /> : <div className="h-8 w-8 rounded-full bg-slate-200" />}
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[14rem]">{s.name}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[14rem]">{s.email}{s.centre ? ` · ${s.centre}` : ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`${td} text-slate-500 whitespace-nowrap`}>{fmtDate(s.signedUpAt)}</td>
                  <td className={`${td} text-right tabular-nums font-bold`}>{s.solved}<span className="text-slate-400 font-normal">/{s.attempted}</span></td>
                  <td className={`${td} text-right`}><Pill tone={accuracyTone(s.accuracy)}>{fmtPct(s.accuracy)}</Pill></td>
                  <td className={`${td} text-right tabular-nums`}>{s.streak > 0 ? <span className="inline-flex items-center gap-0.5"><Flame size={12} className="text-orange-500" />{s.streak}</span> : '0'}</td>
                  <td className={`${td} text-right tabular-nums`}>{s.mockCount ? <>{s.mockCount} <span className="text-slate-400">· {fmtPct(s.avgMockPercent)}</span></> : <span className="text-slate-400">–</span>}</td>
                  <td className={`${td} text-slate-600 dark:text-slate-300 max-w-[12rem] truncate`}>{s.weakestSubjects.length ? s.weakestSubjects.join(', ') : <span className="text-slate-400">–</span>}</td>
                  <td className={`${td} text-right tabular-nums`}>
                    {s.spentPaise ? <span className="font-bold">{rupees(s.spentPaise)}</span> : s.activeSeries ? <Pill tone="info">Access</Pill> : <span className="text-slate-400">–</span>}
                  </td>
                  <td className={`${td} text-right whitespace-nowrap pr-6`}>
                    <span className="text-slate-500 mr-2">{s.lastActive ? timeAgo(s.lastActive) : ''}</span>
                    <Pill tone={status.tone}>{status.label}</Pill>
                  </td>
                </tr>
              )
            })}
            {!students.length && <tr><td colSpan={COLUMNS.length} className="py-10 text-center text-slate-400">No students match.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
