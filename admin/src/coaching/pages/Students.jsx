// 1. Student and batch management
import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Search, X, Check, Loader2 } from 'lucide-react'
import { capi, useCoaching, useWorkspace } from '../api'
import { Load, Panel, PageTitle, StudentLink, ExportButtons, pctTone, BatchSelect, activityOf } from '../kit'
import { inputCls, btnPrimary, btnGhost, th, td, Pill, ErrorBox, fmtPct, fmtDate } from '../../components/ui'
import { downloadXlsx, studentSheet } from '../reports'

function BatchForm({ batch, faculty, onDone, onCancel }) {
  const cid = useWorkspace(s => s.cid)
  const [f, setF] = useState({ name: batch?.name || '', course: batch?.course || '', schedule: batch?.schedule || '', facultyIds: batch?.facultyIds || [] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await capi(cid, batch ? `/batches/${batch.id}` : '/batches', { method: batch ? 'PATCH' : 'POST', body: f })
      onDone()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={save} className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-3">
      <div className="grid md:grid-cols-3 gap-2">
        <input className={inputCls} placeholder="Batch name, e.g. GATE 2027 Weekend" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} aria-label="Batch name" />
        <input className={inputCls} placeholder="Course" value={f.course} onChange={e => setF({ ...f, course: e.target.value })} aria-label="Course" />
        <input className={inputCls} placeholder="Timings, e.g. Sat & Sun 9–1" value={f.schedule} onChange={e => setF({ ...f, schedule: e.target.value })} aria-label="Timings" />
      </div>
      <div className="flex flex-wrap gap-2">
        {faculty.map(x => (
          <label key={x.id} className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold cursor-pointer ${f.facultyIds.includes(x.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border-light dark:border-border-dark text-slate-500'}`}>
            <input type="checkbox" className="sr-only" checked={f.facultyIds.includes(x.id)} onChange={e => setF({ ...f, facultyIds: e.target.checked ? [...f.facultyIds, x.id] : f.facultyIds.filter(id => id !== x.id) })} />
            {x.name}
          </label>
        ))}
        {!faculty.length && <span className="text-[11px] text-slate-400">Add faculty on the Faculty page to assign them.</span>}
      </div>
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {batch ? 'Save batch' : 'Create batch'}</button>
        <button type="button" className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
      <ErrorBox>{error}</ErrorBox>
    </form>
  )
}

export default function Students() {
  const { cid, info, batchId, load } = useWorkspace()
  const [refresh, setRefresh] = useState(0)
  const state = useCoaching('/students', { batchId }, refresh)
  const [editing, setEditing] = useState(null) // batch id, 'new' or null
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const changed = () => { setEditing(null); setRefresh(n => n + 1); load(cid, true) }

  const moveStudent = async (sid, to) => {
    try {
      await capi(cid, `/students/${sid}`, { method: 'PATCH', body: { batchId: to || null } })
      changed()
    } catch (err) { setError(err.message) }
  }
  const removeBatch = async (b) => {
    if (!window.confirm(`Delete the batch "${b.name}"? Its ${b.students} students become unassigned.`)) return
    try { await capi(cid, `/batches/${b.id}`, { method: 'DELETE' }); changed() } catch (err) { setError(err.message) }
  }
  const addDemoStudent = async (e) => {
    e.preventDefault()
    try { await capi(cid, '/students', { method: 'POST', body: { name: newName, batchId: batchId || info.batches[0]?.id } }); setNewName(''); changed() } catch (err) { setError(err.message) }
  }

  const rows = useMemo(() => (state.data?.students || []).filter(s =>
    (!query || `${s.name} ${s.email}`.toLowerCase().includes(query.toLowerCase())) &&
    (!status || (status === 'unassigned' ? !s.batchId : activityOf(s.lastActive) === status))
  ), [state.data, query, status])

  return (
    <div className="space-y-6">
      <PageTitle title="Students & batches" subtitle="Create batches, assign faculty and move students between batches" />
      <ErrorBox>{error}</ErrorBox>
      <Panel title="Batches" right={editing !== 'new' && <button className={btnPrimary} onClick={() => setEditing('new')}><Plus size={13} /> New batch</button>}>
        {editing === 'new' && <div className="mb-4"><BatchForm faculty={info.faculty} onDone={changed} onCancel={() => setEditing(null)} /></div>}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {info.batches.map(b => editing === b.id ? (
            <div key={b.id} className="md:col-span-2 xl:col-span-3"><BatchForm batch={b} faculty={info.faculty} onDone={changed} onCancel={() => setEditing(null)} /></div>
          ) : (
            <div key={b.id} className="p-4 rounded-2xl border border-border-light dark:border-border-dark space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{b.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{b.course || 'No course set'}{b.schedule ? ` · ${b.schedule}` : ''}</p>
                </div>
                <span className="flex gap-2 text-slate-400">
                  <button aria-label={`Edit ${b.name}`} onClick={() => setEditing(b.id)} className="hover:text-primary"><Pencil size={13} /></button>
                  <button aria-label={`Delete ${b.name}`} onClick={() => removeBatch(b)} className="hover:text-rose-600"><Trash2 size={13} /></button>
                </span>
              </div>
              <p className="text-xs"><span className="font-black text-lg">{b.students}</span> <span className="text-slate-500">students</span></p>
              <p className="text-[11px] text-slate-500 truncate" title={b.faculty.join(', ')}>Faculty: {b.faculty.join(', ') || 'none yet'}</p>
            </div>
          ))}
          {info.unassigned > 0 && <div className="p-4 rounded-2xl border border-dashed border-amber-500/50 text-xs text-amber-700 dark:text-amber-300"><span className="font-black text-lg">{info.unassigned}</span> students not in a batch yet. Assign them below.</div>}
          {!info.batches.length && <p className="text-xs text-slate-400">No batches yet. Create one to group students.</p>}
        </div>
      </Panel>

      <Panel title="Students" subtitle={info.centre.demo ? 'Made-up students. Real students join with the centre code on the student site.' : 'Students join with the centre code on the student site; assign each to a batch here.'}
        right={<>
          <BatchSelect />
          <ExportButtons onXlsx={() => downloadXlsx([studentSheet(rows)], `${info.centre.name}-students`)} />
        </>}>
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input className={`${inputCls} pl-9`} placeholder="Search by name or email" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search students" />
            {query && <button onClick={() => setQuery('')} className="absolute right-3 top-3 text-slate-400" aria-label="Clear search"><X size={14} /></button>}
          </div>
          <select className={`${inputCls} md:!w-48`} value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter">
            <option value="">Everyone</option>
            <option value="active">Active (2 days)</option>
            <option value="slowing">Slowing (3–7 days)</option>
            <option value="inactive">Inactive (7+ days)</option>
            <option value="unassigned">Not in a batch</option>
          </select>
          {info.centre.demo && (
            <form onSubmit={addDemoStudent} className="flex gap-2">
              <input className={`${inputCls} md:!w-44`} placeholder="Add demo student" value={newName} onChange={e => setNewName(e.target.value)} aria-label="New demo student name" />
              <button className={btnGhost} disabled={!newName.trim()}><Plus size={13} /></button>
            </form>
          )}
        </div>
        <Load state={state}>{() => (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[860px]">
              <thead className="border-b border-border-light dark:border-border-dark">
                <tr><th className={th}>Rank</th><th className={th}>Student</th><th className={th}>Batch</th><th className={`${th} text-right`}>Tests</th><th className={`${th} text-right`}>Avg test</th><th className={`${th} text-right`}>Practice</th><th className={`${th} text-right`}>Accuracy</th><th className={`${th} text-right`}>Assignments</th><th className={th}>Last active</th></tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {rows.map(s => {
                  const st = activityOf(s.lastActive)
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className={`${td} tabular-nums text-slate-400 font-bold`}>{s.rank ?? '–'}</td>
                      <td className={td}><StudentLink id={s.id} name={s.name} /><div className="text-[10px] text-slate-400">{s.email}</div></td>
                      <td className={td}>
                        <select aria-label={`Batch of ${s.name}`} className="bg-transparent text-xs font-semibold border border-border-light dark:border-border-dark rounded-lg px-1.5 py-1 max-w-[11rem]" value={s.batchId || ''} onChange={e => moveStudent(s.id, e.target.value)}>
                          <option value="">No batch</option>
                          {info.batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{s.testsTaken}{s.testsMissed ? <span className="text-rose-500"> ·{s.testsMissed} missed</span> : ''}</td>
                      <td className={`${td} text-right`}><Pill tone={pctTone(s.avgPercent)}>{fmtPct(s.avgPercent)}</Pill></td>
                      <td className={`${td} text-right tabular-nums`}>{s.answers}</td>
                      <td className={`${td} text-right tabular-nums`}>{fmtPct(s.accuracy)}</td>
                      <td className={`${td} text-right tabular-nums`}>{s.assignmentsDone}/{s.assignmentsDue}</td>
                      <td className={td}><Pill tone={st === 'active' ? 'good' : st === 'slowing' ? 'warning' : 'critical'}>{s.lastActive ? fmtDate(s.lastActive) : 'Never'}</Pill></td>
                    </tr>
                  )
                })}
                {!rows.length && <tr><td colSpan={9} className="py-10 text-center text-slate-400">No students match.</td></tr>}
              </tbody>
            </table>
          </div>
        )}</Load>
      </Panel>
    </div>
  )
}
