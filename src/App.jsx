import React, { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store/useAppStore'
import { useAuthStore } from './store/useAuthStore'
import 'katex/dist/katex.min.css'

// Layouts
import DashboardLayout from './layouts/DashboardLayout'

// Pages. The landing page comes with the app; every other page is its own chunk,
// downloaded the first time it's opened.
import LandingPage from './pages/LandingPage'
import QuestionsGate, { PageLoader } from './components/QuestionsGate'
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const PYQPage = lazy(() => import('./pages/PYQPage'))
const PYQMockTestsPage = lazy(() => import('./pages/PYQMockTestsPage'))
const MockTestsPage = lazy(() => import('./pages/MockTestsPage'))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'))
const NotesPage = lazy(() => import('./pages/NotesPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const DiscussionPage = lazy(() => import('./pages/DiscussionPage'))
const ReportPage = lazy(() => import('./pages/ReportPage'))
const BookletPage = lazy(() => import('./pages/BookletPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const PrototypeAnalyticsPage = lazy(() => import('./pages/PrototypeAnalyticsPage'))
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'))

// Pages that read the question bank wait until it has loaded
const withQuestions = (page) => <QuestionsGate>{page}</QuestionsGate>

// Components
import ScientificCalculator from './components/ScientificCalculator'
import BookmarkSelectorModal from './components/BookmarkSelectorModal'
import VideoSolutionModal from './components/VideoSolutionModal'
import AuthPromptModal from './components/AuthPromptModal'
import OnboardingModal from './components/OnboardingModal'
import ReportIssueModal from './components/ReportIssueModal'
import { BadgeUnlockModal } from './components/Badges'

// Pages still in development (sample data) are only for admins
function AdminOnly({ children }) {
  const user = useAuthStore(s => s.user)
  return user?.isAdmin ? children : <Navigate to="/analytics" replace />
}

function App() {
  const { theme, fetchQuestions, fetchDiscussions, syncUserData } = useAppStore()
  const { checkAuth } = useAuthStore()

  // Verify auth session on mount & fetch cloud data
  useEffect(() => {
    const initializeApp = async () => {
      fetchQuestions()
      fetchDiscussions()
      const user = await checkAuth()
      if (user) {
        await syncUserData()
      }
    }
    initializeApp()
  }, [fetchQuestions, fetchDiscussions, checkAuth, syncUserData])

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
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Dashboard/Practice Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={withQuestions(<DashboardPage />)} />
          <Route path="/pyq" element={withQuestions(<PYQPage />)} />
          <Route path="/pyq-mock" element={withQuestions(<PYQMockTestsPage />)} />
          <Route path="/mock-tests" element={<QuestionsGate originals><MockTestsPage /></QuestionsGate>} />
          <Route path="/booklet" element={withQuestions(<BookletPage />)} />
          <Route path="/analytics" element={withQuestions(<AnalyticsPage />)} />
          <Route path="/analytics-prototype" element={<AdminOnly>{withQuestions(<PrototypeAnalyticsPage />)}</AdminOnly>} />
          <Route path="/bookmarks" element={withQuestions(<BookmarksPage />)} />
          <Route path="/notes" element={withQuestions(<NotesPage />)} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/discussion" element={withQuestions(<DiscussionPage />)} />
          <Route path="/profile" element={withQuestions(<ProfilePage />)} />
          <Route path="/settings" element={withQuestions(<ProfilePage />)} />
          <Route path="/report" element={withQuestions(<ReportPage />)} />
        </Route>

        {/* Fallback Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>

      {/* Global Overlays */}
      <ScientificCalculator />
      <BookmarkSelectorModal />
      <VideoSolutionModal />
      <AuthPromptModal />
      <OnboardingModal />
      <ReportIssueModal />
      <BadgeUnlockModal />
    </BrowserRouter>
  )
}

export default App
