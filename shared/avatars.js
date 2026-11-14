// Avatars, shared by the app (the picker) and the server (which checks that a
// locked avatar is only saved by someone who has earned it).
//
// Free avatars use eight DiceBear styles. Every badge unlocks one more style,
// drawn on a coloured gradient so it stands out. A style belongs to exactly one
// tier, so the server can tell from an avatar URL which badge it needs.

import { findBadge } from './engagement.js'

const DICEBEAR = 'https://api.dicebear.com/7.x'

export const FREE_STYLES = ['adventurer', 'avataaars', 'bottts', 'fun-emoji', 'lorelei', 'micah', 'notionists', 'pixel-art']

// badge id -> the style it unlocks and the gradient behind it
export const BADGE_AVATARS = [
  { badge: 'first-steps', style: 'big-smile', colors: ['ffd5dc', 'ffdfbf'] },
  { badge: 'saver', style: 'thumbs', colors: ['c0aede', 'b6e3f4'] },
  { badge: 'potd-7', style: 'miniavs', colors: ['fde68a', 'fca5a5'] },
  { badge: 'potd-15', style: 'croodles', colors: ['fef3c7', 'fdba74'] },
  { badge: 'potd-30', style: 'big-ears', colors: ['fcd34d', 'f97316'] },
  { badge: 'potd-365', style: 'personas', colors: ['f59e0b', 'b45309'] },
  { badge: 'streak-7', style: 'adventurer-neutral', colors: ['fed7aa', 'fb923c'] },
  { badge: 'streak-15', style: 'lorelei-neutral', colors: ['fdba74', 'ea580c'] },
  { badge: 'streak-30', style: 'open-peeps', colors: ['fb923c', 'c2410c'] },
  { badge: 'streak-365', style: 'notionists-neutral', colors: ['f97316', '7c2d12'] },
  { badge: 'discuss-1', style: 'shapes', colors: ['a7f3d0', '6ee7b7'] },
  { badge: 'discuss-10', style: 'rings', colors: ['6ee7b7', '10b981'] },
  { badge: 'discuss-50', style: 'icons', colors: ['34d399', '047857'] },
  { badge: 'discuss-100', style: 'bottts-neutral', colors: ['10b981', '064e3b'] }
]

const byStyle = new Map(BADGE_AVATARS.map(a => [a.style, a]))

export const dicebearUrl = (style, seed, colors = null) => {
  const params = new URLSearchParams({ seed })
  if (colors) {
    params.set('backgroundType', 'gradientLinear')
    params.set('backgroundColor', colors.join(','))
  }
  return `${DICEBEAR}/${style}/svg?${params.toString()}`
}

const cleanSeed = (name) => (String(name || '').trim() || 'Aspirant')

// The 12 free tiles: one per style with the user's name, then four more variations
export const freeAvatars = (name) => {
  const base = cleanSeed(name)
  return Array.from({ length: 12 }, (_, i) => {
    const style = FREE_STYLES[i % FREE_STYLES.length]
    const seed = i < FREE_STYLES.length ? base : `${base}-${i - FREE_STYLES.length + 2}`
    return { url: dicebearUrl(style, seed), style, label: `${style} avatar` }
  })
}

// One tile per badge, with whether this user has unlocked it
export const badgeAvatars = (name, earnedBadges = {}) => {
  const base = cleanSeed(name)
  return BADGE_AVATARS.map(a => {
    const badge = findBadge(a.badge)
    return {
      url: dicebearUrl(a.style, base, a.colors),
      style: a.style,
      badgeId: a.badge,
      badgeName: badge?.name || a.badge,
      badgeDescription: badge?.description || '',
      unlocked: Boolean(earnedBadges?.[a.badge])
    }
  })
}

// The badge an avatar URL needs, or null when it's free (or not a DiceBear avatar)
export const requiredBadgeFor = (url) => {
  const m = typeof url === 'string' && url.match(/^https:\/\/api\.dicebear\.com\/\d+\.x\/([a-z0-9-]+)\//)
  if (!m) return null
  return byStyle.get(m[1])?.badge || null
}

// The avatar unlocked by a badge, for showing the reward next to the badge
export const avatarForBadge = (badgeId, name) => {
  const a = BADGE_AVATARS.find(x => x.badge === badgeId)
  return a ? dicebearUrl(a.style, cleanSeed(name), a.colors) : null
}
