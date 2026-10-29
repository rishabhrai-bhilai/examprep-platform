import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Flame, CheckCircle, Clock, BookOpen, ChevronRight, Play, Bookmark, Lock, ArrowRight, Target } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import GoogleSignInButton from '../components/GoogleSignInButton'
import { dayKey } from '../../shared/practice.js'
import { practiceSummary, subjectProgress, topicProgress, weakestTopics, recentActivity, formatDuration, timeAgo } from '../utils/practiceStats'

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore()
  const { bookmarks, questions, practice } = useAppStore()

  const summary = useMemo(() => practiceSummary(practice), [practice])
  const subjects = useMemo(() => subjectProgress(practice, questions), [practice, questions])
  const weakTopics = useMemo(() => weakestTopics(topicProgress(practice, questions)), [practice, questions])
  const activity = useMemo(() => {
    let mocks = []
    try {
      mocks = [
        ...JSON.parse(localStorage.getItem('gate_mock_history') || '[]'),
        ...JSON.parse(localStorage.getItem('gate_pyq_mock_history') || '[]')
      ]
    } catch (e) {
      mocks = []
    }
    return recentActivity(practice, questions, mocks)
  }, [practice, questions])

  // --- GATED ACCESS VIEW FOR GUESTS ---
  if (!isAuthenticated) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark min-h-[80vh] flex flex-col justify-center items-center">
        <div className="w-full bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card shadow-soft p-8 sm:p-10 text-center space-y-6">
          <div className="inline-flex p-4 rounded-3xl bg-primary/10 dark:bg-primary/20 text-primary ring-8 ring-primary/5">
            <Lock size={32} className="text-primary" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">
              Register / Login to access your Dashboard
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Your personal dashboard tracks your preparation momentum, daily study streaks, subject-wise analytics, and custom recommendations.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-left space-y-2.5 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <Flame size={16} className="text-orange-500 shrink-0" />
              <span>Track your daily study streak and active learning momentum</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <CheckCircle size={16} className="text-emerald-500 shrink-0" />
              <span>Real-time accuracy and solved questions breakdown by subject</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
              <BookOpen size={16} className="text-primary shrink-0" />
              <span>Personalized topic suggestions and recent practice history</span>
            </div>
          </div>

          <div className="space-y-3 pt-2 max-w-sm mx-auto">
            <GoogleSignInButton text="Sign in with Google" />

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/login"
                state={{ from: '/dashboard' }}
                className="h-10 px-4 bg-primary hover:bg-primary-hover text-white font-semibold text-xs rounded-btn transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Log In</span>
                <ArrowRight size={13} />
              </Link>

              <Link
                to="/signup"
                state={{ from: '/dashboard' }}
                className="h-10 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-btn transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center active:scale-95"
              >
                <span>Sign Up</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { solved, attempted, accuracy, practiceSec, streak, longestStreak } = summary
  const hasPractice = attempted > 0
  const answeredToday = practice.days[dayKey()]?.attempts || 0

  // Find bookmarked questions details
  const bookmarkedItems = questions.filter(q => bookmarks.some(id => String(id) === String(q.id)))

  const statCards = [
    { label: 'Questions Solved', value: solved, sub: hasPractice ? `of ${attempted} attempted` : 'None yet', icon: CheckCircle, tone: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Accuracy', value: accuracy === null ? '—' : `${accuracy}%`, sub: hasPractice ? 'of all answers' : 'Answer a question to see it', icon: Target, tone: 'bg-amber-500/10 text-amber-500' },
    { label: 'Practice Time', value: formatDuration(practiceSec), sub: hasPractice ? 'on answered questions' : 'Starts with your first answer', icon: Clock, tone: 'bg-blue-500/10 text-blue-500' },
    { label: 'Saved Bookmarks', value: bookmarkedItems.length, sub: bookmarkedItems.length ? 'questions saved' : 'None yet', icon: Bookmark, tone: 'bg-indigo-500/10 text-indigo-500' }
  ]

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark">

      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">
            Welcome back, {user?.name || 'Aspirant'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {!hasPractice
              ? 'Answer your first question to start tracking your progress.'
              : answeredToday > 0
                ? `You've answered ${answeredToday} question${answeredToday === 1 ? '' : 's'} today. Keep your momentum going.`
                : streak > 0
                  ? 'Answer a question today to keep your streak alive.'
                  : 'Answer a question today to start a new streak.'}
          </p>
        </div>

        {/* Streak Counter */}
        <div
          className={`flex items-center gap-3 px-4 py-2.5 rounded-btn border self-start md:self-auto ${
            streak > 0
              ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-500'
              : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
          title={longestStreak > 0 ? `Longest streak: ${longestStreak} day${longestStreak === 1 ? '' : 's'}` : 'Days in a row with at least one answered question'}
        >
          <Flame size={20} className={streak > 0 ? 'fill-orange-500' : ''} />
          <div className="text-left">
            <span className="block text-xs font-bold leading-none uppercase">Daily Streak</span>
            <span className="text-lg font-extrabold leading-none mt-1 inline-block">{streak} {streak === 1 ? 'Day' : 'Days'}</span>
          </div>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map(({ label, value, sub, icon: Icon, tone }) => (
          <div key={label} className="p-5 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex items-center gap-4">
            <div className={`h-12 w-12 rounded-btn flex items-center justify-center shrink-0 ${tone}`}>
              <Icon size={24} />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-slate-400 font-bold uppercase">{label}</span>
              <p className="text-2xl font-extrabold mt-0.5">{value}</p>
              <p className="text-[10px] text-slate-400 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress & Activities Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Subject Progress & Practice Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Practice Action Banner */}
          <div className="p-6 rounded-card bg-primary text-white space-y-4 shadow-md">
            <h2 className="text-xl font-bold">Launch Study Mode</h2>
            <p className="text-xs text-white/80 leading-relaxed max-w-md">
              Start our Reels-style Previous Year Questions (PYQs) flow to practice distraction-free. The system automatically saves your response history.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/pyq"
                className="px-4 py-2.5 bg-white text-primary font-bold text-xs rounded-btn hover:bg-slate-100 transition-colors shadow-sm inline-flex items-center gap-1.5"
              >
                <Play size={14} className="fill-primary text-primary" />
                <span>Start Practice</span>
              </Link>
              <Link
                to="/pyq-mock"
                className="px-4 py-2.5 bg-white/25 text-white border border-white/35 font-bold text-xs rounded-btn hover:bg-white/35 transition-colors inline-flex items-center gap-1.5"
              >
                <span>Take PYQ Mock</span>
              </Link>
              <Link
                to="/mock-tests"
                className="px-4 py-2.5 bg-white/15 text-white border border-white/20 font-bold text-xs rounded-btn hover:bg-white/25 transition-colors"
              >
                Take Mock Test
              </Link>
            </div>
          </div>

          {/* Subject Completion Rates */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
            <div className="flex justify-between items-baseline gap-3">
              <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Subject-wise Completion</h3>
              {hasPractice && (
                <span className="text-[10px] text-slate-400 font-semibold">Solved / questions in the bank</span>
              )}
            </div>

            {!hasPractice ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 space-y-2">
                <p>No questions answered yet. Your progress in each subject will show up here.</p>
                <Link to="/pyq" className="text-primary font-semibold hover:underline">Start practising PYQs</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {subjects.map((sub) => {
                  const solvedPct = sub.total ? (sub.solved / sub.total) * 100 : 0
                  const attemptedPct = sub.total ? (sub.attempted / sub.total) * 100 : 0
                  return (
                    <div key={sub.subject} className="space-y-1.5">
                      <div className="flex justify-between gap-3 text-xs font-semibold">
                        <span className="text-slate-600 dark:text-slate-400 truncate">{sub.subject}</span>
                        <span className="text-text-primary-light dark:text-text-primary-dark shrink-0">
                          {sub.solved}/{sub.total} ({Math.round(solvedPct)}%)
                        </span>
                      </div>
                      {/* Solved drawn over attempted */}
                      <div
                        className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
                        title={`${sub.attempted} attempted, ${sub.solved} solved`}
                      >
                        <div className="absolute inset-y-0 left-0 bg-primary/25 rounded-full" style={{ width: `${attemptedPct}%` }}></div>
                        <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${solvedPct}%` }}></div>
                      </div>
                    </div>
                  )
                })}
                <div className="flex gap-4 pt-1 text-[10px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-full bg-primary"></span>Solved</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-full bg-primary/25"></span>Attempted</span>
                </div>
              </div>
            )}
          </div>

          {/* Topics that need work */}
          {weakTopics.length > 0 && (
            <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
              <div className="flex justify-between items-baseline gap-3">
                <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Topics to Revisit</h3>
                <span className="text-[10px] text-slate-400 font-semibold">Most misses among what you tried</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {weakTopics.map((t) => (
                  <div key={`${t.subject}::${t.topic}`} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary-light dark:text-text-primary-dark truncate">{t.topic}</p>
                      <p className="text-[10px] text-slate-400 truncate">{t.subject}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-text-primary-light dark:text-text-primary-dark">{t.solved}/{t.attempted} solved</p>
                      <p className="text-[10px] text-slate-400">{t.total} in bank</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Col: Recent Activity & Saved Bookmarks */}
        <div className="space-y-6">
          
          {/* Recent Activity */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
            <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Recent Activity</h3>
            
            {activity.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                Nothing yet. Questions you answer and mock tests you finish will appear here.
              </div>
            ) : (
              <div className="space-y-3.5">
                {activity.map((act) => (
                  <div key={`${act.kind}-${act.time}-${act.title}`} className="flex items-start gap-3 text-xs border-b border-slate-100 dark:border-slate-800/40 pb-3 last:border-b-0 last:pb-0">
                    <div className={`h-6 w-1 rounded-full shrink-0 mt-0.5 ${act.kind === 'mock' ? 'bg-primary' : act.correct ? 'bg-success' : 'bg-error'}`}></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-text-primary-light dark:text-text-primary-dark truncate">{act.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 min-w-0">
                        {act.detail && <span className="truncate">{act.detail}</span>}
                        {act.detail && <span>•</span>}
                        <span className="shrink-0">{timeAgo(act.time)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bookmarked Questions Preview */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Bookmarked PYQs</h3>
              <Link to="/bookmarks" className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-0.5">
                <span>View All</span>
                <ChevronRight size={14} />
              </Link>
            </div>
            
            <div className="space-y-2">
              {bookmarkedItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
                  No bookmarked questions yet.
                </div>
              ) : (
                bookmarkedItems.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    to="/pyq"
                    className="p-2.5 block rounded-btn bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-text-primary-light dark:text-text-primary-dark font-medium truncate"
                  >
                    {item.question}
                  </Link>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
