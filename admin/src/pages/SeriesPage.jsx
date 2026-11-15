import { useEffect, useMemo, useState } from 'react'
import { Package, Plus, Loader2, Check, X, Search, Eye, EyeOff, Trash2, Ticket, Pencil } from 'lucide-react'
import { api } from '../lib/api'
import { card, inputCls, btnPrimary, btnGhost, th, td, PageHeader, SectionTitle, Spinner, ErrorBox, Pill, Confirm, rupees, fmtDate } from '../components/ui'
import { forgetSeriesOptions } from '../components/SeatsAndSeries'

const label = 'space-y-1 block'
const labelText = 'text-[11px] font-bold text-slate-500'
const toRupees = (paise) => (paise === null || paise === undefined ? '' : String(paise / 100))
// Kinds of mock test, from their ids (shared/mockTests.js)
const kindOf = (id) => (id.startsWith('orig-full') ? 'Original full-length' : id.startsWith('orig-') ? 'Original sectional'
  : id.startsWith('full-') ? 'PYQ full-length' : id.includes('sectional') ? 'PYQ sectional' : 'Mini tests')

function TestPicker({ tests, value, onChange }) {
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const query = q.trim().toLowerCase()
    const map = {}
    tests.filter(t => !query || t.title.toLowerCase().includes(query) || t.subject.toLowerCase().includes(query))
      .forEach(t => { (map[kindOf(t.id)] || (map[kindOf(t.id)] = [])).push(t) })
    return Object.entries(map)
  }, [tests, q])
  const toggle = (id) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  const setGroup = (list, on) => onChange(on ? Array.from(new Set([...value, ...list.map(t => t.id)])) : value.filter(id => !list.some(t => t.id === id)))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className={labelText}>Tests in this series ({value.length} picked)</span>
        <div className="relative w-56">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} !pl-8 !py-1.5 text-xs`} value={q} onChange={e => setQ(e.target.value)} placeholder="Filter tests" aria-label="Filter tests" />
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto rounded-2xl border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
        {groups.map(([kind, list]) => {
          const all = list.every(t => value.includes(t.id))
          return (
            <div key={kind}>
              <div className="sticky top-0 flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>{kind} ({list.length})</span>
                <button type="button" className="text-primary normal-case tracking-normal" onClick={() => setGroup(list, !all)}>{all ? 'Clear all' : 'Pick all'}</button>
              </div>
              {list.map(t => (
                <label key={t.id} className="flex items-center gap-2.5 px-3 py-1.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <input type="checkbox" className="accent-primary" checked={value.includes(t.id)} onChange={() => toggle(t.id)} />
                  <span className="flex-1 min-w-0 truncate text-slate-800 dark:text-slate-200">{t.title}</span>
                  <span className="text-slate-400 shrink-0">{t.totalQuestions} Q · {t.durationMinutes} min</span>
                </label>
              ))}
            </div>
          )
        })}
        {!groups.length && <p className="p-4 text-xs text-slate-400 text-center">No tests match.</p>}
      </div>
    </div>
  )
}

function SeriesEditor({ series, tests, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    title: series?.title || '',
    description: series?.description || '',
    price: toRupees(series?.pricePaise ?? 49900),
    mrp: toRupees(series?.mrpPaise),
    validityDays: series?.validityDays ?? '',
    testIds: series?.testIds || [],
    published: !!series?.published
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = { ...form, validityDays: form.validityDays === '' ? null : Number(form.validityDays) }
      const data = series
        ? await api(`/api/admin/series/${series.id}`, { method: 'PATCH', body })
        : await api('/api/admin/series', { method: 'POST', body })
      forgetSeriesOptions()
      onSaved(data.series)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className={`${card} p-6 space-y-4`}>
      <SectionTitle title={series ? `Edit ${series.title}` : 'New test series'} subtitle="Tests in any series are locked for everyone else. Tests in no series stay free." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <label className={label}><span className={labelText}>Title</span><input className={inputCls} value={form.title} onChange={set('title')} placeholder="GATE CS 2027 Full Test Series" /></label>
          <label className={label}><span className={labelText}>Description (shown on the store)</span><textarea className={`${inputCls} min-h-28`} value={form.description} onChange={set('description')} maxLength={2000} /></label>
          <div className="grid grid-cols-3 gap-3">
            <label className={label}><span className={labelText}>Price (₹)</span><input className={inputCls} type="number" min="0" step="1" value={form.price} onChange={set('price')} /></label>
            <label className={label}><span className={labelText}>Struck-out price (₹)</span><input className={inputCls} type="number" min="0" step="1" value={form.mrp} onChange={set('mrp')} placeholder="Optional" /></label>
            <label className={label}><span className={labelText}>Access (days)</span><input className={inputCls} type="number" min="1" value={form.validityDays} onChange={set('validityDays')} placeholder="No expiry" /></label>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
            <input type="checkbox" className="accent-primary" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
            Published (on sale in the store)
          </label>
        </div>
        <TestPicker tests={tests} value={form.testIds} onChange={ids => setForm(f => ({ ...f, testIds: ids }))} />
      </div>
      <div className="flex items-center gap-2">
        <button className={btnPrimary} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {series ? 'Save changes' : 'Create series'}</button>
        <button type="button" className={btnGhost} onClick={onCancel}><X size={13} /> Cancel</button>
      </div>
      <ErrorBox>{error}</ErrorBox>
    </form>
  )
}

function Coupons({ series }) {
  const [coupons, setCoupons] = useState(null)
  const [form, setForm] = useState({ code: '', percentOff: '20', maxUses: '', expiresAt: '', seriesIds: [] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const load = () => api('/api/admin/coupons').then(d => setCoupons(d.coupons)).catch(err => setError(err.message))
  useEffect(() => { load() }, [])
  const titleOf = (id) => series.find(s => s.id === id)?.title || 'Deleted series'

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/api/admin/coupons', { method: 'POST', body: { ...form, maxUses: form.maxUses || null, expiresAt: form.expiresAt ? `${form.expiresAt}T23:59:59+05:30` : null } })
      setForm({ code: '', percentOff: '20', maxUses: '', expiresAt: '', seriesIds: [] })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const patch = async (c, body) => {
    try { await api(`/api/admin/coupons/${c.id}`, { method: 'PATCH', body }); load() } catch (err) { setError(err.message) }
  }
  const remove = async (c) => {
    try { await api(`/api/admin/coupons/${c.id}`, { method: 'DELETE' }); setConfirmDelete(null); load() } catch (err) { setError(err.message) }
  }

  return (
    <div className={`${card} p-6 space-y-4`}>
      <SectionTitle title="Coupons" subtitle="Percentage off. A 100% coupon gives the series for free." />
      <form onSubmit={create} className="grid gap-2 md:grid-cols-[1fr_6rem_7rem_10rem_minmax(0,1fr)_auto] items-end">
        <label className={label}><span className={labelText}>Code</span><input className={`${inputCls} uppercase`} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="EARLYBIRD" /></label>
        <label className={label}><span className={labelText}>% off</span><input className={inputCls} type="number" min="1" max="100" value={form.percentOff} onChange={e => setForm(f => ({ ...f, percentOff: e.target.value }))} /></label>
        <label className={label}><span className={labelText}>Max uses</span><input className={inputCls} type="number" min="1" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="Unlimited" /></label>
        <label className={label}><span className={labelText}>Expires</span><input className={inputCls} type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} /></label>
        <label className={label}>
          <span className={labelText}>Series</span>
          <select className={inputCls} value={form.seriesIds[0] || ''} onChange={e => setForm(f => ({ ...f, seriesIds: e.target.value ? [e.target.value] : [] }))}>
            <option value="">Every series</option>
            {series.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </label>
        <button className={`${btnPrimary} py-2.5`} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add</button>
      </form>
      <ErrorBox>{error}</ErrorBox>
      {coupons && coupons.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead><tr><th className={`${th} pl-0`}>Code</th><th className={th}>Off</th><th className={th}>Series</th><th className={`${th} text-right`}>Used</th><th className={th}>Expires</th><th className={th}>Status</th><th className={`${th} pr-0`} /></tr></thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {coupons.map(c => {
                const expired = c.expiresAt && c.expiresAt < Date.now()
                const usedUp = c.maxUses && c.uses >= c.maxUses
                return (
                  <tr key={c.id}>
                    <td className={`${td} pl-0 font-mono font-bold`}>{c.code}</td>
                    <td className={td}>{c.percentOff}%</td>
                    <td className={`${td} text-slate-500`}>{c.seriesIds.length ? c.seriesIds.map(titleOf).join(', ') : 'Every series'}</td>
                    <td className={`${td} text-right tabular-nums`}>{c.uses}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                    <td className={`${td} text-slate-500`}>{c.expiresAt ? fmtDate(c.expiresAt) : 'Never'}</td>
                    <td className={td}>{!c.active ? <Pill>Paused</Pill> : expired ? <Pill tone="warning">Expired</Pill> : usedUp ? <Pill tone="warning">Used up</Pill> : <Pill tone="good">Active</Pill>}</td>
                    <td className={`${td} pr-0 text-right whitespace-nowrap`}>
                      {confirmDelete === c.id ? <Confirm text="Delete coupon?" label="Delete" onConfirm={() => remove(c)} onCancel={() => setConfirmDelete(null)} /> : (
                        <span className="inline-flex gap-3">
                          <button className="font-bold text-slate-500 hover:text-primary" onClick={() => patch(c, { active: !c.active })}>{c.active ? 'Pause' : 'Resume'}</button>
                          <button className="text-slate-400 hover:text-rose-600" onClick={() => setConfirmDelete(c.id)} aria-label={`Delete ${c.code}`}><Trash2 size={13} /></button>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function SeriesPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | series
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = () => api('/api/admin/series').then(d => { setData(d); setError('') }).catch(err => setError(err.message))
  useEffect(() => { load() }, [])

  const patch = async (s, body) => {
    try { await api(`/api/admin/series/${s.id}`, { method: 'PATCH', body }); forgetSeriesOptions(); load() } catch (err) { setError(err.message) }
  }
  const remove = async (s) => {
    try { await api(`/api/admin/series/${s.id}`, { method: 'DELETE' }); forgetSeriesOptions(); setConfirmDelete(null); load() } catch (err) { setError(err.message); setConfirmDelete(null) }
  }

  if (!data) return error ? <ErrorBox>{error}</ErrorBox> : <Spinner />
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="Test series"
        subtitle="What students buy on the store. Each series bundles mock tests."
        right={!editing && <button className={btnPrimary} onClick={() => setEditing('new')}><Plus size={13} /> New series</button>}
      />
      <ErrorBox>{error}</ErrorBox>
      {editing && (
        <SeriesEditor
          series={editing === 'new' ? null : editing}
          tests={data.tests}
          onSaved={() => { setEditing(null); load() }}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-xs min-w-[860px]">
          <thead className="border-b border-border-light dark:border-border-dark">
            <tr><th className={`${th} pl-6`}>Series</th><th className={`${th} text-right`}>Price</th><th className={`${th} text-right`}>Tests</th><th className={th}>Access</th><th className={`${th} text-right`}>Sales</th><th className={`${th} text-right`}>Revenue</th><th className={`${th} text-right`}>Students</th><th className={th}>Status</th><th className={`${th} pr-6`} /></tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {data.series.map(s => (
              <tr key={s.id}>
                <td className={`${td} pl-6`}>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{s.title}</div>
                  {s.centres.length > 0 && <div className="text-[10px] text-slate-400">Seats at {s.centres.join(', ')}</div>}
                </td>
                <td className={`${td} text-right tabular-nums font-bold`}>{s.pricePaise ? rupees(s.pricePaise) : 'Free'}{s.mrpPaise > s.pricePaise && <div className="text-[10px] text-slate-400 line-through font-normal">{rupees(s.mrpPaise)}</div>}</td>
                <td className={`${td} text-right tabular-nums`}>{s.testIds.length}</td>
                <td className={`${td} text-slate-500`}>{s.validityDays ? `${s.validityDays} days` : 'No expiry'}</td>
                <td className={`${td} text-right tabular-nums`}>{s.sales}</td>
                <td className={`${td} text-right tabular-nums font-bold`}>{rupees(s.revenuePaise)}</td>
                <td className={`${td} text-right tabular-nums`}>{s.activeStudents}</td>
                <td className={td}>{s.published ? <Pill tone="good">On sale</Pill> : <Pill>Draft</Pill>}</td>
                <td className={`${td} pr-6 text-right whitespace-nowrap`}>
                  {confirmDelete === s.id ? <Confirm text="Delete this series?" label="Delete" onConfirm={() => remove(s)} onCancel={() => setConfirmDelete(null)} /> : (
                    <span className="inline-flex items-center gap-3">
                      <button className="text-slate-500 hover:text-primary" title={s.published ? 'Unpublish' : 'Publish'} aria-label={s.published ? `Unpublish ${s.title}` : `Publish ${s.title}`} onClick={() => patch(s, { published: !s.published })}>{s.published ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                      <button className="text-slate-500 hover:text-primary" aria-label={`Edit ${s.title}`} onClick={() => setEditing(s)}><Pencil size={14} /></button>
                      <button className="text-slate-400 hover:text-rose-600" aria-label={`Delete ${s.title}`} onClick={() => setConfirmDelete(s.id)}><Trash2 size={14} /></button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!data.series.length && <tr><td colSpan={9} className="py-10 text-center text-slate-400"><Ticket className="mx-auto mb-2" size={18} />No test series yet. Create one to start selling.</td></tr>}
          </tbody>
        </table>
      </div>

      <Coupons series={data.series} />
    </div>
  )
}
