// Discussion posts: { [questionId]: Post[] }, where a Post is
// { id, author, authorId, avatar, content, timestamp, parentId?, replyToAuthor?,
//   voters: { [userId]: 'up' | 'down' }, replies: Post[] }
// Authors always come from the signed-in user, never from the request body, and
// only the author (or an admin) can delete a post.

export const MAX_POST_LENGTH = 5000
const POST_ID_RE = /^(sol|rep)-[a-z0-9-]{6,60}$/

const walk = (list, fn, parent = null) => {
  for (const post of list || []) {
    if (fn(post, parent)) return true
    if (walk(post.replies, fn, post)) return true
  }
  return false
}

export const findPost = (list, postId) => {
  let found = null
  walk(list, post => {
    if (String(post.id) === String(postId)) {
      found = post
      return true
    }
    return false
  })
  return found
}

// Upvote / downvote counts instead of who voted
const toPublic = (post) => {
  const { voters, ...rest } = post
  const votes = Object.values(voters || {})
  return {
    ...rest,
    upvotes: votes.filter(v => v === 'up').length,
    downvotes: votes.filter(v => v === 'down').length,
    replies: (post.replies || []).map(toPublic)
  }
}

export const publicDiscussions = (all) => {
  const out = {}
  Object.entries(all || {}).forEach(([qid, list]) => {
    if (Array.isArray(list) && list.length) out[qid] = list.map(toPublic)
  })
  return out
}

export const publicPost = toPublic

// Returns { post } or { error, status }
export const addPost = (all, questionId, user, body) => {
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  if (!content) return { error: 'Please write something first.', status: 400 }
  if (content.length > MAX_POST_LENGTH) return { error: `Please keep it under ${MAX_POST_LENGTH} characters.`, status: 400 }

  const list = all[questionId] || (all[questionId] = [])
  const parentId = body?.parentId !== undefined && body?.parentId !== null ? String(body.parentId) : null
  const parent = parentId ? findPost(list, parentId) : null
  if (parentId && !parent) return { error: 'The comment you are replying to no longer exists.', status: 404 }

  // The client picks the id so it can show the post straight away; it only has
  // to look like one of ours and not be taken
  let id = typeof body?.id === 'string' && POST_ID_RE.test(body.id) ? body.id : null
  if (id && findPost(list, id)) return { error: 'Duplicate post.', status: 409 }
  if (!id) id = `${parent ? 'rep' : 'sol'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const post = {
    id,
    author: user.name || 'Aspirant',
    authorId: user.id,
    avatar: user.avatar || null,
    content,
    timestamp: Date.now(),
    voters: {},
    replies: []
  }
  if (parent) {
    post.parentId = String(parent.id)
    const replyTo = typeof body?.replyToAuthor === 'string' ? body.replyToAuthor.trim().slice(0, 60) : ''
    if (replyTo) post.replyToAuthor = replyTo
    parent.replies = [...(parent.replies || []), post]
  } else {
    list.push(post)
  }
  return { post }
}

// Removes the post and its replies. Returns { ok } or { error, status }
export const deletePost = (all, questionId, postId, user, isAdmin) => {
  const list = all[questionId]
  const post = list && findPost(list, postId)
  if (!post) return { error: 'Comment not found.', status: 404 }
  if (post.authorId !== user.id && !isAdmin) return { error: 'You can only delete your own comments.', status: 403 }

  const remove = (items) => (items || [])
    .filter(p => String(p.id) !== String(postId))
    .map(p => ({ ...p, replies: remove(p.replies) }))
  const next = remove(list)
  if (next.length) all[questionId] = next
  else delete all[questionId]
  return { ok: true }
}

// vote: 'up' | 'down' | null (clear). One vote per user per post.
export const votePost = (all, questionId, postId, userId, vote) => {
  if (vote !== 'up' && vote !== 'down' && vote !== null) return { error: 'Invalid vote.', status: 400 }
  const post = all[questionId] && findPost(all[questionId], postId)
  if (!post) return { error: 'Comment not found.', status: 404 }
  post.voters = { ...(post.voters || {}) }
  if (vote) post.voters[userId] = vote
  else delete post.voters[userId]
  return { post }
}
