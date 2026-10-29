import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flag } from 'lucide-react'
import { useReportStore } from '../store/useReportStore'
import { useAuthStore } from '../store/useAuthStore'
import ReportIssueForm from './ReportIssueForm'

export default function ReportIssueModal() {
  const { reportModal, closeReportModal } = useReportStore()
  const authPromptOpen = useAuthStore((state) => state.authPrompt?.isOpen)

  // ESC key listener (leave Escape to the login prompt when it is on top)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && reportModal.isOpen && !authPromptOpen) {
        closeReportModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [reportModal.isOpen, authPromptOpen, closeReportModal])

  if (!reportModal.isOpen) return null

  return (
    <AnimatePresence>
      {/* z-[90]: one level below AuthPromptModal (z-[100]) so the login prompt can stack on top */}
      <div className="fixed inset-0 z-[90] flex justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeReportModal}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Dialog */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-issue-title"
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative my-auto w-full max-w-lg bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark p-6 sm:p-7 space-y-5 z-10"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={closeReportModal}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 pr-8">
            <div className="inline-flex p-2.5 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary">
              <Flag size={18} />
            </div>
            <h3 id="report-issue-title" className="text-lg font-extrabold text-text-primary-light dark:text-text-primary-dark tracking-tight">
              Report an issue
            </h3>
          </div>

          <ReportIssueForm
            compact
            initialQuestionId={reportModal.questionId}
            initialCategory={reportModal.category}
            onSubmitted={() => setTimeout(closeReportModal, 1500)}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
