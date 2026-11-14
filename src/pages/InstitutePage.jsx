import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  School, Users, Target, Flame, CheckCircle, ClipboardList, Activity, Download, RefreshCw,
  Copy, Check, Loader2, AlertCircle, Search, ChevronDown, ChevronUp, UserMinus, Plus,
  Settings2, Trash2, Link2, TrendingDown, Lock
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useInstituteStore } from '../store/useInstituteStore'
import { formatDuration, timeAgo } from '../utils/practiceStats'
import { studentsCsv, downloadText, STUDENT_SORTS, sortStudents, activityStatus } from '../utils/instituteStats'

const card = 'rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft'
const inputCls = 'w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/60 border border-border-light dark:border-border-dark focus:outline-none focus:border-primary'
const btn = 'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50'
const btnPrimary = `${btn} bg-primary text-white hover:opacity-90`
const btnGhost = `${btn} border border-border-light dark:border-border-dark text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary`

const TONES = {
  good: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
  critical: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25',
  muted: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
}
const accuracyTone = (a) => (a === null || a === undefined ? 'muted' : a >= 70 ? 'good' : a >= 45 ? 'warning' : 'critical')
const fmtPct = (v) => (v === null || v === undefined ? '–' : `${v}%`)
const fmtDate = (t) => (t ? new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '–')
const shortDay = (key) => new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const joinLink = (code) => `${window.location.origin}/profile?join=${code}`

function Pill({ tone = 'muted', children }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${TONES[tone]}`}>{children}</span>
}

function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <div className="p-4 rounded-2xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark space-y-1">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        <Icon size={15} className="text-primary" />
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{value}</div>
      {sub && <p className="text-[11px] text-slate-500 truncate">{sub}</p>}
    </div>
  )
}

function SectionTitle({ title, subtitle, right }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
      <div>
        <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

// Answers per day: one series, thin bars anchored to the baseline, hover for the numbers
function ActivityBars({ days, valueKey = 'attempts', detail }) {
  const max = Math.max(1, ...days.map(d => d[valueKey]))
  const [hover, setHover] = useState(null)
  const shown = hover !== null ? days[hover] : null
  return (
    <div>
      <div className="h-5 text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
        {shown ? `${shortDay(shown.date)}: ${detail(shown)}` : <span className="text-slate-400 font-normal">Hover a bar for the day&apos;s numbers</span>}
      </div>
      <div className="flex items-end h-28 gap-[2px] border-b border-slate-200 dark:border-slate-700" onMouseLeave={() => setHover(null)}>
        {days.map((d, i) => (
          <div
            key={d.date}
            className="flex-1 h-full flex items-end cursor-default"
            onMouseEnter={() => setHover(i)}
            title={`${shortDay(d.date)}: ${detail(d)}`}
          >
            <div
              className={`w-full rounded-t-[4px] transition-colors ${hover === i ? 'bg-primary' : 'bg-primary/60'}`}
              style={{ height: d[valueKey] ? `${Math.max(4, (d[valueKey] / max) * 100)}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
        <span>{shortDay(days[0].date)}</span>
        <span>Today</span>
      </div>
    </div>
  )
}

