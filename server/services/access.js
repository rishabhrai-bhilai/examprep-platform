// Who can take which mock test.
//
// A mock test that belongs to any test series is locked; every other test is free.
// A student unlocks a series by buying it (a paid order that hasn't expired), by an
// admin granting it, or by being in a coaching centre that has seats for it.
// Site admins can take everything.
import { seriesDb, orderDb, instituteDb } from '../db/index.js'

const DAY_MS = 24 * 3600 * 1000

// An order that currently gives access
export const orderIsActive = (order, now = Date.now()) =>
  order.status === 'paid' && (!order.expiresAt || order.expiresAt > now)

// When access from a purchase made now would end (null = no expiry)
export const expiryFor = (series, from = Date.now()) =>
  series.validityDays ? from + series.validityDays * DAY_MS : null

// { testId: [seriesId, ...] } for every test inside a series
export function lockedTests(allSeries = seriesDb.getAll()) {
  const map = {}
  allSeries.forEach(s => (s.testIds || []).forEach(t => { (map[t] || (map[t] = [])).push(s.id) }))
  return map
}

// The student's centre seat: centre members in joining order fill its seats
export function centreSeat(userId, institute = instituteDb.findByMember(userId)) {
  if (!institute || !(institute.seriesIds || []).length) return null
  const order = (institute.members || []).slice().sort((a, b) => a.joinedAt - b.joinedAt)
  const index = order.findIndex(m => m.userId === userId)
  if (index === -1 || index >= (institute.seats || 0)) return null
  return { instituteId: institute.id, instituteName: institute.name, seriesIds: institute.seriesIds }
}

// Series ids the user can use right now, and where each comes from
export function seriesAccess(user, now = Date.now()) {
  const access = new Map() // seriesId -> { via: 'purchase'|'grant'|'centre'|'admin', expiresAt }
  if (!user) return access
  if (user.isAdmin) {
    seriesDb.getAll().forEach(s => access.set(s.id, { via: 'admin', expiresAt: null }))
    return access
  }
  orderDb.getByUser(user.id).filter(o => orderIsActive(o, now)).forEach(o => {
    const prev = access.get(o.seriesId)
    const via = o.source === 'admin' ? 'grant' : 'purchase'
    // Keep the longest-lasting access
    if (!prev || (prev.expiresAt && (!o.expiresAt || o.expiresAt > prev.expiresAt))) {
      access.set(o.seriesId, { via, expiresAt: o.expiresAt || null })
    }
  })
  const seat = centreSeat(user.id)
  if (seat) {
    seat.seriesIds.forEach(id => {
      if (!access.has(id)) access.set(id, { via: 'centre', expiresAt: null, instituteName: seat.instituteName })
    })
  }
  return access
}

// Can this user take the test? (free tests: yes, for anyone)
export function canTakeTest(user, testId, locked = lockedTests(), access = null) {
  const series = locked[testId]
  if (!series) return true
  if (!user) return false
  const mine = access || seriesAccess(user)
  return series.some(id => mine.has(id))
}
