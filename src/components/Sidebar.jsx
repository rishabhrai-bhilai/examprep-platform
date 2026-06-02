import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, Bookmark, BookOpen, User, Settings, X, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function Sidebar() {
  const location = useLocation()
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, toggleSidebarCollapsed } = useAppStore()

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Practice PYQs', path: '/pyq', icon: FileText },
    { name: 'PYQ Mock Tests', path: '/pyq-mock', icon: Clock },
    { name: 'Mock Tests', path: '/mock-tests', icon: BookOpen },
    { name: 'Bookmarks', path: '/bookmarks', icon: Bookmark },
    { name: 'Profile', path: '/profile', icon: User },
  ]

  const handleLinkClick = () => {
    // Close sidebar on mobile after clicking
    setSidebarOpen(false)
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
          sidebarCollapsed ? 'md:w-20' : 'md:w-64'
        } ${
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Toggle Button for collapsing/expanding desktop sidebar */}
        <button
          onClick={toggleSidebarCollapsed}
          className="hidden md:flex absolute top-8 -right-3 h-6 w-6 rounded-full border border-border-light dark:border-border-dark bg-white dark:bg-slate-900/90 backdrop-blur-sm items-center justify-center text-slate-500 hover:text-primary shadow-sm hover:scale-110 transition-all z-[60]"
        >
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
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
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-4 py-3 rounded-btn text-sm font-medium transition-all ${
                    sidebarCollapsed ? 'md:justify-center md:px-0' : ''
                  } ${
                    isActive
                      ? 'text-primary bg-indigo-50 dark:bg-indigo-950/40'
                      : 'text-slate-600 dark:text-slate-400 hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-slate-50 dark:hover:bg-slate-900/60'
                  }`
                }
              >
                <Icon size={20} className={isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'} />
                <span className={`transition-opacity duration-300 ${sidebarCollapsed ? 'md:hidden' : 'block'}`}>
                  {item.name}
                </span>

                {/* Collapsed Tooltip */}
                {sidebarCollapsed && (
                  <span className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10 z-[70]">
                    {item.name}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border-light dark:border-border-dark">
          <NavLink
            to="/settings"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-4 py-3 rounded-btn text-sm font-medium transition-all ${
                sidebarCollapsed ? 'md:justify-center md:px-0' : ''
              } ${
                isActive
                  ? 'text-primary bg-indigo-50 dark:bg-indigo-950/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-slate-50 dark:hover:bg-slate-900/60'
              }`
            }
          >
            <Settings size={20} className="text-slate-400 dark:text-slate-500" />
            <span className={`transition-opacity duration-300 ${sidebarCollapsed ? 'md:hidden' : 'block'}`}>
              Settings
            </span>

            {/* Collapsed Tooltip */}
            {sidebarCollapsed && (
              <span className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10 z-[70]">
                Settings
              </span>
            )}
          </NavLink>
        </div>
      </aside>
    </>
  )
}
