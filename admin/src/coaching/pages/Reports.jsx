// 18. PDF and Excel reports
import { useState } from 'react'
import { FileText, FileSpreadsheet, Loader2, Search } from 'lucide-react'
import { capi, useCoaching, useWorkspace } from '../api'
import { Panel, PageTitle, BatchSelect } from '../kit'
import { inputCls, btnPrimary, btnGhost, ErrorBox } from '../../components/ui'
import { batchPdf, batchWorkbook, studentPdf, studentWorkbook } from '../reports'

export default function Reports() {
  const { cid, info } = useWorkspace()
  const [batch, setBatch] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const students = useCoaching('/students')

  const run = async (key, fn) => {
    setBusy(key)
    setError('')
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy('') }
  }
  const batchReport = () => capi(cid, `/report/batch${batch ? `?batchId=${batch}` : ''}`)
  const studentData = async (sid) => {
    const [r, ins] = await Promise.all([capi(cid, `/students/${sid}/report`), capi(cid, `/insights?studentId=${sid}`)])
    return { ...r, insights: ins.items }
  }
  const spin = (key, Icon) => (busy === key ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />)
  const list = (students.data?.students || []).filter(s => !q || s.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-6">
      <PageTitle title="Reports" subtitle="Download PDF reports to share with students and parents, and Excel workbooks for your own records" />
      <ErrorBox>{error}</ErrorBox>
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Batch report" subtitle="Leaderboard, tests, subject accuracy, weak chapters, insights and every student">
          <div className="flex flex-wrap items-center gap-2">
            <BatchSelect value={batch} onChange={setBatch} allLabel="All batches (whole centre)" />
            <button className={btnPrimary} disabled={!!busy} onClick={() => run('bpdf', async () => batchPdf(await batchReport()))}>{spin('bpdf', FileText)} PDF</button>
            <button className={btnGhost} disabled={!!busy} onClick={() => run('bxls', async () => batchWorkbook(await batchReport()))}>{spin('bxls', FileSpreadsheet)} Excel (7 sheets)</button>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">The Excel workbook has sheets for students, leaderboard, tests, subjects and chapters, weak chapters, course progress and insights.</p>
        </Panel>
        <Panel title="Other exports" subtitle="Every analytics page also has its own Excel button">
          <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
            <li>Students &amp; batches: the student list</li>
            <li>Mock tests → a test: results and question analysis</li>
            <li>Leaderboard, Subjects &amp; chapters, Weakness detection, Batch comparison</li>
            <li>Activity (daily and per student), Assignments with submissions, Course progress, Insights</li>
          </ul>
        </Panel>
      </div>
      <Panel title="Student reports" subtitle="One PDF or Excel file per student">
        <div className="relative mb-3 max-w-sm"><Search size={14} className="absolute left-3 top-3 text-slate-400" /><input className={`${inputCls} pl-9`} placeholder="Find a student" value={q} onChange={e => setQ(e.target.value)} aria-label="Find a student" /></div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[30rem] overflow-y-auto">
          {list.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border-light dark:border-border-dark">
              <div className="min-w-0"><p className="text-xs font-bold truncate">{s.name}</p><p className="text-[10px] text-slate-400 truncate">{s.batch || 'No batch'}</p></div>
              <span className="flex gap-1.5 shrink-0">
                <button className={btnGhost} disabled={!!busy} onClick={() => run(`p${s.id}`, async () => studentPdf(await studentData(s.id), info.centre))} aria-label={`PDF report for ${s.name}`}>{spin(`p${s.id}`, FileText)} PDF</button>
                <button className={btnGhost} disabled={!!busy} onClick={() => run(`x${s.id}`, async () => studentWorkbook(await studentData(s.id)))} aria-label={`Excel report for ${s.name}`}>{spin(`x${s.id}`, FileSpreadsheet)}</button>
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
