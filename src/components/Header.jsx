import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Search, Calculator, Sun, Moon, User, LogOut, BookOpen } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'

export default function Header() {
  const navigate = useNavigate()
  const { theme, toggleTheme, setCalculatorOpen, calculatorOpen, toggleSidebar } = useAppStore()
  const { user, isAuthenticated, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft transition-colors duration-200">
      {/* Left side: Logo & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-800 text-text-secondary-light dark:text-text-secondary-dark md:hidden focus:outline-none"
          aria-label="Toggle Sidebar"
        >
          <Menu size={20} className="text-primary" />
        </button>

        <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight text-text-primary-light dark:text-text-primary-dark">
          <BookOpen className="text-primary" size={24} />
          <span>Exam<span className="text-primary">Prep</span></span>
        </Link>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden sm:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={18} className="text-slate-400 dark:text-slate-500" />
          </span>
          <input
            type="search"
            placeholder="Search questions, subjects, topics..."
            className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Right side: Tools, Theme, Profile */}
      <div className="flex items-center gap-2">
        {/* Scientific Calculator Button */}
        <button
          onClick={() => setCalculatorOpen(!calculatorOpen)}
          className={`p-2.5 rounded-btn transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
            calculatorOpen ? 'text-primary bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-600 dark:text-slate-400'
          }`}
          title="Scientific Calculator"
        >
          <Calculator size={20} />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-btn text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* User Profile / Auth State */}
        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Link to="/profile" className="flex items-center gap-2 p-1.5 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name || 'user'}`}
                alt="Avatar"
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
              />
              <span className="hidden md:inline text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                {user?.name}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-btn text-error hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:text-primary transition-colors"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-btn transition-colors"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
