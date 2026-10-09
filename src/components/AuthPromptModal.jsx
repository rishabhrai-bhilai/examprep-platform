import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { X, Lock, ShieldCheck, Sparkles, MessageSquare, Cloud, CheckCircle2, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import GoogleSignInButton from './GoogleSignInButton'

export default function AuthPromptModal() {
  const navigate = useNavigate()
  const { authPrompt, closeAuthPrompt, isAuthenticated } = useAuthStore()

  // If already authenticated, close prompt
  useEffect(() => {
    if (isAuthenticated && authPrompt.isOpen) {
      closeAuthPrompt()
    }
  }, [isAuthenticated, authPrompt.isOpen, closeAuthPrompt])

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && authPrompt.isOpen) {
        closeAuthPrompt()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [authPrompt.isOpen, closeAuthPrompt])

  if (!authPrompt.isOpen || isAuthenticated) return null

  const handleNavigateToLogin = () => {
    closeAuthPrompt()
    navigate('/login')
  }

  const handleNavigateToSignup = () => {
    closeAuthPrompt()
    navigate('/signup')
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthPrompt}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark p-6 sm:p-7 space-y-6 z-10 overflow-hidden"
        >
          {/* Accent Glow in Header */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={closeAuthPrompt}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="text-center space-y-2.5 pt-2">
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary mb-1 ring-8 ring-primary/5">
              <Lock size={26} className="text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-text-primary-light dark:text-text-primary-dark tracking-tight">
              Register / Login to access this feature
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-2">
              {authPrompt.message || 'Please log in or create an account to access community voting, discussions, and cloud-synced study tools.'}
            </p>
          </div>

          {/* Key Advantages Pill List */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-2 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <Cloud size={15} className="text-primary shrink-0" />
              <span>Sync notes & bookmarks across all your devices</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <MessageSquare size={15} className="text-emerald-500 shrink-0" />
              <span>Upvote quality questions and reply to solutions</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <Sparkles size={15} className="text-amber-500 shrink-0" />
              <span>Track your practice streaks and test performance</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-1">
            {/* Google Sign In */}
            <GoogleSignInButton
              text="Continue with Google"
              onSuccess={closeAuthPrompt}
            />

            {/* Email Login / Signup Buttons Split */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleNavigateToLogin}
                className="h-10 px-4 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-btn transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <span>Log In</span>
                <ArrowRight size={13} />
              </button>

              <button
                type="button"
                onClick={handleNavigateToSignup}
                className="h-10 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-btn transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-[0.98]"
              >
                <span>Create Account</span>
              </button>
            </div>
          </div>

          {/* Dismiss Footer */}
          <div className="text-center pt-1 border-t border-slate-100 dark:border-slate-800/40">
            <button
              type="button"
              onClick={closeAuthPrompt}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors font-medium"
            >
              Continue exploring as guest
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
