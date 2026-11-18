import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

// Asks before a timed test is submitted, with what is still unanswered.
export default function SubmitConfirmModal({ open, total, answered, flagged, oneAttempt = false, onCancel, onConfirm }) {
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  const unanswered = total - answered

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="submit-confirm-title">
      <div className="w-full max-w-sm rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 shadow-xl space-y-4">
        <h3 id="submit-confirm-title" className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          Submit the test?
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-btn bg-emerald-500/10"><p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{answered}</p><p className="text-[10px] font-bold uppercase text-slate-500">Answered</p></div>
          <div className="p-2 rounded-btn bg-rose-500/10"><p className="text-lg font-black text-rose-600 dark:text-rose-400">{unanswered}</p><p className="text-[10px] font-bold uppercase text-slate-500">Unanswered</p></div>
          <div className="p-2 rounded-btn bg-amber-500/10"><p className="text-lg font-black text-amber-600 dark:text-amber-400">{flagged}</p><p className="text-[10px] font-bold uppercase text-slate-500">Flagged</p></div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {unanswered > 0 ? `${unanswered} of ${total} questions are still unanswered. ` : 'Every question has an answer. '}
          {oneAttempt ? 'Each test can be taken once, so you will not be able to retake it.' : 'You cannot change answers after submitting.'}
        </p>
        <div className="flex gap-2 justify-end">
          <button ref={cancelRef} onClick={onCancel} className="px-4 py-2 rounded-btn text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
            Keep going
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-btn text-xs font-bold bg-primary hover:bg-primary-hover text-white">
            Submit test
          </button>
        </div>
      </div>
    </div>
  )
}
