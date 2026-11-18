// A rough GATE score from marks, using GATE's own formula:
//   score = 350 + 650 × (M − Mq) / (Mt − Mq)
// M is marks out of 100, Mq the qualifying marks and Mt the marks of the top
// 0.1% of candidates. Typical recent CSE values are used, so treat it as a guide.
const QUALIFYING = 27 // general-category qualifying marks, recent CSE papers
const TOP = 80 // approx. mean of the top 0.1%

// Only a full paper (out of 100) maps onto GATE marks; a short mock doesn't
export const estimateGateScore = (score, maxScore) => {
  if (!maxScore || maxScore < 100) return { value: '—', note: 'Shown for full 100-mark papers only' }
  const marks = (score / maxScore) * 100
  if (marks < QUALIFYING) return { value: '—', note: `Below the usual qualifying mark (about ${QUALIFYING}/100)` }
  const value = Math.min(1000, Math.round(350 + (650 * (marks - QUALIFYING)) / (TOP - QUALIFYING)))
  return { value, note: `From ${Number(marks.toFixed(2))}/100 using GATE's formula; a rough guide` }
}

// 1 -> "1st", 22 -> "22nd", 46.2 -> "46.2nd" is wrong, so decimals get "th" only for whole numbers
export const ordinal = (n) => {
  const num = Number(n)
  if (!Number.isFinite(num)) return String(n)
  const shown = Number(num.toFixed(1))
  if (!Number.isInteger(shown)) return `${shown}`
  const mod100 = shown % 100
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[shown % 10] || 'th')
  return `${shown}${suffix}`
}
