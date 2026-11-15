import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Target, Flame, ClipboardList, Clock, Activity, Gift, Loader2, Package } from 'lucide-react'
import { api } from '../lib/api'
import { formatDuration, timeAgo } from '../../../src/utils/practiceStats'
import { activityStatus } from '../lib/instituteStats'
import {
  card, inputCls, btnPrimary, th, td, SectionTitle, StatTile, DailyBars, SubjectBars, MockTable, Spinner, ErrorBox,
  Pill, Confirm, fmtPct, fmtDate, rupees
} from '../components/ui'
import { loadSeriesOptions } from '../components/SeatsAndSeries'

const VIA = { purchase: 'Bought', grant: 'Given by admin', centre: 'Centre seat', admin: 'Admin' }
const ORDER_TONE = { paid: 'good', refunded: 'muted', revoked: 'muted', failed: 'critical' }

function GrantAccess({ studentId, has, onDone }) {
  const [options, setOptions] = useState([])
  const [seriesId, setSeriesId] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { loadSeriesOptions().then(setOptions).catch(() => {}) }, [])
  const available = options.filter(s => !has.includes(s.id))

  const grant = async (e) => {
    e.preventDefault()
    if (!seriesId) return
    setBusy(true)
    setError('')
    try {
      await api(`/api/admin/students/${studentId}/grants`, { method: 'POST', body: { seriesId, note } })
      setSeriesId('')
      setNote('')
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={grant} className="space-y-2">
      <p className="text-[11px] font-bold text-slate-500">Give a series without online payment (e.g. paid by UPI or bank transfer)</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <select className={`${inputCls} sm:!w-56`} value={seriesId} onChange={e => setSeriesId(e.target.value)} aria-label="Series to give">
          <option value="">Choose a series…</option>
          {available.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        <input className={inputCls} value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional), e.g. UPI ref 4821" maxLength={200} aria-label="Note" />
        <button className={btnPrimary} disabled={busy || !seriesId}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Gift size={13} />} Give access</button>
      </div>
      <ErrorBox>{error}</ErrorBox>
    </form>
  )
}

