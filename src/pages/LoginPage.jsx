import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Lock, Mail, AlertCircle, Eye, EyeOff, User, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import GoogleSignInButton from '../components/GoogleSignInButton'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, quickLogin, error, loading, clearError, isAuthenticated } = useAuthStore()
  const { syncUserData } = useAppStore()

  // Temporary simplified name login enabled by default; standard email/password intact
  const [useStandardLogin, setUseStandardLogin] = useState(false)
  const [quickName, setQuickName] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Clear errors on load & redirect if already authenticated
  useEffect(() => {
    clearError()
    if (isAuthenticated) {
      const from = location.state?.from || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, clearError, location.state])

  const handleQuickSubmit = async (e) => {
    e.preventDefault()
    if (!quickName.trim()) return
    const result = await quickLogin(quickName.trim())
    if (result.success) {
      await syncUserData()
      const from = location.state?.from || '/dashboard'
      navigate(from, { replace: true })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await login(email, password)
    if (result.success) {
      await syncUserData()
      const from = location.state?.from || '/dashboard'
      navigate(from, { replace: true })
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
          <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            {useStandardLogin ? 'Sign in to your account' : 'Welcome to ExamPrep'}
          </h2>
          <p className="text-xs text-slate-500">
            {useStandardLogin
              ? 'Welcome back! Sign in below to access your cloud-synced study session.'
              : 'Enter your name below to start exploring all features immediately.'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-error/10 border border-error/20 text-error rounded-btn flex items-start gap-2 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Quick Name Login (Temporary Default) */}
        {!useStandardLogin ? (
          <div className="space-y-5">
            <form onSubmit={handleQuickSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Your Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Enter your name (e.g. Alex)..."
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark font-medium shadow-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Instant access: enter any name to get started, or 'super' for admin view.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !quickName.trim()}
                className="w-full h-11 bg-primary hover:bg-primary-hover text-white font-bold rounded-btn shadow-md transition-all active:scale-95 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? 'Entering...' : 'Enter ExamPrep'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setUseStandardLogin(true)}
                className="text-xs font-medium text-slate-500 hover:text-primary transition-colors underline decoration-dotted"
              >
                Use standard email & password sign-in
              </button>
            </div>
          </div>
        ) : (
          /* 2. Standard Login (Preserved Intact) */
          <div className="space-y-5">
            <div className="text-left">
              <button
                type="button"
                onClick={() => setUseStandardLogin(false)}
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>← Quick sign in with name</span>
              </button>
            </div>

            {/* Google Sign-in */}
            <div className="space-y-3">
              <GoogleSignInButton text="Sign in with Google" />
              
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                <span className="bg-card-light dark:bg-card-dark px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider relative">
                  or continue with email
                </span>
              </div>
            </div>

        {/* Form */}
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

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-500 uppercase">Password</label>
              <Link to="/forgot-password" className="text-xs text-primary font-semibold hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 pl-10 pr-10 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-6 bg-primary hover:bg-primary-hover text-white font-semibold rounded-btn shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In with Email'}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800/40 text-xs text-slate-500">
          New to ExamPrep?{' '}
          <Link to="/signup" className="text-primary font-semibold hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    )}

  </div>
</div>
  )
}
