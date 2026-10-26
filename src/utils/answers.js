// Answer checking for official GATE keys.
//
// A question carries:
//   answer              MCQ: option index, MSQ: sorted index array, NAT: key string
//   answerAlternatives  other accepted answers in the same shape (official keys
//                       sometimes accept "A or C", or "A, C, D or C, D")
//   marksToAll          true when the official key awards marks to everyone
// NAT key strings are a value ("21"), a range ("0.021 to 0.024"), or several of
// those joined by "OR" ("2 to 2 OR 4 to 4").

const sameSet = (a, b) =>
  Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(v => b.includes(v))

const acceptedAnswers = (q) =>
  [q?.answer, ...(Array.isArray(q?.answerAlternatives) ? q.answerAlternatives : [])]
    .filter(a => a !== null && a !== undefined)

export const isNATCorrect = (userAns, key) => {
  if (userAns === undefined || userAns === null || String(userAns).trim() === '') return false
  const value = parseFloat(userAns)
  if (Number.isNaN(value)) return false
  return String(key).split(/\s+OR\s+/i).some(part => {
    const [lo, hi = lo] = part.split(/\s+to\s+/i).map(parseFloat)
    if (Number.isNaN(lo) || Number.isNaN(hi)) return false
    const eps = 1e-9
    return value >= Math.min(lo, hi) - eps && value <= Math.max(lo, hi) + eps
  })
}

// Is option `idx` one the key accepts (for highlighting MCQ options)?
export const isAcceptedOption = (q, idx) =>
  acceptedAnswers(q).some(a => (Array.isArray(a) ? a.includes(idx) : a === idx))

// Is the user's response correct? MCQ: index, MSQ: index array, NAT: string
export const isAnswerCorrect = (q, userAns) => {
  if (userAns === undefined || userAns === null || userAns === '') return false
  if (q?.marksToAll) return true
  if (q?.type === 'NAT') return acceptedAnswers(q).some(k => isNATCorrect(userAns, k))
  if (q?.type === 'MSQ') return acceptedAnswers(q).some(k => sameSet(userAns, k))
  return acceptedAnswers(q).some(k => k === userAns)
}

// Human-readable correct answer, e.g. "Option B: 42", "A, C", "Value: 0.5 to 0.6"
export const formatAnswer = (q) => {
  if (q?.marksToAll) return 'Marks to all (official key)'
  const letter = i => String.fromCharCode(65 + i)
  const one = (a) => {
    if (q?.type === 'NAT') return `Value: ${a}`
    if (Array.isArray(a)) return a.map(letter).join(', ')
    return `Option ${letter(a)}: ${q.options?.[a] ?? ''}`
  }
  const all = acceptedAnswers(q)
  return all.length ? all.map(one).join(' or ') : 'Not available'
}
