import React, { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex-1 h-full min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
      <span className="h-8 w-8 rounded-full border-[3px] border-primary/25 border-t-primary animate-spin" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  )
}

// Pages below this only render once the question bank (its own ~1 MB chunk) has
// arrived, so they never see an empty list and behave as they always have
export default function QuestionsGate({ children }) {
  const hasQuestions = useAppStore(s => s.questions.length > 0)
  const error = useAppStore(s => s.questionsError)
  const fetchQuestions = useAppStore(s => s.fetchQuestions)

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  if (hasQuestions) return children
  if (error) {
    return (
      <div className="flex-1 h-full min-h-[50vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{error}</p>
        <button onClick={fetchQuestions} className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-btn transition-colors">
          Try again
        </button>
      </div>
    )
  }
  return <PageLoader label="Loading questions…" />
}
