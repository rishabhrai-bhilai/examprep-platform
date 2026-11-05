// Tags every past-paper question with the book chapters it belongs to, so the
// topic-wise practice and topic-wise mock pages follow the book's index.
//
// A question's fine-grained GATE Overflow tags are kept in `topicTags`; its
// `tags` become [{ subject, topic: <chapter name> }] using the topic lists in
// shared/syllabusChapters.js (a "Subject: Topic" entry pulls a tag from another
// subject into that chapter, e.g. Algorithms hashing into PDS > Hashing).
// Tags the book doesn't cover (Software Engineering & Web Technologies, from
// older papers) stay as they are. Also rewrites src/data/topics.json.
//
// Safe to rerun: it always starts from `topicTags`.
//   node scripts/tag-chapters.mjs
import fs from 'fs'
import { SYLLABUS_CHAPTERS } from '../shared/syllabusChapters.js'
import { SUBJECTS } from '../src/utils/subjects.js'

const QUESTIONS = 'src/data/questions.json'
const TOPICS = 'src/data/topics.json'

// "subject::topic" -> chapters [{ subject, topic: chapter }]
const chaptersFor = new Map()
for (const [subject, chapters] of Object.entries(SYLLABUS_CHAPTERS)) {
  for (const ch of chapters) {
    for (const spec of ch.topics) {
      const m = spec.match(/^(.+?): (.+)$/)
      const key = m ? `${m[1]}::${m[2]}` : `${subject}::${spec}`
      chaptersFor.set(key, [...(chaptersFor.get(key) || []), { subject, topic: ch.name }])
    }
  }
}

const raw = fs.readFileSync(QUESTIONS, 'utf8')
const eol = raw.includes('\r\n') ? '\r\n' : '\n'
const questions = JSON.parse(raw)

const kept = {} // uncovered tags that stay, by subject
let unchanged = 0
for (const q of questions) {
  if (!q.topicTags) q.topicTags = q.tags || (q.topic ? [{ subject: q.subject, topic: q.topic }] : [])
  const next = []
  const add = (t) => { if (!next.some(x => x.subject === t.subject && x.topic === t.topic)) next.push(t) }
  for (const t of q.topicTags) {
    const chs = chaptersFor.get(`${t.subject}::${t.topic}`)
    if (chs) chs.forEach(add)
    else { add(t); (kept[t.subject] = kept[t.subject] || new Set()).add(t.topic) }
  }
  if (JSON.stringify(next) === JSON.stringify(q.tags)) unchanged++
  q.tags = next
}

fs.writeFileSync(QUESTIONS, JSON.stringify(questions, null, 2).split('\n').join(eol) + eol)

// Topic list: the book's chapters in book order, plus any uncovered topics
const list = SUBJECTS.map(subject => ({
  subject,
  topics: [
    ...(SYLLABUS_CHAPTERS[subject] || []).map(c => c.name),
    ...[...(kept[subject] || [])].sort()
  ]
})).filter(s => s.topics.length > 0)
fs.writeFileSync(TOPICS, JSON.stringify(list, null, 2) + '\n')

const counts = {}
questions.forEach(q => q.tags.forEach(t => { const k = `${t.subject} > ${t.topic}`; counts[k] = (counts[k] || 0) + 1 }))
for (const s of list) console.log(`${s.subject}: ${s.topics.map(t => `${t} ${counts[`${s.subject} > ${t}`] || 0}`).join(' | ')}`)
console.log(`${questions.length} questions retagged (${unchanged} unchanged); ${list.reduce((n, s) => n + s.topics.length, 0)} topics listed`)
for (const [s, t] of Object.entries(kept)) console.log(`kept as-is (not in the book): ${s}: ${[...t].join(', ')}`)
