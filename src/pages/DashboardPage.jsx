import React from 'react'
import { Link } from 'react-router-dom'
import { Flame, CheckCircle, Clock, BookOpen, ChevronRight, Play, Bookmark } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { bookmarks, questions } = useAppStore()

  // Mock progress details
  const streak = user?.streak || 5
  const solved = user?.solvedQuestions || 34
  
  const subjectsProgress = [
    { name: "Computer Science", solved: 24, total: 150, color: "bg-indigo-500" },
    { name: "Mathematics", solved: 8, total: 90, color: "bg-emerald-500" },
    { name: "General Aptitude", solved: 2, total: 50, color: "bg-amber-500" }
  ]

  const recentActivity = [
    { action: "Solved PYQ on Binary Trees", time: "2 hours ago", subject: "Computer Science" },
    { action: "Attempted Mock Test #1", time: "1 day ago", subject: "Mock Test", score: "80%" },
    { action: "Bookmarked Calculus Derivative question", time: "2 days ago", subject: "Mathematics" }
  ]

  // Find bookmarked questions details
  const bookmarkedItems = questions.filter(q => bookmarks.includes(q.id))

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark min-h-screen">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">
            Welcome back, {user?.name || 'Aspirant'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Keep your momentum going. You have 3 recommended topics to review today.
          </p>
        </div>
        
        {/* Streak Counter */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-btn bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-500 self-start md:self-auto">
          <Flame size={20} className="fill-orange-500 animate-bounce" />
          <div className="text-left">
            <span className="block text-xs font-bold leading-none uppercase">Daily Streak</span>
            <span className="text-lg font-extrabold leading-none mt-1 inline-block">{streak} Days</span>
          </div>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Solved */}
        <div className="p-5 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex items-center gap-4">
          <div className="h-12 w-12 rounded-btn bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase">Questions Solved</span>
            <p className="text-2xl font-extrabold mt-0.5">{solved}</p>
          </div>
        </div>
        
        {/* Card 2: Bookmarks */}
        <div className="p-5 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex items-center gap-4">
          <div className="h-12 w-12 rounded-btn bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
            <Bookmark size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase">Saved Bookmarks</span>
            <p className="text-2xl font-extrabold mt-0.5">{bookmarks.length}</p>
          </div>
        </div>

        {/* Card 3: Avg Time */}
        <div className="p-5 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft flex items-center gap-4">
          <div className="h-12 w-12 rounded-btn bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase">Practice Time</span>
            <p className="text-2xl font-extrabold mt-0.5">4.8 Hrs</p>
          </div>
        </div>
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
            <div className="flex gap-3">
              <Link
                to="/pyq"
                className="px-4 py-2.5 bg-white text-primary font-bold text-xs rounded-btn hover:bg-slate-100 transition-colors shadow-sm inline-flex items-center gap-1.5"
              >
                <Play size={14} className="fill-primary text-primary" />
                <span>Start Practice</span>
              </Link>
              <Link
                to="/mock-tests"
                className="px-4 py-2.5 bg-white/10 text-white border border-white/20 font-bold text-xs rounded-btn hover:bg-white/20 transition-colors"
              >
                Take Mock Test
              </Link>
            </div>
          </div>

          {/* Subject Completion Rates */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
            <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Subject-wise Completion</h3>
            
            <div className="space-y-4">
              {subjectsProgress.map((sub, idx) => {
                const percent = Math.round((sub.solved / sub.total) * 100)
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-600 dark:text-slate-400">{sub.name}</span>
                      <span className="text-text-primary-light dark:text-text-primary-dark">{sub.solved}/{sub.total} ({percent}%)</span>
                    </div>
                    {/* Progress Bar Container */}
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${sub.color} rounded-full`} style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Right Col: Recent Activity & Saved Bookmarks */}
        <div className="space-y-6">
          
          {/* Recent Activity */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
            <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Recent Activity</h3>
            
            <div className="space-y-3.5">
              {recentActivity.map((act, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs border-b border-slate-100 dark:border-slate-800/40 pb-3 last:border-b-0 last:pb-0">
                  <div className="h-6 w-1 bg-primary rounded-full shrink-0 mt-0.5"></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary-light dark:text-text-primary-dark truncate">{act.action}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                      <span>{act.subject}</span>
                      <span>•</span>
                      <span>{act.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
