import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, Users, UserPlus, Activity, IndianRupee, ShoppingBag, School, Package, RefreshCw, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import { card, btnGhost, th, td, PageHeader, SectionTitle, StatTile, DailyBars, Spinner, ErrorBox, Pill, rupees, fmtDateTime } from '../components/ui'
import { timeAgo } from '../../../src/utils/practiceStats'

export default function OverviewPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api('/api/admin/overview'))
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  if (!data) return error ? <ErrorBox>{error}</ErrorBox> : <Spinner />
  const t = data.totals
  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Overview"
        subtitle={`Updated ${timeAgo(data.generatedAt)} · dates in India time`}
        right={<button className={btnGhost} onClick={load} disabled={loading}><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh</button>}
      />
      <ErrorBox>{error}</ErrorBox>
      {!data.paymentsLive && (
        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>Razorpay keys aren&apos;t set on the server, so students can&apos;t pay online yet. Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET.</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile icon={Users} label="Students" value={t.students.toLocaleString('en-IN')} sub={`${t.newLast30} joined in 30 days`} />
        <StatTile icon={Activity} label="Active this week" value={t.activeLast7} sub={`${t.activeToday} active today`} />
        <StatTile icon={IndianRupee} label="Revenue (30 days)" value={rupees(t.revenueLast30Paise)} sub={`${rupees(t.revenuePaise)} all time`} />
        <StatTile icon={ShoppingBag} label="Paid orders" value={t.paidOrders} sub={`${t.buyers} buyer${t.buyers === 1 ? '' : 's'}${t.refundedPaise ? ` · ${rupees(t.refundedPaise)} refunded` : ''}`} />
        <StatTile icon={School} label="Centres" value={t.centres} sub={`${t.centreStudents} students linked`} />
        <StatTile icon={Package} label="Test series" value={t.publishedSeries} sub={`${t.series - t.publishedSeries} draft${t.series - t.publishedSeries === 1 ? '' : 's'}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className={`${card} p-6`}>
          <SectionTitle title="Active students" subtitle="Students who answered a question or took a test, per day" />
          <DailyBars days={data.daily} valueKey="active" detail={d => `${d.active} active`} />
        </div>
        <div className={`${card} p-6`}>
          <SectionTitle title="Sign-ups" subtitle="New accounts per day, last 30 days" />
          <DailyBars days={data.daily} valueKey="signups" detail={d => `${d.signups} sign-up${d.signups === 1 ? '' : 's'}`} />
        </div>
        <div className={`${card} p-6`}>
          <SectionTitle title="Revenue" subtitle="Paid orders per day (refunds removed)" />
          <DailyBars days={data.daily} valueKey="revenuePaise" detail={d => `${rupees(d.revenuePaise)} from ${d.orders} order${d.orders === 1 ? '' : 's'}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className={`${card} p-6`}>
          <SectionTitle title="Best-selling series" right={<Link to="/series" className="text-xs font-bold text-primary">All series →</Link>} />
          {data.topSeries.length === 0 ? <p className="text-xs text-slate-400 py-6 text-center">No sales yet.</p> : (
            <table className="w-full text-xs">
              <thead><tr><th className={`${th} pl-0`}>Series</th><th className={`${th} text-right`}>Sales</th><th className={`${th} text-right pr-0`}>Revenue</th></tr></thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {data.topSeries.map(s => (
                  <tr key={s.seriesId}>
                    <td className={`${td} pl-0 font-semibold text-slate-800 dark:text-slate-200`}>{s.title}</td>
                    <td className={`${td} text-right tabular-nums`}>{s.sales}</td>
                    <td className={`${td} text-right tabular-nums font-bold pr-0`}>{rupees(s.revenuePaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className={`${card} p-6`}>
          <SectionTitle title="Latest orders" right={<Link to="/sales" className="text-xs font-bold text-primary">All sales →</Link>} />
          {data.recentOrders.length === 0 ? <p className="text-xs text-slate-400 py-6 text-center">No orders yet.</p> : (
            <ul className="divide-y divide-border-light dark:divide-border-dark">
              {data.recentOrders.map(o => (
                <li key={o.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{o.userName}</p>
                    <p className="text-slate-500 truncate">{o.seriesTitle} · {fmtDateTime(o.paidAt)}</p>
                  </div>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="font-bold tabular-nums">{o.amountPaise ? rupees(o.amountPaise) : o.source === 'admin' ? 'Granted' : 'Free'}</span>
                    {o.status === 'refunded' && <Pill tone="muted">Refunded</Pill>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
