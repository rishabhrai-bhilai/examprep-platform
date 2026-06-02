import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'
import BottomNav from '../components/BottomNav'

export default function DashboardLayout() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-bg-light dark:bg-bg-dark text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
