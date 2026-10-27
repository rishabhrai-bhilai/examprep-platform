import React, { useState } from 'react'
import { FileQuestion, Bug, Lightbulb, HelpCircle, Send, CheckCircle2, AlertCircle, Loader2, LogIn } from 'lucide-react'
import { useReportStore } from '../store/useReportStore'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import QuestionText from './QuestionText'

const MIN_LENGTH = 10
const MAX_LENGTH = 2000

const CATEGORIES = [
  { id: 'question', label: 'Wrong question / answer', icon: FileQuestion },
  { id: 'bug', label: 'Bug on the site', icon: Bug },
  { id: 'suggestion', label: 'Suggestion / idea', icon: Lightbulb },
  { id: 'other', label: 'Other', icon: HelpCircle }
]

const PLACEHOLDERS = {
  question: 'The answer key says B, but the correct answer is C because…',
  bug: 'When I open a mock test and press Next, the page goes blank…',
  suggestion: 'It would be great if I could filter questions by…',
  other: 'Tell us what is on your mind…'
}

const formatQuestionLabel = (q) =>
  `GATE ${q.year} ${q.paper || ''} · Q${q.questionNumber} · ${q.subject}`.replace(/\s+·/g, ' ·')

export default function ReportIssueForm({ initialQuestionId = null, initialCategory, onSubmitted, compact = false }) {
  const { submitReport } = useReportStore()
  const { isAuthenticated, openAuthPrompt } = useAuthStore()
  const { questions } = useAppStore()

  const hasInitialQuestion = initialQuestionId !== null && initialQuestionId !== undefined && initialQuestionId !== ''
  const [category, setCategory] = useState(initialCategory || (hasInitialQuestion ? 'question' : 'bug'))
  const [questionIdInput, setQuestionIdInput] = useState(hasInitialQuestion ? String(initialQuestionId) : '')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const trimmedId = questionIdInput.trim()
  const resolvedQuestion = trimmedId
    ? (questions || []).find(q => String(q.id) === trimmedId) || null
    : null
  const trimmedLength = message.trim().length
  const needsQuestion = category === 'question'
  const canSubmit = !submitting &&
    trimmedLength >= MIN_LENGTH &&
    message.length <= MAX_LENGTH &&
    (!needsQuestion || !!resolvedQuestion)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      openAuthPrompt('report an issue')
      return
    }
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const report = await submitReport({
        category,
        questionId: needsQuestion && resolvedQuestion ? resolvedQuestion.id : null,
        message: message.trim(),
        page: window.location.pathname
      })
      setSuccess(true)
      setMessage('')
      if (onSubmitted) onSubmitted(report)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className={`flex flex-col items-center text-center gap-3 ${compact ? 'py-6' : 'py-10'}`}>
        <div className="inline-flex p-3 rounded-2xl bg-success/10 text-success ring-8 ring-success/5">
          <CheckCircle2 size={26} />
        </div>
        <p className="text-base font-bold text-text-primary-light dark:text-text-primary-dark">
          Thanks! We&apos;ll look into it.
        </p>
        {!compact && (
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Send another report
          </button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-4' : 'space-y-5'}>
      {/* Category pills */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          What kind of issue?
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ id, label, icon: Icon }) => {
            const active = category === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setCategory(id); setError('') }}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-[0.98] ${
                  active
                    ? 'bg-primary border-primary text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-border-light dark:border-border-dark text-slate-600 dark:text-slate-300 hover:border-primary/50 hover:text-primary'
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Question reference */}
      {needsQuestion && (
        hasInitialQuestion && resolvedQuestion ? (
          <div className="p-3 rounded-input bg-slate-50 dark:bg-slate-900/60 border border-border-light dark:border-border-dark">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reporting</p>
            <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark mt-0.5">
              {formatQuestionLabel(resolvedQuestion)}
            </p>
            {resolvedQuestion.question && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {/* First line of text only, rendered with KaTeX; figures are skipped */}
                <QuestionText
                  inline
                  text={resolvedQuestion.question.replace(/!\[[^\]]*\]\([^)]*\)/g, '').split('\n').find(l => l.trim()) || ''}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="report-question-id" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Question ID
            </label>
            <input
              id="report-question-id"
              type="number"
              min="1"
              value={questionIdInput}
              onChange={(e) => setQuestionIdInput(e.target.value)}
              placeholder="e.g. 1234"
              className="w-full h-10 px-3 rounded-input bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark text-sm text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <p className="text-[11px] text-slate-400">
              Open the question and use the flag button, or enter its ID
            </p>
            {trimmedId && (
              resolvedQuestion ? (
                <p className="text-xs font-semibold text-primary">{formatQuestionLabel(resolvedQuestion)}</p>
              ) : (
                <p className="text-xs font-semibold text-error">No question with this ID</p>
              )
            )}
          </div>
        )
      )}

      {/* Message */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="report-message" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            What&apos;s wrong?
          </label>
          <span className={`text-[11px] font-semibold tabular-nums ${message.length > MAX_LENGTH ? 'text-error' : 'text-slate-400'}`}>
            {message.length} / {MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="report-message"
          value={message}
          onChange={(e) => { setMessage(e.target.value); setError('') }}
          placeholder={PLACEHOLDERS[category]}
          rows={compact ? 4 : 6}
          className="w-full px-3 py-2.5 rounded-input bg-white dark:bg-slate-900 border border-border-light dark:border-border-dark text-sm text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-y"
        />
        {message.length > 0 && trimmedLength < MIN_LENGTH && (
          <p className="text-[11px] text-slate-400">Please write at least {MIN_LENGTH} characters.</p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-input bg-error/10 border border-error/20 text-error text-xs font-medium">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {isAuthenticated ? (
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-10 px-4 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-btn transition-all shadow-xs flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          <span>{submitting ? 'Sending…' : 'Send report'}</span>
        </button>
      ) : (
        <button
          type="submit"
          className="w-full h-10 px-4 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-btn transition-all shadow-xs flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <LogIn size={15} />
          <span>Log in to send</span>
        </button>
      )}
    </form>
  )
}
