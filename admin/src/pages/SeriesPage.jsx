import { useEffect, useMemo, useState } from 'react'
import { Package, Plus, Loader2, Check, X, Search, Eye, EyeOff, Trash2, Pencil } from 'lucide-react'
import { api } from '../lib/api'
import { card, inputCls, btnPrimary, btnGhost, th, td, PageHeader, SectionTitle, Spinner, ErrorBox, Pill, Confirm } from '../components/ui'
import { forgetSeriesOptions } from '../components/SeatsAndSeries'

const label = 'space-y-1 block'
const labelText = 'text-[11px] font-bold text-slate-500'
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
    testIds: series?.testIds || [],
    published: series ? !!series.published : true
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = series
        ? await api(`/api/admin/series/${series.id}`, { method: 'PATCH', body: form })
        : await api('/api/admin/series', { method: 'POST', body: form })
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
      <SectionTitle title={series ? `Edit ${series.title}` : 'New test series'} subtitle="Tests in a live series are locked for everyone except students with a seat at a centre that has the series." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <label className={label}><span className={labelText}>Title</span><input className={inputCls} value={form.title} onChange={set('title')} placeholder="GATE CS 2027 Full Test Series" /></label>
          <label className={label}><span className={labelText}>Description (shown to centre students)</span><textarea className={`${inputCls} min-h-28`} value={form.description} onChange={set('description')} maxLength={2000} /></label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
            <input type="checkbox" className="accent-primary" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
            Live (centres can be given this series)
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
        subtitle="Bundles of mock tests for coaching centres. Give a series to a centre under Coaching centres → seats."
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
        <table className="w-full text-xs min-w-[720px]">
          <thead className="border-b border-border-light dark:border-border-dark">
            <tr><th className={`${th} pl-6`}>Series</th><th className={`${th} text-right`}>Tests</th><th className={th}>Centres</th><th className={`${th} text-right`}>Students with a seat</th><th className={th}>Status</th><th className={`${th} pr-6`} /></tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {data.series.map(s => (
              <tr key={s.id}>
                <td className={`${td} pl-6`}>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{s.title}</div>
                  {s.description && <div className="text-[10px] text-slate-400 truncate max-w-[22rem]">{s.description}</div>}
                </td>
                <td className={`${td} text-right tabular-nums`}>{s.testIds.length}</td>
                <td className={`${td} text-slate-600 dark:text-slate-300`}>{s.centres.length ? s.centres.join(', ') : <span className="text-slate-400">None yet</span>}</td>
                <td className={`${td} text-right tabular-nums font-bold`}>{s.activeStudents}</td>
                <td className={td}>{s.published ? <Pill tone="good">Live</Pill> : <Pill>Draft</Pill>}</td>
                <td className={`${td} pr-6 text-right whitespace-nowrap`}>
                  {confirmDelete === s.id ? <Confirm text="Delete? Its tests become free for everyone." label="Delete" onConfirm={() => remove(s)} onCancel={() => setConfirmDelete(null)} /> : (
                    <span className="inline-flex items-center gap-3">
                      <button className="text-slate-500 hover:text-primary" title={s.published ? 'Make draft' : 'Make live'} aria-label={s.published ? `Make ${s.title} a draft` : `Make ${s.title} live`} onClick={() => patch(s, { published: !s.published })}>{s.published ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                      <button className="text-slate-500 hover:text-primary" aria-label={`Edit ${s.title}`} onClick={() => setEditing(s)}><Pencil size={14} /></button>
                      <button className="text-slate-400 hover:text-rose-600" aria-label={`Delete ${s.title}`} onClick={() => setConfirmDelete(s.id)}><Trash2 size={14} /></button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!data.series.length && <tr><td colSpan={6} className="py-10 text-center text-slate-400">No test series yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
