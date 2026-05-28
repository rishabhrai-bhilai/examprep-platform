import React, { useState, useEffect } from 'react'
import { X, Send, ThumbsUp, CornerDownRight } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import { dummyDiscussions } from '../utils/dummyData'

export default function DiscussionDrawer() {
  const { activeDiscussionQuestionId, setActiveDiscussionQuestionId } = useAppStore()
  const { user, isAuthenticated } = useAuthStore()
  const [comments, setComments] = useState([])
  const [newCommentText, setNewCommentText] = useState('')
  const [replyTexts, setReplyTexts] = useState({}) // { commentId: text }
  const [activeReplyBox, setActiveReplyBox] = useState(null) // commentId

  // Load comments when active question changes
  useEffect(() => {
    if (activeDiscussionQuestionId) {
      const mockComments = dummyDiscussions[activeDiscussionQuestionId] || []
      setComments(mockComments)
    }
  }, [activeDiscussionQuestionId])

  if (activeDiscussionQuestionId === null) return null

  const handleAddComment = (e) => {
    e.preventDefault()
    if (!newCommentText.trim()) return

    const authorName = isAuthenticated ? user.name : 'Anonymous Guest'
    const authorAvatar = isAuthenticated
      ? user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`
      : `https://api.dicebear.com/7.x/adventurer/svg?seed=guest-${Date.now()}`

    const newComment = {
      id: Date.now(),
      author: authorName,
      avatar: authorAvatar,
      content: newCommentText,
      likes: 0,
      replies: []
    }

    setComments((prev) => [...prev, newComment])
    setNewCommentText('')
    
    // Save to our in-memory global registry so it stays when toggled
    if (!dummyDiscussions[activeDiscussionQuestionId]) {
      dummyDiscussions[activeDiscussionQuestionId] = []
    }
    dummyDiscussions[activeDiscussionQuestionId].push(newComment)
  }

  const handleAddReply = (commentId) => {
    const text = replyTexts[commentId]
    if (!text || !text.trim()) return

    const authorName = isAuthenticated ? user.name : 'Anonymous Guest'
    const authorAvatar = isAuthenticated
      ? user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`
      : `https://api.dicebear.com/7.x/adventurer/svg?seed=guest-${Date.now()}`

    const newReply = {
      id: Date.now(),
      author: authorName,
      avatar: authorAvatar,
      content: text,
      likes: 0
    }

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return { ...c, replies: [...c.replies, newReply] }
        }
        return c
      })
    )

    setReplyTexts((prev) => ({ ...prev, [commentId]: '' }))
    setActiveReplyBox(null)

    // Save to global registry
    const qComments = dummyDiscussions[activeDiscussionQuestionId] || []
    const targetComment = qComments.find((c) => c.id === commentId)
    if (targetComment) {
      if (!targetComment.replies) targetComment.replies = []
      targetComment.replies.push(newReply)
    }
  }

  const handleLikeComment = (commentId, isReply = false, parentId = null) => {
    setComments((prev) =>
      prev.map((c) => {
        if (!isReply && c.id === commentId) {
          return { ...c, likes: c.likes + 1 }
        } else if (isReply && c.id === parentId) {
          return {
            ...c,
            replies: c.replies.map((r) => (r.id === commentId ? { ...r, likes: r.likes + 1 } : r))
          }
        }
        return c
      })
    )
  }

  return (
    <>
      {/* Background overlay */}
      <div
        className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={() => setActiveDiscussionQuestionId(null)}
      />

      {/* Right Drawer Panel */}
      <div className="fixed top-0 right-0 z-[150] h-full w-full max-w-md bg-card-light dark:bg-card-dark border-l border-border-light dark:border-border-dark shadow-2xl flex flex-col transition-transform duration-300 ease-out translate-x-0">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50">
          <div>
            <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark">Discussions</h3>
            <p className="text-xs text-slate-500">Question #{activeDiscussionQuestionId}</p>
          </div>
          <button
            onClick={() => setActiveDiscussionQuestionId(null)}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Comment Thread List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 dark:text-slate-500">
              <span className="text-sm">No discussions yet.</span>
              <span className="text-xs mt-1">Be the first to share your doubts or explanation!</span>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-3">
                {/* Main Comment */}
                <div className="flex items-start gap-3">
                  <img
                    src={comment.avatar}
                    alt={comment.author}
                    className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">{comment.author}</span>
                      <span className="text-[10px] text-slate-400">Just now</span>
                    </div>
                    <p className="text-sm mt-1 text-slate-700 dark:text-slate-300 leading-relaxed break-words">{comment.content}</p>
                    
                    {/* Action Bar */}
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => handleLikeComment(comment.id)}
                        className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-primary transition-colors"
                      >
                        <ThumbsUp size={12} />
                        <span>{comment.likes}</span>
                      </button>
                      <button
                        onClick={() => setActiveReplyBox(activeReplyBox === comment.id ? null : comment.id)}
                        className="text-[11px] font-medium text-slate-500 hover:text-primary transition-colors"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub Replies */}
                {comment.replies && comment.replies.map((reply) => (
                  <div key={reply.id} className="flex items-start gap-3 pl-8">
                    <CornerDownRight size={14} className="text-slate-400 mt-1 flex-shrink-0" />
                    <img
                      src={reply.avatar}
                      alt={reply.author}
                      className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[11px] font-semibold text-text-primary-light dark:text-text-primary-dark">{reply.author}</span>
                        <span className="text-[10px] text-slate-400">Just now</span>
                      </div>
                      <p className="text-xs mt-0.5 text-slate-600 dark:text-slate-400 leading-relaxed break-words">{reply.content}</p>
                      
                      <button
                        onClick={() => handleLikeComment(reply.id, true, comment.id)}
                        className="flex items-center gap-1 text-[10px] mt-1 text-slate-500 hover:text-primary transition-colors"
                      >
                        <ThumbsUp size={10} />
                        <span>{reply.likes}</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Reply Input Box */}
                {activeReplyBox === comment.id && (
                  <div className="flex gap-2 mt-2 pl-8">
                    <input
                      type="text"
                      placeholder="Write a reply..."
                      value={replyTexts[comment.id] || ''}
                      onChange={(e) => setReplyTexts((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                      className="flex-1 h-8 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark"
                    />
                    <button
                      onClick={() => handleAddReply(comment.id)}
                      className="h-8 w-8 flex items-center justify-center rounded-btn bg-primary text-white hover:bg-primary-hover shrink-0"
                    >
                      <Send size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input box */}
        <form onSubmit={handleAddComment} className="p-4 border-t border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/30">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask a question or explain..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="flex-1 h-10 px-4 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark"
            />
            <button
              type="submit"
              className="h-10 px-4 flex items-center justify-center rounded-btn bg-primary text-white hover:bg-primary-hover transition-colors font-medium text-sm"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
