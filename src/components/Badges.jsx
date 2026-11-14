import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Sparkles, Flame, MessageSquare, Award, Lock, Share2, X } from 'lucide-react'
import { BADGES, findBadge } from '../../shared/engagement.js'
import { avatarForBadge } from '../../shared/avatars.js'
import { useAuthStore } from '../store/useAuthStore'
import { markBadgesSeen } from '../utils/engagementApi'

// How each badge group looks: an icon for the app, an emoji for the share card
const GROUPS = {
  practice: { icon: Award, emoji: '🏅', tone: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', colors: ['#6366F1', '#4338CA'] },
  potd: { icon: Sparkles, emoji: '⭐', tone: 'text-amber-500 bg-amber-500/10 border-amber-500/20', colors: ['#F59E0B', '#B45309'] },
  streak: { icon: Flame, emoji: '🔥', tone: 'text-orange-500 bg-orange-500/10 border-orange-500/20', colors: ['#F97316', '#C2410C'] },
  discussion: { icon: MessageSquare, emoji: '💬', tone: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', colors: ['#10B981', '#047857'] }
}

const earnedDate = (ms) => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// A square PNG of the badge with ExamPrep branding, for sharing or saving
export async function drawShareCard(badge, userName, earnedAt) {
  const size = 1080
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const [c1, c2] = GROUPS[badge.group].colors

  const bg = ctx.createLinearGradient(0, 0, size, size)
  bg.addColorStop(0, '#0F172A')
  bg.addColorStop(1, '#1E1B4B')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)

  ctx.textAlign = 'center'
  ctx.font = '800 56px Inter, system-ui, sans-serif'
  ctx.fillStyle = '#F8FAFC'
  ctx.fillText('Exam', size / 2 - 62, 140)
  ctx.fillStyle = '#818CF8'
  ctx.fillText('Prep', size / 2 + 78, 140)

  const ring = ctx.createLinearGradient(size / 2 - 200, 260, size / 2 + 200, 660)
  ring.addColorStop(0, c1)
  ring.addColorStop(1, c2)
  ctx.beginPath()
  ctx.arc(size / 2, 470, 200, 0, Math.PI * 2)
  ctx.fillStyle = ring
  ctx.fill()
  ctx.font = '170px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText(GROUPS[badge.group].emoji, size / 2, 480)
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = '#F8FAFC'
  ctx.font = '800 64px Inter, system-ui, sans-serif'
  ctx.fillText(badge.name, size / 2, 790)
  ctx.fillStyle = '#94A3B8'
  ctx.font = '500 34px Inter, system-ui, sans-serif'
  ctx.fillText(badge.description, size / 2, 850)
  ctx.fillStyle = '#CBD5E1'
  ctx.font = '600 32px Inter, system-ui, sans-serif'
  ctx.fillText(`${userName} · ${earnedDate(earnedAt)}`, size / 2, 960)

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

export async function shareBadge(badge, userName, earnedAt) {
  const blob = await drawShareCard(badge, userName, earnedAt)
  const file = new File([blob], `examprep-${badge.id}.png`, { type: 'image/png' })
  const text = `I earned the "${badge.name}" badge on ExamPrep!`
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: badge.name, text })
      return
    } catch (err) {
      if (err?.name === 'AbortError') return
    }
  }
  // No share sheet (most desktops): save the image instead
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Every badge, earned ones first, for the profile page
export function BadgeGrid() {
  const user = useAuthStore(s => s.user)
  const earned = user?.badges || {}
  const sorted = [...BADGES].sort((a, b) => (earned[b.id] ? 1 : 0) - (earned[a.id] ? 1 : 0))

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-baseline">
        <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Badges</h3>
        <span className="text-[10px] text-slate-400 font-semibold">{Object.keys(earned).length} of {BADGES.length} earned</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sorted.map(badge => {
          const { icon: Icon, tone } = GROUPS[badge.group]
          const at = earned[badge.id]
          return (
            <div
              key={badge.id}
              className={`p-3 rounded-btn border text-center flex flex-col items-center gap-1.5 ${at ? tone : 'text-slate-400 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70'}`}
            >
              {at ? <Icon size={22} /> : <Lock size={22} />}
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{badge.name}</h4>
              <p className="text-[10px] text-slate-500 leading-tight">{badge.description}</p>
              {avatarForBadge(badge.id, user?.name) && (
                <span className="mt-0.5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400" title={at ? 'Avatar unlocked: pick it in Settings' : 'Earn this badge to unlock the avatar'}>
                  <img src={avatarForBadge(badge.id, user?.name)} alt="" loading="lazy" className={`h-5 w-5 rounded-full ${at ? '' : 'grayscale opacity-40'}`} />
                  {at ? 'Avatar unlocked' : 'Unlocks an avatar'}
                </span>
              )}
              {at && (
                <button
                  onClick={() => shareBadge(badge, user.name || 'ExamPrep student', at)}
                  className="mt-1 text-[10px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Share2 size={11} /> Share
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Celebrates badges the user hasn't seen yet, one at a time. Seen badges are stored
// on the server, so the pop-up never comes back for the same badge.
export function BadgeUnlockModal() {
  const user = useAuthStore(s => s.user)
  const updateProfile = useAuthStore(s => s.updateProfile)
  const [avatarState, setAvatarState] = useState(null) // null | 'saving' | 'saved' | 'error'
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [dismissed, setDismissed] = useState([])

  const seen = new Set([...(user?.badgesSeen || []), ...dismissed])
  const queue = isAuthenticated && user?.profileCompleted
    ? Object.keys(user?.badges || {}).filter(id => !seen.has(id) && findBadge(id))
    : []
  const badge = queue.length ? findBadge(queue[0]) : null

  useEffect(() => {
    if (!badge) return
    confetti({ particleCount: 120, spread: 75, origin: { y: 0.55 }, zIndex: 2000 })
  }, [badge?.id])

  if (!badge) return null
  const { icon: Icon, tone } = GROUPS[badge.group]
  const earnedAt = user.badges[badge.id]

  const reward = avatarForBadge(badge.id, user.name)
  const usingReward = reward && user.avatar === reward

  const useReward = async () => {
    setAvatarState('saving')
    const result = await updateProfile({ avatar: reward }).catch(() => null)
    setAvatarState(result?.success ? 'saved' : 'error')
  }

  const close = () => {
    setAvatarState(null)
    setDismissed(d => [...d, badge.id])
    markBadgesSeen([badge.id]).catch(() => {})
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1100] flex justify-center p-4 overflow-y-auto">
        <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={close} />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-unlock-title"
          initial={{ scale: 0.6, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="relative my-auto w-full max-w-sm bg-card-light dark:bg-card-dark rounded-2xl border border-border-light dark:border-border-dark shadow-2xl p-6 text-center space-y-4"
        >
          <button onClick={close} aria-label="Close" className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Badge unlocked</p>
          <motion.div
            initial={{ rotate: -20, scale: 0.5 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 10 }}
            className={`mx-auto h-24 w-24 rounded-full border-2 flex items-center justify-center ${tone}`}
          >
            <Icon size={44} />
          </motion.div>
          <div>
            <h2 id="badge-unlock-title" className="text-xl font-extrabold text-text-primary-light dark:text-text-primary-dark">{badge.name}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{badge.description}</p>
            <p className="text-[11px] text-slate-400 mt-1">Earned {earnedDate(earnedAt)}{queue.length > 1 ? ` · ${queue.length - 1} more to see` : ''}</p>
          </div>
          {reward && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/60 text-left">
              <img src={reward} alt="New avatar" className="h-12 w-12 rounded-full shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark">New avatar unlocked</p>
                <p className="text-[11px] text-slate-500">
                  {avatarState === 'error' ? 'Could not update your picture. Try again from Settings.' : usingReward || avatarState === 'saved' ? 'It is now your profile picture.' : 'Use it now or pick it later in Settings.'}
                </p>
              </div>
              {!usingReward && avatarState !== 'saved' && (
                <button
                  onClick={useReward}
                  disabled={avatarState === 'saving'}
                  className="shrink-0 px-3 py-1.5 rounded-btn bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 disabled:opacity-60"
                >
                  {avatarState === 'saving' ? 'Saving…' : 'Use it'}
                </button>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={close} className="flex-1 py-2 rounded-btn bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              {queue.length > 1 ? 'Next badge' : 'Close'}
            </button>
            <button
              onClick={() => shareBadge(badge, user.name || 'ExamPrep student', earnedAt)}
              className="flex-1 py-2 rounded-btn bg-primary hover:bg-primary-hover text-white text-sm font-bold inline-flex items-center justify-center gap-1.5"
            >
              <Share2 size={15} /> Share
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
