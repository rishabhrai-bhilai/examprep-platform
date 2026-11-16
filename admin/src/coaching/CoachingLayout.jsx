// Wraps every page of one coaching workspace (/c/:cid/...): loads it, and shows
// its name, the demo badge and the batch filter
import { useEffect } from 'react'
import { Outlet, useParams, Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { useWorkspace } from './api'
import { api, useAdminAuth } from '../lib/api'
import { DemoBadge, BatchSelect } from './kit'
import { Spinner, ErrorBox } from '../components/ui'

// eslint-disable-next-line react-refresh/only-export-components
export const COACHING_NAV = [
  { group: 'Manage', items: [
    { to: '', label: 'Dashboard', end: true },
    { to: 'students', label: 'Students & batches' },
    { to: 'tests', label: 'Mock tests' },
    { to: 'questions', label: 'Question bank' },
    { to: 'assignments', label: 'Assignments' },
    { to: 'syllabus', label: 'Course progress' },
    { to: 'notices', label: 'Notice board' },
    { to: 'faculty', label: 'Faculty' }
  ] },
  { group: 'Analyse', items: [
    { to: 'leaderboard', label: 'Leaderboard' },
    { to: 'analytics', label: 'Subjects & chapters' },
    { to: 'weaknesses', label: 'Weakness detection' },
    { to: 'compare', label: 'Batch comparison' },
    { to: 'activity', label: 'Student activity' },
    { to: 'insights', label: 'Automated insights' },
    { to: 'reports', label: 'Reports (PDF / Excel)' }
  ] }
]

export default function CoachingLayout() {
  const { cid } = useParams()
  const { info, error, load } = useWorkspace()
  const isSiteAdmin = useAdminAuth(s => Boolean(s.user?.isAdmin))
  useEffect(() => { load(cid) }, [cid, load])

  const resetDemo = async () => {
    if (!window.confirm('Reset the demo centre? Changes you made to it are thrown away.')) return
    await api('/api/coaching/demo/reset', { method: 'POST' })
    window.location.reload()
  }

  if (error) return <ErrorBox>{error}</ErrorBox>
  if (!info || useWorkspace.getState().cid !== cid) return <Spinner />
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-border-light dark:border-border-dark">
        <div className="min-w-0">
          <Link to="/centres" className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-primary"><ArrowLeft size={12} /> All centres</Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 truncate">{info.centre.name}</h2>
            {info.centre.demo && <DemoBadge />}
          </div>
          <p className="text-[11px] text-slate-500">
            {info.counts.students} students · {info.batches.length} batches · {info.faculty.length} faculty
            {info.centre.demo ? ' · made-up data for showing the app, never mixed with real centres' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BatchSelect />
          {info.centre.demo && isSiteAdmin && <button onClick={resetDemo} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-primary" title="Throw away changes and regenerate the demo"><RotateCcw size={12} /> Reset demo</button>}
          {!info.centre.demo && <Link to={`/centres/${cid}`} className="text-[11px] font-bold text-primary">Members &amp; settings</Link>}
        </div>
      </div>
      <Outlet />
    </div>
  )
}
