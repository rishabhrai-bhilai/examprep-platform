// 5. Automatic evaluation and 11. question-level analytics for one test
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, CheckCircle2, AlertTriangle, Gift, Undo2, Users, Target, ListChecks } from 'lucide-react'
import { capi, useCoaching, useWorkspace, fmtSec, letter, answerText } from '../api'
import { Load, Panel, PageTitle, StudentLink, ExportButtons, pctTone } from '../kit'
import { StatTile, Pill, ErrorBox, inputCls, fmtPct, fmtDateTime, th, td } from '../../components/ui'
import { StatusPill, TestEditor } from './Tests'
import { downloadXlsx } from '../reports'

function KeyEditor({ q, testId, onChanged }) {
  const cid = useWorkspace(s => s.cid)
  const [value, setValue] = useState(q.answer)
  const [error, setError] = useState('')
  const send = async (body) => {
    setError('')
    try { onChanged(await capi(cid, `/tests/${testId}/key`, { method: 'POST', body: { questionId: q.id, ...body } })) } catch (err) { setError(err.message) }
  }
  return (
    <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold">Answer key:</span>
        {q.type === 'NAT' ? (
          <input className={`${inputCls} !w-40 !py-1.5`} value={value} onChange={e => setValue(e.target.value)} aria-label="Correct value" />
        ) : q.options.map((o, i) => {
          const on = [].concat(value).includes(i)
          return (
            <button key={i} type="button" onClick={() => setValue(q.type === 'MSQ' ? (on ? [].concat(value).filter(x => x !== i) : [...[].concat(value), i].sort()) : i)}
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${on ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-border-light dark:border-border-dark'}`}>
              {letter(i)}
            </button>
          )
        })}
        <button className="px-2.5 py-1 rounded-lg bg-primary text-white text-[11px] font-bold" onClick={() => send({ answer: value })}>Save key and re-evaluate</button>
        <button className="px-2.5 py-1 rounded-lg border border-border-light dark:border-border-dark text-[11px] font-bold inline-flex items-center gap-1" onClick={() => send({ bonus: !q.bonus })}><Gift size={12} /> {q.bonus ? 'Remove marks to all' : 'Marks to all'}</button>
        {q.keyChanged && <button className="px-2.5 py-1 rounded-lg border border-border-light dark:border-border-dark text-[11px] font-bold inline-flex items-center gap-1" onClick={() => send({ reset: true })}><Undo2 size={12} /> Use the original key ({answerText(q, q.originalAnswer)})</button>}
      </div>
      <ErrorBox>{error}</ErrorBox>
    </div>
  )
}

export default function TestDetail() {
  const { tid } = useParams()
  const { cid, info } = useWorkspace()
  const [refresh, setRefresh] = useState(0)
  const state = useCoaching(`/tests/${tid}`, {}, refresh)
  const [editing, setEditing] = useState(false)
  const [open, setOpen] = useState(null)
  const [override, setOverride] = useState(null)
  const [onlyFlagged, setOnlyFlagged] = useState(false)

  return (
    <Load state={state}>{(d0) => {
      const d = override ? { ...d0, ...override } : d0
      const t = d.test
      const qs = d.questions.filter(q => !onlyFlagged || q.flags?.length)
      const flagged = d.questions.filter(q => q.flags?.length).length
      const exportXlsx = () => downloadXlsx([
        { name: 'Results', rows: [['Rank', 'Student', 'Batch', 'Score', 'Max', '%', 'Percentile', 'Correct', 'Wrong', 'Time (min)'], ...d.results.map(r => [r.rank, r.name, r.batch || '', r.score, r.maxScore, r.percent, r.percentile, r.correct, r.incorrect, Math.round(r.timeTaken / 60)])] },
        { name: 'Question analysis', rows: [['Q', 'Subject', 'Chapter', 'Type', 'Marks', 'Key', 'Attempted %', 'Correct %', 'Avg time (s)', 'Discrimination', 'Most picked wrong', 'Flags'], ...d.questions.map(q => [q.number, q.subject, q.chapter, q.type, q.marks, answerText(q), q.attemptedPct ?? '', q.correctPct ?? '', q.avgTimeSec ?? '', q.discrimination ?? '', q.topWrong || '', (q.flags || []).join('; ')])] }
      ], `${t.title}-results`)
      return (
        <div className="space-y-6">
          <Link to={`/c/${cid}/tests`} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-primary"><ArrowLeft size={12} /> Tests</Link>
          <PageTitle
            title={<span className="flex flex-wrap items-center gap-2">{t.title} <StatusPill status={t.status} /></span>}
            subtitle={`${fmtDateTime(t.scheduledAt)}${t.durationMin ? ` · ${t.durationMin} min` : ''} · ${t.kind === 'platform' ? 'ExamPrep platform test' : t.batches.join(', ') || 'All batches'}${t.kind !== 'platform' ? ` · ${t.negativeMarking ? 'negative marking on' : 'no negative marking'}` : ''}`}
            right={<>
              {t.kind !== 'platform' && <button onClick={() => setEditing(e => !e)} className="inline-flex items-center gap-1 text-xs font-bold text-primary"><Pencil size={13} /> {editing ? 'Close editor' : 'Edit or reschedule'}</button>}
              {d.results.length > 0 && <ExportButtons onXlsx={exportXlsx} />}
            </>}
          />
          {editing && <Panel title="Edit test"><TestEditor test={t} onDone={() => { setEditing(false); setOverride(null); setRefresh(n => n + 1) }} onCancel={() => setEditing(false)} /></Panel>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile icon={Users} label="Attempts" value={`${t.attempts}${t.kind !== 'platform' ? ` / ${t.eligible}` : ''}`} sub={t.kind !== 'platform' ? `${t.eligible - t.attempts} not taken` : ''} />
            <StatTile icon={Target} label="Average" value={fmtPct(t.avgPercent)} sub={`Top ${fmtPct(t.topPercent)}`} />
            <StatTile icon={ListChecks} label="Questions" value={t.questionCount ?? '–'} sub={t.maxScore ? `${t.maxScore} marks` : ''} />
            <StatTile icon={AlertTriangle} label="Flagged questions" value={flagged} sub="Key issues, too hard or too easy" />
          </div>
          {t.kind !== 'platform' && t.attempts > 0 && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={13} /> Evaluated automatically against the answer key at {fmtDateTime(d.evaluatedAt)}. Change a key below and every result is re-scored at once.</p>
          )}
          <div className="grid lg:grid-cols-5 gap-6">
            <Panel title="Results" subtitle="Ranked by score, ties by time" className="lg:col-span-2" pad="p-0">
              <div className="max-h-[32rem] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card-light dark:bg-card-dark"><tr><th className={`${th} pl-5`}>#</th><th className={th}>Student</th><th className={`${th} text-right`}>Score</th><th className={`${th} text-right pr-5`}>%ile</th></tr></thead>
                  <tbody className="divide-y divide-border-light dark:divide-border-dark">
                    {d.results.map(r => (
                      <tr key={r.studentId}>
                        <td className={`${td} pl-5 text-slate-400 font-bold`}>{r.rank}</td>
                        <td className={td}><StudentLink id={r.studentId} name={r.name} /><div className="text-[10px] text-slate-400">{r.batch} · {Math.round(r.timeTaken / 60)} min</div></td>
                        <td className={`${td} text-right tabular-nums`}><span className="font-bold">{r.score}</span><span className="text-slate-400">/{r.maxScore}</span><div><Pill tone={pctTone(r.percent)}>{fmtPct(r.percent)}</Pill></div></td>
                        <td className={`${td} text-right tabular-nums pr-5`}>{r.percentile}</td>
                      </tr>
                    ))}
                    {!d.results.length && <tr><td colSpan={4} className="py-8 text-center text-slate-400">No one has taken it yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel title="Question-level analytics" className="lg:col-span-3" pad="p-0"
              right={null}>
              <div className="px-5 pb-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <label className="flex items-center gap-1.5 font-semibold"><input type="checkbox" checked={onlyFlagged} onChange={e => setOnlyFlagged(e.target.checked)} /> Only flagged ({flagged})</label>
                <span>Discrimination: top 27% minus bottom 27% correct rate (good ≥ 0.3)</span>
              </div>
              {t.kind === 'platform' ? <p className="p-5 text-xs text-slate-400">Question-level data isn&apos;t kept for platform mock tests.</p> : (
                <div className="max-h-[32rem] overflow-y-auto divide-y divide-border-light dark:divide-border-dark">
                  {qs.map(q => (
                    <div key={q.id} className="px-5 py-3 space-y-2">
                      <button className="w-full text-left" onClick={() => setOpen(open === q.id ? null : q.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Q{q.number} <span className="font-normal text-slate-400">· {q.subject} · {q.chapter} · {q.type} · {q.marks}m · key {answerText(q)}</span>
                              {q.keyChanged && <Pill tone="info">Key changed</Pill>} {q.bonus && <Pill tone="good">Marks to all</Pill>}
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">{q.text}</p>
                          </div>
                          <div className="text-right shrink-0 text-[11px] tabular-nums">
                            <Pill tone={pctTone(q.correctPct)}>{fmtPct(q.correctPct)} right</Pill>
                            <div className="text-slate-400 mt-0.5">{fmtPct(q.attemptedPct)} tried · {fmtSec(q.avgTimeSec || 0)} · D {q.discrimination ?? '–'}</div>
                          </div>
                        </div>
                        {q.flags?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{q.flags.map(f => <Pill key={f} tone={f.startsWith('Possible key') ? 'critical' : 'warning'}><AlertTriangle size={10} /> {f}</Pill>)}</div>}
                      </button>
                      {open === q.id && (
                        <div className="space-y-2">
                          {q.optionCounts && (
                            <div className="space-y-1">
                              {q.options.map((o, i) => {
                                const n = q.optionCounts[i]
                                const max = Math.max(1, ...q.optionCounts)
                                const key = [].concat(q.answer).includes(i)
                                return (
                                  <div key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)_8rem_2.5rem] items-center gap-2 text-[11px]">
                                    <span className={`font-bold ${key ? 'text-emerald-600' : 'text-slate-500'}`}>{letter(i)}</span>
                                    <span className="truncate text-slate-600 dark:text-slate-300" title={o}>{o}</span>
                                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className={`h-full rounded-full ${key ? 'bg-emerald-500' : 'bg-slate-400'}`} style={{ width: `${(n / max) * 100}%` }} /></div>
                                    <span className="tabular-nums text-right">{n}</span>
                                  </div>
                                )
                              })}
                              <p className="text-[10px] text-slate-400">Green = the key. Bars show how many students picked each option.</p>
                            </div>
                          )}
                          <KeyEditor q={q} testId={t.id} onChanged={(res) => setOverride({ questions: res.questions, results: res.results, evaluatedAt: res.evaluatedAt, test: { ...t, avgPercent: res.results.length ? Math.round(res.results.reduce((n, r) => n + r.percent, 0) / res.results.length * 10) / 10 : null, topPercent: res.results[0]?.percent ?? null } })} />
                        </div>
                      )}
                    </div>
                  ))}
                  {!qs.length && <p className="p-6 text-xs text-slate-400 text-center">No questions to show.</p>}
                </div>
              )}
            </Panel>
          </div>
          {info.centre.demo && <p className="text-[10px] text-slate-400">Demo: one question in Full Mock 1 was deliberately keyed wrongly so the key check can be shown.</p>}
        </div>
      )
    }}</Load>
  )
}