// Subject accuracy as a bar per row (the numbers are printed, so colour is never needed to read it)
function SubjectBars({ rows, weak = [] }) {
  if (!rows.length) return <p className="text-xs text-slate-400 py-6 text-center">No answers yet.</p>
  return (
    <div className="space-y-2.5">
      {rows.map(r => {
        const isWeak = weak.includes(r.subject)
        return (
          <div key={r.subject} className="grid grid-cols-[minmax(0,14rem)_1fr_auto] items-center gap-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate flex items-center gap-1" title={r.subject}>
              {isWeak && <TrendingDown size={12} className="shrink-0 text-rose-500" aria-label="Weak subject" />}
              {r.subject}
            </span>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className={`h-full rounded-full ${isWeak ? 'bg-rose-500' : 'bg-primary'}`} style={{ width: `${r.accuracy ?? 0}%` }} />
            </div>
            <span className="text-xs tabular-nums text-slate-600 dark:text-slate-300 w-28 text-right">
              <span className="font-bold">{fmtPct(r.accuracy)}</span> <span className="text-slate-400">· {r.answers} ans</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// --- Site admins: create a centre and see every centre ---
function CentresAdmin({ institutes, onCreated, onDeleted }) {
  const { createInstitute, deleteInstitute } = useInstituteStore()
  const [name, setName] = useState('')
  const [emails, setEmails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const created = await createInstitute(name, emails)
      setName('')
      setEmails('')
      onCreated(created)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    try {
      await deleteInstitute(id)
      setConfirmDelete(null)
      onDeleted(id)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className={`${card} p-6`}>
      <SectionTitle title="Coaching centres" subtitle="Only site admins see this. Each centre's admins sign in with the emails listed here." />
      <form onSubmit={create} className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-2">
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Centre name, e.g. Ace Academy Bhilai" aria-label="Centre name" />
        <input className={inputCls} value={emails} onChange={e => setEmails(e.target.value)} placeholder="Admin emails, comma separated" aria-label="Admin emails" />
        <button className={btnPrimary} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create centre</button>
      </form>
      {error && <p className="text-xs text-rose-600 mt-2 flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
      {institutes.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-[10px] uppercase tracking-wider text-slate-400">
              <tr><th className="py-2 pr-3">Centre</th><th className="py-2 pr-3">Code</th><th className="py-2 pr-3">Admins</th><th className="py-2 pr-3">Students</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {institutes.map(i => (
                <tr key={i.id}>
                  <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-200">{i.name}</td>
                  <td className="py-2 pr-3 font-mono">{i.code}</td>
                  <td className="py-2 pr-3 text-slate-500">{i.adminEmails.join(', ')}</td>
                  <td className="py-2 pr-3 tabular-nums">{i.memberCount}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {confirmDelete === i.id ? (
                      <>
                        <button onClick={() => remove(i.id)} className="text-rose-600 font-bold mr-2">Delete for good</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-slate-500">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDelete(i.id)} className="text-slate-400 hover:text-rose-600" aria-label={`Delete ${i.name}`}><Trash2 size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// --- Invite code, link and admins of one centre ---
function CentreSettings({ institute, onChange }) {
  const { updateInstitute } = useInstituteStore()
  const [copied, setCopied] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(institute.name)
  const [emails, setEmails] = useState(institute.adminEmails.join(', '))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmNewCode, setConfirmNewCode] = useState(false)

  useEffect(() => {
    setName(institute.name)
    setEmails(institute.adminEmails.join(', '))
  }, [institute])

  const copy = async (what, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      setError('Could not copy. Select the text and copy it instead.')
    }
  }

  const save = async (updates) => {
    setBusy(true)
    setError('')
    try {
      onChange(await updateInstitute(institute.id, updates))
      setConfirmNewCode(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`${card} p-5 space-y-4`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Invite students</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xl font-black tracking-[0.2em] text-slate-900 dark:text-slate-100">{institute.code}</span>
            <button className={btnGhost} onClick={() => copy('code', institute.code)}>{copied === 'code' ? <Check size={13} /> : <Copy size={13} />} Code</button>
            <button className={btnGhost} onClick={() => copy('link', joinLink(institute.code))}>{copied === 'link' ? <Check size={13} /> : <Link2 size={13} />} Join link</button>
          </div>
          <p className="text-[11px] text-slate-500">Students enter the code in Profile → &ldquo;Join your coaching centre&rdquo;, or open the join link.</p>
        </div>
        <button className={btnGhost + ' self-start lg:self-auto'} onClick={() => setOpen(o => !o)}>
          <Settings2 size={13} /> Centre settings {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border-light dark:border-border-dark">
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500">Centre name</span>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500">Admin emails (they see this dashboard)</span>
            <input className={inputCls} value={emails} onChange={e => setEmails(e.target.value)} />
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-2">
            <button className={btnPrimary} disabled={busy} onClick={() => save({ name, adminEmails: emails })}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
            </button>
            {!confirmNewCode ? (
              <button className={btnGhost} onClick={() => setConfirmNewCode(true)}><RefreshCw size={13} /> New invite code</button>
            ) : (
              <span className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">The old code stops working. Students already linked stay linked.</span>
                <button className="font-bold text-primary" disabled={busy} onClick={() => save({ regenerateCode: true })}>Make new code</button>
                <button className="text-slate-500" onClick={() => setConfirmNewCode(false)}>Cancel</button>
              </span>
            )}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-rose-600 flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
    </div>
  )
}

// --- One student's detail, opened from the table ---
function StudentDetail({ student, onRemove }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 p-5 bg-slate-50/70 dark:bg-slate-900/40">
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Student</p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-slate-500">Email</dt><dd className="text-slate-800 dark:text-slate-200 break-all">{student.email}</dd>
          <dt className="text-slate-500">Target year</dt><dd className="text-slate-800 dark:text-slate-200">{student.targetYear || '–'}</dd>
          <dt className="text-slate-500">Joined centre</dt><dd className="text-slate-800 dark:text-slate-200">{fmtDate(student.joinedAt)}</dd>
          <dt className="text-slate-500">On ExamPrep since</dt><dd className="text-slate-800 dark:text-slate-200">{fmtDate(student.signedUpAt)}</dd>
          <dt className="text-slate-500">Practice time</dt><dd className="text-slate-800 dark:text-slate-200">{formatDuration(student.practiceSec)}</dd>
          <dt className="text-slate-500">Active days</dt><dd className="text-slate-800 dark:text-slate-200">{student.activeDays}</dd>
          <dt className="text-slate-500">Longest streak</dt><dd className="text-slate-800 dark:text-slate-200">{student.longestStreak} days</dd>
          <dt className="text-slate-500">Answers given</dt><dd className="text-slate-800 dark:text-slate-200">{student.totalAnswers}</dd>
        </dl>
        <div className="pt-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Last 30 days</p>
          <ActivityBars days={student.activity} detail={d => `${d.attempts} answers, ${d.correct} correct`} />
        </div>
        <div className="pt-2">
          {!confirm ? (
            <button className="text-xs text-slate-400 hover:text-rose-600 inline-flex items-center gap-1" onClick={() => setConfirm(true)}><UserMinus size={13} /> Remove from centre</button>
          ) : (
            <span className="text-xs flex items-center gap-2">
              <span className="text-slate-500">Remove {student.name}? They can rejoin with the code.</span>
              <button className="font-bold text-rose-600" disabled={busy} onClick={async () => { setBusy(true); await onRemove(student); setBusy(false) }}>Remove</button>
              <button className="text-slate-500" onClick={() => setConfirm(false)}>Cancel</button>
            </span>
          )}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Subject accuracy (practice + mocks)</p>
        <SubjectBars rows={student.subjects} weak={student.weakestSubjects} />
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Mock tests ({student.mocks.length})</p>
        {student.mocks.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No mock tests taken yet.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                <tr><th className="py-1.5 pr-2">Test</th><th className="py-1.5 pr-2 text-right">Score</th><th className="py-1.5 text-right">Right / wrong</th></tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {student.mocks.map(m => (
                  <tr key={`${m.testId}-${m.submittedAt}`}>
                    <td className="py-1.5 pr-2">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{m.title}</div>
                      <div className="text-[10px] text-slate-400">{fmtDate(m.submittedAt)} · {Math.round(m.timeTaken / 60)} min</div>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums whitespace-nowrap">
                      <span className="font-bold">{m.score}</span><span className="text-slate-400">/{m.maxScore}</span>
                      <div><Pill tone={accuracyTone(m.percent)}>{fmtPct(m.percent)}</Pill></div>
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-500">{m.correct} / {m.incorrect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InstitutePage() {
  const { user, isAuthenticated } = useAuthStore()
  const { fetchInstitutes, fetchDashboard, removeStudent } = useInstituteStore()
  const [institutes, setInstitutes] = useState(null)
  const [canCreate, setCanCreate] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('solved')
  const [sortDesc, setSortDesc] = useState(true)
  const [expanded, setExpanded] = useState(null)

  const loadInstitutes = useCallback(async () => {
    try {
      const data = await fetchInstitutes()
      setInstitutes(data.institutes)
      setCanCreate(data.canCreate)
      setSelectedId(id => (data.institutes.some(i => i.id === id) ? id : data.institutes[0]?.id || null))
    } catch (err) {
      setError(err.message)
      setInstitutes([])
    }
  }, [fetchInstitutes])

  const loadDashboard = useCallback(async (id) => {
    if (!id) return setDashboard(null)
    setLoading(true)
    setError('')
    try {
      setDashboard(await fetchDashboard(id))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchDashboard])

  useEffect(() => { if (isAuthenticated) loadInstitutes() }, [isAuthenticated, loadInstitutes])
  useEffect(() => { loadDashboard(selectedId) }, [selectedId, loadDashboard])

  const students = useMemo(() => {
    const list = dashboard?.students || []
    const q = query.trim().toLowerCase()
    const filtered = q ? list.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) : list
    return sortStudents(filtered, sortKey, sortDesc)
  }, [dashboard, query, sortKey, sortDesc])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (institutes === null) {
    return <div className="flex items-center justify-center py-24 text-slate-400"><Loader2 className="animate-spin" /></div>
  }
  if (!institutes.length && !canCreate) {
    return (
      <div className={`${card} p-10 text-center max-w-xl mx-auto mt-10 space-y-2`}>
        <Lock className="mx-auto text-slate-400" />
        <h2 className="font-extrabold text-lg text-slate-900 dark:text-slate-100">Coaching dashboard</h2>
        <p className="text-sm text-slate-500">This page is for coaching-centre admins. If your centre uses ExamPrep, ask us to add {user?.email} as an admin.</p>
      </div>
    )
  }

  const institute = institutes.find(i => i.id === selectedId) || null
  const summary = dashboard?.summary
  const setSort = (key) => {
    if (key === sortKey) setSortDesc(d => !d)
    else { setSortKey(key); setSortDesc(!STUDENT_SORTS[key].asc) }
  }
  const replaceInstitute = (updated) => setInstitutes(list => list.map(i => (i.id === updated.id ? updated : i)))
  const exportCsv = () => {
    const slug = institute.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    downloadText(`${slug || 'centre'}-students-${new Date().toISOString().slice(0, 10)}.csv`, studentsCsv(students))
  }
  const onRemove = async (student) => {
    try {
      await removeStudent(institute.id, student.id)
      setExpanded(null)
      await Promise.all([loadDashboard(institute.id), loadInstitutes()])
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><School size={24} /></div>
          <div>
            <h2 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">{institute?.name || 'Coaching dashboard'}</h2>
            <p className="text-xs text-slate-500">
              {dashboard ? `Updated ${timeAgo(dashboard.generatedAt)} · ${summary.students} student${summary.students === 1 ? '' : 's'}` : 'Track your batch on ExamPrep'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {institutes.length > 1 && (
            <select className={`${inputCls} !w-auto !py-2 text-xs font-bold`} value={selectedId || ''} onChange={e => { setSelectedId(e.target.value); setExpanded(null) }} aria-label="Choose centre">
              {institutes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          )}
          {institute && (
            <>
              <button className={btnGhost} onClick={() => loadDashboard(institute.id)} disabled={loading}>
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <button className={btnPrimary} onClick={exportCsv} disabled={!students.length}><Download size={13} /> Export CSV</button>
            </>
          )}
        </div>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2"><AlertCircle size={14} />{error}</div>}

      {canCreate && (
        <CentresAdmin
          institutes={institutes}
          onCreated={(created) => { setInstitutes(list => [...list, created]); setSelectedId(created.id) }}
          onDeleted={(id) => { setInstitutes(list => list.filter(i => i.id !== id)); if (id === selectedId) setSelectedId(null); loadInstitutes() }}
        />
      )}

      {institute && <CentreSettings institute={institute} onChange={replaceInstitute} />}

      {institute && !dashboard && loading && <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>}

      {dashboard && summary.students === 0 && (
        <div className={`${card} p-10 text-center space-y-2`}>
          <Users className="mx-auto text-slate-400" />
          <p className="font-bold text-slate-800 dark:text-slate-200">No students yet</p>
          <p className="text-sm text-slate-500">Share the code <span className="font-mono font-bold">{institute.code}</span> or the join link with your batch. Their progress shows up here as soon as they join.</p>
        </div>
      )}

      {dashboard && summary.students > 0 && (
        <>
          {/* Batch summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatTile icon={Users} label="Students" value={summary.students} sub={`${summary.activeLast7} active this week`} />
            <StatTile icon={CheckCircle} label="Questions solved" value={summary.totalSolved} sub={`${summary.avgSolved ?? 0} per student on average`} />
            <StatTile icon={Target} label="Avg accuracy" value={fmtPct(summary.avgAccuracy)} sub="Across practice answers" />
            <StatTile icon={Flame} label="Avg streak" value={`${summary.avgStreak ?? 0} d`} sub="Current study streak" />
            <StatTile icon={ClipboardList} label="Mock attempts" value={summary.mockAttempts} sub={`${summary.tests.length} different tests`} />
            <StatTile icon={Activity} label="Avg mock score" value={fmtPct(summary.avgMockPercent)} sub="Mean of student averages" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className={`${card} p-6`}>
              <SectionTitle title="Batch activity" subtitle="Questions answered per day by the whole batch, last 30 days" />
              <ActivityBars days={summary.activity} detail={d => `${d.attempts} answers by ${d.activeStudents} student${d.activeStudents === 1 ? '' : 's'}`} />
            </div>
            <div className={`${card} p-6`}>
              <SectionTitle
                title="Subjects"
                subtitle="Batch accuracy per subject (practice + mock tests). Subjects under 60% are marked as weak."
              />
              {summary.weakestSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {summary.weakestSubjects.map(s => <Pill key={s.subject} tone="critical"><TrendingDown size={11} />{s.subject} · {fmtPct(s.accuracy)}</Pill>)}
                </div>
              )}
              <SubjectBars rows={summary.subjects} weak={summary.weakestSubjects.map(s => s.subject)} />
            </div>
          </div>

          {summary.tests.length > 0 && (
            <div className={`${card} p-6`}>
              <SectionTitle title="Mock tests" subtitle="How the batch did on each test (scores as a share of the maximum)" />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                    <tr><th className="py-2 pr-3">Test</th><th className="py-2 pr-3 text-right">Students</th><th className="py-2 pr-3 text-right">Average</th><th className="py-2 pr-3 text-right">Best</th><th className="py-2 text-right">Last taken</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {summary.tests.map(t => (
                      <tr key={t.testId}>
                        <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-200">{t.title}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{t.attempts}</td>
                        <td className="py-2 pr-3 text-right"><Pill tone={accuracyTone(t.avgPercent)}>{fmtPct(t.avgPercent)}</Pill></td>
                        <td className="py-2 pr-3 text-right tabular-nums font-bold">{fmtPct(t.bestPercent)}</td>
                        <td className="py-2 text-right text-slate-500">{timeAgo(t.lastAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Students */}
          <div className={`${card} overflow-hidden`}>
            <div className="p-6 pb-0">
              <SectionTitle
                title="Students"
                subtitle="Click a student for subjects, mock tests and daily activity."
                right={(
                  <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className={`${inputCls} !pl-9 !py-2 text-xs`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or email" aria-label="Search students" />
                  </div>
                )}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-b border-border-light dark:border-border-dark">
                  <tr>
                    {[['name', 'Student'], ['solved', 'Solved'], ['accuracy', 'Accuracy'], ['streak', 'Streak'], ['week', 'Last 7 days'], ['mocks', 'Mocks'], [null, 'Weakest subjects'], ['lastActive', 'Last active']].map(([key, label]) => (
                      <th key={label} className={`py-2.5 px-3 ${key && key !== 'name' ? 'text-right' : ''} first:pl-6`}>
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
                    const open = expanded === s.id
                    return (
                      <React.Fragment key={s.id}>
                        <tr
                          onClick={() => setExpanded(open ? null : s.id)}
                          className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 ${open ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}
                          aria-expanded={open}
                        >
                          <td className="py-2.5 px-3 pl-6">
                            <div className="flex items-center gap-2.5">
                              {s.avatar ? <img src={s.avatar} alt="" className="h-8 w-8 rounded-full bg-slate-100 object-cover" /> : <div className="h-8 w-8 rounded-full bg-slate-200" />}
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{s.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">{s.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-bold">{s.solved}<span className="text-slate-400 font-normal">/{s.attempted}</span></td>
                          <td className="py-2.5 px-3 text-right"><Pill tone={accuracyTone(s.accuracy)}>{fmtPct(s.accuracy)}</Pill></td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{s.streak > 0 ? <span className="inline-flex items-center gap-0.5"><Flame size={12} className="text-orange-500" />{s.streak}</span> : '0'}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{s.answersLast7}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{s.mockCount ? <>{s.mockCount} <span className="text-slate-400">· avg {fmtPct(s.avgMockPercent)}</span></> : <span className="text-slate-400">–</span>}</td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{s.weakestSubjects.length ? s.weakestSubjects.join(', ') : <span className="text-slate-400">–</span>}</td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-slate-500">{s.lastActive ? timeAgo(s.lastActive) : ''}</span>
                              <Pill tone={status.tone}>{status.label}</Pill>
                              {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                            </div>
                          </td>
                        </tr>
                        {open && (
                          <tr><td colSpan={8} className="p-0"><StudentDetail student={s} onRemove={onRemove} /></td></tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                  {students.length === 0 && (
                    <tr><td colSpan={8} className="py-10 text-center text-slate-400">No students match &ldquo;{query}&rdquo;.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
