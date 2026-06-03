import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'

// Layouts
import DashboardLayout from './layouts/DashboardLayout'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import DashboardPage from './pages/DashboardPage'
import PYQPage from './pages/PYQPage'
import PYQMockTestsPage from './pages/PYQMockTestsPage'
import MockTestsPage from './pages/MockTestsPage'
import BookmarksPage from './pages/BookmarksPage'
import ProfilePage from './pages/ProfilePage'
import DiscussionPage from './pages/DiscussionPage'

// Components
import ScientificCalculator from './components/ScientificCalculator'

function App() {
  const { theme, fetchQuestions } = useAppStore()

  // Fetch questions on mount
  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  // Apply dark mode theme class to html node on mount and changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Protected Dashboard/Practice Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pyq" element={<PYQPage />} />
          <Route path="/pyq-mock" element={<PYQMockTestsPage />} />
          <Route path="/mock-tests" element={<MockTestsPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/discussion" element={<DiscussionPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Settings page falls back to Profile or custom view */}
          <Route path="/settings" element={<ProfilePage />} />
        </Route>

        {/* Fallback Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Overlays */}
      <ScientificCalculator />
    </BrowserRouter>
  )
}

export default App
