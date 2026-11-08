// Gives every question its readable code (see shared/questionCodes.js), stored as
// `code` right after `id`. Rerun after adding questions; existing codes never change
// unless the facts they're made from (paper, number, subject, marks, type) do.
//   node scripts/assign-question-codes.mjs
import fs from 'fs'
import { buildQuestionCode, pastPaperPart } from '../shared/questionCodes.js'

// Original questions, in the batches they were written in
const ORIGINAL_BATCHES = [
  { paper: 'M01', from: 9000001, to: 9000285 }, // full-length and first sectional mocks
  { paper: 'M02', from: 9000286, to: 9000999 } // chapter-based sectionals
]

const read = (file) => {
  const raw = fs.readFileSync(file, 'utf8')
  return { list: JSON.parse(raw), eol: raw.includes('\r\n') ? '\r\n' : '\n' }
}
const write = (file, list, eol) => fs.writeFileSync(file, JSON.stringify(list, null, 2).split('\n').join(eol) + eol)
const withCode = (q, code) => { const { id, code: _old, ...rest } = q; return { id, code, ...rest } }

// Past papers
const pyq = read('src/data/questions.json')
const setsByYear = {}
pyq.list.forEach(q => { (setsByYear[q.year] = setsByYear[q.year] || new Set()).add(Number(q.set) || 1) })
const pyqOut = pyq.list.map(q => withCode(q, buildQuestionCode({
  source: '01',
  exam: 'CS',
  paper: pastPaperPart(q.year, q.set || 1, setsByYear[q.year].size),
  subject: q.subject,
  marks: q.marks,
  type: q.type,
  serial: q.questionNumber
})))
write('src/data/questions.json', pyqOut, pyq.eol)

// Originals
const orig = read('shared/originalQuestions.json')
const origOut = orig.list.map(q => {
  const batch = ORIGINAL_BATCHES.find(b => q.id >= b.from && q.id <= b.to)
  if (!batch) throw new Error(`Original question ${q.id} is outside every batch; add a batch above`)
  return withCode(q, buildQuestionCode({ source: '04', exam: 'CS', paper: batch.paper, subject: q.subject, marks: q.marks, type: q.type, serial: q.id - batch.from + 1 }))
})
write('shared/originalQuestions.json', origOut, orig.eol)

// Every code (and its unique part) must be unique across both banks
const all = [...pyqOut, ...origOut]
const codes = new Set(all.map(q => q.code))
const cores = new Set(all.map(q => { const p = q.code.split('-'); return `${p[0]}-${p[1]}-${p[2]}-${p[5]}` }))
if (codes.size !== all.length || cores.size !== all.length) throw new Error('Duplicate question codes')
console.log(`${pyqOut.length} past-paper and ${origOut.length} original questions coded; e.g. ${pyqOut[0].code}, ${origOut[0].code}, ${origOut.at(-1).code}`)
