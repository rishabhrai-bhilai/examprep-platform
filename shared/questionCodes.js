// Readable question codes: SS-EE-PPP-SB-MT-NNN, e.g. 01-CS-261-OS-2N-047
//
//   SS   source        01 official GATE paper, 02 other exam, 03 AI-generated (not reviewed),
//                      04 ExamPrep original (written and independently verified)
//   EE   exam/paper    CS, IT, DA; for other exams IS (ISRO), NI (NIELIT), UN (UGC NET)
//   PPP  which paper   past papers: 2-digit year + set (261 = 2026 Set 1; 0 when the
//                      year had one paper, 120 = 2012); originals/AI: batch (M01, A01)
//   SB   subject       see SUBJECT_CODES
//   MT   marks + type  1M = 1-mark MCQ, 2S = 2-mark MSQ, 2N = 2-mark NAT
//   NNN  serial        past papers: question number in the paper; others: number in the batch
//
// SS-EE-PPP-NNN alone is unique; subject and marks/type are there to read at a
// glance. Difficulty and topic are left out on purpose: they get re-rated, and a
// code never changes once given. The numeric `id` stays the key that bookmarks,
// notes, attempts and discussions use; `code` is how people refer to a question.
// Codes are written by scripts/assign-question-codes.mjs.

export const SOURCES = {
  '01': 'Official GATE paper',
  '02': 'Other exam',
  '03': 'AI-generated',
  '04': 'ExamPrep original'
}

export const EXAMS = { CS: 'GATE CS', IT: 'GATE IT', DA: 'GATE DA', IS: 'ISRO', NI: 'NIELIT', UN: 'UGC NET' }

export const SUBJECT_CODES = {
  'General Aptitude': 'GA',
  'Engineering Mathematics': 'EM',
  'Discrete Mathematics': 'DM',
  'Digital Logic': 'DL',
  'Computer Organization & Architecture': 'CO',
  'Programming & Data Structures': 'PD',
  Algorithms: 'AL',
  'Theory of Computation': 'TC',
  'Compiler Design': 'CD',
  'Operating Systems': 'OS',
  Databases: 'DB',
  'Computer Networks': 'CN',
  'Software Engineering & Web Technologies': 'SE'
}
const SUBJECT_BY_CODE = Object.fromEntries(Object.entries(SUBJECT_CODES).map(([name, code]) => [code, name]))

const TYPE_CODES = { MCQ: 'M', MSQ: 'S', NAT: 'N' }
const TYPE_BY_CODE = { M: 'MCQ', S: 'MSQ', N: 'NAT' }

const pad = (n, width) => String(n).padStart(width, '0')

// paper: '261' style for past papers, or a batch like 'M01'
export function buildQuestionCode({ source, exam = 'CS', paper, subject, marks, type, serial }) {
  const sb = SUBJECT_CODES[subject]
  const tc = TYPE_CODES[type]
  if (!SOURCES[source] || !EXAMS[exam] || !/^[0-9A-Z]{3}$/.test(paper) || !sb || ![1, 2].includes(marks) || !tc || !(serial > 0 && serial < 1000)) {
    throw new Error(`Cannot build a question code from ${JSON.stringify({ source, exam, paper, subject, marks, type, serial })}`)
  }
  return `${source}-${exam}-${paper}-${sb}-${marks}${tc}-${pad(serial, 3)}`
}

// Past-paper part: 2-digit year + set digit (0 when that year had a single paper)
export const pastPaperPart = (year, set, setsThatYear) =>
  `${pad(Number(year) % 100, 2)}${setsThatYear > 1 ? Number(set) : 0}`

const CODE_RE = /^(\d{2})-([A-Z]{2})-([0-9A-Z]{3})-([A-Z]{2})-([12])([MSN])-(\d{3})$/

// Decoded properties, or null for anything that isn't a code
export function parseQuestionCode(code) {
  const m = String(code || '').trim().toUpperCase().match(CODE_RE)
  if (!m) return null
  const [, source, exam, paper, sb, marks, tc, serial] = m
  const pastPaper = /^\d{3}$/.test(paper)
  return {
    source, sourceName: SOURCES[source] || 'Unknown source',
    exam, examName: EXAMS[exam] || exam,
    paper,
    year: pastPaper ? 2000 + Number(paper.slice(0, 2)) : null,
    set: pastPaper && paper[2] !== '0' ? Number(paper[2]) : null,
    batch: pastPaper ? null : paper,
    subject: SUBJECT_BY_CODE[sb] || sb,
    marks: Number(marks),
    type: TYPE_BY_CODE[tc],
    serial: Number(serial)
  }
}

// "GATE CS 2026 Set 1 · Operating Systems · 2-mark NAT · Q47"
export function describeQuestionCode(code) {
  const p = parseQuestionCode(code)
  if (!p) return ''
  const where = p.year
    ? `${p.examName} ${p.year}${p.set ? ` Set ${p.set}` : ''}`
    : `${p.sourceName} · batch ${p.batch}`
  return `${where} · ${p.subject} · ${p.marks}-mark ${p.type} · ${p.year ? 'Q' : '#'}${p.serial}`
}

// Letters and digits only, so "01cs261os2n047" or "01-CS-261-OS-2N-047" both match
const squash = (s) => String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, '')

// Does what someone typed refer to this question? Accepts the numeric id, the full
// code, or the unique part of the code without subject and marks/type (01-CS-261-047)
export function matchesQuestionRef(q, input) {
  const raw = String(input || '').trim().replace(/^#/, '')
  if (!raw || !q) return false
  if (String(q.id) === raw) return true
  if (!q.code) return false
  const typed = squash(raw)
  if (typed === squash(q.code)) return true
  const p = q.code.split('-')
  return typed === squash(`${p[0]}${p[1]}${p[2]}${p[5]}`)
}

export const findQuestionByRef = (list, input) => (list || []).find(q => matchesQuestionRef(q, input)) || null
