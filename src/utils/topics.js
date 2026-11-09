import CHAPTER_LIST from '../data/topics.json'
import GO_TOPIC_LIST from '../data/goTopics.json'
import { currentTopicScheme } from '../store/useTopicScheme'

// Two ways to group questions, chosen by the user (see store/useTopicScheme):
//   'chapters'  the book's chapters, in book order (src/data/topics.json, built by
//               scripts/tag-chapters.mjs, which also writes each question's `tags`)
//   'topics'    the classic GATE Overflow topics (src/data/goTopics.json), kept on
//               each question as `topicTags`
// Every helper takes the scheme as an optional last argument and otherwise uses
// the user's current choice.

// [{ subject, topics: [name] }] for a scheme
export const topicList = (scheme = currentTopicScheme()) => (scheme === 'topics' ? GO_TOPIC_LIST : CHAPTER_LIST)

// The book's chapter list (kept for code that always wants chapters)
export const TOPICS = CHAPTER_LIST

// The finer topic names inside a set of questions ("Cache Memory", "TCP"), so
// searching a chapter list by a familiar topic still finds its chapter
export const subtopicText = (questions) => Array.from(new Set(
  questions.flatMap(q => [q.topic, ...(q.topicTags || []).map(t => t.topic)]).filter(Boolean)
)).join(' ').toLowerCase()

// A question's topic tags: [{ subject, topic }]. A question can sit under
// several topics, possibly in other subjects. Falls back to the single `topic`
// field for questions without tags (e.g. original mock questions).
export const getTags = (q, scheme = currentTopicScheme()) => {
  const list = scheme === 'topics' ? (q?.topicTags?.length ? q.topicTags : q?.tags) : q?.tags
  if (Array.isArray(list) && list.length > 0) return list
  return q?.topic ? [{ subject: q.subject, topic: q.topic }] : []
}

export const hasTag = (q, subject, topic, scheme) =>
  getTags(q, scheme).some(t => t.subject === subject && t.topic === topic)

export const hasTopicName = (q, topic, scheme) => getTags(q, scheme).some(t => t.topic === topic)

// Topic names are only unique within a subject ("Hashing" is in two), so
// selections that hold plain strings use this key
export const topicKey = (subject, topic) => `${subject}::${topic}`

// { subject: { topic: questionCount } } covering every listed topic, so topics
// with no questions yet show up with 0. Tags outside the list are kept too.
export const buildTopicsMap = (questions, scheme = currentTopicScheme()) => {
  const map = {}
  topicList(scheme).forEach(({ subject, topics }) => {
    map[subject] = {}
    topics.forEach(t => { map[subject][t] = 0 })
  })
  questions.forEach(q => {
    getTags(q, scheme).forEach(({ subject, topic }) => {
      if (!map[subject]) map[subject] = {}
      map[subject][topic] = (map[subject][topic] || 0) + 1
    })
  })
  return map
}
