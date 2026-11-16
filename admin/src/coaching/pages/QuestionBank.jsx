// 4. Question bank management: the centre's own questions plus the PYQ library
import { useState } from 'react'
import { Plus, Pencil, Trash2, Search, Loader2, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { capi, useCoaching, useWorkspace, letter, answerText } from '../api'
import { Panel, PageTitle } from '../kit'
import { inputCls, btnPrimary, btnGhost, Pill, ErrorBox, Spinner } from '../../components/ui'

const blank = (subject) => ({ subject, chapter: '', type: 'MCQ', difficulty: 'Medium', marks: 1, question: '', options: ['', '', '', ''], answer: 0, explanation: '' })

function QuestionForm({ initial, onDone, onCancel }) {
  const { cid, info } = useWorkspace()
  const [f, setF] = useState(initial?.id ? { ...initial, options: initial.options || ['', '', '', ''] } : blank(info.syllabus[0].subject))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const chapters = info.syllabus.find(s => s.subject === f.subject)?.chapters || []
  const setOpt = (i, v) => setF({ ...f, options: f.options.map((o, j) => (j === i ? v : o)) })
  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await capi(cid, initial?.id ? `/questions/${initial.id}` : '/questions', { method: initial?.id ? 'PATCH' : 'POST', body: f })
      onDone()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={save} className="space-y-3 p-4 rounded-2xl border border-primary/30 bg-primary/5">
      <div className="grid md:grid-cols-5 gap-2">
        <select className={`${inputCls} md:col-span-2`} value={f.subject} onChange={e => setF({ ...f, subject: e.target.value, chapter: '' })} aria-label="Subject">{info.syllabus.map(s => <option key={s.subject}>{s.subject}</option>)}</select>
        <select className={`${inputCls} md:col-span-3`} value={f.chapter} onChange={e => setF({ ...f, chapter: e.target.value })} aria-label="Chapter"><option value="">Chapter…</option>{chapters.map(c => <option key={c}>{c}</option>)}</select>
        <select className={inputCls} value={f.type} onChange={e => setF({ ...f, type: e.target.value, answer: e.target.value === 'MSQ' ? [] : e.target.value === 'NAT' ? '' : 0 })} aria-label="Type"><option>MCQ</option><option>MSQ</option><option>NAT</option></select>
        <select className={inputCls} value={f.difficulty} onChange={e => setF({ ...f, difficulty: e.target.value })} aria-label="Difficulty"><option>Easy</option><option>Medium</option><option>Hard</option></select>
        <select className={inputCls} value={f.marks} onChange={e => setF({ ...f, marks: Number(e.target.value) })} aria-label="Marks"><option value={1}>1 mark</option><option value={2}>2 marks</option></select>
      </div>
      <textarea className={`${inputCls} min-h-24`} placeholder="Question text (Markdown and $LaTeX$ work on the student site)" value={f.question} onChange={e => setF({ ...f, question: e.target.value })} aria-label="Question" />
      {f.type === 'NAT' ? (
        <input className={inputCls} placeholder='Correct value, e.g. 42 or "2.5 to 2.6"' value={f.answer} onChange={e => setF({ ...f, answer: e.target.value })} aria-label="Correct value" />
      ) : (
        <div className="space-y-2">
          {f.options.map((o, i) => {
            const on = f.type === 'MSQ' ? [].concat(f.answer).includes(i) : f.answer === i
            return (
              <div key={i} className="flex items-center gap-2">
                <button type="button" onClick={() => setF({ ...f, answer: f.type === 'MSQ' ? (on ? f.answer.filter(x => x !== i) : [...f.answer, i].sort()) : i })}
                  className={`h-8 w-8 shrink-0 rounded-lg border text-xs font-black ${on ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border-light dark:border-border-dark'}`} aria-label={`Mark option ${letter(i)} correct`}>{letter(i)}</button>
                <input className={inputCls} value={o} onChange={e => setOpt(i, e.target.value)} placeholder={`Option ${letter(i)}`} aria-label={`Option ${letter(i)}`} />
              </div>
            )
          })}
          <p className="text-[10px] text-slate-400">Click a letter to mark it correct{f.type === 'MSQ' ? ' (several allowed)' : ''}.</p>
        </div>
      )}
      <textarea className={inputCls} placeholder="Explanation (optional)" value={f.explanation} onChange={e => setF({ ...f, explanation: e.target.value })} aria-label="Explanation" />
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {initial?.id ? 'Save question' : 'Add to bank'}</button>
        <button type="button" className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
      <ErrorBox>{error}</ErrorBox>
    </form>
  )
}

