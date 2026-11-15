import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Package, Clock, ListChecks, CheckCircle2, Lock, Loader2, AlertCircle, Tag, ArrowLeft,
  ShieldCheck, Sparkles, School, CalendarClock
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useSeriesStore, formatRupees } from '../store/useSeriesStore'

const card = 'rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft'
const btn = 'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50'
const btnPrimary = `${btn} bg-primary text-white hover:opacity-90`
const btnGhost = `${btn} border border-border-light dark:border-border-dark text-slate-700 dark:text-slate-200 hover:border-primary hover:text-primary`
const fmtDate = (t) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

const validityText = (days) => (days ? `${days} days of access` : 'Access until you finish preparing (no expiry)')
const accessText = (a) => {
  if (!a) return null
  if (a.via === 'centre') return `Unlocked by ${a.instituteName || 'your coaching centre'}`
  if (a.via === 'admin') return 'You can see this as an admin'
  return a.expiresAt ? `Unlocked until ${fmtDate(a.expiresAt)}` : 'Unlocked'
}

function Price({ series, size = 'lg' }) {
  if (!series.pricePaise) return <span className={`font-black text-emerald-600 ${size === 'lg' ? 'text-3xl' : 'text-xl'}`}>Free</span>
  return (
    <span className="flex items-baseline gap-2">
      <span className={`font-black text-slate-900 dark:text-slate-100 ${size === 'lg' ? 'text-3xl' : 'text-xl'}`}>{formatRupees(series.pricePaise)}</span>
      {series.mrpPaise > series.pricePaise && <span className="text-sm text-slate-400 line-through">{formatRupees(series.mrpPaise)}</span>}
    </span>
  )
}

function SeriesCard({ series }) {
  return (
    <Link to={`/test-series/${series.id}`} className={`${card} p-5 flex flex-col gap-4 hover:border-primary transition-colors`}>
      <div className="flex items-start justify-between gap-3">
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Package size={20} /></div>
        {series.access
          ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={12} /> Unlocked</span>
          : !series.published && <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700">Draft</span>}
      </div>
      <div className="space-y-1.5 flex-1">
        <h3 className="font-extrabold text-lg text-slate-900 dark:text-slate-100 tracking-tight">{series.title}</h3>
        {series.description && <p className="text-sm text-slate-500 line-clamp-3">{series.description}</p>}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><ListChecks size={13} /> {series.testCount} tests</span>
        <span className="inline-flex items-center gap-1"><Sparkles size={13} /> {series.questionCount} questions</span>
        <span className="inline-flex items-center gap-1"><CalendarClock size={13} /> {series.validityDays ? `${series.validityDays} days` : 'No expiry'}</span>
      </div>
      <div className="flex items-center justify-between pt-1">
        <Price series={series} size="sm" />
        <span className="text-sm font-bold text-primary">{series.access ? 'Open' : 'View details'} →</span>
      </div>
    </Link>
  )
}

function StoreList() {
  const { series, fetchSeries } = useSeriesStore()
  const [error, setError] = useState('')
  useEffect(() => { fetchSeries().catch(err => setError(err.message)) }, [fetchSeries])

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Test Series</h1>
        <p className="text-sm text-slate-500 mt-1">Full-length and sectional GATE CS mock tests with all-India comparison and detailed analysis. Pay once and take them at your own pace.</p>
      </div>
      {error && <p className="text-sm text-rose-600 flex items-center gap-1.5"><AlertCircle size={15} />{error}</p>}
      {!series && !error && <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>}
      {series && !series.length && (
        <div className={`${card} p-10 text-center text-sm text-slate-500`}>No test series are on sale yet. Free mock tests are under Mock Tests.</div>
      )}
      {series && series.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {series.map(s => <SeriesCard key={s.id} series={s} />)}
        </div>
      )}
      <p className="text-xs text-slate-500 flex items-center gap-1.5"><School size={14} /> Studying with a coaching centre? Enter its code in your Profile: your centre may already have paid for you.</p>
    </div>
  )
}

