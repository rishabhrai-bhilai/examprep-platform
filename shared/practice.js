// Per-question practice tracking, shared by the client store and the server.
//
// attempts: { [questionId]: {
//   questionId, correct, answeredAt, timeSpentSec,   // latest attempt
//   attempts,                                       // how many times answered
//   totalTimeSec,                                   // time over all attempts
//   solvedAt                                        // first correct answer, or null
// } }
// days: { 'YYYY-MM-DD': { attempts, correct, timeSec } } in the user's own
// calendar (the browser's time zone when the answer was given), used for the
// streak and practice time.
//
// Counts only grow, and merging takes the larger value field by field, so
// syncing the same data twice (or in either direction) never double counts.

export const MAX_QUESTION_SECONDS = 15 * 60
const MAX_ATTEMPTS = 10000
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const clampSec = (v) => Math.max(0, Math.min(MAX_QUESTION_SECONDS, Math.round(num(v))))

// 'YYYY-MM-DD' for a moment in a time zone (the runtime's own zone if none given)
export const dayKey = (time = Date.now(), timeZone) => {
  try {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date(time))
  } catch {
    const d = new Date(time)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
}

// Calendar arithmetic on day keys (done in UTC so DST never shifts the date)
const shiftDay = (key, delta) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10)
}

// Adds one answer to the maps and returns new { attempts, days }
export const addAttempt = ({ attempts = {}, days = {} }, { questionId, correct, timeSpentSec = 0, answeredAt = Date.now() }) => {
  const id = String(questionId)
  const sec = clampSec(timeSpentSec)
  const prev = attempts[id]
  const rec = {
    questionId: Number(questionId),
    correct: !!correct,
    answeredAt,
    timeSpentSec: sec,
    attempts: (prev?.attempts || 0) + 1,
    totalTimeSec: (prev?.totalTimeSec || 0) + sec,
    solvedAt: prev?.solvedAt || (correct ? answeredAt : null)
  }
  const day = dayKey(answeredAt)
  const prevDay = days[day] || { attempts: 0, correct: 0, timeSec: 0 }
  return {
    attempts: { ...attempts, [id]: rec },
    days: {
      ...days,
      [day]: {
        attempts: prevDay.attempts + 1,
        correct: prevDay.correct + (correct ? 1 : 0),
        timeSec: prevDay.timeSec + sec
      }
    }
  }
}

const mergeRecord = (a, b) => {
  if (!a) return b
  if (!b) return a
  const latest = num(b.answeredAt) > num(a.answeredAt) ? b : a
  const solved = [a.solvedAt, b.solvedAt].filter(Boolean)
  return {
    ...latest,
    attempts: Math.max(num(a.attempts), num(b.attempts)),
    totalTimeSec: Math.max(num(a.totalTimeSec), num(b.totalTimeSec)),
    solvedAt: solved.length ? Math.min(...solved) : null
  }
}

export const mergePractice = (a = {}, b = {}) => {
  const attempts = { ...(a.attempts || {}) }
  Object.entries(b.attempts || {}).forEach(([id, rec]) => {
    attempts[id] = mergeRecord(attempts[id], rec)
  })
  const days = { ...(a.days || {}) }
  Object.entries(b.days || {}).forEach(([day, v]) => {
    const cur = days[day]
    days[day] = cur
      ? {
          attempts: Math.max(num(cur.attempts), num(v.attempts)),
          correct: Math.max(num(cur.correct), num(v.correct)),
          timeSec: Math.max(num(cur.timeSec), num(v.timeSec))
        }
      : v
  })
  return { attempts, days }
}

// Drops malformed entries from untrusted input. `isKnownQuestion(id)` filters ids.
export const sanitizePractice = ({ attempts, days } = {}, isKnownQuestion = () => true) => {
  const cleanAttempts = {}
  if (attempts && typeof attempts === 'object') {
    Object.entries(attempts).forEach(([id, r]) => {
      const qid = Number(id)
      if (!Number.isInteger(qid) || !r || typeof r !== 'object' || !isKnownQuestion(qid)) return
      const answeredAt = num(r.answeredAt)
      if (answeredAt <= 0) return
      const count = Math.max(1, Math.min(MAX_ATTEMPTS, Math.floor(num(r.attempts))))
      cleanAttempts[qid] = {
        questionId: qid,
        correct: !!r.correct,
        answeredAt,
        timeSpentSec: clampSec(r.timeSpentSec),
        attempts: count,
        totalTimeSec: Math.max(0, Math.min(count * MAX_QUESTION_SECONDS, Math.round(num(r.totalTimeSec)))),
        solvedAt: num(r.solvedAt) > 0 ? num(r.solvedAt) : (r.correct ? answeredAt : null)
      }
    })
  }
  const cleanDays = {}
  if (days && typeof days === 'object') {
    Object.entries(days).forEach(([day, v]) => {
      if (!DAY_RE.test(day) || !v || typeof v !== 'object') return
      const n = Math.max(0, Math.floor(num(v.attempts)))
      if (n === 0) return
      cleanDays[day] = {
        attempts: n,
        correct: Math.max(0, Math.min(n, Math.floor(num(v.correct)))),
        timeSec: Math.max(0, Math.min(n * MAX_QUESTION_SECONDS, Math.round(num(v.timeSec))))
      }
    })
  }
  return { attempts: cleanAttempts, days: cleanDays }
}

// Consecutive active days ending today, or ending yesterday (today isn't over yet)
export const currentStreak = (days = {}, today = dayKey()) => {
  let day = days[today] ? today : shiftDay(today, -1)
  let streak = 0
  while (days[day]?.attempts > 0) {
    streak++
    day = shiftDay(day, -1)
  }
  return streak
}

export const longestStreak = (days = {}) => {
  const active = Object.keys(days).filter(d => days[d]?.attempts > 0).sort()
  let best = 0
  let run = 0
  active.forEach((d, i) => {
    run = i > 0 && shiftDay(active[i - 1], 1) === d ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}

// Totals that don't need the question bank
export const practiceSummary = ({ attempts = {}, days = {} } = {}, today) => {
  const recs = Object.values(attempts)
  const totalAnswers = Object.values(days).reduce((s, d) => s + num(d.attempts), 0)
  const totalCorrect = Object.values(days).reduce((s, d) => s + num(d.correct), 0)
  return {
    solved: recs.filter(r => r.solvedAt).length,
    attempted: recs.length,
    totalAnswers,
    accuracy: totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : null,
    practiceSec: Object.values(days).reduce((s, d) => s + num(d.timeSec), 0),
    streak: currentStreak(days, today),
    longestStreak: longestStreak(days),
    activeDays: Object.keys(days).length
  }
}
