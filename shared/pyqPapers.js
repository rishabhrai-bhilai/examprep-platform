// Year-wise PYQ papers as tests the server can score and compare. Only full year
// papers get a global comparison: subject, topic, random and custom papers differ
// from student to student, so comparing them would mean nothing.

// "Set 2", 2 or missing (one-set years) -> 2 / 1
export const parseSet = (s) => {
  if (typeof s === 'string') {
    const m = s.match(/\d+/)
    return m ? parseInt(m[0], 10) : 1
  }
  return Number(s) || 1
}

// pyq-2025-s1 for one set, pyq-2007 for a whole year
export const pyqPaperId = (year, set = null) => (set === null || set === undefined ? `pyq-${year}` : `pyq-${year}-s${parseSet(set)}`)

const PAPER_RE = /^pyq-(\d{4})(?:-s(\d+))?$/

export const isPyqPaperId = (id) => PAPER_RE.test(String(id))

// The paper's questions, the same selection the PYQ mock page makes
export const pyqPaperQuestions = (questions, id) => {
  const m = String(id).match(PAPER_RE)
  if (!m) return []
  const [, year, set] = m
  return questions.filter(q => String(q.year) === year && (set === undefined || parseSet(q.set) === Number(set)))
}

// PYQ tests allow 1.5 minutes per question
export const pyqPaperMinutes = (questionCount) => Math.round(questionCount * 1.5)

export const pyqPaperTitle = (id) => {
  const m = String(id).match(PAPER_RE)
  if (!m) return id
  return m[2] ? `GATE ${m[1]} Set ${m[2]}` : `GATE ${m[1]}`
}