function BuyBox({ series, onPaid }) {
  const { isAuthenticated } = useAuthStore()
  const { paymentMode, quote, buy, completeDevPayment, cancelDevPayment } = useSeriesStore()
  const navigate = useNavigate()
  const [coupon, setCoupon] = useState('')
  const [applied, setApplied] = useState(null) // { couponCode, discountPaise, amountPaise }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [devOrder, setDevOrder] = useState(null)

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const applyCoupon = (e) => {
    e.preventDefault()
    if (!coupon.trim()) return
    run(async () => setApplied(await quote(series.id, coupon.trim())))
  }

  const pay = () => {
    if (!isAuthenticated) return navigate('/login', { state: { from: `/test-series/${series.id}` } })
    run(async () => {
      const result = await buy(series.id, applied?.couponCode || '')
      if (result.status === 'dev') setDevOrder(result)
      else onPaid()
    })
  }

  const amount = applied ? applied.amountPaise : series.pricePaise
  const payLabel = !series.pricePaise || amount === 0 ? 'Get it free' : `Pay ${formatRupees(amount)}`

  if (devOrder) {
    return (
      <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Simulated payment of {formatRupees(devOrder.amountPaise)}</p>
        <p className="text-xs text-slate-500">Razorpay keys aren&apos;t set on this server, so development uses a pretend checkout. Nothing is charged.</p>
        <div className="flex gap-2">
          <button className={btnPrimary} disabled={busy} onClick={() => run(async () => { await completeDevPayment(devOrder.orderId); setDevOrder(null); onPaid() })}>
            {busy && <Loader2 size={15} className="animate-spin" />} Payment succeeds
          </button>
          <button className={btnGhost} disabled={busy} onClick={() => { cancelDevPayment(devOrder.orderId); setDevOrder(null) }}>Cancel</button>
        </div>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        {applied ? (
          <span className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{formatRupees(applied.amountPaise)}</span>
            <span className="text-sm text-slate-400 line-through">{formatRupees(applied.pricePaise)}</span>
          </span>
        ) : <Price series={series} />}
      </div>
      {series.pricePaise > 0 && (
        applied ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <Tag size={13} /> {applied.couponCode} saves {formatRupees(applied.discountPaise)}
            <button className="ml-auto text-slate-500 hover:text-rose-600 font-bold" onClick={() => { setApplied(null); setCoupon('') }}>Remove</button>
          </p>
        ) : (
          <form onSubmit={applyCoupon} className="flex gap-2">
            <input value={coupon} onChange={e => { setCoupon(e.target.value.toUpperCase()); setError('') }} placeholder="Coupon code" aria-label="Coupon code" maxLength={24}
              className="flex-1 min-w-0 px-3.5 py-2 rounded-xl text-sm uppercase bg-slate-50 dark:bg-slate-800/60 border border-border-light dark:border-border-dark focus:outline-none focus:border-primary" />
            <button type="submit" className={btnGhost} disabled={busy || !coupon.trim()}>Apply</button>
          </form>
        )
      )}
      <button className={`${btnPrimary} w-full py-3`} onClick={pay} disabled={busy || (paymentMode === 'off' && amount > 0)}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />} {isAuthenticated ? payLabel : 'Sign in to buy'}
      </button>
      {paymentMode === 'off' && amount > 0 && <p className="text-xs text-amber-700">Online payments aren&apos;t switched on yet. Please check back soon.</p>}
      {paymentMode === 'razorpay-test' && <p className="text-[11px] text-amber-700">Razorpay test mode: use a test card or UPI ID, nothing is charged.</p>}
      {error && <p className="text-xs text-rose-600 flex items-center gap-1.5"><AlertCircle size={13} />{error}</p>}
      <p className="text-[11px] text-slate-500 flex items-start gap-1.5"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-500" /> Secure payment by Razorpay: UPI, cards, netbanking and wallets. {validityText(series.validityDays)}.</p>
    </div>
  )
}

function SeriesDetail({ id }) {
  const { fetchOneSeries, refreshAccess } = useSeriesStore()
  const [series, setSeries] = useState(null)
  const [error, setError] = useState('')
  const [justPaid, setJustPaid] = useState(false)

  const load = () => fetchOneSeries(id).then(setSeries).catch(err => setError(err.message))
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const onPaid = async () => {
    setJustPaid(true)
    await refreshAccess()
    load()
  }

  if (error) return <div className="p-4 md:p-8 max-w-4xl mx-auto"><p className="text-sm text-rose-600">{error}</p><Link to="/test-series" className="text-sm text-primary font-bold">← All test series</Link></div>
  if (!series) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>

  const totalMinutes = series.tests.reduce((n, t) => n + (t.durationMinutes || 0), 0)
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <Link to="/test-series" className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-primary"><ArrowLeft size={15} /> All test series</Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5 min-w-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{series.title}</h1>
            {series.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-line">{series.description}</p>}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5"><ListChecks size={15} /> {series.testCount} tests</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles size={15} /> {series.questionCount} questions</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={15} /> {Math.round(totalMinutes / 60)} hours of tests</span>
          </div>
          <div className={`${card} overflow-hidden`}>
            <div className="px-5 py-3 border-b border-border-light dark:border-border-dark text-xs font-bold uppercase tracking-wider text-slate-500">What&apos;s inside</div>
            <ul className="divide-y divide-border-light dark:divide-border-dark">
              {series.tests.map(t => (
                <li key={t.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.totalQuestions} questions · {t.durationMinutes} min · {t.difficulty}</p>
                  </div>
                  {series.access ? <CheckCircle2 size={16} className="shrink-0 text-emerald-500" /> : <Lock size={15} className="shrink-0 text-slate-400" />}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className={`${card} p-5 h-fit lg:sticky lg:top-6`}>
          {series.access ? (
            <div className="space-y-3">
              {justPaid && <p className="text-sm font-bold text-emerald-600">Payment received. Thank you!</p>}
              <p className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={16} /> {accessText(series.access)}</p>
              <Link to="/mock-tests" className={`${btnPrimary} w-full py-3`}>Go to mock tests</Link>
              <p className="text-[11px] text-slate-500">These tests now open from Mock Tests. Each one can be taken once, and your first attempt counts in the all-India comparison.</p>
            </div>
          ) : <BuyBox series={series} onPaid={onPaid} />}
        </div>
      </div>
    </div>
  )
}

export default function TestSeriesPage() {
  const { id } = useParams()
  return id ? <SeriesDetail id={id} /> : <StoreList />
}