export default function StudentDetailPage() {
  const { id } = useParams()
  const [student, setStudent] = useState(null)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => api(`/api/admin/students/${id}`).then(d => setStudent(d.student)).catch(err => setError(err.message)), [id])
  useEffect(() => { load() }, [load])

  const act = async (order, action) => {
    setBusy(true)
    setError('')
    try {
      await api(`/api/admin/orders/${order.id}/${action}`, { method: 'POST' })
      setConfirm(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!student) return error ? <div className="space-y-3"><ErrorBox>{error}</ErrorBox><Link to="/students" className="text-sm font-bold text-primary">← Students</Link></div> : <Spinner />
  const status = activityStatus(student.lastActive)
  const spent = student.orders.filter(o => o.status === 'paid').reduce((n, o) => n + o.amountPaise, 0)

  return (
    <div className="space-y-6">
      <Link to="/students" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-primary"><ArrowLeft size={14} /> Students</Link>
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {student.avatar ? <img src={student.avatar} alt="" className="h-14 w-14 rounded-full bg-slate-100 object-cover" /> : <div className="h-14 w-14 rounded-full bg-slate-200" />}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 truncate">{student.name}</h1>
          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{student.email}</span>
            {student.phone && <span>· {student.phone}</span>}
            <span>· {student.provider === 'google' ? 'Google account' : 'Email account'}</span>
            <Pill tone={status.tone}>{status.label}</Pill>
          </p>
        </div>
      </div>
      <ErrorBox>{error}</ErrorBox>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile icon={CheckCircle} label="Solved" value={student.solved} sub={`of ${student.attempted} tried`} />
        <StatTile icon={Target} label="Accuracy" value={fmtPct(student.accuracy)} sub={`${student.totalAnswers} answers`} />
        <StatTile icon={Flame} label="Streak" value={`${student.streak} d`} sub={`Best ${student.longestStreak} days`} />
        <StatTile icon={ClipboardList} label="Mock tests" value={student.mockCount} sub={`Avg ${fmtPct(student.avgMockPercent)} · best ${fmtPct(student.bestMockPercent)}`} />
        <StatTile icon={Clock} label="Practice time" value={formatDuration(student.practiceSec)} sub={`${student.activeDays} active days`} />
        <StatTile icon={Activity} label="Last active" value={student.lastActive ? timeAgo(student.lastActive) : '–'} sub={`Signed up ${fmtDate(student.signedUpAt)}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className={`${card} p-6 space-y-5`}>
          <SectionTitle title="Access and purchases" subtitle={`${rupees(spent)} paid in total${student.centre ? ` · in ${student.centre.name}` : ''}`} />
          {student.access.length === 0 ? <p className="text-xs text-slate-400">No test series.</p> : (
            <ul className="space-y-1.5">
              {student.access.map(a => (
                <li key={a.seriesId} className="flex items-center justify-between gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200"><Package size={13} className="text-primary" />{a.title}</span>
                  <span className="text-slate-500">{VIA[a.via]}{a.instituteName ? ` (${a.instituteName})` : ''} · {a.expiresAt ? `until ${fmtDate(a.expiresAt)}` : 'no expiry'}</span>
                </li>
              ))}
            </ul>
          )}
          <GrantAccess studentId={student.id} has={student.access.filter(a => a.via !== 'centre').map(a => a.seriesId)} onDone={load} />
          {student.orders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr><th className={`${th} pl-0`}>Series</th><th className={th}>Date</th><th className={`${th} text-right`}>Amount</th><th className={th}>Status</th><th className={`${th} pr-0`} /></tr></thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {student.orders.map(o => (
                    <tr key={o.id}>
                      <td className={`${td} pl-0 font-semibold`}>{o.seriesTitle}{o.couponCode && <span className="text-slate-400"> · {o.couponCode}</span>}</td>
                      <td className={`${td} text-slate-500 whitespace-nowrap`}>{fmtDate(o.paidAt || o.createdAt)}</td>
                      <td className={`${td} text-right tabular-nums font-bold`}>{o.amountPaise ? rupees(o.amountPaise) : o.source === 'admin' ? 'Given' : 'Free'}</td>
                      <td className={td}><Pill tone={ORDER_TONE[o.status] || 'muted'}>{o.status}</Pill></td>
                      <td className={`${td} pr-0 text-right whitespace-nowrap`}>
                        {o.status === 'paid' && (confirm === o.id ? (
                          <Confirm
                            busy={busy}
                            text={o.amountPaise ? `Refund ${rupees(o.amountPaise)}? Access ends now.` : 'Take back access?'}
                            label={o.amountPaise ? 'Refund' : 'Revoke'}
                            onConfirm={() => act(o, o.amountPaise ? 'refund' : 'revoke')}
                            onCancel={() => setConfirm(null)}
                          />
                        ) : (
                          <button className="font-bold text-slate-500 hover:text-rose-600" onClick={() => setConfirm(o.id)}>{o.amountPaise ? 'Refund' : 'Revoke'}</button>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className={`${card} p-6`}>
          <SectionTitle title="Last 30 days" subtitle="Questions answered per day" />
          <DailyBars days={student.activity} detail={d => `${d.attempts} answers, ${d.correct} correct`} />
          <div className="mt-6">
            <SectionTitle title="Subjects" subtitle="Accuracy across practice and mock tests. Under 60% is weak." />
            <SubjectBars rows={student.subjects} weak={student.weakestSubjects} />
          </div>
        </div>
      </div>

      <div className={`${card} p-6`}>
        <SectionTitle title={`Mock tests (${student.mocks.length})`} />
        <MockTable mocks={student.mocks} />
      </div>
    </div>
  )
}
