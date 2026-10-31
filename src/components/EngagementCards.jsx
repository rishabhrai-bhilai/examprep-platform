import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, ThumbsUp, Reply, PenLine, BarChart2 } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { fetchDiscussionStats } from '../utils/engagementApi'

const card = 'p-5 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft'

// What the user has added to discussions and how others responded
export function DiscussionStatsCard() {
  const user = useAuthStore(s => s.user)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!user) return
    let active = true
    fetchDiscussionStats().then(d => active && setStats(d)).catch(() => {})
    return () => { active = false }
  }, [user?.id])

  if (!user || !stats) return null
  const rows = [
    { label: 'Solutions posted', value: stats.solutionsPosted, icon: PenLine },
    { label: 'Replies posted', value: stats.repliesPosted, icon: MessageSquare },
    { label: 'Upvotes received', value: stats.upvotesReceived, icon: ThumbsUp },
    { label: 'Replies received', value: stats.repliesReceived, icon: Reply }
  ]

  return (
    <div className={`${card} space-y-3`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">Discussion activity</h3>
        <Link to="/discussion" className="text-xs font-bold text-primary hover:underline">Open forum</Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-2.5 rounded-btn bg-slate-50 dark:bg-slate-900/60">
            <p className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"><Icon size={11} /> {label}</p>
            <p className="text-lg font-extrabold text-text-primary-light dark:text-text-primary-dark">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AnalyticsLinkCard() {
  return (
    <Link to="/analytics" className={`${card} flex items-center gap-3 hover:border-primary/40 transition-colors`}>
      <div className="h-10 w-10 rounded-btn bg-primary/10 text-primary flex items-center justify-center shrink-0"><BarChart2 size={20} /></div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">Test analytics</p>
        <p className="text-xs text-slate-500 truncate">Scores, progress and how you compare</p>
      </div>
    </Link>
  )
}
