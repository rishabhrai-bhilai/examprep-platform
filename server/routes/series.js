// Test series on the student site: which mock tests are locked, which the student
// has through their coaching centre, and the original questions they may see.
import { lockedTests, seriesAccess, canTakeTest } from '../services/access.js'
import { seriesDb } from '../db/index.js'

export function registerSeriesRoutes(app, { mockTests, originalQuestions, optionalUser, isAdminEmail }) {
  const viewer = (req) => {
    const user = optionalUser(req)
    return user ? { id: user.id, email: user.email, isAdmin: isAdminEmail(user.email) } : null
  }

  // Which tests are locked, and which of those this student has unlocked
  app.get('/api/me/access', (req, res) => {
    const user = viewer(req)
    const locked = lockedTests()
    const access = seriesAccess(user)
    const unlocked = Object.keys(locked).filter(id => canTakeTest(user, id, locked, access))
    const series = [...access.entries()].map(([id, a]) => ({ seriesId: id, title: seriesDb.findById(id)?.title || id, ...a }))
    res.status(200).json({ locked, unlocked, series })
  })

  // Original (non-PYQ) questions this visitor may see: those in free tests or in
  // tests they've unlocked. They aren't bundled into the site, so locked ones stay locked.
  // They come without answers and explanations, which a student gets only after
  // submitting the test (see /api/mock-tests/:testId/answers in server.js).
  app.get('/api/mock-tests/originals', (req, res) => {
    const user = viewer(req)
    const locked = lockedTests()
    const access = seriesAccess(user)
    const hidden = new Set()
    const visible = new Set()
    mockTests.forEach(t => {
      const target = canTakeTest(user, t.id, locked, access) ? visible : hidden
      t.questions.forEach(id => target.add(id))
    })
    res.set('Cache-Control', 'private, no-store')
    res.status(200).json(originalQuestions.filter(q => visible.has(q.id) || !hidden.has(q.id)))
  })
}
