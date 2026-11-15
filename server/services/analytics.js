// Peer comparison for the Analytics page, computed from everyone's real data:
//  - first attempts at fixed tests (mock tests, or full PYQ year papers), and
//  - practice records (every answered question, with the day it was answered).
//
// `space` is 'mock' (mock tests) or 'pyq' (PYQ year papers). Nothing here is
// estimated or invented: sections with too little data come back empty and the
// page says so.

const round1 = (n) => Math.round(n * 10) / 10
const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0)
const DAY_MS = 864e5

// "Riya Sharma" -> "Riya S.", initials "RS"; other students are never shown in full
const displayName = (name) => {
  const parts = String(name || 'Student').trim().split(/\s+/).filter(Boolean)
  const first = parts[0] || 'Student'
  const last = parts.length > 1 ? parts[parts.length - 1] : ''
  return {
    name: last ? `${first} ${last[0].toUpperCase()}.` : first,
    initials: ((first[0] || 'S') + (last[0] || '')).toUpperCase()
  }
}

const quantile = (sorted, q) => {
  if (!sorted.length) return 0
  const i = (sorted.length - 1) * q
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo)
}

// Per-student totals over their first attempts in this space, optionally only
// those submitted before `before` (used for last week's ranks)
function standings(attempts, before = Infinity) {
  const byUser = new Map()
  for (const a of attempts) {
    if ((a.submittedAt || 0) >= before) continue
    const u = byUser.get(a.userId) || { userId: a.userId, tests: 0, pctSum: 0, correct: 0, incorrect: 0, subjects: {} }
    u.tests++
    u.pctSum += pct(a.score, a.maxScore)
    u.correct += a.correct || 0
    u.incorrect += a.incorrect || 0
    for (const [name, s] of Object.entries(a.subjects || {})) {
      const t = u.subjects[name] || (u.subjects[name] = { score: 0, maxScore: 0 })
      t.score += s.score || 0
      t.maxScore += s.maxScore || 0
    }
    byUser.set(a.userId, u)
  }
  const list = [...byUser.values()].map(u => ({
    ...u,
    average: u.pctSum / u.tests,
    accuracy: pct(u.correct, u.correct + u.incorrect)
  }))
  list.sort((x, y) => y.average - x.average || y.tests - x.tests)
  list.forEach((u, i) => { u.rank = i > 0 && list[i - 1].average === u.average ? list[i - 1].rank : i + 1 })
  return list
}

const BUCKETS = [[0, 20], [20, 35], [35, 50], [50, 65], [65, 80], [80, 100.0001]]

