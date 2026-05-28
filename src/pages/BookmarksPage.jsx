import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, FileText, ArrowRight, HelpCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function BookmarksPage() {
  const navigate = useNavigate()
  const { bookmarks, toggleBookmark, setActiveQuestionIndex, questions } = useAppStore()

  // Filter bookmarked items
  const savedQuestions = questions.filter((q) => bookmarks.includes(q.id))

  const handlePracticeQuestion = (questionId) => {
    // Find index of the question in the store list
    const idx = questions.findIndex((q) => q.id === questionId)
    if (idx !== -1) {
      setActiveQuestionIndex(idx)
      navigate('/pyq', { state: { startReels: true, questionId } })
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 bg-bg-light dark:bg-bg-dark min-h-screen">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
          <Bookmark className="text-primary fill-primary" size={24} />
          <span>Saved Bookmarks</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your bookmarked questions. Click on any card to practice it instantly in Reels mode.
        </p>
      </div>

      {savedQuestions.length === 0 ? (
        <div className="p-12 text-center rounded-card border border-dashed border-slate-200 dark:border-slate-800 bg-card-light dark:bg-card-dark space-y-4 max-w-lg mx-auto mt-8">
          <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Bookmark size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">No bookmarked questions</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Bookmark questions while practicing on the PYQ page to save them here for quick revisions.
            </p>
          </div>
          <button
            onClick={() => navigate('/pyq')}
            className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-btn shadow-sm transition-all active:scale-95 inline-flex items-center gap-1"
          >
            <span>Go to PYQs</span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {savedQuestions.map((q, idx) => (
            <div
              key={q.id}
              className="p-5 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-300 dark:hover:border-slate-800"
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">
                  <span className="text-primary">{q.subject}</span>
                  <span>•</span>
                  <span>{q.topic}</span>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{q.difficulty}</span>
                </div>
                
                <h3 className="font-semibold text-sm text-text-primary-light dark:text-text-primary-dark line-clamp-2 md:line-clamp-1 leading-relaxed">
                  {q.question}
                </h3>
              </div>

              <div className="flex gap-2 items-center shrink-0 w-full md:w-auto border-t md:border-t-0 border-slate-100 dark:border-slate-800/40 pt-3 md:pt-0">
                <button
                  onClick={() => toggleBookmark(q.id)}
                  className="px-3 py-2 text-xs font-semibold text-error hover:bg-red-50 dark:hover:bg-red-950/20 rounded-btn transition-colors"
                >
                  Remove
                </button>
                <button
                  onClick={() => handlePracticeQuestion(q.id)}
                  className="px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-btn shadow-sm transition-all active:scale-95 inline-flex items-center gap-1.5 ml-auto md:ml-0"
                >
                  <span>Practice</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
