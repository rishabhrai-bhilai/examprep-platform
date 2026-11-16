// 3. Mock test creation and scheduling
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Loader2, CalendarClock, Search, X, Wand2 } from 'lucide-react'
import { capi, useCoaching, useWorkspace, toLocalInput } from '../api'
import { Load, Panel, PageTitle, pctTone } from '../kit'
import { inputCls, btnPrimary, btnGhost, th, td, Pill, ErrorBox, fmtPct, fmtDateTime } from '../../components/ui'

const STATUS = { live: ['critical', 'Live'], scheduled: ['info', 'Scheduled'], completed: ['muted', 'Completed'], draft: ['warning', 'Draft'] }

export function StatusPill({ status }) {
  const [tone, label] = STATUS[status] || ['muted', status]
  return <Pill tone={tone}>{label}</Pill>
}

// Search the bank and tick questions to add
function QuestionPicker({ picked, onToggle }) {
  const { info } = useWorkspace()
  const [f, setF] = useState({ subject: '', chapter: '', q: '' })
  const state = useCoaching('/questions', { ...f, pageSize: 15 })
  const chapters = info.syllabus.find(s => s.subject === f.subject)?.chapters || []
  return (
    <div className="space-y-2">
      <div className="grid md:grid-cols-3 gap-2">
        <select className={inputCls} value={f.subject} onChange={e => setF({ ...f, subject: e.target.value, chapter: '' })} aria-label="Subject"><option value="">Any subject</option>{info.syllabus.map(s => <option key={s.subject}>{s.subject}</option>)}</select>
        <select className={inputCls} value={f.chapter} onChange={e => setF({ ...f, chapter: e.target.value })} disabled={!f.subject} aria-label="Chapter"><option value="">Any chapter</option>{chapters.map(c => <option key={c}>{c}</option>)}</select>
        <div className="relative"><Search size={14} className="absolute left-3 top-3 text-slate-400" /><input className={`${inputCls} pl-9`} placeholder="Search text or code" value={f.q} onChange={e => setF({ ...f, q: e.target.value })} aria-label="Search questions" /></div>
      </div>
      <div className="max-h-72 overflow-y-auto rounded-xl border border-border-light dark:border-border-dark divide-y divide-border-light dark:divide-border-dark">
        {(state.data?.items || []).map(q => (
          <label key={q.id} className="flex gap-2 p-2.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
            <input type="checkbox" checked={picked.includes(q.id)} onChange={() => onToggle(q.id)} className="mt-0.5" />
            <span className="min-w-0">
              <span className="block text-slate-800 dark:text-slate-200 line-clamp-2">{q.text}</span>
              <span className="text-[10px] text-slate-400">{q.source === 'centre' ? 'Centre' : `PYQ ${q.year || ''}`} · {q.subject} · {q.chapter} · {q.type} · {q.marks}m · {q.difficulty}</span>
            </span>
          </label>
        ))}
        {state.data && !state.data.items.length && <p className="p-4 text-xs text-slate-400 text-center">No questions match.</p>}
      </div>
      <p className="text-[10px] text-slate-400">{state.data ? `${state.data.total} matching` : 'Loading…'} · showing 15</p>
    </div>
  )
}

