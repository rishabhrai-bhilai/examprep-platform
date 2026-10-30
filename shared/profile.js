// Date of birth helpers, shared by the server (validation) and the app (age display).
// A date of birth is stored as 'YYYY-MM-DD'; the age is always worked out from it,
// so it goes up by itself on the birthday.

export const MIN_AGE = 10
export const MAX_AGE = 100

const DOB_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const pad = (n) => String(n).padStart(2, '0')
const toKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
const todayParts = (today) => [today.getFullYear(), today.getMonth() + 1, today.getDate()]

// { year, month, day } for a real calendar date, else null (rejects 2023-02-30)
export function parseDob(value) {
  const m = typeof value === 'string' ? value.match(DOB_RE) : null
  if (!m) return null
  const [year, month, day] = m.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return { year, month, day }
}

// Whole years lived on `today` (local date), or null for an invalid date of birth
export function ageFromDob(value, today = new Date()) {
  const dob = parseDob(value)
  if (!dob) return null
  const [y, m, d] = todayParts(today)
  const hadBirthday = m > dob.month || (m === dob.month && d >= dob.day)
  return y - dob.year - (hadBirthday ? 0 : 1)
}

// Error message, or null when the date of birth is acceptable
export function dobProblem(value, today = new Date()) {
  if (!parseDob(value)) return 'Please enter a valid date of birth.'
  const age = ageFromDob(value, today)
  if (age < 0) return 'Date of birth cannot be in the future.'
  if (age < MIN_AGE || age > MAX_AGE) return `You must be between ${MIN_AGE} and ${MAX_AGE} years old.`
  return null
}

// min / max for <input type="date">
export function dobInputRange(today = new Date()) {
  const [y, m, d] = todayParts(today)
  return { min: toKey(y - MAX_AGE - 1, m, d), max: toKey(y - MIN_AGE, m, d) }
}
