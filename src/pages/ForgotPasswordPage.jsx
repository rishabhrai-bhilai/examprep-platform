import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Mail, Lock, AlertCircle, CheckCircle, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import TurnstileWidget from '../components/TurnstileWidget'

const RESEND_SECONDS = 60
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

const inputClass = 'w-full h-10 pl-10 pr-4 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark'
const codeInputClass = 'w-full h-12 px-4 text-2xl font-mono font-bold tracking-[0.5em] text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark'
const submitClass = 'w-full h-10 mt-6 bg-primary hover:bg-primary-hover text-white font-semibold rounded-btn shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center disabled:opacity-50'
const linkButtonClass = 'text-primary font-semibold hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { forgotPassword, resetPassword, fetchAuthConfig, error, loading, clearError } = useAuthStore()
  const { syncUserData } = useAppStore()

  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [successMsg, setSuccessMsg] = useState('')
  const [localError, setLocalError] = useState('')
  const [emailDisabled, setEmailDisabled] = useState(false)
  const [turnstileSiteKey, setTurnstileSiteKey] = useState(null)
  const [checking, setChecking] = useState(false)
  const resettingRef = useRef(false)
  const humanCheckRef = useRef(null)

  useEffect(() => {
    clearError()
  }, [clearError])

  useEffect(() => {
    let active = true
    fetchAuthConfig().then((config) => {
      if (!active) return
      if (config?.emailEnabled === false) setEmailDisabled(true)
      setTurnstileSiteKey(config?.turnstileSiteKey || null)
    })
    return () => { active = false }
  }, [fetchAuthConfig])

  // The link in the reset email opens /forgot-password#email=...&code=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const linkEmail = params.get('email')
    const linkCode = params.get('code')
    if (!linkEmail || !/^\d{6}$/.test(linkCode || '')) return
    setEmail(linkEmail)
    setCode(linkCode)
    setStep('reset')
    setSuccessMsg('Choose a new password for your account.')
    // Keep the code out of the address bar and browser history
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  // Token from the Cloudflare check (null when it's off); shows an error if it never passed
  const getHumanToken = async () => {
    if (!turnstileSiteKey) return { ok: true, token: null }
    setChecking(true)
    const token = await humanCheckRef.current?.getToken()
    setChecking(false)
    if (!token) setLocalError("We couldn't confirm you're human. Please refresh the page and try again.")
    return { ok: !!token, token }
  }

  const counting = cooldown > 0
  useEffect(() => {
    if (!counting) return
    const id = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [counting])

  const goToStep = (next) => {
    clearError()
    setLocalError('')
    setSuccessMsg('')
    setStep(next)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setSuccessMsg('')
    clearError()

    const human = await getHumanToken()
    if (!human.ok) return
    const result = await forgotPassword(email.trim(), human.token)
    if (result.success) {
      setCode('')
      setPassword('')
      setConfirmPassword('')
      goToStep('reset')
      setSuccessMsg(result.message || 'If an account exists for that email, a reset code has been sent.')
      setCooldown(RESEND_SECONDS)
    } else if (result.retryAfter) {
      setCooldown(result.retryAfter)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (resettingRef.current) return
    setLocalError('')
    clearError()

    if (!/^\d{6}$/.test(code)) {
      setLocalError('Enter the 6-digit code from your email.')
      return
    }
    if (!PASSWORD_RULE.test(password)) {
      setLocalError('Password must be at least 8 characters and include a letter and a number.')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }

    resettingRef.current = true
    const result = await resetPassword(email.trim(), code, password)
    if (result.success) {
      await syncUserData()
      navigate('/dashboard', { replace: true })
    } else {
      resettingRef.current = false
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || loading || checking) return
    setLocalError('')
    setSuccessMsg('')
    clearError()
    const human = await getHumanToken()
    if (!human.ok) return
    const result = await forgotPassword(email.trim(), human.token)
    if (result.success) {
      setCode('')
      setSuccessMsg('A new code has been sent to your email.')
      setCooldown(RESEND_SECONDS)
    } else if (result.retryAfter) {
      setCooldown(result.retryAfter)
    }
  }

  const shownError = localError || error
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword

  return (
    <div className="min-h-dvh bg-bg-light dark:bg-bg-dark flex flex-col justify-center items-center p-4">
      {/* Box */}
      <div className="w-full max-w-md bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card shadow-soft p-8 space-y-6">

        {/* Brand */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-xl tracking-tight text-text-primary-light dark:text-text-primary-dark">
            <BookOpen className="text-primary" size={28} />
            <span>Exam<span className="text-primary">Prep</span></span>
          </Link>
          <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Reset password</h2>
          {step === 'email' ? (
            <>
              <p className="text-xs text-slate-500">We&apos;ll email you a 6-digit code to reset your password.</p>
              <p className="text-[11px] text-slate-400">Signed up with Google? You can use this to add a password too.</p>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Enter the code sent to <b className="text-text-primary-light dark:text-text-primary-dark">{email}</b> and choose a new password. The code expires in 10 minutes.
            </p>
          )}
        </div>

        {/* Success Alert */}
        {successMsg && !shownError && (
          <div className="p-3 bg-success/10 border border-success/20 text-success rounded-btn flex items-start gap-2 text-xs">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {shownError && (
          <div className="p-3 bg-error/10 border border-error/20 text-error rounded-btn flex items-start gap-2 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{shownError}</span>
          </div>
        )}

        {emailDisabled && (
          <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-btn flex items-start gap-2 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>Password reset emails are temporarily unavailable. If you signed up with Google, you can still sign in with Google.</span>
          </div>
        )}

        {/* Form */}
        {step === 'email' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || checking || emailDisabled}
              className={submitClass}
            >
              {checking ? 'Checking...' : loading ? 'Sending code...' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reset-code" className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <KeyRound size={14} />
                <span>Reset Code</span>
              </label>
              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={codeInputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reset-password" className="text-xs font-semibold text-slate-500 uppercase">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-describedby="reset-password-hint"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p id="reset-password-hint" className="text-[11px] text-slate-400">At least 8 characters, with a letter and a number</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reset-confirm" className="text-xs font-semibold text-slate-500 uppercase">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  id="reset-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  aria-invalid={mismatch}
                  aria-describedby={mismatch ? 'reset-confirm-error' : undefined}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputClass} pr-10 ${mismatch ? 'border-error dark:border-error' : ''}`}
                />
              </div>
              {mismatch && (
                <p id="reset-confirm-error" className="text-[11px] text-error">Passwords do not match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6 || mismatch}
              className={submitClass}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || loading || checking}
                className={linkButtonClass}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
              <button
                type="button"
                onClick={() => goToStep('email')}
                className="text-slate-500 hover:text-primary font-medium transition-colors"
              >
                Use a different email
              </button>
            </div>
          </form>
        )}

        {/* Stays mounted across both steps so "Resend code" gets a fresh token too */}
        <TurnstileWidget ref={humanCheckRef} siteKey={emailDisabled ? null : turnstileSiteKey} />

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
