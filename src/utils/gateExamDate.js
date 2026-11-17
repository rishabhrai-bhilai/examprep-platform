// One place for the GATE exam date, so the dashboard and profile agree.
// Known dates go in KNOWN; other years fall back to the first Saturday of February.
const KNOWN = {
  2027: new Date(2027, 1, 14) // 14 Feb 2027. Update when the official schedule is announced.
}

// The next exam: this year's if February hasn't passed, otherwise next year's
export const defaultGateYear = (now = new Date()) => (now.getMonth() > 1 ? now.getFullYear() + 1 : now.getFullYear())

export const gateExamDate = (year) => {
  const yr = Number(year)
  if (KNOWN[yr]) return new Date(KNOWN[yr])
  const febFirst = new Date(yr, 1, 1)
  return new Date(yr, 1, 1 + ((6 - febFirst.getDay() + 7) % 7))
}

// { year, date, daysRemaining } for a target year (or the next exam if none is set)
export const gateCountdown = (targetYear, now = new Date()) => {
  const year = Number(targetYear) || defaultGateYear(now)
  const date = gateExamDate(year)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return { year, date, daysRemaining: Math.ceil((date - today) / 864e5) }
}
