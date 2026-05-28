import React, { useState } from 'react'
import { User, Mail, Award, Flame, CheckCircle, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'

export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const { bookmarks, setActiveQuestionIndex } = useAppStore()

  const [name, setName] = useState(user?.name || 'Aspirant')
  const [email, setEmail] = useState(user?.email || 'aspirant@examprep.com')
  const [isSaved, setIsSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
    // Update local storage
    const updatedUser = { ...user, name, email }
    localStorage.setItem('user', JSON.stringify(updatedUser))
  }

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to clear all practice bookmarks, history, and theme preferences?')) {
      localStorage.clear()
      window.location.reload()
    }
  }

  const badges = [
    { name: "First Steps", desc: "Solved 1st question", icon: Sparkles, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    { name: "5-day Streak", desc: "Maintained 5 day daily streak", icon: Flame, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
    { name: "Saver", desc: "Bookmarked 3+ questions", icon: Award, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  ]

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 bg-bg-light dark:bg-bg-dark min-h-screen">
      
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary-light dark:text-text-primary-dark">Student Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account preferences, achievements, and statistics.</p>
      </div>

      {/* Two columns split */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile Details (Left 2 cols) */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Card 1: User Prefs */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-5">
            <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Account Details</h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Aspirant Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-btn transition-colors shadow-sm"
                >
                  Save Changes
                </button>
                {isSaved && (
                  <span className="text-xs font-semibold text-success">Profile changes saved!</span>
                )}
              </div>
            </form>
          </div>

          {/* Badges / Achievements */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
            <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Earned Badges</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {badges.map((badge, idx) => {
                const Icon = badge.icon
                return (
                  <div key={idx} className={`p-4 rounded-btn border text-center flex flex-col items-center justify-center space-y-2 ${badge.color}`}>
                    <Icon size={24} className="mb-1" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{badge.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{badge.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Analytics & Tools (Right 1 col) */}
        <div className="space-y-6">
          
          {/* Practice Summary */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4 text-center">
            <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Performance Card</h3>
            
            <div className="flex flex-col items-center py-4 border-b border-slate-100 dark:border-slate-800/40">
              <span className="text-3xl font-extrabold text-primary">{user?.solvedQuestions || 34}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Questions Solved</span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800/40 text-xs">
              <span className="text-slate-500 font-medium">Rank</span>
              <span className="font-bold text-text-primary-light dark:text-text-primary-dark">#{user?.rank || 1205}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 text-xs">
              <span className="text-slate-500 font-medium">Daily Streak</span>
              <span className="font-bold text-orange-500 flex items-center gap-1">
                <Flame size={14} className="fill-orange-500" />
                <span>{user?.streak || 5} Days</span>
              </span>
            </div>
          </div>

          {/* Reset / Developer Settings */}
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-4">
            <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Reset System</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              If you want to clear your local database session (including streak state, bookmarks, and mock test scores).
            </p>
            <button
              onClick={handleResetData}
              className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-error border border-red-500/20 text-xs font-bold rounded-btn transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} />
              <span>Reset Practice Data</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  )
}
