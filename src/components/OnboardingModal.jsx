import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Cake, Phone, Target, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { ageFromDob, dobInputRange, dobProblem } from '../../shared/profile.js'

const PHONE_RE = /^\+?[0-9][0-9\s-]{6,15}$/

const getTargetYearOptions = () => {
  const year = new Date().getFullYear()
  return [year + 1, year + 2, year + 3]
}

const validateProfileFields = ({ name, dob, phone, targetYear }, { requireDob = true } = {}) => {
  const trimmedName = (name || '').trim()
  if (!trimmedName) return 'Please enter your name.'
  if (trimmedName.length > 60) return 'Name must be 60 characters or fewer.'
  const dobStr = String(dob ?? '').trim()
  if (dobStr === '') {
    if (requireDob) return 'Please enter your date of birth.'
  } else {
    const dobError = dobProblem(dobStr)
    if (dobError) return dobError
  }
  const phoneStr = (phone || '').trim()
  if (phoneStr && !PHONE_RE.test(phoneStr)) return 'Please enter a valid phone number (digits, spaces or dashes, optional leading +).'
  if (targetYear !== '' && targetYear != null) {
    const y = Number(targetYear)
    if (!Number.isInteger(y) || y < 2020 || y > 2040) return 'Please choose a valid target year.'
  }
  return null
}

const inputClass = 'w-full h-10 pl-10 pr-4 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark'

export default function OnboardingModal() {
  const { user, isAuthenticated, updateProfile, logout } = useAuthStore()

  const [name, setName] = useState(user?.name || '')
  const [dob, setDob] = useState(user?.dob || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [targetYear, setTargetYear] = useState(user?.targetYear ? String(user.targetYear) : '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const isOpen = Boolean(isAuthenticated && user && !user.profileCompleted)

  // Re-prefill when a different user signs in
  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setDob(user.dob || '')
      setPhone(user.phone || '')
      setTargetYear(user.targetYear ? String(user.targetYear) : '')
      setError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?._id, user?.email])

  if (!isOpen) return null

  const yearOptions = getTargetYearOptions()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validateProfileFields({ name, dob, phone, targetYear })
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setIsSaving(true)
    try {
      const result = await updateProfile({
        name: name.trim(),
        dob,
        phone: phone.trim(),
        targetYear: targetYear ? Number(targetYear) : null,
        completeProfile: true
      })
      if (!result?.success) {
        setError(result?.error || 'Could not save your profile. Please try again.')
      }
    } catch (err) {
      setError(err?.message || 'Could not save your profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex justify-center p-4 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        {/* Backdrop (not dismissable) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative my-auto w-full max-w-md bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark p-6 sm:p-7 space-y-6 z-10 overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="text-center space-y-2 pt-1">
            <h3 id="onboarding-title" className="text-lg sm:text-xl font-extrabold text-text-primary-light dark:text-text-primary-dark tracking-tight">
              Welcome to ExamPrep! 👋
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-2">
              Tell us a little about yourself to personalise your prep.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="onboarding-name" className="text-xs font-semibold text-slate-500 uppercase">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <User size={16} />
                </span>
                <input
                  id="onboarding-name"
                  type="text"
                  required
                  maxLength={60}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="onboarding-dob" className="text-xs font-semibold text-slate-500 uppercase">Date of Birth</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Cake size={16} />
                </span>
                <input
                  id="onboarding-dob"
                  type="date"
                  required
                  {...dobInputRange()}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className={inputClass}
                />
              </div>
              {dob && ageFromDob(dob) !== null && !dobProblem(dob) && (
                <p className="text-[11px] text-slate-400">You are {ageFromDob(dob)}. This updates by itself on your birthday.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="onboarding-phone" className="text-xs font-semibold text-slate-500 uppercase">Phone Number</label>
                <span className="text-[10px] font-semibold text-slate-400">Optional</span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Phone size={16} />
                </span>
                <input
                  id="onboarding-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="onboarding-target-year" className="text-xs font-semibold text-slate-500 uppercase">Target GATE Year</label>
                <span className="text-[10px] font-semibold text-slate-400">Optional</span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Target size={16} />
                </span>
                <select
                  id="onboarding-target-year"
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Not sure yet</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={String(y)}>GATE {y}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-btn bg-red-500/10 border border-red-500/20 text-error text-xs font-medium" role="alert">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full h-10 px-4 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-btn transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Save & Continue</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-1 border-t border-slate-100 dark:border-slate-800/40">
            <button
              type="button"
              onClick={logout}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors font-medium pt-3"
            >
              Sign out
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
