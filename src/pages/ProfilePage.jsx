import React, { useState } from 'react'
import { User, Mail, Award, Flame, CheckCircle, ShieldAlert, Sparkles, RefreshCw, Clock, BookOpen, Calendar } from 'lucide-react'
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

      {/* Separated Exam Analytics & History Tabs */}
      {(() => {
        const [activeHistoryTab, setActiveHistoryTab] = useState('mock')
        const mockHistory = JSON.parse(localStorage.getItem('gate_mock_history') || '[]')
        const pyqHistory = JSON.parse(localStorage.getItem('gate_pyq_mock_history') || '[]')

        // Mock stats
        const mockAttempts = mockHistory.length
        const mockAvgScore = mockAttempts > 0 
          ? (mockHistory.reduce((sum, h) => sum + h.score, 0) / mockAttempts).toFixed(2)
          : '0.00'
        const mockBestScore = mockAttempts > 0
          ? Math.max(...mockHistory.map(h => h.score)).toFixed(2)
          : '0.00'

        // PYQ Mock stats
        const pyqAttempts = pyqHistory.length
        const pyqAvgScore = pyqAttempts > 0
          ? (pyqHistory.reduce((sum, h) => sum + h.score, 0) / pyqAttempts).toFixed(2)
          : '0.00'
        const pyqBestScore = pyqAttempts > 0
          ? Math.max(...pyqHistory.map(h => h.score)).toFixed(2)
          : '0.00'

        const currentHistory = activeHistoryTab === 'mock' ? mockHistory : pyqHistory
        const currentAttempts = activeHistoryTab === 'mock' ? mockAttempts : pyqAttempts
        const currentAvg = activeHistoryTab === 'mock' ? mockAvgScore : pyqAvgScore
        const currentBest = activeHistoryTab === 'mock' ? mockBestScore : pyqBestScore

        return (
          <div className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2 border-b border-slate-100 dark:border-slate-800/40">
              <div>
                <h3 className="font-extrabold text-base text-text-primary-light dark:text-text-primary-dark">
                  Mock Exam History & Analytics
                </h3>
                <p className="text-xs text-slate-500">Track and review your previous GATE practice sessions.</p>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-btn self-start sm:self-auto">
                <button
                  onClick={() => setActiveHistoryTab('mock')}
                  className={`px-4.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-btn transition-all ${
                    activeHistoryTab === 'mock'
                      ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-350'
                  }`}
                >
                  Mock Tests
                </button>
                <button
                  onClick={() => setActiveHistoryTab('pyq')}
                  className={`px-4.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-btn transition-all ${
                    activeHistoryTab === 'pyq'
                      ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-350'
                  }`}
                >
                  PYQ Mocks
                </button>
              </div>
            </div>

            {/* Aggregate Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-btn border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                  <Award size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Attempted Exams</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none mt-1 inline-block">
                    {currentAttempts} Mocks
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-btn border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 shrink-0">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Average Score</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none mt-1 inline-block">
                    {currentAvg} Marks
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-btn border border-border-light dark:border-border-dark bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-3">
                <div className="h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 shrink-0">
                  <Flame size={18} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none">Highest Score</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none mt-1 inline-block">
                    {currentBest} Marks
                  </span>
                </div>
              </div>
            </div>

            {/* Attempts list */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Exam Run Records</span>

              {currentHistory.length === 0 ? (
                <div className="text-center py-8 rounded-card border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 font-semibold">
                  No exams attempted yet in this category. Start one from the navigation panel!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1.5 custom-scrollbar">
                  {currentHistory.map((item, idx) => (
                    <div
                      key={item.testId + idx}
                      className="p-4 rounded-btn border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-350 dark:hover:border-slate-800 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-primary uppercase">
                            {item.displayName || `Mock Test ${currentHistory.length - idx}`}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">•</span>
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                            <Calendar size={10} />
                            <span>{item.date}</span>
                          </span>
                          {item.time && (
                            <>
                              <span className="text-[10px] text-slate-400 font-medium">•</span>
                              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                <Clock size={10} />
                                <span>{item.time}</span>
                              </span>
                            </>
                          )}
                          {item.questionsCount && (
                            <>
                              <span className="text-[10px] text-slate-400 font-medium">•</span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                {item.questionsCount} Qs
                              </span>
                            </>
                          )}
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                          {item.testTitle}
                        </h4>
                        {item.modeInfo && (
                          <p className="text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase">
                            {item.modeInfo}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-6 self-end sm:self-auto">
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">Score</span>
                          <span className="text-sm font-black text-slate-800 dark:text-slate-150 leading-none mt-1 inline-block">
                            {item.score} / {item.maxScore}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">Accuracy</span>
                          <span className="text-xs font-extrabold text-success leading-none mt-1 inline-block">
                            {item.percentage}%
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block leading-none">Duration</span>
                          <span className="text-[11px] font-mono font-bold text-slate-500 leading-none mt-1.5 inline-block">
                            {item.timeTakenFormatted}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
