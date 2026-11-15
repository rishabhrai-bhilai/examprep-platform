import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { School, Plus, Loader2, Trash2, ChevronRight } from 'lucide-react'
import { api, useAdminAuth } from '../lib/api'
import { card, inputCls, btnPrimary, th, td, PageHeader, SectionTitle, Spinner, ErrorBox, Confirm, fmtDate } from '../components/ui'
import { SeriesPicker } from '../components/SeatsAndSeries'

function CreateCentre({ onCreated }) {
  const [name, setName] = useState('')
  const [emails, setEmails] = useState('')
  const [seats, setSeats] = useState('0')
  const [seriesIds, setSeriesIds] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api('/api/institutes', { method: 'POST', body: { name, adminEmails: emails, seats: Number(seats), seriesIds } })
      setName(''); setEmails(''); setSeats('0'); setSeriesIds([])
      onCreated(data.institute)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={create} className={`${card} p-6 space-y-3`}>
      <SectionTitle title="New coaching centre" subtitle="Centre admins sign in to this admin app with the emails you list and see only their own students." />
      <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_7rem]">
        <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Centre name, e.g. Ace Academy Bhilai" aria-label="Centre name" />
        <input className={inputCls} value={emails} onChange={e => setEmails(e.target.value)} placeholder="Admin emails, comma separated" aria-label="Admin emails" />
        <input className={inputCls} type="number" min="0" value={seats} onChange={e => setSeats(e.target.value)} aria-label="Paid seats" title="Paid seats" />
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-bold text-slate-500">Test series the seats unlock (optional: leave empty for progress tracking only)</p>
        <SeriesPicker value={seriesIds} onChange={setSeriesIds} />
      </div>
      <button className={btnPrimary} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create centre</button>
      <ErrorBox>{error}</ErrorBox>
    </form>
  )
}

export default function CentresPage() {
  const isSiteAdmin = useAdminAuth(s => Boolean(s.user?.isAdmin))
  const [centres, setCentres] = useState(null)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = () => api('/api/institutes').then(d => setCentres(d.institutes)).catch(err => { setError(err.message); setCentres([]) })
  useEffect(() => { load() }, [])

  const remove = async (id) => {
    try {
      await api(`/api/institutes/${id}`, { method: 'DELETE' })
      setConfirmDelete(null)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!centres) return <Spinner />
  return (
    <div className="space-y-6">
      <PageHeader icon={School} title="Coaching centres" subtitle={isSiteAdmin ? `${centres.length} centre${centres.length === 1 ? '' : 's'}` : 'The centres you manage'} />
      <ErrorBox>{error}</ErrorBox>
      {isSiteAdmin && <CreateCentre onCreated={() => load()} />}
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-xs min-w-[720px]">
          <thead className="border-b border-border-light dark:border-border-dark">
            <tr>
              <th className={`${th} pl-6`}>Centre</th><th className={th}>Code</th><th className={th}>Admins</th>
              <th className={`${th} text-right`}>Students</th><th className={th}>Seats &amp; series</th><th className={th}>Created</th><th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {centres.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className={`${td} pl-6`}><Link to={`/centres/${c.id}`} className="font-bold text-slate-900 dark:text-slate-100 hover:text-primary">{c.name}</Link></td>
                <td className={`${td} font-mono`}>{c.code}</td>
                <td className={`${td} text-slate-500 max-w-[14rem] truncate`} title={c.adminEmails.join(', ')}>{c.adminEmails.join(', ')}</td>
                <td className={`${td} text-right tabular-nums font-bold`}>{c.memberCount}</td>
                <td className={`${td} text-slate-600 dark:text-slate-300`}>{c.series.length ? `${c.memberCount}/${c.seats} · ${c.series.map(s => s.title).join(', ')}` : <span className="text-slate-400">Progress only</span>}</td>
                <td className={`${td} text-slate-500`}>{fmtDate(c.createdAt)}</td>
                <td className={`${td} text-right whitespace-nowrap pr-6`}>
                  {confirmDelete === c.id ? (
                    <Confirm text="Delete this centre? Students stay on ExamPrep." label="Delete for good" onConfirm={() => remove(c.id)} onCancel={() => setConfirmDelete(null)} />
                  ) : (
                    <span className="inline-flex items-center gap-3">
                      {isSiteAdmin && <button onClick={() => setConfirmDelete(c.id)} className="text-slate-400 hover:text-rose-600" aria-label={`Delete ${c.name}`}><Trash2 size={14} /></button>}
                      <Link to={`/centres/${c.id}`} className="inline-flex items-center gap-0.5 font-bold text-primary">Open <ChevronRight size={13} /></Link>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!centres.length && <tr><td colSpan={7} className="py-10 text-center text-slate-400">No centres yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
