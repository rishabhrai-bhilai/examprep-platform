// The syllabus a coaching centre tracks: GATE CS subjects and their chapters
// (the same chapters as the sectional mocks, shared/syllabusChapters.js).
// Questions carry fine topics ("TCP", "Cache Memory"); chapterOf() maps them
// to the chapter that covers them.
import { SYLLABUS_CHAPTERS } from '../../shared/syllabusChapters.js'

export const SUBJECTS = Object.keys(SYLLABUS_CHAPTERS)

export const SYLLABUS = SUBJECTS.map(subject => ({
  subject,
  chapters: SYLLABUS_CHAPTERS[subject].map(c => c.name)
}))

export const CHAPTER_COUNT = SYLLABUS.reduce((n, s) => n + s.chapters.length, 0)

// "Subject|Chapter": the key used for chapter-level records
export const chapterKey = (subject, chapter) => `${subject}|${chapter}`

const lookup = new Map()
SUBJECTS.forEach(subject => SYLLABUS_CHAPTERS[subject].forEach(ch => ch.topics.forEach(t => {
  const [s, topic] = t.includes(': ') ? t.split(': ') : [subject, t]
  const key = `${s}|${topic}`
  if (!lookup.has(key)) lookup.set(key, { subject, chapter: ch.name })
})))

// { subject, chapter } for a question; chapter "Other" when no chapter covers it
export function chapterOf(q) {
  if (!q) return { subject: 'General Aptitude', chapter: 'Other' }
  if (q.chapter && SYLLABUS_CHAPTERS[q.subject]?.some(c => c.name === q.chapter)) return { subject: q.subject, chapter: q.chapter }
  const tags = [{ subject: q.subject, topic: q.topic }, ...(q.tags || [])]
  for (const t of tags) {
    const hit = lookup.get(`${t.subject}|${t.topic}`)
    if (hit && hit.subject === q.subject) return hit
  }
  for (const t of tags) {
    const hit = lookup.get(`${t.subject}|${t.topic}`)
    if (hit) return hit
  }
  // A chapter named like the topic itself ("Graph Theory")
  const named = SYLLABUS_CHAPTERS[q.subject]?.find(c => c.name === q.topic)
  return { subject: q.subject || 'General Aptitude', chapter: named ? named.name : 'Other' }
}