// Monday of the week containing a 'YYYY-MM-DD' day (UTC arithmetic)
const weekStart = (dayKey) => {
  const [y, m, d] = dayKey.split('-').map(Number)
  const t = Date.UTC(y, m - 1, d)
  const dow = (new Date(t).getUTCDay() + 6) % 7
  return new Date(t - dow * DAY_MS).toISOString().slice(0, 10)
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const weekLabel = (key) => { const [, m, d] = key.split('-').map(Number); return `${MONTHS[m - 1]} ${d}` }

/**
 * @param {object} p
 * @param {string} p.userId       the student asking
 * @param {'mock'|'pyq'} p.space
 * @param {object[]} p.attempts   all first attempts in this space ({ userId, testId, submittedAt, score, maxScore, correct, incorrect, unanswered, subjects })
 * @param {Map<string, object>} p.users  userId -> user record (name, streak)
 * @param {object} p.practice     { [userId]: { attempts: { [qid]: { correct } }, days: { 'YYYY-MM-DD': { attempts } } } }
 * @param {Map<number, object>} p.questionsById  questions of this space (id -> question)
 * @param {(testId: string) => string} p.testTitle
 * @param {(mine: object, everyone: object[]) => object} p.compareAttempt
 * @param {string} p.today        'YYYY-MM-DD' in the student's time zone
 */
export function peerAnalytics({ userId, space, attempts, users, practice, questionsById, testTitle, compareAttempt, today, now = Date.now() }) {
  const current = standings(attempts)
  const lastWeek = standings(attempts, now - 7 * DAY_MS)
  const lastRank = new Map(lastWeek.map(u => [u.userId, u.rank]))
  const me = current.find(u => u.userId === userId) || null

  const row = (u) => {
    const user = users.get(u.userId) || {}
    const { name, initials } = displayName(user.name)
    const before = lastRank.get(u.userId)
    return {
      rank: u.rank,
      name: u.userId === userId ? 'You' : name,
      initials,
      score: round1(u.average),
      accuracy: round1(u.accuracy),
      tests: u.tests,
      streak: user.streak || 0,
      change: before ? Math.abs(before - u.rank) : null,
      up: before ? before >= u.rank : true,
      isNew: !before,
      isUser: u.userId === userId
    }
  }

  // --- Leaderboard ---
  let leaderboard = null
  if (current.length) {
    const myIndex = me ? current.indexOf(me) : -1
    const around = myIndex >= 0 ? current.slice(Math.max(0, myIndex - 4), myIndex + 5) : []
    leaderboard = {
      totalLearners: current.length,
      userRank: me?.rank || null,
      behindPrev: myIndex > 0 ? round1(current[myIndex - 1].average - me.average) : null,
      prevRank: myIndex > 0 ? current[myIndex - 1].rank : null,
      aheadNext: myIndex >= 0 && myIndex < current.length - 1 ? round1(me.average - current[myIndex + 1].average) : null,
      nextRank: myIndex >= 0 && myIndex < current.length - 1 ? current[myIndex + 1].rank : null,
      top10: current.slice(0, 10).map(row),
      aroundYou: around.map(row),
      user: me ? row(me) : null
    }
  }

  // --- Cohort standing and score spread (average % per student) ---
  let cohort = null
  let bellCurveBuckets = []
  if (current.length) {
    const scores = current.map(u => u.average).sort((a, b) => a - b)
    const n = scores.length
    let percentile = null
    if (me) {
      const lower = scores.filter(s => s < me.average).length
      const tied = scores.filter(s => s === me.average).length - 1
      percentile = n > 1 ? round1(((lower + tied / 2) / (n - 1)) * 100) : 100
    }
    cohort = {
      totalParticipants: n,
      userRank: me?.rank || null,
      percentile,
      userScore: me ? round1(me.average) : null,
      cohortAverage: round1(scores.reduce((a, b) => a + b, 0) / n),
      cohortMedian: round1(quantile(scores, 0.5)),
      top10PercentScore: round1(quantile(scores, 0.9)),
      topperScore: round1(scores[n - 1])
    }
    bellCurveBuckets = BUCKETS.map(([from, to], i) => {
      const count = scores.filter(s => s >= from && s < to).length
      return {
        range: i === 0 ? `0 - ${to}` : `${from + 1} - ${Math.min(100, Math.round(to))}`,
        count,
        percentage: round1(pct(count, n)),
        hasUser: me ? me.average >= from && me.average < to : false
      }
    })
  }

  // --- Subjects: you vs everyone vs the top 10% of students ---
  let subjectBenchmark = []
  if (me) {
    const top = current.slice(0, Math.max(1, Math.ceil(current.length * 0.1)))
    const avgPct = (group, name) => {
      const vals = group.map(u => u.subjects[name]).filter(s => s && s.maxScore > 0).map(s => pct(s.score, s.maxScore))
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    }
    subjectBenchmark = Object.entries(me.subjects)
      .filter(([, s]) => s.maxScore > 0)
      .map(([name, s]) => {
        const userScore = Math.max(0, Math.round(pct(s.score, s.maxScore)))
        const cohortAvg = Math.max(0, Math.round(avgPct(current, name) ?? 0))
        const topperAvg = Math.max(0, Math.round(avgPct(top, name) ?? 0))
        const diff = userScore - cohortAvg
        return { name, userScore, cohortAvg, topperAvg, gap: diff === 0 ? 'Level with average' : `${diff > 0 ? '+' : ''}${diff}% vs avg`, above: diff >= 0 }
      })
      .sort((a, b) => b.userScore - a.userScore)
  }

  // --- Each of your tests, with your rank among everyone who took it ---
  const testStanding = attempts
    .filter(a => a.userId === userId)
    .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0))
    .slice(0, 6)
    .map(a => {
      const c = compareAttempt(a, attempts.filter(x => x.testId === a.testId))
      return { testId: a.testId, title: testTitle(a.testId), score: a.score, maxScore: a.maxScore, rank: c.rank, participants: c.participants, percentile: c.percentile }
    })

  // --- Weekly effort: questions answered per week (last 8 weeks) ---
  const thisWeek = weekStart(today)
  const weeks = Array.from({ length: 8 }, (_, i) => new Date(Date.parse(thisWeek) - (7 - i) * 7 * DAY_MS).toISOString().slice(0, 10))
  const weekly = new Map(weeks.map(w => [w, new Map()]))
  for (const [uid, rec] of Object.entries(practice || {})) {
    for (const [day, v] of Object.entries(rec?.days || {})) {
      const w = weekly.get(weekStart(day))
      if (w && v?.attempts > 0) w.set(uid, (w.get(uid) || 0) + v.attempts)
    }
  }
  const weeklyEffort = weeks.map(w => {
    const counts = [...weekly.get(w).values()].sort((a, b) => a - b)
    return {
      week: weekLabel(w),
      you: weekly.get(w).get(userId) || 0,
      median: Math.round(quantile(counts, 0.5)),
      top10: Math.round(quantile(counts, 0.9)),
      activeLearners: counts.length
    }
  })

  // --- Questions most students got right that you missed, and the reverse ---
  const MIN_ATTEMPTERS = 5
  const crowd = new Map()
  for (const rec of Object.values(practice || {})) {
    for (const [qid, a] of Object.entries(rec?.attempts || {})) {
      if (!questionsById.has(Number(qid))) continue
      const c = crowd.get(qid) || { n: 0, right: 0 }
      c.n++
      if (a.correct) c.right++
      crowd.set(qid, c)
    }
  }
  const mine = practice?.[userId]?.attempts || {}
  const item = (qid, c, a) => {
    const q = questionsById.get(Number(qid))
    const marks = Number(q.marks) || 1
    const paper = q.year ? `GATE ${q.year}${q.set ? ` ${typeof q.set === 'string' ? q.set : `Set ${q.set}`}` : ''} · Q${q.questionNumber || '?'}` : `Mock question · ${q.code || q.id}`
    return {
      id: String(qid),
      code: q.code || null,
      paper,
      subject: q.subject,
      topic: q.topic || '',
      crowdPct: Math.round(pct(c.right, c.n)),
      attempters: c.n,
      userStatus: a.correct ? 'Solved' : 'Missed',
      marks: `${marks} Mark${marks > 1 ? 's' : ''} ${q.type || 'MCQ'}`
    }
  }
  const scored = Object.entries(mine)
    .map(([qid, a]) => ({ qid, a, c: crowd.get(qid) }))
    .filter(x => x.c && x.c.n >= MIN_ATTEMPTERS)
  const crowdQuestions = {
    easyMissed: scored.filter(x => !x.a.correct && pct(x.c.right, x.c.n) >= 60)
      .sort((x, y) => y.c.right / y.c.n - x.c.right / x.c.n).slice(0, 5).map(x => item(x.qid, x.c, x.a)),
    beatCrowd: scored.filter(x => x.a.correct && pct(x.c.right, x.c.n) <= 40)
      .sort((x, y) => x.c.right / x.c.n - y.c.right / y.c.n).slice(0, 5).map(x => item(x.qid, x.c, x.a)),
    minAttempters: MIN_ATTEMPTERS
  }

  return { space, cohort, leaderboard, bellCurveBuckets, subjectBenchmark, testStanding, weeklyEffort, crowdQuestions }
}