export default function QuestionBank() {
  const { cid, info } = useWorkspace()
  const [f, setF] = useState({ source: '', subject: '', chapter: '', difficulty: '', type: '', q: '', page: 1 })
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const state = useCoaching('/questions', { ...f, pageSize: 20 }, refresh)
  const set = (patch) => setF(x => ({ ...x, page: 1, ...patch }))
  const chapters = info.syllabus.find(s => s.subject === f.subject)?.chapters || []
  const d = state.data
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1

  const edit = async (id) => {
    const { question } = await capi(cid, `/questions/${id}`)
    setEditing(question)
  }
  const remove = async (id) => {
    if (!window.confirm('Delete this question from the bank?')) return
    try { await capi(cid, `/questions/${id}`, { method: 'DELETE' }); setRefresh(n => n + 1) } catch (err) { setError(err.message) }
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Question bank" subtitle={d ? `${d.counts.centre} of the centre's own questions · ${d.counts.pyq} GATE PYQs in the library` : ''}
        right={!editing && <button className={btnPrimary} onClick={() => setEditing({})}><Plus size={13} /> New question</button>} />
      {editing && <QuestionForm initial={editing} onDone={() => { setEditing(null); setRefresh(n => n + 1) }} onCancel={() => setEditing(null)} />}
      <ErrorBox>{error}</ErrorBox>
      <Panel>
        <div className="grid md:grid-cols-6 gap-2 mb-4">
          <select className={inputCls} value={f.source} onChange={e => set({ source: e.target.value })} aria-label="Source"><option value="">All sources</option><option value="centre">Centre&apos;s own</option><option value="pyq">GATE PYQs</option></select>
          <select className={inputCls} value={f.subject} onChange={e => set({ subject: e.target.value, chapter: '' })} aria-label="Subject"><option value="">All subjects</option>{info.syllabus.map(s => <option key={s.subject}>{s.subject}</option>)}</select>
          <select className={inputCls} value={f.chapter} onChange={e => set({ chapter: e.target.value })} disabled={!f.subject} aria-label="Chapter"><option value="">All chapters</option>{chapters.map(c => <option key={c}>{c}</option>)}</select>
          <select className={inputCls} value={f.difficulty} onChange={e => set({ difficulty: e.target.value })} aria-label="Difficulty"><option value="">Any difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
          <select className={inputCls} value={f.type} onChange={e => set({ type: e.target.value })} aria-label="Type"><option value="">Any type</option><option>MCQ</option><option>MSQ</option><option>NAT</option></select>
          <div className="relative"><Search size={14} className="absolute left-3 top-3 text-slate-400" /><input className={`${inputCls} pl-9`} placeholder="Search" value={f.q} onChange={e => set({ q: e.target.value })} aria-label="Search questions" /></div>
        </div>
        {!d ? <Spinner /> : (
          <>
            <ul className="divide-y divide-border-light dark:divide-border-dark">
              {d.items.map(q => (
                <li key={q.id} className="py-3 flex gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Pill tone={q.source === 'centre' ? 'info' : 'muted'}>{q.source === 'centre' ? 'Centre' : `PYQ ${q.year || ''}`}</Pill>
                      <Pill tone={q.difficulty === 'Hard' ? 'critical' : q.difficulty === 'Easy' ? 'good' : 'warning'}>{q.difficulty}</Pill>
                      <span className="text-[10px] text-slate-500">{q.subject} · {q.chapter} · {q.type} · {q.marks} mark{q.marks > 1 ? 's' : ''}{q.code ? ` · ${q.code}` : ''}{q.usedIn ? ` · in ${q.usedIn} test${q.usedIn > 1 ? 's' : ''}` : ''}</span>
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2">{q.text}</p>
                    {q.options && <p className="text-[10px] text-slate-500 truncate">{q.options.map((o, i) => `${letter(i)}) ${String(o).slice(0, 40)}`).join('   ')}</p>}
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Key: {answerText(q)}</p>
                  </div>
                  {q.source === 'centre' && (
                    <div className="flex flex-col gap-2 text-slate-400">
                      <button onClick={() => edit(q.id)} className="hover:text-primary" aria-label="Edit question"><Pencil size={13} /></button>
                      <button onClick={() => remove(q.id)} className="hover:text-rose-600" aria-label="Delete question"><Trash2 size={13} /></button>
                    </div>
                  )}
                </li>
              ))}
              {!d.items.length && <li className="py-10 text-center text-xs text-slate-400">No questions match.</li>}
            </ul>
            <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
              <span>{d.total} questions</span>
              <span className="flex items-center gap-2">
                <button className={btnGhost} disabled={f.page <= 1} onClick={() => setF(x => ({ ...x, page: x.page - 1 }))} aria-label="Previous page"><ChevronLeft size={13} /></button>
                Page {f.page} of {pages}
                <button className={btnGhost} disabled={f.page >= pages} onClick={() => setF(x => ({ ...x, page: x.page + 1 }))} aria-label="Next page"><ChevronRight size={13} /></button>
              </span>
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
