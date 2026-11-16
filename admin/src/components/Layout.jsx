import { useState } from 'react'
import { NavLink, Outlet, useMatch } from 'react-router-dom'
import { LayoutDashboard, Users, Package, School, LogOut, Menu, X, Moon, Sun, ExternalLink } from 'lucide-react'
import { useAdminAuth } from '../lib/api'
import { COACHING_NAV } from '../coaching/CoachingLayout'
import { useWorkspace } from '../coaching/api'

const SITE_NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/series', label: 'Test series', icon: Package },
  { to: '/centres', label: 'Coaching centres', icon: School }
]
const CENTRE_NAV = [{ to: '/centres', label: 'My centres', icon: School }]
const studentSite = (import.meta.env.VITE_STUDENT_SITE_URL || window.location.origin.replace('//admin.', '//')).replace(/\/$/, '')

const toggleTheme = () => {
  const dark = !document.documentElement.classList.contains('dark')
  document.documentElement.classList.toggle('dark', dark)
  try { localStorage.setItem('examprep_admin_theme', dark ? 'dark' : 'light') } catch { /* private mode */ }
}

export default function Layout() {
  const { user, signOut } = useAdminAuth()
  const [open, setOpen] = useState(false)
  const nav = user?.isAdmin ? SITE_NAV : CENTRE_NAV
  const inCentre = useMatch('/c/:cid/*')
  const cid = inCentre?.params.cid
  const centreName = useWorkspace(s => (s.cid === cid ? s.info?.centre.name : null))
  const linkCls = ({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`

  const sidebar = (
    <nav className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center gap-2 border-b border-border-light dark:border-border-dark">
        <div className="h-8 w-8 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm">E</div>
        <div>
          <p className="font-extrabold text-sm text-slate-900 dark:text-slate-100 leading-tight">ExamPrep Admin</p>
          <p className="text-[10px] text-slate-500">{user?.isAdmin ? 'Site admin' : 'Centre admin'}</p>
        </div>
      </div>
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        {cid && (
          <div className="pb-3 mb-2 border-b border-border-light dark:border-border-dark space-y-3">
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-primary truncate" title={centreName || ''}>{centreName || 'Centre'}</p>
            {COACHING_NAV.map(g => (
              <div key={g.group} className="space-y-0.5">
                <p className="px-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">{g.group}</p>
                {g.items.map(item => (
                  <NavLink key={item.to} to={`/c/${cid}${item.to ? `/${item.to}` : ''}`} end={item.end} onClick={() => setOpen(false)}
                    className={({ isActive }) => `block px-3 py-1.5 rounded-lg text-[13px] font-semibold ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </div>
        )}
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={linkCls}>
            <Icon size={17} /> {label}
          </NavLink>
        ))}
      </div>
      <div className="p-3 border-t border-border-light dark:border-border-dark space-y-1">
        <a href={studentSite} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-primary"><ExternalLink size={15} /> Student site</a>
        <button onClick={toggleTheme} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-primary"><Sun size={15} className="hidden dark:block" /><Moon size={15} className="dark:hidden" /> Theme</button>
        <div className="px-3 pt-2 text-[11px] text-slate-500 truncate" title={user?.email}>{user?.email}</div>
        <button onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600"><LogOut size={15} /> Sign out</button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark text-slate-800 dark:text-slate-100">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-60 bg-card-light dark:bg-card-dark border-r border-border-light dark:border-border-dark">{sidebar}</aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-card-light dark:bg-card-dark overflow-y-auto">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="lg:hidden h-14 px-4 flex items-center justify-between border-b border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark">
          <button onClick={() => setOpen(o => !o)} aria-label="Menu" className="p-1.5 -ml-1.5">{open ? <X size={20} /> : <Menu size={20} />}</button>
          <span className="font-extrabold text-sm">ExamPrep Admin</span>
          <span className="w-6" />
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-16">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
