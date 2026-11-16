// 14. Faculty: the list, and each teacher's own dashboard
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Check, Loader2, ArrowLeft, BookOpen, ClipboardList, AlertTriangle } from 'lucide-react'
import { capi, useCoaching, useWorkspace } from '../api'
import { Load, Panel, PageTitle, StudentLink, InsightList, AutomatedLabel, pctTone } from '../kit'
import { inputCls, btnPrimary, btnGhost, Pill, ErrorBox, StatTile, fmtPct, fmtDate } from '../../components/ui'
import { StatusPill } from './Tests'

function FacultyForm({ person, onDone, onCancel }) {
  const { cid, info } = useWorkspace()
  const [f, setF] = useState({ name: person?.name || '', email: person?.email || '', subjects: person?.subjects || [], batchIds: person?.batchIds || [] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const chip = (on) => `px-2.5 py-1 rounded-full border text-[11px] font-semibold cursor-pointer ${on ? 'border-primary bg-primary/10 text-primary' : 'border-border-light dark:border-border-dark text-slate-500'}`
  const flip = (key, v) => setF(x => ({ ...x, [key]: x[key].includes(v) ? x[key].filter(y => y !== v) : [...x[key], v] }))
  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await capi(cid, person ? `/faculty/${person.id}` : '/faculty', { method: person ? 'PATCH' : 'POST', body: f })
      onDone()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={save} className="space-y-3 p-4 rounded-2xl border border-primary/30 bg-primary/5">
      <div className="grid md:grid-cols-2 gap-2">
        <input className={inputCls} placeholder="Name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} aria-label="Name" />
        <input className={inputCls} placeholder="Email (optional)" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} aria-label="Email" />
      </div>
      <div className="space-y-1"><p className="text-[11px] font-bold text-slate-500">Subjects</p><div className="flex flex-wrap gap-1.5">{info.syllabus.map(s => <button type="button" key={s.subject} className={chip(f.subjects.includes(s.subject))} onClick={() => flip('subjects', s.subject)}>{s.subject}</button>)}</div></div>
      <div className="space-y-1"><p className="text-[11px] font-bold text-slate-500">Batches</p><div className="flex flex-wrap gap-1.5">{info.batches.map(b => <button type="button" key={b.id} className={chip(f.batchIds.includes(b.id))} onClick={() => flip('batchIds', b.id)}>{b.name}</button>)}</div></div>
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {person ? 'Save' : 'Add faculty'}</button>
        <button type="button" className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
      <ErrorBox>{error}</ErrorBox>
    </form>
  )
}

