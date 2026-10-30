import React, { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'
import { useAppStore } from '../store/useAppStore'

// <main> is the one scrolling area for every page in here. Full-height pages
// (PYQ practice, Notes, Discussions) use h-full and scroll inside themselves.
export default function DashboardLayout() {
  const { pathname } = useLocation()
  const { isPracticeActive } = useAppStore()
  const mainRef = useRef(null)

  // A new page starts at the top instead of where the last one was scrolled to
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [pathname])

  return (
    // dvh: on phones 100vh is taller than the visible screen while the browser bar shows
    <div className="h-dvh w-full flex flex-col overflow-hidden bg-bg-light dark:bg-bg-dark text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <Header />
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar />
        {/* Room for the phone bottom bar, which practice mode hides */}
        <main ref={mainRef} className={`flex-1 min-w-0 overflow-y-auto overflow-x-hidden ${isPracticeActive ? '' : 'pb-16 md:pb-0'}`}>
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
