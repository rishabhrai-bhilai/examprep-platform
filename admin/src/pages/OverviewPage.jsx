import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, Users, Activity, ClipboardList, School, Package, RefreshCw, Armchair } from 'lucide-react'
import { api } from '../lib/api'
import { card, btnGhost, th, td, PageHeader, SectionTitle, StatTile, DailyBars, Spinner, ErrorBox } from '../components/ui'
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

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatTile icon={Users} label="Students" value={t.students.toLocaleString('en-IN')} sub={`${t.newLast30} joined in 30 days`} />
        <StatTile icon={Activity} label="Active this week" value={t.activeLast7} sub={`${t.activeToday} active today`} />
        <StatTile icon={ClipboardList} label="Mock attempts" value={t.mockAttempts} sub={`${t.mockAttemptsLast30} in 30 days`} />
        <StatTile icon={School} label="Centres" value={t.centres} sub={`${t.centreStudents} students linked`} />
        <StatTile icon={Armchair} label="Series seats" value={t.seats} sub="Across all centres" />
        <StatTile icon={Package} label="Test series" value={t.publishedSeries} sub={`${t.series - t.publishedSeries} not live`} />
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
          <SectionTitle title="Mock tests taken" subtitle="Submitted mock tests per day" />
          <DailyBars days={data.daily} valueKey="mocks" detail={d => `${d.mocks} test${d.mocks === 1 ? '' : 's'}`} />
        </div>
      </div>

      <div className={`${card} p-6`}>
        <SectionTitle title="Coaching centres" subtitle="Largest first" right={<Link to="/centres" className="text-xs font-bold text-primary">All centres →</Link>} />
        {data.centres.length === 0 ? <p className="text-xs text-slate-400 py-6 text-center">No centres yet.</p> : (
          <table className="w-full text-xs">
            <thead><tr><th className={`${th} pl-0`}>Centre</th><th className={`${th} text-right`}>Students</th><th className={`${th} text-right pr-0`}>Seats</th></tr></thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {data.centres.map(c => (
                <tr key={c.id}>
                  <td className={`${td} pl-0`}><Link to={`/centres/${c.id}`} className="font-semibold text-slate-800 dark:text-slate-200 hover:text-primary">{c.name}</Link></td>
                  <td className={`${td} text-right tabular-nums font-bold`}>{c.students}</td>
                  <td className={`${td} text-right tabular-nums pr-0`}>{c.series ? c.seats : <span className="text-slate-400">Progress only</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
