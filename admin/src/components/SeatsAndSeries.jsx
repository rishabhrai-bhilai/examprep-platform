import { useEffect, useState } from 'react'
import { Check, Loader2, Armchair } from 'lucide-react'
import { api } from '../lib/api'
import { inputCls, btnPrimary, ErrorBox } from './ui'

// Every test series (for pickers), loaded once
let seriesCache = null
export const loadSeriesOptions = async () => {
  if (!seriesCache) seriesCache = api('/api/admin/series').then(d => d.series).catch(err => { seriesCache = null; throw err })
  return seriesCache
}
export const forgetSeriesOptions = () => { seriesCache = null }

// Series checkboxes
export function SeriesPicker({ value, onChange }) {
  const [options, setOptions] = useState(null)
  useEffect(() => { loadSeriesOptions().then(setOptions).catch(() => setOptions([])) }, [])
  if (!options) return <p className="text-xs text-slate-400">Loading series…</p>
  if (!options.length) return <p className="text-xs text-slate-400">No test series yet. Create one under Test series.</p>
  const toggle = (id) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(s => (
        <label key={s.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${value.includes(s.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border-light dark:border-border-dark text-slate-600 dark:text-slate-300'}`}>
          <input type="checkbox" className="accent-primary" checked={value.includes(s.id)} onChange={() => toggle(s.id)} />
          {s.title}{!s.published && <span className="text-[10px] text-amber-600">(draft)</span>}
        </label>
      ))}
    </div>
  )
}

// Site admins: how many seats a centre has paid for, and which series they unlock
export default function SeatsAndSeries({ institute, onSaved }) {
  const [seats, setSeats] = useState(String(institute.seats || 0))
  const [seriesIds, setSeriesIds] = useState(institute.seriesIds || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const data = await api(`/api/institutes/${institute.id}`, { method: 'PATCH', body: { seats: Number(seats), seriesIds } })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      onSaved?.(data.institute)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const over = institute.memberCount > Number(seats) && seriesIds.length > 0
  return (
    <div className="space-y-3 rounded-2xl border border-border-light dark:border-border-dark p-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"><Armchair size={14} className="text-primary" /> Test series seats (site admins only)</div>
      <div className="grid gap-3 md:grid-cols-[8rem_1fr]">
        <label className="space-y-1">
          <span className="text-[11px] font-bold text-slate-500">Seats</span>
          <input className={inputCls} type="number" min="0" value={seats} onChange={e => setSeats(e.target.value)} />
        </label>
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-500">Series these seats unlock</span>
          <SeriesPicker value={seriesIds} onChange={setSeriesIds} />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        With series picked, students can join only while seats are free, and every member gets those series.
        {over && <span className="text-amber-700"> {institute.memberCount} students are already in: the last {institute.memberCount - Number(seats)} to join lose access.</span>}
      </p>
      <div className="flex items-center gap-2">
        <button className={btnPrimary} disabled={busy} onClick={save}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {saved ? 'Saved' : 'Save seats'}</button>
      </div>
      <ErrorBox>{error}</ErrorBox>
    </div>
  )
}
