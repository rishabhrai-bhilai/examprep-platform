import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IndianRupee, Download, Search, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import { downloadText } from '../lib/instituteStats'
import { card, inputCls, btnPrimary, btnGhost, th, td, PageHeader, StatTile, Spinner, ErrorBox, Pill, Confirm, rupees, fmtDateTime } from '../components/ui'

const STATUSES = [['all', 'All'], ['paid', 'Paid'], ['refunded', 'Refunded'], ['failed', 'Failed'], ['created', 'Unfinished'], ['revoked', 'Revoked']]
const TONE = { paid: 'good', refunded: 'muted', revoked: 'muted', failed: 'critical', created: 'warning' }
const SOURCE = { razorpay: 'Razorpay', admin: 'Given by admin', coupon: '100% coupon', free: 'Free series', dev: 'Simulated (dev)' }

const csvCell = (v) => {
  const t = String(v ?? '')
  const safe = /^[=+\-@]/.test(t) ? `'${t}` : t
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}
const ordersCsv = (orders) => [
  ['Order', 'Date', 'Student', 'Email', 'Series', 'Amount (INR)', 'Discount (INR)', 'Coupon', 'Status', 'Source', 'Razorpay payment', 'Note'],
  ...orders.map(o => [o.id, new Date(o.paidAt || o.createdAt).toISOString(), o.userName, o.userEmail, o.seriesTitle,
    (o.amountPaise / 100).toFixed(2), ((o.discountPaise || 0) / 100).toFixed(2), o.couponCode || '', o.status, SOURCE[o.source] || o.source,
    o.razorpayPaymentId || '', o.note || ''])
].map(r => r.map(csvCell).join(',')).join('\r\n')

export default function SalesPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => api('/api/admin/orders').then(d => { setData(d); setError('') }).catch(err => setError(err.message))
  useEffect(() => { load() }, [])

  const orders = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data?.orders || []).filter(o => (status === 'all' || o.status === status) &&
      (!q || [o.userName, o.userEmail, o.seriesTitle, o.couponCode, o.razorpayPaymentId].some(v => (v || '').toLowerCase().includes(q))))
  }, [data, status, query])

  const act = async (o) => {
    setBusy(true)
    setError('')
    try {
      await api(`/api/admin/orders/${o.id}/${o.amountPaise ? 'refund' : 'revoke'}`, { method: 'POST' })
      setConfirm(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!data) return error ? <ErrorBox>{error}</ErrorBox> : <Spinner />
  const paid = data.orders.filter(o => o.status === 'paid' && o.amountPaise > 0)
  const gross = paid.reduce((n, o) => n + o.amountPaise, 0)
  const refunded = data.orders.filter(o => o.status === 'refunded').reduce((n, o) => n + o.amountPaise, 0)
  const discounts = paid.reduce((n, o) => n + (o.discountPaise || 0), 0)

  return (
    <div className="space-y-5">
      <PageHeader
        icon={IndianRupee}
        title="Sales"
        subtitle={data.paymentsLive ? 'Payments by Razorpay' : 'Razorpay is not connected yet'}
        right={<>
          <button className={btnGhost} onClick={load}><RefreshCw size={13} /> Refresh</button>
          <button className={btnPrimary} disabled={!orders.length} onClick={() => downloadText(`examprep-orders-${new Date().toISOString().slice(0, 10)}.csv`, ordersCsv(orders))}><Download size={13} /> Export CSV</button>
        </>}
      />
      <ErrorBox>{error}</ErrorBox>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatTile icon={IndianRupee} label="Net revenue" value={rupees(gross)} sub={`${paid.length} paid order${paid.length === 1 ? '' : 's'}`} />
        <StatTile icon={IndianRupee} label="Average order" value={rupees(paid.length ? Math.round(gross / paid.length) : 0)} sub="Paid orders only" />
        <StatTile icon={IndianRupee} label="Coupon discounts" value={rupees(discounts)} sub="On paid orders" />
        <StatTile icon={IndianRupee} label="Refunded" value={rupees(refunded)} sub={`${data.orders.filter(o => o.status === 'refunded').length} refunds`} />
      </div>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative lg:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} !pl-9 !py-2 text-xs`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search student, series, coupon or payment id" aria-label="Search orders" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map(([key, label]) => (
            <button key={key} onClick={() => setStatus(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${status === key ? 'bg-primary text-white border-primary' : 'border-border-light dark:border-border-dark text-slate-600 dark:text-slate-300 hover:border-primary'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-xs min-w-[900px]">
          <thead className="border-b border-border-light dark:border-border-dark">
            <tr><th className={`${th} pl-6`}>Date</th><th className={th}>Student</th><th className={th}>Series</th><th className={`${th} text-right`}>Amount</th><th className={th}>Status</th><th className={th}>How</th><th className={`${th} pr-6`} /></tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark">
            {orders.map(o => (
              <tr key={o.id}>
                <td className={`${td} pl-6 text-slate-500 whitespace-nowrap`}>{fmtDateTime(o.paidAt || o.createdAt)}</td>
                <td className={td}>
                  <Link to={`/students/${o.userId}`} className="font-bold text-slate-900 dark:text-slate-100 hover:text-primary">{o.userName}</Link>
                  <div className="text-[10px] text-slate-400">{o.userEmail}</div>
                </td>
                <td className={td}>{o.seriesTitle}{o.couponCode && <div className="text-[10px] text-slate-400">Coupon {o.couponCode} · −{rupees(o.discountPaise)}</div>}</td>
                <td className={`${td} text-right tabular-nums font-bold`}>{rupees(o.amountPaise)}</td>
                <td className={td}><Pill tone={TONE[o.status] || 'muted'}>{o.status === 'created' ? 'unfinished' : o.status}</Pill></td>
                <td className={`${td} text-slate-500`}>
                  {SOURCE[o.source] || o.source}
                  {o.razorpayPaymentId && <div className="text-[10px] font-mono text-slate-400">{o.razorpayPaymentId}</div>}
                  {o.grantedBy && <div className="text-[10px] text-slate-400">by {o.grantedBy}{o.note ? ` · ${o.note}` : ''}</div>}
                </td>
                <td className={`${td} pr-6 text-right whitespace-nowrap`}>
                  {o.status === 'paid' && (confirm === o.id
                    ? <Confirm busy={busy} text={o.amountPaise ? `Refund ${rupees(o.amountPaise)}?` : 'Take back access?'} label={o.amountPaise ? 'Refund' : 'Revoke'} onConfirm={() => act(o)} onCancel={() => setConfirm(null)} />
                    : <button className="font-bold text-slate-500 hover:text-rose-600" onClick={() => setConfirm(o.id)}>{o.amountPaise ? 'Refund' : 'Revoke'}</button>)}
                </td>
              </tr>
            ))}
            {!orders.length && <tr><td colSpan={7} className="py-10 text-center text-slate-400">No orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
