import TOPIC_LIST from '../data/topics.json'

// [{ subject, topics: [name] }] in syllabus order (built by scripts/build-topics.mjs)
export const TOPICS = TOPIC_LIST

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
