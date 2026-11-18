// Helpers shared by the timed test pages.

// A question's answer type. Questions without options are numerical (NAT).
export const answerType = (q) => q?.type || (Array.isArray(q?.options) && q.options.length ? 'MCQ' : 'NAT')

// True when a response has actually been given (0 is a valid option index)
export const hasAnswer = (a) => a !== undefined && a !== null && a !== '' && !(Array.isArray(a) && a.length === 0)

// Answered questions split by kind, from the real questions and responses
export const skillBreakdown = (questions, answers, isCorrect) => {
  const groups = [
    { type: 'Conceptual (1-mark MCQ/MSQ)', label: 'Recall of facts and formulas.', color: 'bg-emerald-500', test: q => answerType(q) !== 'NAT' && Number(q.marks) !== 2 },
    { type: 'Numerical (NAT)', label: 'Calculation accuracy, with no options to guess from.', color: 'bg-indigo-500', test: q => answerType(q) === 'NAT' },
    { type: 'Application (2-mark MCQ/MSQ)', label: 'Longer derivations and multi-step reasoning.', color: 'bg-amber-500', test: q => answerType(q) !== 'NAT' && Number(q.marks) === 2 }
  ]
  return groups.map(g => {
    const answered = (questions || []).filter(q => g.test(q) && hasAnswer(answers?.[q.id]))
    return { ...g, total: answered.length, correct: answered.filter(q => isCorrect(q, answers[q.id])).length }
  })
}
