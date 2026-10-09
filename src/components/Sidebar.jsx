import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, Bookmark, BookOpen, User, Settings, X, ChevronLeft, ChevronRight, Clock, MessageSquare, NotebookPen, Users } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'

export default function Sidebar() {
  const location = useLocation()
  const { 
    sidebarOpen, 
    setSidebarOpen, 
    sidebarCollapsed, 
    toggleSidebarCollapsed, 
    isPracticeActive, 
    questions,
    questionNotes,
    bookmarks,
    bookmarkFolders 
  } = useAppStore()
  const { isSuperUser, visitorStats, fetchVisitorStats } = useAuthStore()
  const isSuper = isSuperUser()

  React.useEffect(() => {
    if (isSuper) {
      fetchVisitorStats()
    }
  }, [isSuper, fetchVisitorStats])

  // Local override so user can still manually toggle
  const [manualOverride, setManualOverride] = React.useState(null)
  const [hoveredTooltip, setHoveredTooltip] = useState(null)

  const isDiscussion = location.pathname === '/discussion'
  const isPracticingOrDiscussion = isPracticeActive || isDiscussion

  // Reset manual toggle when navigation or practice mode switches
  React.useEffect(() => {
    setManualOverride(null)
  }, [location.pathname, isPracticeActive])

  // If in practice or discussion mode, default to collapsed (icons only)
  const isCollapsed = manualOverride !== null ? manualOverride : (isPracticingOrDiscussion || sidebarCollapsed)

  const handleToggle = () => {
    setManualOverride(!isCollapsed)
    toggleSidebarCollapsed()
    setHoveredTooltip(null)
  }

  const availableQuestions = questions || []

  // Count only notes that belong to actual available questions and have content
  const notesCount = availableQuestions.filter(q => {
    const n = questionNotes?.[q.id] || questionNotes?.[String(q.id)]
    if (!n) return false
    if (typeof n === 'string') return n.trim().length > 0
    if (typeof n === 'object') {
      const hasSheets = Array.isArray(n.sheets) && n.sheets.length > 0
      const hasStrokes = Array.isArray(n.strokes) && n.strokes.length > 0
      const hasData = !!n.data
      const hasText = !!n.content || !!n.text
      return hasSheets || hasStrokes || hasData || hasText || !!n.name
    }
    return true
  }).length

  // Count only bookmarks that belong to actual available questions
  const rawBookmarkIds = Array.isArray(bookmarks) && bookmarks.length > 0
    ? bookmarks
    : (bookmarkFolders ? Array.from(new Set(Object.values(bookmarkFolders).flat())) : [])
  const bookmarksCount = availableQuestions.filter(q =>
    rawBookmarkIds.some(id => String(id) === String(q.id))
  ).length

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Practice PYQs', path: '/pyq', icon: FileText },
    { name: 'PYQ Mock Tests', path: '/pyq-mock', icon: Clock },
    { name: 'Mock Tests', path: '/mock-tests', icon: BookOpen },
    { name: 'Bookmarks', path: '/bookmarks', icon: Bookmark, badge: bookmarksCount },
    { name: 'Scratchpad Notes', path: '/notes', icon: NotebookPen, badge: notesCount },
    { name: 'Discussion Forum', path: '/discussion', icon: MessageSquare },
    { name: 'Profile', path: '/profile', icon: User },
    ...(isSuper ? [
      { 
        name: 'Visitor Analytics', 
        path: '/admin-visitors', 
        icon: Users, 
        badge: visitorStats?.totalUniqueUsers || 0 
      }
    ] : [])
  ]

  const handleLinkClick = () => {
    // Close sidebar on mobile after clicking
    setSidebarOpen(false)
    setHoveredTooltip(null)
  }

  const handleItemMouseEnter = (e, name, badge) => {
    if (!isCollapsed) return
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredTooltip({
      name,
      badge,
      top: rect.top + rect.height / 2
    })
  }

  const handleItemMouseLeave = () => {
    setHoveredTooltip(null)
  }

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-16 md:top-16 left-0 z-50 h-[calc(100vh-4rem)] flex-shrink-0 flex flex-col border-r border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark transition-all duration-300 ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-none md:transform-none'
        }`}
      >
        {/* Toggle Button for collapsing/expanding desktop sidebar */}
        <button
          onClick={handleToggle}
          className="hidden md:flex absolute top-8 -right-3 h-6 w-6 rounded-full border border-border-light dark:border-border-dark bg-white dark:bg-slate-900/90 backdrop-blur-sm items-center justify-center text-slate-500 hover:text-primary shadow-sm hover:scale-110 transition-all z-[60]"
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* Mobile Close Button in Sidebar Header */}
        <div className="flex items-center justify-between p-4 md:hidden border-b border-border-light dark:border-border-dark">
          <span className="font-bold text-text-primary-light dark:text-text-primary-dark">Menu</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                onMouseEnter={(e) => handleItemMouseEnter(e, item.name, item.badge)}
                onMouseLeave={handleItemMouseLeave}
                title={isCollapsed ? `${item.name}${item.badge !== undefined && item.badge > 0 ? ` (${item.badge})` : ''}` : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-4 py-3 rounded-btn text-sm font-medium transition-all ${
                    isCollapsed ? 'md:justify-center md:px-0' : ''
                  } ${
                    isActive
                      ? 'text-primary bg-indigo-50 dark:bg-indigo-950/40'
                      : 'text-slate-600 dark:text-slate-400 hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-slate-50 dark:hover:bg-slate-900/60'
                  }`
                }
              >
                <div className="relative flex items-center justify-center">
                  <Icon size={20} className={isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'} />
                  {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="hidden md:flex absolute -top-1.5 -right-2 text-[9px] font-extrabold min-w-[15px] h-[15px] px-1 rounded-full bg-primary text-white items-center justify-center shadow-xs">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`transition-opacity duration-300 flex-1 flex items-center justify-between ${isCollapsed ? 'md:hidden' : 'flex'}`}>
                  <span>{item.name}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-primary/15 text-primary">
                      {item.badge}
                    </span>
                  )}
                </span>
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border-light dark:border-border-dark">
          <NavLink
            to="/settings"
            onClick={handleLinkClick}
            onMouseEnter={(e) => handleItemMouseEnter(e, 'Settings')}
            onMouseLeave={handleItemMouseLeave}
            title={isCollapsed ? 'Settings' : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-4 py-3 rounded-btn text-sm font-medium transition-all ${
                isCollapsed ? 'md:justify-center md:px-0' : ''
              } ${
                isActive
                  ? 'text-primary bg-indigo-50 dark:bg-indigo-950/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-slate-50 dark:hover:bg-slate-900/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Settings size={20} className={isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'} />
                <span className={`transition-opacity duration-300 ${isCollapsed ? 'md:hidden' : 'block'}`}>
                  Settings
                </span>
              </>
            )}
          </NavLink>
        </div>
      </aside>

      {/* Floating Tooltip for Collapsed Sidebar rendered into document.body */}
      {isCollapsed && hoveredTooltip && typeof document !== 'undefined' && createPortal(
        <div
          style={{ top: `${hoveredTooltip.top}px` }}
          className="hidden md:flex fixed left-20 -translate-y-1/2 ml-3 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg pointer-events-none whitespace-nowrap border border-white/10 z-[9999] items-center gap-1.5 animate-in fade-in duration-150"
        >
          <span>{hoveredTooltip.name}</span>
          {hoveredTooltip.badge !== undefined && hoveredTooltip.badge > 0 && (
            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-primary/20 text-indigo-300">
              {hoveredTooltip.badge}
            </span>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
