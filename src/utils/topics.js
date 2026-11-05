import TOPIC_LIST from '../data/topics.json'

// [{ subject, topics: [name] }]: each subject's book chapters in book order
// (built by scripts/tag-chapters.mjs, which also tags questions with them)
export const TOPICS = TOPIC_LIST

// The finer topic names inside a set of questions ("Cache Memory", "TCP"), so
// searching a chapter list by a familiar topic still finds its chapter
export const subtopicText = (questions) => Array.from(new Set(
  questions.flatMap(q => [q.topic, ...(q.topicTags || []).map(t => t.topic)]).filter(Boolean)
)).join(' ').toLowerCase()

// A question's topic tags: [{ subject, topic }]. A question can sit under
// several topics, possibly in other subjects. Falls back to the old single
// `topic` field for questions that haven't been tagged yet.
export const getTags = (q) => {
  if (Array.isArray(q?.tags) && q.tags.length > 0) return q.tags
  return q?.topic ? [{ subject: q.subject, topic: q.topic }] : []
}

export const hasTag = (q, subject, topic) =>
  getTags(q).some(t => t.subject === subject && t.topic === topic)

export const hasTopicName = (q, topic) => getTags(q).some(t => t.topic === topic)

// Topic names are only unique within a subject ("Hashing" is in two), so
// selections that hold plain strings use this key
export const topicKey = (subject, topic) => `${subject}::${topic}`

// { subject: { topic: questionCount } } covering every listed topic, so topics
// with no questions yet show up with 0. Tags outside the list are kept too.
export const buildTopicsMap = (questions) => {
  const map = {}
  TOPICS.forEach(({ subject, topics }) => {
    map[subject] = {}
    topics.forEach(t => { map[subject][t] = 0 })
  })
  questions.forEach(q => {
    getTags(q).forEach(({ subject, topic }) => {
      if (!map[subject]) map[subject] = {}
      map[subject][topic] = (map[subject][topic] || 0) + 1
    })
  })
  return map
}
