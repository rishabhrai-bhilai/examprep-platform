import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import { useAuthStore } from './store/useAuthStore'
import 'katex/dist/katex.min.css'

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
import NotesPage from './pages/NotesPage'
import ProfilePage from './pages/ProfilePage'
import DiscussionPage from './pages/DiscussionPage'
import VisitorAnalyticsPage from './pages/VisitorAnalyticsPage'

// Components
import ScientificCalculator from './components/ScientificCalculator'
import BookmarkSelectorModal from './components/BookmarkSelectorModal'
import VideoSolutionModal from './components/VideoSolutionModal'
import AuthPromptModal from './components/AuthPromptModal'

function App() {
  const { theme, fetchQuestions, syncUserData } = useAppStore()
  const { checkAuth, pingVisitor } = useAuthStore()

  // Verify auth session on mount & fetch cloud data
  useEffect(() => {
    const initializeApp = async () => {
      fetchQuestions()
      const user = await checkAuth()
      if (user && user.name) {
        await syncUserData()
        pingVisitor(user.name)
      }
    }
    initializeApp()
  }, [fetchQuestions, checkAuth, syncUserData, pingVisitor])

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

        {/* Dashboard/Practice Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pyq" element={<PYQPage />} />
          <Route path="/pyq-mock" element={<PYQMockTestsPage />} />
          <Route path="/mock-tests" element={<MockTestsPage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/discussion" element={<DiscussionPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<ProfilePage />} />
          <Route path="/admin-visitors" element={<VisitorAnalyticsPage />} />
        </Route>

        {/* Fallback Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Overlays */}
      <ScientificCalculator />
      <BookmarkSelectorModal />
      <VideoSolutionModal />
      <AuthPromptModal />
    </BrowserRouter>
  )
}

export default App
