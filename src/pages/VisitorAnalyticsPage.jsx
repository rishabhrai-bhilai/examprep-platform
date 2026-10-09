import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  Users, 
  TrendingUp, 
  Clock, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  ArrowLeft,
  Calendar,
  UserCheck
} from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'

export default function VisitorAnalyticsPage() {
  const { user, isSuperUser, visitorStats, fetchVisitorStats } = useAuthStore()
  const isSuper = isSuperUser()
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date())

  // Automatically fetch latest stats on mount
  useEffect(() => {
    if (isSuper) {
      fetchVisitorStats().then(() => {
        setLastRefreshedAt(new Date())
      })
    }
  }, [isSuper, fetchVisitorStats])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchVisitorStats()
      setLastRefreshedAt(new Date())
    } finally {
      setTimeout(() => setIsRefreshing(false), 400)
    }
  }

  const visitors = visitorStats?.visitors || []
  const totalUniqueUsers = visitorStats?.totalUniqueUsers || visitors.length
  const totalVisits = visitorStats?.totalVisits || visitors.reduce((sum, v) => sum + (v.visitCount || 1), 0)

  // Filter visitors by name
  const filteredVisitors = useMemo(() => {
    if (!searchTerm.trim()) return visitors
    const query = searchTerm.toLowerCase().trim()
    return visitors.filter((v) => v.name && v.name.toLowerCase().includes(query))
  }, [visitors, searchTerm])

  const formatDate = (isoString) => {
    if (!isoString) return '—'
    try {
      const d = new Date(isoString)
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch (_) {
      return String(isoString)
    }
  }

  // Restricted Access View for Non-Super Users
  if (!isSuper) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card p-8 text-center space-y-4 shadow-soft">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
            Super User Access Restricted
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            This visitor analytics counter is a temporary administrative feature restricted exclusively to the super user.
            {user?.name ? (
              <span className="block mt-2 font-medium text-slate-700 dark:text-slate-300">
                Current account: <span className="text-primary font-bold">{user.name}</span>
              </span>
            ) : (
              <span className="block mt-2 font-medium text-slate-700 dark:text-slate-300">
                You are currently not signed in.
              </span>
            )}
          </p>
          <div className="pt-4 flex flex-wrap justify-center gap-3">
            <Link
              to="/dashboard"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text-primary-light dark:text-text-primary-dark text-xs font-bold rounded-btn transition-colors"
            >
              Return to Dashboard
            </Link>
            <Link
              to="/login"
              className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-btn shadow-xs transition-colors"
            >
              Sign In as Super User
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Super User View
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border-light dark:border-border-dark">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Sparkles size={12} />
              Temporary Tab • Super User Only
            </span>
            <span className="text-xs text-slate-400">
              Updated {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-text-primary-light dark:text-text-primary-dark flex items-center gap-2.5">
            <ShieldCheck className="text-primary" size={28} />
            <span>Visitor Counter & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time record of all users who have visited this website till date along with their names.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-btn text-text-primary-light dark:text-text-primary-dark transition-colors shadow-xs active:scale-95 disabled:opacity-60"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-primary' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Stats'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Metric 1: Total Unique Users */}
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card p-5 shadow-soft relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Unique Visitors
              </p>
              <h3 className="text-3xl font-black text-text-primary-light dark:text-text-primary-dark tracking-tight">
                {totalUniqueUsers}
              </h3>
              <p className="text-[11px] text-slate-400">
                Distinct names visited till date
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-80" />
        </div>

        {/* Metric 2: Total Visits / Sessions */}
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card p-5 shadow-soft relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Visits / Sessions
              </p>
              <h3 className="text-3xl font-black text-text-primary-light dark:text-text-primary-dark tracking-tight">
                {totalVisits}
              </h3>
              <p className="text-[11px] text-slate-400">
                Cumulative site visits recorded
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80" />
        </div>

        {/* Metric 3: Latest Active Visitor */}
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card p-5 shadow-soft relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Latest Active Visitor
              </p>
              <h3 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark truncate max-w-[180px]">
                {visitors[0]?.name || 'None yet'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {visitors[0] ? formatDate(visitors[0].lastVisitedAt) : 'No visits recorded'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Clock size={24} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500 opacity-80" />
        </div>
      </div>

      {/* Visitor List Section */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card shadow-soft overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-border-light dark:border-border-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/30">
          <div>
            <h2 className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
              <UserCheck size={16} className="text-primary" />
              <span>Visitor Directory</span>
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                {filteredVisitors.length}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              List of all users who have visited the site, their visit count, and active timestamps
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Filter visitors by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-white dark:bg-slate-950 border border-border-light dark:border-border-dark rounded-input focus:outline-none focus:border-primary text-text-primary-light dark:text-text-primary-dark"
            />
          </div>
        </div>

        {/* Table Content */}
        {filteredVisitors.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
              {searchTerm ? `No visitors found matching "${searchTerm}"` : 'No visitors recorded yet.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-primary hover:underline font-semibold"
              >
                Clear search filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/70 dark:bg-slate-900/50">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Visitor Name</th>
                  <th className="py-3 px-4 text-center">Visit Count</th>
                  <th className="py-3 px-4">First Visited</th>
                  <th className="py-3 px-4">Last Visited</th>
                  <th className="py-3 px-4 text-right">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {filteredVisitors.map((visitor, idx) => {
                  const isCurrentSuper = visitor.name && visitor.name.toLowerCase() === 'super'
                  const initials = visitor.name ? visitor.name.slice(0, 2).toUpperCase() : '?'
                  return (
                    <tr
                      key={visitor.id || idx}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCurrentSuper
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-text-primary-light dark:text-text-primary-dark">
                              <span>{visitor.name}</span>
                              {isCurrentSuper && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  Super User
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {visitor.id || `vis-${idx + 1}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                          {visitor.visitCount || 1} {visitor.visitCount === 1 ? 'visit' : 'visits'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{formatDate(visitor.firstVisitedAt)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400" />
                          <span>{formatDate(visitor.lastVisitedAt)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isCurrentSuper ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                            Super Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Visitor
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Informational Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-border-light dark:border-border-dark text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <p>
            ℹ️ Temporary counter tab requested for visitor tracking. Only visible when signed in as <span className="font-bold text-primary">super</span>.
          </p>
          <span className="text-[10px] text-slate-400 font-mono">
            {totalVisits} total visits logged
          </span>
        </div>
      </div>
    </div>
  )
}
