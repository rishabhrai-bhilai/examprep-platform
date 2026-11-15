import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  School, Users, Target, Flame, CheckCircle, ClipboardList, Activity, Download, RefreshCw,
  Copy, Check, Loader2, Search, ChevronDown, ChevronUp, UserMinus,
  Settings2, Link2, TrendingDown, ArrowLeft, Armchair
} from 'lucide-react'
import { api, useAdminAuth } from '../lib/api'
import { formatDuration, timeAgo } from '../../../src/utils/practiceStats'
import { studentsCsv, downloadText, STUDENT_SORTS, sortStudents, activityStatus } from '../lib/instituteStats'
import {
  card, inputCls, btnPrimary, btnGhost, Pill, StatTile, SectionTitle, DailyBars, SubjectBars, MockTable,
  ErrorBox, Spinner, accuracyTone, fmtPct, fmtDate
} from '../components/ui'
import SeatsAndSeries from '../components/SeatsAndSeries'

// Students join on the student site, so the link points there (VITE_STUDENT_SITE_URL in the admin build)
const studentSite = (import.meta.env.VITE_STUDENT_SITE_URL || window.location.origin.replace('//admin.', '//')).replace(/\/$/, '')
const joinLink = (code) => `${studentSite}/profile?join=${code}`
const updateInstitute = async (id, updates) => (await api(`/api/institutes/${id}`, { method: 'PATCH', body: updates })).institute

// --- Invite code, link and admins of one centre ---
function CentreSettings({ institute, onChange, isSiteAdmin }) {
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
          {isSiteAdmin && (
            <div className="md:col-span-2">
              <SeatsAndSeries institute={institute} onSaved={onChange} />
            </div>
          )}
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
          <dt className="text-slate-500">Test series seat</dt><dd className="text-slate-800 dark:text-slate-200">{student.hasSeat ? 'Yes' : 'No'}</dd>
        </dl>
        <div className="pt-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Last 30 days</p>
          <DailyBars days={student.activity} detail={d => `${d.attempts} answers, ${d.correct} correct`} />
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
        <MockTable mocks={student.mocks} />
      </div>
    </div>
  )
}

export default function CentreDashboard() {
  const { id } = useParams()
  const isSiteAdmin = useAdminAuth(s => Boolean(s.user?.isAdmin))
  const [institute, setInstitute] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('solved')
  const [sortDesc, setSortDesc] = useState(true)
  const [expanded, setExpanded] = useState(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api(`/api/institutes/${id}/dashboard`)
      setDashboard(data)
      setInstitute(data.institute)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const students = useMemo(() => {
    const list = dashboard?.students || []
    const q = query.trim().toLowerCase()
    const filtered = q ? list.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) : list
    return sortStudents(filtered, sortKey, sortDesc)
  }, [dashboard, query, sortKey, sortDesc])

  if (!institute) return error ? <div className="space-y-4"><ErrorBox>{error}</ErrorBox><Link to="/centres" className="text-sm font-bold text-primary">← Centres</Link></div> : <Spinner />

  const summary = dashboard?.summary
  const setSort = (key) => {
    if (key === sortKey) setSortDesc(d => !d)
    else { setSortKey(key); setSortDesc(!STUDENT_SORTS[key].asc) }
  }
  const replaceInstitute = (updated) => { setInstitute(updated); loadDashboard() }
  const exportCsv = () => {
    const slug = institute.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    downloadText(`${slug || 'centre'}-students-${new Date().toISOString().slice(0, 10)}.csv`, studentsCsv(students))
  }
  const onRemove = async (student) => {
    try {
      await api(`/api/institutes/${institute.id}/members/${encodeURIComponent(student.id)}`, { method: 'DELETE' })
      setExpanded(null)
      await loadDashboard()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <Link to="/centres" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-primary"><ArrowLeft size={14} /> Centres</Link>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><School size={24} /></div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{institute.name}</h2>
            <p className="text-xs text-slate-500">
              {dashboard ? `Updated ${timeAgo(dashboard.generatedAt)} · ${summary.students} student${summary.students === 1 ? '' : 's'}` : 'Loading…'}
              {institute.series.length > 0 && <> · <Armchair size={11} className="inline -mt-0.5" /> {institute.memberCount}/{institute.seats} seats for {institute.series.map(s => s.title).join(', ')}</>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnGhost} onClick={loadDashboard} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className={btnPrimary} onClick={exportCsv} disabled={!students.length}><Download size={13} /> Export CSV</button>
        </div>
      </div>

      <ErrorBox>{error}</ErrorBox>

      <CentreSettings institute={institute} onChange={replaceInstitute} isSiteAdmin={isSiteAdmin} />

      {!dashboard && loading && <Spinner />}

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
              <DailyBars days={summary.activity} detail={d => `${d.attempts} answers by ${d.activeStudents} student${d.activeStudents === 1 ? '' : 's'}`} />
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
