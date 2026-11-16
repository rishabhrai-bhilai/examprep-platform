// 15. Assignment management: create, track submissions, grade
import { useState } from 'react'
import { Plus, Pencil, Trash2, Check, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { capi, useCoaching, useWorkspace, toLocalInput } from '../api'
import { Load, Panel, PageTitle, StudentLink, ExportButtons } from '../kit'
import { inputCls, btnPrimary, btnGhost, Pill, ErrorBox, fmtDate, fmtDateTime } from '../../components/ui'
import { downloadXlsx } from '../reports'

function AssignmentForm({ a, onDone, onCancel }) {
  const { cid, info } = useWorkspace()
  const [f, setF] = useState({
    title: a?.title || '', description: a?.description || '', subject: a?.subject || '', chapter: a?.chapter || '',
    batchIds: a?.batchIds || [], dueAt: toLocalInput(a?.dueAt || Date.now() + 7 * 86400000), maxMarks: a?.maxMarks || 20, facultyId: a?.facultyId || ''
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const chapters = info.syllabus.find(s => s.subject === f.subject)?.chapters || []
  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await capi(cid, a ? `/assignments/${a.id}` : '/assignments', { method: a ? 'PATCH' : 'POST', body: { ...f, dueAt: new Date(f.dueAt).getTime(), maxMarks: Number(f.maxMarks), subject: f.subject || null, facultyId: f.facultyId || null } })
      onDone()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={save} className="space-y-3 p-4 rounded-2xl border border-primary/30 bg-primary/5">
      <input className={inputCls} placeholder="Title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} aria-label="Title" />
      <textarea className={`${inputCls} min-h-20`} placeholder="Instructions" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} aria-label="Instructions" />
      <div className="grid md:grid-cols-5 gap-2">
        <select className={inputCls} value={f.subject} onChange={e => setF({ ...f, subject: e.target.value, chapter: '' })} aria-label="Subject"><option value="">Subject…</option>{info.syllabus.map(s => <option key={s.subject}>{s.subject}</option>)}</select>
        <select className={inputCls} value={f.chapter} onChange={e => setF({ ...f, chapter: e.target.value })} disabled={!f.subject} aria-label="Chapter"><option value="">Chapter…</option>{chapters.map(c => <option key={c}>{c}</option>)}</select>
        <select className={inputCls} value={f.facultyId} onChange={e => setF({ ...f, facultyId: e.target.value })} aria-label="Set by"><option value="">Set by…</option>{info.faculty.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <input type="datetime-local" className={inputCls} value={f.dueAt} onChange={e => setF({ ...f, dueAt: e.target.value })} aria-label="Due" />
        <input type="number" min="1" max="500" className={inputCls} value={f.maxMarks} onChange={e => setF({ ...f, maxMarks: e.target.value })} aria-label="Maximum marks" />
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-[11px] font-bold text-slate-500 self-center">Batches (none = all):</span>
        {info.batches.map(b => (
          <label key={b.id} className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold cursor-pointer ${f.batchIds.includes(b.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border-light dark:border-border-dark text-slate-500'}`}>
            <input type="checkbox" className="sr-only" checked={f.batchIds.includes(b.id)} onChange={e => setF({ ...f, batchIds: e.target.checked ? [...f.batchIds, b.id] : f.batchIds.filter(x => x !== b.id) })} />{b.name}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {a ? 'Save' : 'Create assignment'}</button>
        <button type="button" className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
      <ErrorBox>{error}</ErrorBox>
    </form>
  )
}

function GradeRow({ a, s, onSaved }) {
  const cid = useWorkspace(x => x.cid)
  const [marks, setMarks] = useState(s.marks ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const send = async (body) => {
    setBusy(true)
    setError('')
    try { await capi(cid, `/assignments/${a.id}/submissions/${s.studentId}`, { method: 'PUT', body }); onSaved() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <tr>
      <td className="py-1.5"><StudentLink id={s.studentId} name={s.name} /><div className="text-[10px] text-slate-400">{s.batch}</div></td>
      <td className="py-1.5 text-slate-500 whitespace-nowrap">{s.submittedAt ? <>{fmtDateTime(s.submittedAt)} {s.late && <Pill tone="warning">Late</Pill>}</> : <Pill tone={a.status === 'open' ? 'muted' : 'critical'}>{a.status === 'open' ? 'Pending' : 'Missing'}</Pill>}</td>
      <td className="py-1.5 text-right">
        <span className="inline-flex items-center gap-1.5">
          <input type="number" min="0" max={a.maxMarks} className="w-16 px-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-800/60 border border-border-light dark:border-border-dark" value={marks} onChange={e => setMarks(e.target.value)} aria-label={`Marks for ${s.name}`} />
          <span className="text-slate-400">/{a.maxMarks}</span>
          <button disabled={busy} onClick={() => send({ marks })} className="px-2 py-1 rounded-lg bg-primary text-white text-[10px] font-bold">{s.submittedAt ? 'Save' : 'Mark received'}</button>
          {s.submittedAt && <button disabled={busy} onClick={() => send({ clear: true })} className="text-[10px] text-slate-400 hover:text-rose-600">Undo</button>}
        </span>
        {error && <div className="text-[10px] text-rose-600">{error}</div>}
      </td>
    </tr>
  )
}

export default function Assignments() {
  const { cid, info, batchId } = useWorkspace()
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(null)
  const state = useCoaching('/assignments', {}, refresh)
  const changed = () => { setEditing(null); setRefresh(n => n + 1) }
  const remove = async (a) => {
    if (!window.confirm(`Delete "${a.title}" and its submissions?`)) return
    await capi(cid, `/assignments/${a.id}`, { method: 'DELETE' })
    changed()
  }
  return (
    <div className="space-y-6">
      <PageTitle title="Assignments" subtitle="Set work for batches, record submissions (online or on paper) and grade them"
        right={<>
          {state.data && <ExportButtons onXlsx={() => downloadXlsx([{ name: 'Assignments', rows: [['Assignment', 'Subject', 'Batches', 'Due', 'Submitted', 'Eligible', 'Late', 'Graded', 'Avg marks', 'Max'], ...state.data.assignments.map(a => [a.title, a.subject || '', a.batches.join(', ') || 'All', fmtDate(a.dueAt), a.submitted, a.eligible, a.late, a.graded, a.avgMarks ?? '', a.maxMarks])] }, { name: 'Submissions', rows: [['Assignment', 'Student', 'Batch', 'Submitted', 'Late', 'Marks', 'Feedback'], ...state.data.assignments.flatMap(a => a.submissions.map(s => [a.title, s.name, s.batch || '', s.submittedAt ? fmtDate(s.submittedAt) : '', s.late ? 'Yes' : '', s.marks ?? '', s.feedback]))] }], `${info.centre.name}-assignments`)} />}
          {editing !== 'new' && <button className={btnPrimary} onClick={() => setEditing('new')}><Plus size={13} /> New assignment</button>}
        </>} />
      {editing === 'new' && <AssignmentForm onDone={changed} onCancel={() => setEditing(null)} />}
      <Load state={state}>{(d) => {
        const rows = d.assignments.filter(a => !batchId || !a.batchIds.length || a.batchIds.includes(batchId))
        return (
          <div className="space-y-3">
            {rows.map(a => editing === a.id ? <AssignmentForm key={a.id} a={a} onDone={changed} onCancel={() => setEditing(null)} /> : (
              <Panel key={a.id} pad="p-0">
                <div className="flex items-start gap-3 p-4">
                  <button onClick={() => setOpen(open === a.id ? null : a.id)} className="mt-0.5 text-slate-400" aria-label="Show submissions" aria-expanded={open === a.id}>{open === a.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => setOpen(open === a.id ? null : a.id)} className="font-extrabold text-sm text-left text-slate-900 dark:text-slate-100 hover:text-primary">{a.title}</button>
                      <Pill tone={a.status === 'open' ? 'info' : 'muted'}>{a.status === 'open' ? 'Open' : 'Closed'}</Pill>
                      {a.submitted - a.graded > 0 && <Pill tone="warning">{a.submitted - a.graded} to grade</Pill>}
                    </div>
                    <p className="text-[11px] text-slate-500">{[a.subject, a.chapter].filter(Boolean).join(' · ')}{a.faculty ? ` · ${a.faculty}` : ''} · {a.batches.join(', ') || 'All batches'} · due {fmtDateTime(a.dueAt)} · {a.maxMarks} marks</p>
                    {a.description && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{a.description}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black tabular-nums">{a.submitted}<span className="text-xs text-slate-400">/{a.eligible}</span></p>
                    <p className="text-[10px] text-slate-500">submitted · {a.late} late{a.avgMarks !== null ? ` · avg ${a.avgMarks}` : ''}</p>
                    <div className="flex justify-end gap-2 mt-1 text-slate-400">
                      <button onClick={() => setEditing(a.id)} className="hover:text-primary" aria-label={`Edit ${a.title}`}><Pencil size={13} /></button>
                      <button onClick={() => remove(a)} className="hover:text-rose-600" aria-label={`Delete ${a.title}`}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800"><div className="h-full bg-primary" style={{ width: `${a.eligible ? (a.submitted / a.eligible) * 100 : 0}%` }} /></div>
                {open === a.id && (
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-[10px] uppercase tracking-wider text-slate-400"><th className="py-1">Student</th><th>Submitted</th><th className="text-right">Marks</th></tr></thead>
                      <tbody className="divide-y divide-border-light dark:divide-border-dark">
                        {a.submissions.filter(s => !batchId || info.batches.find(b => b.id === batchId)?.name === s.batch).map(s => <GradeRow key={`${s.studentId}-${s.marks}-${s.submittedAt}`} a={a} s={s} onSaved={() => setRefresh(n => n + 1)} />)}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            ))}
            {!rows.length && <p className="text-xs text-slate-400">No assignments yet.</p>}
          </div>
        )
      }}</Load>
    </div>
  )
}
