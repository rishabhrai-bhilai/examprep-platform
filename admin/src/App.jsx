import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAdminAuth, roleOf } from './lib/api'
import Layout from './components/Layout'
import { Spinner } from './components/ui'
import LoginPage from './pages/LoginPage'
import OverviewPage from './pages/OverviewPage'
import StudentsPage from './pages/StudentsPage'
import StudentDetailPage from './pages/StudentDetailPage'
import SeriesPage from './pages/SeriesPage'
import CentresPage from './pages/CentresPage'
import CentreDashboard from './pages/CentreDashboard'

function NotAdmin() {
  const { user, signOut } = useAdminAuth()
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-light dark:bg-bg-dark">
      <div className="max-w-sm text-center space-y-3">
        <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">No admin access</h1>
        <p className="text-sm text-slate-500">{user?.email} isn&apos;t a site admin or a coaching-centre admin.</p>
        <button onClick={signOut} className="text-sm font-bold text-primary">Sign in with another account</button>
      </div>
    </div>
  )
}

export default function App() {
  const { user, checked, check } = useAdminAuth()
  useEffect(() => { check() }, [check])

  if (!checked) return <Spinner />
  if (!user) return <LoginPage />
  const role = roleOf(user)
  if (!role) return <NotAdmin />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {role === 'site' ? (
            <>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/students/:id" element={<StudentDetailPage />} />
              <Route path="/series" element={<SeriesPage />} />
            </>
          ) : (
            <Route path="/" element={<Navigate to="/centres" replace />} />
          )}
          <Route path="/centres" element={<CentresPage />} />
          <Route path="/centres/:id" element={<CentreDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
