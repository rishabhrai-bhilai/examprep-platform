import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Lock, Mail, User, AlertCircle, CheckCircle, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import GoogleSignInButton from '../components/GoogleSignInButton'

const RESEND_SECONDS = 60
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

const inputClass = 'w-full h-10 pl-10 pr-4 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark'
const codeInputClass = 'w-full h-12 px-4 text-2xl font-mono font-bold tracking-[0.5em] text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark'
const submitClass = 'w-full h-10 mt-6 bg-primary hover:bg-primary-hover text-white font-semibold rounded-btn shadow-sm transition-all active:scale-95 text-sm flex items-center justify-center disabled:opacity-50'
const linkButtonClass = 'text-primary font-semibold hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed'

// Off-screen (not display:none) so bots still see and fill it
const honeypotStyle = { position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }

export default function SignupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { startSignup, verifySignup, fetchAuthConfig, error, loading, clearError, isAuthenticated } = useAuthStore()
  const { syncUserData } = useAppStore()

  const [step, setStep] = useState('details')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [website, setWebsite] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [localError, setLocalError] = useState('')
  const [info, setInfo] = useState('')
  const [emailDisabled, setEmailDisabled] = useState(false)
  const verifyingRef = useRef(false)

  useEffect(() => {
    clearError()
    // The verify handler navigates itself once user data has synced
    if (isAuthenticated && !verifyingRef.current) {
      const from = location.state?.from || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, clearError, location.state])

  useEffect(() => {
    let active = true
    fetchAuthConfig().then((config) => {
      if (active && config?.emailEnabled === false) setEmailDisabled(true)
    })
    return () => { active = false }
  }, [fetchAuthConfig])

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
    setInfo('')
    setStep(next)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    const trimmedName = name.trim()
    if (!trimmedName || trimmedName.length > 60) {
      setLocalError('Name must be between 1 and 60 characters.')
      return
    }
    if (!PASSWORD_RULE.test(password)) {
      setLocalError('Password must be at least 8 characters and include a letter and a number.')
      return
    }

    const result = await startSignup(trimmedName, email.trim(), password, website)
    if (result.success) {
      setCode('')
      goToStep('verify')
      setInfo(result.message || '')
      setCooldown(RESEND_SECONDS)
    } else if (result.retryAfter) {
      setCooldown(result.retryAfter)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setLocalError('')
    clearError()

    if (!/^\d{6}$/.test(code)) {
      setLocalError('Enter the 6-digit code from your email.')
      return
    }

    verifyingRef.current = true
    const result = await verifySignup(email.trim(), code)
    if (result.success) {
      await syncUserData()
      const from = location.state?.from || '/dashboard'
      navigate(from, { replace: true })
    } else {
      verifyingRef.current = false
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || loading) return
    setLocalError('')
    setInfo('')
    clearError()
    const result = await startSignup(name.trim(), email.trim(), password, website)
    if (result.success) {
      setCode('')
      setInfo('A new code has been sent to your email.')
      setCooldown(RESEND_SECONDS)
    } else if (result.retryAfter) {
      setCooldown(result.retryAfter)
    }
  }

  const shownError = localError || error

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
          {step === 'details' ? (
            <>
              <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Create your account</h2>
              <p className="text-xs text-slate-500">Sign up to unlock cloud-synced scratchpads, bookmarks, and discussion voting.</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">Verify your email</h2>
              <p className="text-xs text-slate-500">
                We sent a 6-digit code to <b className="text-text-primary-light dark:text-text-primary-dark">{email}</b>. It expires in 10 minutes.
              </p>
            </>
          )}
        </div>

        {/* Success Alert */}
        {info && !shownError && (
          <div className="p-3 bg-success/10 border border-success/20 text-success rounded-btn flex items-start gap-2 text-xs">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{info}</span>
          </div>
        )}

        {/* Error Alert */}
        {shownError && (
          <div className="p-3 bg-error/10 border border-error/20 text-error rounded-btn flex items-start gap-2 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{shownError}</span>
          </div>
        )}

        {step === 'details' ? (
          <>
            {/* Google Sign-in */}
            <div className="space-y-3">
              <GoogleSignInButton text="Sign up with Google" />

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                <span className="bg-card-light dark:bg-card-dark px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider relative">
                  or sign up with email
                </span>
              </div>
            </div>

            {emailDisabled && (
              <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-btn flex items-start gap-2 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>Email sign-up is temporarily unavailable. Please continue with Google.</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset disabled={emailDisabled} className="space-y-4 disabled:opacity-60">
                <div className="space-y-1.5">
                  <label htmlFor="signup-name" className="text-xs font-semibold text-slate-500 uppercase">Full Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <User size={16} />
                    </span>
                    <input
                      id="signup-name"
                      type="text"
                      required
                      maxLength={60}
                      autoComplete="name"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="signup-email" className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <Mail size={16} />
                    </span>
                    <input
                      id="signup-email"
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

                <div className="space-y-1.5">
                  <label htmlFor="signup-password" className="text-xs font-semibold text-slate-500 uppercase">Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <Lock size={16} />
                    </span>
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      aria-describedby="signup-password-hint"
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
                  <p id="signup-password-hint" className="text-[11px] text-slate-400">At least 8 characters, with a letter and a number</p>
                </div>

                {/* Honeypot: hidden from people, left for bots */}
                <div style={honeypotStyle} aria-hidden="true">
                  <label htmlFor="signup-website">Website</label>
                  <input
                    id="signup-website"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || emailDisabled}
                  className={submitClass}
                >
                  {loading ? 'Sending code...' : 'Create Account'}
                </button>
              </fieldset>
            </form>
          </>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="signup-code" className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <KeyRound size={14} />
                <span>Verification Code</span>
              </label>
              <input
                id="signup-code"
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

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className={submitClass}
            >
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className={linkButtonClass}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
              <button
                type="button"
                onClick={() => goToStep('details')}
                className="text-slate-500 hover:text-primary font-medium transition-colors"
              >
                Change email
              </button>
            </div>
          </form>
        )}

        <div className="text-center pt-4 border-t border-slate-100 dark:border-slate-800/40 text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Log in
          </Link>
        </div>

      </div>
    </div>
  )
}
