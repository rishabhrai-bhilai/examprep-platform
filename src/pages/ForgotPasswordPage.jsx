import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'

export default function ForgotPasswordPage() {
  const { forgotPassword, error, loading, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setSuccessMsg('')
    clearError()

    const success = await forgotPassword(email)
    if (success) {
      setSuccessMsg('Reset instructions have been sent to your email address!')
    } else {
      setLocalError('Failed to send reset link. Try again.')
    }
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex flex-col justify-center items-center p-4">
      {/* Box */}
      <div className="w-full max-w-md bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card shadow-soft p-8 space-y-6">
        
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-xl tracking-tight text-text-primary-light dark:text-text-primary-dark">
            <BookOpen className="text-primary" size={28} />
            <span>Exam<span className="text-primary">Prep</span></span>
          </Link>
          <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Reset password</h2>
          <p className="text-xs text-slate-500">We will email you link instructions to reset your password.</p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3 bg-success/10 border border-success/20 text-success rounded-btn flex items-start gap-2 text-xs">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {(localError || error) && (
          <div className="p-3 bg-error/10 border border-error/20 text-error rounded-btn flex items-start gap-2 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{localError || error}</span>
          </div>
        )}

        {/* Form */}
        {!successMsg ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 mt-6 bg-primary hover:bg-primary-hover text-white font-semibold rounded-btn shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center disabled:opacity-50"
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <Link
              to="/login"
              className="w-full h-10 bg-primary hover:bg-primary-hover text-white font-semibold rounded-btn shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center"
            >
              Back to Login
            </Link>
          </div>
        )}

        <div className="text-center pt-2">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary transition-colors font-medium">
            <ArrowLeft size={14} />
            <span>Back to sign in</span>
          </Link>
        </div>

      </div>
    </div>
  )
}
