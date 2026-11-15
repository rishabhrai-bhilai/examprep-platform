import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, CheckCircle2, ArrowRight } from 'lucide-react'
import { useSeriesStore, formatRupees } from '../store/useSeriesStore'

const fmtDate = (t) => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const STATUS = {
  paid: { label: 'Paid', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  refunded: { label: 'Refunded', cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
  revoked: { label: 'Ended', cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
  failed: { label: 'Failed', cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' }
}
const how = (o) => (o.source === 'admin' ? 'Given by ExamPrep' : o.amountPaise === 0 ? 'Free' : formatRupees(o.amountPaise))

// Profile: the test series the student has, and their payment history
export default function MyPurchasesCard() {
  const { access, orders, fetchOrders, fetchAccess } = useSeriesStore()
  useEffect(() => {
    fetchOrders().catch(() => {})
    fetchAccess().catch(() => {})
  }, [fetchOrders, fetchAccess])

  const history = (orders || []).filter(o => o.status !== 'failed')
  return (
    <div className="p-5 rounded-3xl border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><Package size={20} /></div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 tracking-tight">My test series</h3>
            <p className="text-xs text-slate-500 mt-0.5">What you&apos;ve unlocked, and your payments.</p>
          </div>
        </div>
        <Link to="/test-series" className="text-xs font-bold text-primary inline-flex items-center gap-1 shrink-0">Browse <ArrowRight size={13} /></Link>
      </div>

      {access.series.length === 0 ? (
        <p className="text-sm text-slate-500">You haven&apos;t unlocked a test series yet. Free mock tests are always under Mock Tests.</p>
      ) : (
        <ul className="space-y-2">
          {access.series.map(s => (
            <li key={s.seriesId} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-500" />
                <Link to={`/test-series/${s.seriesId}`} className="font-bold text-slate-800 dark:text-slate-200 truncate hover:text-primary">{s.title}</Link>
              </span>
              <span className="text-xs text-slate-500 shrink-0">
                {s.via === 'centre' ? `Via ${s.instituteName}` : s.via === 'admin' ? 'Admin' : s.expiresAt ? `Until ${fmtDate(s.expiresAt)}` : 'No expiry'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 && (
        <div className="pt-3 border-t border-border-light dark:border-border-dark space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Payment history</p>
          {history.map(o => (
            <div key={o.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">{o.seriesTitle} · {fmtDate(o.paidAt || o.createdAt)}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-slate-800 dark:text-slate-200">{how(o)}</span>
                <span className={`px-2 py-0.5 rounded-full font-bold ${STATUS[o.status]?.cls || STATUS.revoked.cls}`}>{STATUS[o.status]?.label || o.status}</span>
              </span>
            </div>
          ))}
          <p className="text-[11px] text-slate-500">Payment ids are on your Razorpay receipt email. For a refund, use Report an Issue.</p>
        </div>
      )}
    </div>
  )
}
