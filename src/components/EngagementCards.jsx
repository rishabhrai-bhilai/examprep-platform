import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, CheckCircle2, XCircle, Flame, MessageSquare, ThumbsUp, Reply, PenLine, BarChart2 } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import { fetchProblemOfTheDay, fetchDiscussionStats } from '../utils/engagementApi'

const card = 'p-5 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft'

// Today's problem, whether it's done, and the Problem of the Day streak.
// Attempting it (right or wrong) keeps the streak going.
export function ProblemOfTheDayCard() {
  const navigate = useNavigate()
  const { questions } = useAppStore()
  const user = useAuthStore(s => s.user)
  const [potd, setPotd] = useState(null)

  // Refetch when the user changes (an attempt updates the user)
  useEffect(() => {
    let active = true
    fetchProblemOfTheDay().then(d => active && setPotd(d)).catch(() => {})
    return () => { active = false }
  }, [user?.potdStreak, user?.id])

  const question = potd && questions.find(q => q.id === potd.questionId)
  if (!question) return null

  const open = () => navigate('/pyq', {
    state: { startReels: true, questionId: question.id, bookmarkFolderQuestions: [question.id], potd: true }
  })

  return (
    <div className={`${card} space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Sparkles size={13} /> Problem of the Day
          </p>
          <p className="text-sm font-bold mt-1 text-text-primary-light dark:text-text-primary-dark">
            GATE {question.year}{question.set ? ` Set ${question.set}` : ''} · {question.subject}
          </p>
          <p className="text-xs text-slate-500">{question.type || 'MCQ'} · {question.marks || 1} {question.marks === 2 ? 'marks' : 'mark'}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-btn bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold shrink-0" title="Days in a row you attempted the Problem of the Day">
          <Flame size={14} /> {potd.potdStreak || 0}
        </div>
      </div>

      {potd.attempted ? (
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs font-semibold flex items-center gap-1.5 ${potd.correct ? 'text-success' : 'text-slate-500'}`}>
            {potd.correct ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {potd.correct ? 'Solved today. See you tomorrow!' : 'Attempted today. Your streak is safe.'}
          </p>
          <button onClick={open} className="text-xs font-bold text-primary hover:underline shrink-0">Review</button>
        </div>
      ) : (
        <div className="space-y-2">
          <button onClick={open} className="w-full py-2 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-btn transition-colors">
            Solve today&apos;s problem
          </button>
          {!user && <p className="text-[11px] text-slate-400 text-center">Log in to build a streak and earn badges.</p>}
        </div>
      )}
    </div>
  )
}

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
