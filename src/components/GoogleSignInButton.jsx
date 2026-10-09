import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'

export default function GoogleSignInButton({ 
  onSuccess, 
  text = 'Continue with Google',
  className = '' 
}) {
  const navigate = useNavigate()
  const { loginWithGoogle, loading } = useAuthStore()
  const { syncUserData } = useAppStore()
  const [googleLoading, setGoogleLoading] = useState(false)

  // Handle successful login
  const handleGoogleSuccess = async (credential, profile) => {
    setGoogleLoading(true)
    const res = await loginWithGoogle(credential, profile)
    setGoogleLoading(false)
    if (res.success) {
      await syncUserData()
      if (onSuccess) {
        onSuccess(res.user)
      } else {
        navigate('/dashboard')
      }
    }
  }

  // One-click simulated Google authentication for seamless local testing
  const handleDevGoogleLogin = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000)
    const mockGoogleProfile = {
      name: `GATE Scholar #${randomId}`,
      email: `scholar_${randomId}@gmail.com`,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=scholar${randomId}`
    }
    handleGoogleSuccess(JSON.stringify(mockGoogleProfile), mockGoogleProfile)
  }

  return (
    <button
      type="button"
      onClick={handleDevGoogleLogin}
      disabled={loading || googleLoading}
      className={`w-full h-11 flex items-center justify-center gap-3 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-btn shadow-xs hover:shadow-sm transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {/* Official Google 'G' Logo SVG */}
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.34 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.14 0 9.97 0 12s.45 3.86 1.24 5.42l4.04-3.15z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        />
      </svg>
      <span>{googleLoading ? 'Signing in with Google...' : text}</span>
    </button>
  )
}
