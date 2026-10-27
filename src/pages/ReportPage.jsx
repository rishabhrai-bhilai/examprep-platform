import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Flag, Inbox, ShieldCheck, Lock, Loader2, RefreshCw, Save, MessageSquareReply, AlertCircle, Check } from 'lucide-react'
import { useReportStore } from '../store/useReportStore'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import ReportIssueForm from '../components/ReportIssueForm'

const CATEGORY_META = {
  question: { label: 'Question', className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  bug: { label: 'Bug', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  suggestion: { label: 'Suggestion', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  other: { label: 'Other', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20' }
}

const STATUS_META = {
  open: { label: 'Open', className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
  in_progress: { label: 'In progress', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  resolved: { label: 'Resolved', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' }
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'resolved', label: 'Resolved' }
]

const formatDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function Badge({ meta }) {
  if (!meta) return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${meta.className}`}>
      {meta.label}
    </span>
  )
}

function ReportSummary({ report, questionLabel }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge meta={CATEGORY_META[report.category] || CATEGORY_META.other} />
        <Badge meta={STATUS_META[report.status] || STATUS_META.open} />
        <span className="text-[11px] text-slate-400 ml-auto">{formatDate(report.createdAt)}</span>
      </div>
      {report.questionId !== null && report.questionId !== undefined && (
        <p className="text-xs font-semibold text-primary">{questionLabel(report.questionId)}</p>
      )}
      <p className="text-sm text-text-primary-light dark:text-text-primary-dark line-clamp-3 whitespace-pre-line break-words">
        {report.message}
      </p>
    </div>
  )
}

function AdminReportItem({ report, questionLabel, onSaved }) {
  const { updateReport } = useReportStore()
  const [status, setStatus] = useState(report.status || 'open')
  const [adminNote, setAdminNote] = useState(report.adminNote || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const dirty = status !== (report.status || 'open') || adminNote !== (report.adminNote || '')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const updated = await updateReport(report.id, { status, adminNote })
      onSaved(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="p-4 rounded-card border border-border-light dark:border-border-dark bg-white/60 dark:bg-slate-900/40 space-y-3">
      <ReportSummary report={report} questionLabel={questionLabel} />
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        From <span className="font-semibold text-slate-700 dark:text-slate-300">{report.userName || 'Unknown'}</span>
        {report.userEmail && <> · {report.userEmail}</>}
        {report.page && <> · on {report.page}</>}
      </p>

      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 px-2 rounded-input bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark text-xs font-semibold text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Status"
        >
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <textarea
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Reply to the reporter (optional)"
          rows={2}
          maxLength={1000}
          className="px-3 py-2 rounded-input bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark text-xs text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        {error && <span className="text-xs text-error font-medium">{error}</span>}
        {saved && <span className="text-xs text-success font-semibold flex items-center gap-1"><Check size={13} /> Saved</span>}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="h-8 px-3 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-btn transition-all flex items-center gap-1.5"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          <span>Save</span>
        </button>
      </div>
    </li>
  )
}

export default function ReportPage() {
  const [searchParams] = useSearchParams()
  const { fetchMyReports, fetchAllReports } = useReportStore()
  const { isAuthenticated, user } = useAuthStore()
  const { questions } = useAppStore()
  const isAdmin = !!user?.isAdmin

  const questionIdParam = searchParams.get('questionId')
  const initialQuestionId = questionIdParam && !Number.isNaN(Number(questionIdParam)) ? Number(questionIdParam) : null

  const [myReports, setMyReports] = useState([])
  const [myLoading, setMyLoading] = useState(false)
  const [myError, setMyError] = useState('')

  const [allReports, setAllReports] = useState([])
  const [allLoading, setAllLoading] = useState(false)
  const [allError, setAllError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const questionLabel = (id) => {
    const q = (questions || []).find(item => String(item.id) === String(id))
    if (!q) return `Question #${id}`
    return `GATE ${q.year} ${q.paper || ''} · Q${q.questionNumber} · ${q.subject}`.replace(/\s+·/g, ' ·')
  }

  const loadMyReports = useCallback(async () => {
    setMyLoading(true)
    setMyError('')
    try {
      const data = await fetchMyReports()
      setMyReports(Array.isArray(data) ? data : [])
    } catch (err) {
      setMyError(err.message)
    } finally {
      setMyLoading(false)
    }
  }, [fetchMyReports])

  const loadAllReports = useCallback(async () => {
    setAllLoading(true)
    setAllError('')
    try {
      const data = await fetchAllReports()
      setAllReports(Array.isArray(data) ? data : [])
    } catch (err) {
      setAllError(err.message)
    } finally {
      setAllLoading(false)
    }
  }, [fetchAllReports])

  useEffect(() => {
    if (isAuthenticated) loadMyReports()
  }, [isAuthenticated, loadMyReports])

  useEffect(() => {
    if (isAuthenticated && isAdmin) loadAllReports()
  }, [isAuthenticated, isAdmin, loadAllReports])

  const handleSubmitted = () => {
    loadMyReports()
    if (isAdmin) loadAllReports()
  }

  const handleAdminSaved = (updated) => {
    if (!updated) return
    setAllReports(prev => prev.map(r => (r.id === updated.id ? { ...r, ...updated } : r)))
    setMyReports(prev => prev.map(r => (r.id === updated.id ? { ...r, ...updated } : r)))
  }

  const filteredAll = statusFilter === 'all' ? allReports : allReports.filter(r => r.status === statusFilter)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark min-h-screen">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
          <Flag size={22} className="text-primary" />
          Report an Issue
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Found a wrong answer, a bug, or have an idea? Tell us — we read every report.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card shadow-soft p-5 sm:p-6 space-y-4">
        {!isAuthenticated && (
          <div className="flex items-start gap-2.5 p-3 rounded-input bg-primary/5 border border-primary/15 text-xs text-slate-600 dark:text-slate-300">
            <Lock size={14} className="text-primary shrink-0 mt-0.5" />
            <span>Reports need an account so we can follow up with you. You can write your report now and log in to send it.</span>
          </div>
        )}
        <ReportIssueForm
          key={initialQuestionId ?? 'none'}
          initialQuestionId={initialQuestionId}
          initialCategory={initialQuestionId !== null ? 'question' : undefined}
          onSubmitted={handleSubmitted}
        />
      </div>

      {/* My Reports */}
      {isAuthenticated && (
        <section className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card shadow-soft p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
              <Inbox size={18} className="text-primary" />
              My reports
            </h2>
            <button
              type="button"
              onClick={loadMyReports}
              disabled={myLoading}
              className="p-1.5 rounded-btn text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh"
              aria-label="Refresh my reports"
            >
              <RefreshCw size={15} className={myLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {myError && (
            <p className="flex items-center gap-2 text-xs text-error font-medium"><AlertCircle size={14} /> {myError}</p>
          )}

          {!myError && myLoading && myReports.length === 0 ? (
            <div className="flex justify-center py-6 text-slate-400"><Loader2 size={20} className="animate-spin" /></div>
          ) : !myError && myReports.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
              You haven&apos;t sent any reports yet. Anything you send will show up here with its status.
            </p>
          ) : (
            <ul className="space-y-3">
              {myReports.map(report => (
                <li key={report.id} className="p-4 rounded-card border border-border-light dark:border-border-dark bg-white/60 dark:bg-slate-900/40 space-y-2">
                  <ReportSummary report={report} questionLabel={questionLabel} />
                  {report.adminNote && (
                    <div className="flex items-start gap-2 p-2.5 rounded-input bg-primary/5 border border-primary/15 text-xs text-slate-700 dark:text-slate-300">
                      <MessageSquareReply size={14} className="text-primary shrink-0 mt-0.5" />
                      <span className="whitespace-pre-line break-words">
                        <span className="font-semibold text-primary">Reply from the team:</span> {report.adminNote}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Admin: All Reports */}
      {isAuthenticated && isAdmin && (
        <section className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card shadow-soft p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              All reports (admin)
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                      statusFilter === f.id
                        ? 'bg-primary border-primary text-white'
                        : 'border-border-light dark:border-border-dark text-slate-500 dark:text-slate-400 hover:text-primary hover:border-primary/50'
                    }`}
                  >
                    {f.label}
                    {f.id !== 'all' && ` (${allReports.filter(r => r.status === f.id).length})`}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={loadAllReports}
                disabled={allLoading}
                className="p-1.5 rounded-btn text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Refresh"
                aria-label="Refresh all reports"
              >
                <RefreshCw size={15} className={allLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {allError && (
            <p className="flex items-center gap-2 text-xs text-error font-medium"><AlertCircle size={14} /> {allError}</p>
          )}

          {!allError && allLoading && allReports.length === 0 ? (
            <div className="flex justify-center py-6 text-slate-400"><Loader2 size={20} className="animate-spin" /></div>
          ) : !allError && filteredAll.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No reports here.</p>
          ) : (
            <ul className="space-y-3">
              {filteredAll.map(report => (
                <AdminReportItem
                  key={report.id}
                  report={report}
                  questionLabel={questionLabel}
                  onSaved={handleAdminSaved}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
