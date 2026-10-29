import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

// Cloudflare Turnstile. Most visitors never see it; it only shows a checkbox
// when Cloudflare isn't sure. Parents call ref.getToken() right before a request:
// each token works once, so the widget fetches a fresh one after every use.
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const WAIT_MS = 15000

let scriptPromise = null
const loadScript = () => {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_URL
      script.async = true
      script.onload = () => resolve(window.turnstile)
      script.onerror = () => {
        scriptPromise = null
        reject(new Error('Could not load the security check.'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

const TurnstileWidget = forwardRef(function TurnstileWidget({ siteKey }, ref) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const tokenRef = useRef(null)
  const waitersRef = useRef([])

  useEffect(() => {
    if (!siteKey) return
    let cancelled = false
    loadScript()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          'refresh-expired': 'auto',
          callback: (token) => {
            tokenRef.current = token
            const waiters = waitersRef.current
            waitersRef.current = []
            waiters.forEach((resolve) => resolve())
          },
          'expired-callback': () => { tokenRef.current = null },
          'error-callback': () => { tokenRef.current = null }
        })
      })
      .catch((err) => console.warn(err.message))
    return () => {
      cancelled = true
      if (widgetIdRef.current !== null) window.turnstile?.remove(widgetIdRef.current)
      widgetIdRef.current = null
      tokenRef.current = null
    }
  }, [siteKey])

  useImperativeHandle(ref, () => ({
    // Resolves to a one-time token, or null when the check is off or never finished
    getToken: async () => {
      if (!siteKey) return null
      if (!tokenRef.current) {
        await new Promise((resolve) => {
          const done = () => {
            clearTimeout(timer)
            resolve()
          }
          const timer = setTimeout(() => {
            waitersRef.current = waitersRef.current.filter((w) => w !== done)
            resolve()
          }, WAIT_MS)
          waitersRef.current.push(done)
        })
      }
      const token = tokenRef.current
      tokenRef.current = null
      if (token && widgetIdRef.current !== null) window.turnstile?.reset(widgetIdRef.current)
      return token
    }
  }), [siteKey])

  if (!siteKey) return null
  return <div ref={containerRef} className="flex justify-center" />
})

export default TurnstileWidget
