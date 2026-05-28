import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, BookOpen, Bookmark, User } from 'lucide-react'

export default function BottomNav() {
  const items = [
    { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { name: 'PYQs', path: '/pyq', icon: FileText },
    { name: 'Mock', path: '/mock-tests', icon: BookOpen },
    { name: 'Saved', path: '/bookmarks', icon: Bookmark },
    { name: 'Profile', path: '/profile', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-border-light dark:border-border-dark bg-card-light/95 dark:bg-card-dark/95 backdrop-blur-md flex items-center justify-around px-2 shadow-lg md:hidden">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-slate-500 dark:text-slate-400 hover:text-text-primary-light dark:hover:text-text-primary-dark'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} className={`mb-1 ${isActive ? 'text-primary scale-110' : 'text-slate-400 dark:text-slate-500'} transition-transform`} />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
