import { useEffect, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { School, Loader2, Check, X, LogOut, AlertCircle, ShieldCheck, EyeOff, Package } from 'lucide-react'
import { useInstituteStore } from '../store/useInstituteStore'
import { useSeriesStore } from '../store/useSeriesStore'

// What a coaching centre can and can't see (matches server/services/institutes.js)
const SHARED_WITH_CENTRE = [
  'Your name, email and target year',
  'Questions solved, accuracy, streak and practice time',
  'Mock test and full-paper scores',
  'Subject-wise accuracy and your daily activity'
]
const NOT_SHARED = 'Notes, bookmarks, discussion posts, phone number and date of birth stay private.'

const formatDate = (t) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// "Join your coaching centre" box in Profile. A link like /profile?join=CODE fills the code in.
export default function JoinInstituteCard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { membership, fetchMembership, lookupCode, joinInstitute, leaveInstitute } = useInstituteStore()
  const [code, setCode] = useState(() => searchParams.get('join') || '')
  const [found, setFound] = useState(null) // { name } of the centre behind the code
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmLeave, setConfirmLeave] = useState(false)
  // A centre's seats unlock its test series, so access changes on joining or leaving
  const refreshAccess = useSeriesStore(s => s.refreshAccess)

  useEffect(() => {
    fetchMembership().catch(() => {})
  }, [fetchMembership])

  // A locked mock test links to /profile#coaching-centre: bring this box into view
  const { hash } = useLocation()
  useEffect(() => {
    if (hash === '#coaching-centre' && membership !== undefined) {
      document.getElementById('coaching-centre')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [hash, membership])

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const checkCode = (e) => {
    e.preventDefault()
    if (!code.trim()) return setError('Enter the code your centre gave you.')
    run(async () => {
      setFound(await lookupCode(code.trim()))
      setConsent(false)
    })
  }

  const join = () => run(async () => {
    await joinInstitute(code.trim())
    refreshAccess()
    setFound(null)
    setCode('')
    if (searchParams.has('join')) {
      searchParams.delete('join')
      setSearchParams(searchParams, { replace: true })
    }
  })

  const leave = () => run(async () => {
    await leaveInstitute()
    refreshAccess()
    setConfirmLeave(false)
  })

  const shell = 'p-5 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4'
  const header = (subtitle, title = 'Join your coaching centre') => (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        <School size={20} />
      </div>
      <div>
        <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )

  if (membership === undefined) return null

  if (membership) {
    return (
      <div className={shell} id="coaching-centre">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {header(<>You&apos;re linked to <span className="font-bold text-slate-800 dark:text-slate-200">{membership.name}</span> since {formatDate(membership.joinedAt)}.</>, 'Your coaching centre')}
          {!confirmLeave ? (
            <button
              onClick={() => setConfirmLeave(true)}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-border-light dark:border-border-dark text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-400 transition-colors"
            >
              <LogOut size={14} /> Leave centre
            </button>
          ) : (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-slate-500">Stop sharing?</span>
              <button onClick={leave} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Leave
              </button>
              <button onClick={() => setConfirmLeave(false)} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">Cancel</button>
            </div>
          )}
        </div>
        {!(membership.series?.length > 0) && (
          <p className="text-xs text-slate-500">Your centre hasn&apos;t added a test series on ExamPrep yet. When it does, the tests appear under Mock Tests.</p>
        )}
        {membership.series?.length > 0 && (
          <p className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
            <Package size={13} className="mt-0.5 shrink-0 text-primary" />
            <span>Your centre has unlocked <strong>{membership.series.join(', ')}</strong> for you.</span>
          </p>
        )}
        <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-500" />
          <span>Your centre can see your progress and test scores. {NOT_SHARED} Leaving stops sharing straight away{membership.series?.length > 0 ? " and gives up the centre's test series" : ''}.</span>
        </p>
        {error && <p className="text-xs text-rose-600 flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
      </div>
    )
  }

  return (
    <div className={shell} id="coaching-centre">
      {header('Studying with a coaching centre on ExamPrep? Enter the code they gave you: they can follow your progress, and any test series they run on ExamPrep unlocks for you.')}

      {!found ? (
        <form onSubmit={checkCode} className="flex flex-col sm:flex-row gap-2">
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
            placeholder="Centre code, e.g. 7KQ2MX"
            maxLength={20}
            aria-label="Coaching centre code"
            className="flex-1 px-3.5 py-2.5 rounded-xl text-sm font-mono tracking-widest uppercase bg-slate-50 dark:bg-slate-800/60 border border-border-light dark:border-border-dark focus:outline-none focus:border-primary"
          />
          <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:opacity-90 disabled:opacity-60">
            {busy && <Loader2 size={15} className="animate-spin" />} Continue
          </button>
        </form>
      ) : (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Join {found.name}?</p>
          {found.series?.length > 0 && (
            <p className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
              <Package size={13} className="mt-0.5 shrink-0 text-primary" />
              <span>Unlocks <strong>{found.series.join(', ')}</strong> for you.</span>
            </p>
          )}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">They will see</p>
            <ul className="space-y-1">
              {SHARED_WITH_CENTRE.map(item => (
                <li key={item} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                  <Check size={13} className="mt-0.5 shrink-0 text-emerald-500" /> {item}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 flex items-start gap-1.5 pt-1">
              <EyeOff size={13} className="mt-0.5 shrink-0" /> {NOT_SHARED}
            </p>
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" id="join-centre-consent" aria-label={`I agree to share my progress with ${found.name}`} checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-primary" />
            <span>I agree to share this with {found.name}. I can leave at any time from my Profile.</span>
          </label>
          <div className="flex gap-2">
            <button onClick={join} disabled={!consent || busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:opacity-90 disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Join centre
            </button>
            <button onClick={() => { setFound(null); setError('') }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
              <X size={15} /> Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-rose-600 flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
    </div>
  )
}