export function TestEditor({ test, onDone, onCancel }) {
  const { cid, info } = useWorkspace()
  const now = Date.now()
  const [f, setF] = useState({
    title: test?.title || '', description: test?.description || '', batchIds: test?.batchIds || [],
    scheduledAt: toLocalInput(test?.scheduledAt || now + 86400000), windowEndsAt: toLocalInput(test?.windowEndsAt || ''),
    durationMin: test?.durationMin || 60, negativeMarking: test ? test.negativeMarking : true, published: test ? test.published : true,
    questionIds: test?.questionIds || []
  })
  const [blueprint, setBlueprint] = useState(test ? [] : [{ subject: info.syllabus[0].subject, chapter: '', count: 10 }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const toggle = (id) => setF(x => ({ ...x, questionIds: x.questionIds.includes(id) ? x.questionIds.filter(y => y !== id) : [...x.questionIds, id] }))
  const total = f.questionIds.length + blueprint.reduce((n, r) => n + (Number(r.count) || 0), 0)

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = {
        ...f, scheduledAt: new Date(f.scheduledAt).getTime(), windowEndsAt: f.windowEndsAt ? new Date(f.windowEndsAt).getTime() : null,
        durationMin: Number(f.durationMin), blueprint: blueprint.filter(r => Number(r.count) > 0)
      }
      const data = await capi(cid, test ? `/tests/${test.id}` : '/tests', { method: test ? 'PATCH' : 'POST', body })
      onDone(data.test)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid md:grid-cols-2 gap-3">
        <label className="space-y-1 md:col-span-2"><span className="text-[11px] font-bold text-slate-500">Title</span><input className={inputCls} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Weekly Test 8: Operating Systems" /></label>
        <label className="space-y-1"><span className="text-[11px] font-bold text-slate-500">Opens at</span><input type="datetime-local" className={inputCls} value={f.scheduledAt} onChange={e => setF({ ...f, scheduledAt: e.target.value })} /></label>
        <label className="space-y-1"><span className="text-[11px] font-bold text-slate-500">Closes at (optional; default a day later)</span><input type="datetime-local" className={inputCls} value={f.windowEndsAt} onChange={e => setF({ ...f, windowEndsAt: e.target.value })} /></label>
        <label className="space-y-1"><span className="text-[11px] font-bold text-slate-500">Duration (minutes)</span><input type="number" min="5" max="300" className={inputCls} value={f.durationMin} onChange={e => setF({ ...f, durationMin: e.target.value })} /></label>
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-500">Marking and visibility</span>
          <div className="flex flex-wrap gap-4 text-xs pt-2">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.negativeMarking} onChange={e => setF({ ...f, negativeMarking: e.target.checked })} /> Negative marking (GATE: −1/3 on MCQs)</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.published} onChange={e => setF({ ...f, published: e.target.checked })} /> Published (unticked = draft)</label>
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-slate-500">Batches (none ticked = all batches)</span>
        <div className="flex flex-wrap gap-2">
          {info.batches.map(b => (
            <label key={b.id} className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold cursor-pointer ${f.batchIds.includes(b.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border-light dark:border-border-dark text-slate-500'}`}>
              <input type="checkbox" className="sr-only" checked={f.batchIds.includes(b.id)} onChange={e => setF({ ...f, batchIds: e.target.checked ? [...f.batchIds, b.id] : f.batchIds.filter(x => x !== b.id) })} />{b.name}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><Wand2 size={12} /> Auto-pick questions by blueprint</span>
        {blueprint.map((r, i) => {
          const chapters = info.syllabus.find(s => s.subject === r.subject)?.chapters || []
          const set = (patch) => setBlueprint(b => b.map((x, j) => (j === i ? { ...x, ...patch } : x)))
          return (
            <div key={i} className="grid grid-cols-[1fr_1fr_5rem_auto] gap-2">
              <select className={inputCls} value={r.subject} onChange={e => set({ subject: e.target.value, chapter: '' })} aria-label="Blueprint subject">{info.syllabus.map(s => <option key={s.subject}>{s.subject}</option>)}</select>
              <select className={inputCls} value={r.chapter} onChange={e => set({ chapter: e.target.value })} aria-label="Blueprint chapter"><option value="">Any chapter</option>{chapters.map(c => <option key={c}>{c}</option>)}</select>
              <input type="number" min="0" max="65" className={inputCls} value={r.count} onChange={e => set({ count: e.target.value })} aria-label="Number of questions" />
              <button type="button" className="text-slate-400 hover:text-rose-600 px-1" onClick={() => setBlueprint(b => b.filter((_, j) => j !== i))} aria-label="Remove row"><X size={14} /></button>
            </div>
          )
        })}
        <button type="button" className={btnGhost} onClick={() => setBlueprint(b => [...b, { subject: info.syllabus[0].subject, chapter: '', count: 5 }])}><Plus size={13} /> Add blueprint row</button>
      </div>
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-500">Or pick questions yourself ({f.questionIds.length} picked)</span>
        <QuestionPicker picked={f.questionIds} onToggle={toggle} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className={btnPrimary} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <CalendarClock size={13} />} {test ? 'Save test' : 'Create and schedule'}</button>
        {onCancel && <button type="button" className={btnGhost} onClick={onCancel}>Cancel</button>}
        <span className="text-[11px] text-slate-500">About {total} questions{test ? ' (blueprint rows add to the current list)' : ''}</span>
      </div>
      <ErrorBox>{error}</ErrorBox>
    </form>
  )
}

export default function Tests() {
  const { cid, info, batchId } = useWorkspace()
  const navigate = useNavigate()
  const [refresh, setRefresh] = useState(0)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState('')
  const state = useCoaching('/tests', {}, refresh)
  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.title}" and its ${t.attempts} results?`)) return
    await capi(cid, `/tests/${t.id}`, { method: 'DELETE' })
    setRefresh(n => n + 1)
  }
  return (
    <div className="space-y-6">
      <PageTitle title="Mock tests" subtitle="Create tests from the question bank, schedule them for batches; results are evaluated automatically"
        right={!creating && <button className={btnPrimary} onClick={() => setCreating(true)}><Plus size={13} /> New test</button>} />
      {creating && <Panel title="New test"><TestEditor onDone={(t) => navigate(`/c/${cid}/tests/${t.id}`)} onCancel={() => setCreating(false)} /></Panel>}
      {!info.centre.demo && <p className="text-[11px] text-slate-500">Platform mock tests your students take on ExamPrep appear here with real results. Tests you create here are saved and scheduled; taking them on the student site is the next step to wire up.</p>}
      <Load state={state}>{(d) => {
        const rows = d.tests.filter(t => (!filter || t.status === filter) && (!batchId || !t.batchIds.length || t.batchIds.includes(batchId)))
        return (
          <Panel pad="p-0" title={null}>
            <div className="flex flex-wrap gap-2 p-4 border-b border-border-light dark:border-border-dark">
              {['', 'live', 'scheduled', 'completed', 'draft'].map(s => (
                <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 rounded-full text-[11px] font-bold border ${filter === s ? 'border-primary bg-primary/10 text-primary' : 'border-border-light dark:border-border-dark text-slate-500'}`}>
                  {s ? STATUS[s][1] : 'All'} ({s ? d.tests.filter(t => t.status === s).length : d.tests.length})
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[820px]">
                <thead className="border-b border-border-light dark:border-border-dark"><tr><th className={`${th} pl-5`}>Test</th><th className={th}>Status</th><th className={th}>Opens</th><th className={th}>Batches</th><th className={`${th} text-right`}>Questions</th><th className={`${th} text-right`}>Attempts</th><th className={`${th} text-right`}>Average</th><th className={th} /></tr></thead>
                <tbody className="divide-y divide-border-light dark:divide-border-dark">
                  {rows.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className={`${td} pl-5`}><Link to={`/c/${cid}/tests/${t.id}`} className="font-bold text-slate-900 dark:text-slate-100 hover:text-primary">{t.title}</Link>{t.kind === 'platform' && <div className="text-[10px] text-slate-400">ExamPrep platform test</div>}</td>
                      <td className={td}><StatusPill status={t.status} /></td>
                      <td className={`${td} text-slate-500 whitespace-nowrap`}>{fmtDateTime(t.scheduledAt)}{t.durationMin ? ` · ${t.durationMin}m` : ''}</td>
                      <td className={`${td} text-slate-500 max-w-[12rem] truncate`}>{t.kind === 'platform' ? '–' : t.batches.join(', ') || 'All'}</td>
                      <td className={`${td} text-right tabular-nums`}>{t.questionCount ?? '–'}</td>
                      <td className={`${td} text-right tabular-nums`}>{t.attempts}{t.kind !== 'platform' ? `/${t.eligible}` : ''}</td>
                      <td className={`${td} text-right`}>{t.attempts ? <Pill tone={pctTone(t.avgPercent)}>{fmtPct(t.avgPercent)}</Pill> : '–'}</td>
                      <td className={`${td} text-right pr-5`}>{t.kind !== 'platform' && <button aria-label={`Delete ${t.title}`} onClick={() => remove(t)} className="text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>}</td>
                    </tr>
                  ))}
                  {!rows.length && <tr><td colSpan={8} className="py-10 text-center text-slate-400">No tests here.</td></tr>}
                </tbody>
              </table>
            </div>
          </Panel>
        )
      }}</Load>
    </div>
  )
}
