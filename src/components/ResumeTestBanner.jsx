import React from 'react'
import { useNavigate } from 'react-router-dom'
import { PlayCircle } from 'lucide-react'
import { formatSavedAt } from '../utils/testSession'

const PAGE_PATHS = { mock: '/mock-tests', pyq: '/pyq-mock' }

// Shown above the test lists while a test is in progress (after a refresh, crash
// or closed tab). On the test's own page it resumes the test; elsewhere it links there.
export default function ResumeTestBanner({ session, page, onResume }) {
  const navigate = useNavigate()
  if (!session) return null
  const here = session.page === page
  const answered = Object.values(session.answers || {}).filter(a => a !== '' && a !== null && !(Array.isArray(a) && a.length === 0)).length
  const mins = Math.floor((session.timeLeft || 0) / 60)

  return (
    <div className="p-4 rounded-card border border-amber-400/40 bg-amber-50 dark:bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Test in progress: {session.title}</p>
        <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-0.5">
          {answered} of {session.questionIds.length} answered · {mins} min left · saved {formatSavedAt(session.savedAt)}.
          {' '}It continues from where it stopped, with the same time left.
        </p>
      </div>
      <button
        onClick={() => (here ? onResume() : navigate(PAGE_PATHS[session.page] || '/mock-tests'))}
        className="shrink-0 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-btn flex items-center gap-1.5 active:scale-95 transition-all"
      >
        <PlayCircle size={14} />
        {here ? 'Resume Test' : 'Go to Test'}
      </button>
    </div>
  )
}
