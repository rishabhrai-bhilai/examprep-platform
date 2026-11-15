// Who can take which mock test.
//
// A mock test that belongs to any test series is locked; every other test is free.
// Series are for coaching centres: a student gets a centre's series while they
// hold one of its paid seats. Site admins can take everything.
import { seriesDb, instituteDb } from '../db/index.js'

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
export function seriesAccess(user) {
  const access = new Map() // seriesId -> { via: 'centre' | 'admin', instituteName? }
  if (!user) return access
  if (user.isAdmin) {
    seriesDb.getAll().forEach(s => access.set(s.id, { via: 'admin' }))
    return access
  }
  const seat = centreSeat(user.id)
  if (seat) seat.seriesIds.forEach(id => access.set(id, { via: 'centre', instituteName: seat.instituteName }))
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