export default function Faculty() {
  const { cid, load } = useWorkspace()
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState(null)
  const state = useCoaching('/faculty', {}, refresh)
  const changed = () => { setEditing(null); setRefresh(n => n + 1); load(cid, true) }
  const remove = async (f) => {
    if (!window.confirm(`Remove ${f.name}?`)) return
    await capi(cid, `/faculty/${f.id}`, { method: 'DELETE' })
    changed()
  }
  return (
    <div className="space-y-6">
      <PageTitle title="Faculty" subtitle="Teachers, their subjects and batches. Open one to see their dashboard."
        right={editing !== 'new' && <button className={btnPrimary} onClick={() => setEditing('new')}><Plus size={13} /> Add faculty</button>} />
      {editing === 'new' && <FacultyForm onDone={changed} onCancel={() => setEditing(null)} />}
      <Load state={state}>{(d) => (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {d.faculty.map(f => editing === f.id ? (
            <div key={f.id} className="md:col-span-2 xl:col-span-3"><FacultyForm person={f} onDone={changed} onCancel={() => setEditing(null)} /></div>
          ) : (
            <Panel key={f.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 shrink-0 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center">{f.name.replace(/^Dr\.\s*/, '').split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
                  <div className="min-w-0">
                    <Link to={`/c/${cid}/faculty/${f.id}`} className="font-extrabold text-sm text-slate-900 dark:text-slate-100 hover:text-primary">{f.name}</Link>
                    <p className="text-[11px] text-slate-500 truncate">{f.email || 'No email'}</p>
                  </div>
                </div>
                <span className="flex gap-2 text-slate-400">
                  <button onClick={() => setEditing(f.id)} className="hover:text-primary" aria-label={`Edit ${f.name}`}><Pencil size={13} /></button>
                  <button onClick={() => remove(f)} className="hover:text-rose-600" aria-label={`Remove ${f.name}`}><Trash2 size={13} /></button>
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">{f.subjects.map(s => <Pill key={s} tone="info">{s}</Pill>)}</div>
              <p className="text-[11px] text-slate-500 mt-2">{f.batches.join(', ') || 'No batches'}</p>
              <Link to={`/c/${cid}/faculty/${f.id}`} className="inline-block mt-3 text-[11px] font-bold text-primary">Open dashboard</Link>
            </Panel>
          ))}
          {!d.faculty.length && <p className="text-xs text-slate-400">No faculty yet.</p>}
        </div>
      )}</Load>
    </div>
  )
}

export function FacultyDashboard() {
  const { fid } = useParams()
  const cid = useWorkspace(s => s.cid)
  const state = useCoaching(`/faculty/${fid}/dashboard`)
  return (
    <Load state={state}>{(d) => {
      const toGrade = d.assignments.reduce((n, a) => n + a.toGrade, 0)
      return (
        <div className="space-y-6">
          <Link to={`/c/${cid}/faculty`} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-primary"><ArrowLeft size={12} /> Faculty</Link>
          <PageTitle title={d.faculty.name} subtitle={`${d.faculty.subjects.join(', ')} · ${d.faculty.batches.join(', ')}`} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile icon={BookOpen} label="Classes" value={d.classes.length} sub="Subject × batch" />
            <StatTile icon={ClipboardList} label="Assignments" value={d.assignments.length} sub={`${toGrade} submissions to grade`} />
            <StatTile icon={AlertTriangle} label="Need attention" value={d.attention.length} sub="Under 40% in these subjects" />
            <StatTile icon={BookOpen} label="Chapters taught" value={`${d.classes.reduce((n, c) => n + c.chaptersDone, 0)}/${d.classes.reduce((n, c) => n + c.chaptersTotal, 0)}`} sub="Across their classes" />
          </div>
          <Panel title="Classes" subtitle="Each subject they teach, in each batch" pad="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[720px]">
                <thead className="border-b border-border-light dark:border-border-dark"><tr className="text-left text-[10px] uppercase tracking-wider text-slate-400"><th className="py-2 pl-5">Batch</th><th>Subject</th><th className="text-right">Accuracy</th><th className="text-right">Chapters taught</th><th className="pl-4">Next chapter</th><th className="pr-5">Weak chapters</th></tr></thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {d.classes.map(c => (
                    <tr key={`${c.batchId}|${c.subject}`} className="align-top">
                      <td className="py-2 pl-5 font-semibold">{c.batch}</td>
                      <td className="py-2">{c.subject}</td>
                      <td className="py-2 text-right"><Pill tone={pctTone(c.accuracy)}>{fmtPct(c.accuracy)}</Pill></td>
                      <td className="py-2 text-right tabular-nums">{c.chaptersDone}/{c.chaptersTotal}</td>
                      <td className="py-2 pl-4 text-slate-500">{c.nextChapter || 'All done'}</td>
                      <td className="py-2 pr-5 text-slate-500">{c.weakChapters.map(w => `${w.chapter} (${w.accuracy}%)`).join(', ') || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <div className="grid lg:grid-cols-2 gap-6">
            <Panel title="Students needing attention" subtitle="Under 40% accuracy in this teacher's subjects">
              <ul className="space-y-1.5">
                {d.attention.map(s => <li key={s.id} className="flex items-center justify-between text-xs"><span><StudentLink id={s.id} name={s.name} /> <span className="text-[10px] text-slate-400">{s.batch}</span></span><Pill tone="critical">{fmtPct(s.accuracy)} · {s.answers} ans</Pill></li>)}
                {!d.attention.length && <li className="text-xs text-slate-400">No one under 40%.</li>}
              </ul>
            </Panel>
            <Panel title="Automated insights" right={<AutomatedLabel />}>
              <InsightList items={d.insights} />
            </Panel>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Panel title="Their assignments">
              <ul className="divide-y divide-border-light dark:divide-border-dark">
                {d.assignments.map(a => (
                  <li key={a.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0"><p className="font-semibold truncate">{a.title}</p><p className="text-[10px] text-slate-400">Due {fmtDate(a.dueAt)} · {a.batches.join(', ')}</p></div>
                    <span className="text-right whitespace-nowrap"><span className="tabular-nums">{a.submitted}/{a.eligible}</span> {a.toGrade > 0 && <Pill tone="info">{a.toGrade} to grade</Pill>}</span>
                  </li>
                ))}
                {!d.assignments.length && <li className="py-4 text-xs text-slate-400">None yet.</li>}
              </ul>
              <Link to={`/c/${cid}/assignments`} className="inline-block mt-2 text-[11px] font-bold text-primary">Manage assignments</Link>
            </Panel>
            <Panel title="Tests for their batches">
              <ul className="divide-y divide-border-light dark:divide-border-dark">
                {d.tests.map(t => (
                  <li key={t.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                    <Link to={`/c/${cid}/tests/${t.id}`} className="font-semibold hover:text-primary truncate">{t.title}</Link>
                    <span className="flex items-center gap-2 whitespace-nowrap"><StatusPill status={t.status} />{t.attempts > 0 && <Pill tone={pctTone(t.avgPercent)}>{fmtPct(t.avgPercent)}</Pill>}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )
    }}</Load>
  )
}
