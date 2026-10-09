import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Search, Calculator, Sun, Moon, Maximize, Minimize, BookOpen, User, LogIn, LogOut } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'

export default function Header() {
  const navigate = useNavigate()
  const { theme, toggleTheme, setCalculatorOpen, calculatorOpen, toggleSidebar } = useAppStore()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Track fullscreen changes to toggle icon
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

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

      {/* Right side: Tools, Theme, Fullscreen, Auth */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Scientific Calculator Button */}
        <button
          onClick={() => setCalculatorOpen(!calculatorOpen)}
          className={`p-2 sm:p-2.5 rounded-btn transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
            calculatorOpen ? 'text-primary bg-indigo-50 dark:bg-indigo-950/40' : 'text-slate-600 dark:text-slate-400'
          }`}
          title="Scientific Calculator"
        >
          <Calculator size={19} />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 sm:p-2.5 rounded-btn text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-2 sm:p-2.5 rounded-btn text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:flex"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

        {/* User Auth Section */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 transition-all text-xs font-semibold text-slate-700 dark:text-slate-200"
              title="View Profile"
            >
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name)}`}
                alt={user.name}
                className="w-6 h-6 rounded-full border border-primary/30 object-cover bg-slate-100 dark:bg-slate-800"
              />
              <span className="hidden md:inline max-w-[100px] truncate">{user.name}</span>
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 rounded-btn text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-btn transition-all shadow-xs active:scale-95"
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  )
}
