import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, FileText, Bookmark, BookOpen, User, Settings, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function Sidebar() {
  const location = useLocation()
  const { sidebarOpen, setSidebarOpen } = useAppStore()

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Practice PYQs', path: '/pyq', icon: FileText },
    { name: 'Mock Tests', path: '/mock-tests', icon: BookOpen },
    { name: 'Bookmarks', path: '/bookmarks', icon: Bookmark },
    { name: 'Profile', path: '/profile', icon: User },
  ]

  const handleLinkClick = () => {
    // Close sidebar on mobile after clicking
    setSidebarOpen(false)
  }

  // Sidebar wrapper styling
  // Desktop: Fixed sidebar
  // Mobile: Overlay drawer menu
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
        className={`fixed md:sticky top-16 md:top-16 left-0 z-50 h-[calc(100vh-4rem)] w-64 flex-shrink-0 flex flex-col border-r border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
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
                  `flex items-center gap-3 px-4 py-3 rounded-btn text-sm font-medium transition-all ${
                    isActive
                      ? 'text-primary bg-indigo-50 dark:bg-indigo-950/40'
                      : 'text-slate-600 dark:text-slate-400 hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-slate-50 dark:hover:bg-slate-900/60'
                  }`
                }
              >
                <Icon size={20} className={isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border-light dark:border-border-dark">
          <NavLink
            to="/settings"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-btn text-sm font-medium transition-all ${
                isActive
                  ? 'text-primary bg-indigo-50 dark:bg-indigo-950/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-text-primary-light dark:hover:text-text-primary-dark hover:bg-slate-50 dark:hover:bg-slate-900/60'
              }`
            }
          >
            <Settings size={20} className="text-slate-400 dark:text-slate-500" />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>
    </>
  )
}
