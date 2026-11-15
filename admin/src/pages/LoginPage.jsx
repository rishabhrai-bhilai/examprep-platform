import { useEffect, useRef, useState } from 'react'
import { Loader2, Lock, Mail } from 'lucide-react'
import { api, useAdminAuth, roleOf } from '../lib/api'
import { card, inputCls, btnPrimary, ErrorBox } from '../components/ui'

// Google's button, when the server has a Google client id. The admin address must
// be listed under "Authorised JavaScript origins" for that client in Google Cloud.
function GoogleButton({ clientId, onCredential }) {
  const ref = useRef(null)
  useEffect(() => {
    let cancelled = false
    const render = () => {
      if (cancelled || !window.google?.accounts?.id || !ref.current) return
      window.google.accounts.id.initialize({ client_id: clientId, callback: (r) => onCredential(r.credential) })
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: 320, text: 'signin_with' })
    }
    if (window.google?.accounts?.id) render()
    else {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true
      s.onload = render
      document.head.appendChild(s)
    }
    return () => { cancelled = true }
  }, [clientId, onCredential])
  return <div ref={ref} className="flex justify-center" />
}

export default function LoginPage() {
  const signIn = useAdminAuth(s => s.signIn)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [config, setConfig] = useState(null)
  useEffect(() => { api('/api/auth/config').then(setConfig).catch(() => setConfig({})) }, [])

  // Only site admins and centre admins can use this app
  const finish = (data) => {
    if (!roleOf(data.user)) throw new Error("This account isn't an admin. Students sign in on the student site.")
    signIn(data.token, data.user)
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      finish(await api('/api/auth/login', { method: 'POST', body: { email, password } }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const google = async (credential) => {
    setError('')
    try {
      finish(await api('/api/auth/google', { method: 'POST', body: { credential } }))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center px-4">
      <div className={`${card} w-full max-w-sm p-7 space-y-5`}>
        <div className="text-center space-y-1">
          <div className="mx-auto h-11 w-11 rounded-2xl bg-primary text-white flex items-center justify-center font-black">E</div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">ExamPrep Admin</h1>
          <p className="text-xs text-slate-500">For site admins and coaching-centre admins</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} !pl-9`} type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" aria-label="Email" required />
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} !pl-9`} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" aria-label="Password" required />
          </div>
          <button className={`${btnPrimary} w-full py-2.5 text-sm`} disabled={busy}>{busy && <Loader2 size={15} className="animate-spin" />} Sign in</button>
        </form>
        {config?.googleClientId && (
          <>
            <div className="flex items-center gap-3 text-[11px] text-slate-400"><span className="flex-1 h-px bg-border-light dark:bg-border-dark" />or<span className="flex-1 h-px bg-border-light dark:bg-border-dark" /></div>
            <GoogleButton clientId={config.googleClientId} onCredential={google} />
          </>
        )}
        <ErrorBox>{error}</ErrorBox>
        <p className="text-[11px] text-slate-500 text-center">Use the same account as on the student site. Google-only accounts can add a password with &ldquo;Forgot password&rdquo; there.</p>
      </div>
    </div>
  )
}
