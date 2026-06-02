import React, { useState, useEffect } from 'react'
import { 
  X, Send, ThumbsUp, ThumbsDown, CornerDownRight, Bookmark, Play, Check, MessageSquare
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import { dummyDiscussions } from '../utils/dummyData'

export default function DiscussionDrawer({
  currentQuestion,
  selectedAnswers,
  setSelectedAnswers,
  isMSQCorrect,
  isNATCorrect,
  handleSelectMCQ,
  handleToggleMSQ,
  handleSubmitMSQ,
  handleNATSubmit
}) {
  const { 
    activeDiscussionQuestionId, 
    setActiveDiscussionQuestionId,
    theme,
    bookmarks,
    toggleBookmark,
    votes,
    upvoteQuestion,
    downvoteQuestion,
    setActiveVideoSolutionUrl
  } = useAppStore()
  
  const { user, isAuthenticated } = useAuthStore()
  const [comments, setComments] = useState([])
  const [newCommentText, setNewCommentText] = useState('')
  const [replyTexts, setReplyTexts] = useState({}) // { commentId: text }
  const [activeReplyBox, setActiveReplyBox] = useState(null) // commentId
  const [mobileTab, setMobileTab] = useState('question') // 'question' | 'discussion'

  // Load comments when active question changes
  useEffect(() => {
    if (activeDiscussionQuestionId) {
      const mockComments = dummyDiscussions[activeDiscussionQuestionId] || []
      setComments(mockComments)
    }
  }, [activeDiscussionQuestionId])

  // Reset mobile tab when discussion drawer is opened
  useEffect(() => {
    if (activeDiscussionQuestionId) {
      setMobileTab('question')
    }
  }, [activeDiscussionQuestionId])

  if (activeDiscussionQuestionId === null || !currentQuestion) return null

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
    <div className="fixed inset-0 z-[100] w-screen h-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      
      {/* Mobile view tabs */}
      <div className="flex md:hidden border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 shrink-0">
        <button
          onClick={() => setMobileTab('question')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
            mobileTab === 'question'
              ? 'border-primary text-primary bg-indigo-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          }`}
        >
          Question
        </button>
        <button
          onClick={() => setMobileTab('discussion')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
            mobileTab === 'discussion'
              ? 'border-primary text-primary bg-indigo-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          }`}
        >
          Discussion
        </button>
      </div>

      <div className="flex flex-1 relative min-h-0 w-full h-full">
        
        {/* --- LEFT PANEL: QUESTION VIEW --- */}
        <div 
          className={`w-full md:w-[380px] lg:w-[440px] shrink-0 border-r border-border-light dark:border-border-dark flex flex-col bg-card-light dark:bg-card-dark h-full relative ${
            mobileTab === 'question' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 shrink-0">
            <button
              onClick={() => setActiveDiscussionQuestionId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-350 font-bold text-xs transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
            >
              <X size={14} />
              <span>Exit Discussion</span>
            </button>
            <span className="text-xs font-extrabold text-slate-450 uppercase tracking-wider">Question #{currentQuestion.id}</span>
          </div>

          {/* Question Contents Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 pr-14 custom-scrollbar space-y-5 pb-16 relative">
            
            {/* Subject/Topic Tags */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3 text-[10px] text-slate-400">
              <span className="text-primary font-bold">{currentQuestion.subject}</span>
              <span>•</span>
              <span className="truncate max-w-[120px]">{currentQuestion.topic}</span>
              <span>•</span>
              <span className="font-semibold">{currentQuestion.year}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[9px] uppercase tracking-wide text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                {currentQuestion.type}
              </span>
              <span className="font-bold text-[9px] uppercase tracking-wide text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                {currentQuestion.marks} Marks
              </span>
              <span className="font-semibold text-[9px] uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-400">
                {currentQuestion.difficulty}
              </span>
            </div>

            {/* Question Text */}
            <div className="text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
              {currentQuestion.question}
            </div>

            {/* MCQ Options */}
            {currentQuestion.type === 'MCQ' && (
              <div className="space-y-2 pt-1">
                {currentQuestion.options.map((option, idx) => {
                  const ansState = selectedAnswers[currentQuestion.id]
                  const isSelected = ansState === idx
                  const isCorrect = currentQuestion.answer === idx
                  const hasAnswered = ansState !== undefined

                  let btnStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200'
                  let prefixStyle = 'border-slate-300 dark:border-slate-700 text-slate-500'

                  if (hasAnswered) {
                    if (isCorrect) {
                      btnStyle = 'border-success bg-emerald-500/10 text-success font-medium'
                      prefixStyle = 'bg-success border-success text-white'
                    } else if (isSelected) {
                      btnStyle = 'border-error bg-red-500/10 text-error font-medium'
                      prefixStyle = 'bg-error border-error text-white'
                    } else {
                      btnStyle = 'border-slate-100 dark:border-slate-900 opacity-60 text-slate-455'
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectMCQ(idx)}
                      disabled={hasAnswered}
                      className={`w-full py-2.5 px-3.5 rounded-btn border text-left text-xs flex items-start gap-3 transition-all ${
                        !hasAnswered ? 'active:scale-99' : ''
                      } ${btnStyle}`}
                    >
                      <span className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold ${prefixStyle}`}>
                        {hasAnswered && isCorrect ? (
                          <Check size={12} strokeWidth={3} />
                        ) : hasAnswered && isSelected ? (
                          <X size={12} strokeWidth={3} />
                        ) : (
                          String.fromCharCode(65 + idx)
                        )}
                      </span>
                      <span className="flex-1 min-w-0 break-words mt-0.5">{option}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* MSQ Options */}
            {currentQuestion.type === 'MSQ' && (
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  {currentQuestion.options.map((option, idx) => {
                    const ansState = selectedAnswers[currentQuestion.id] || { selected: [], submitted: false }
                    const isSelected = ansState.selected.includes(idx)
                    const isCorrect = currentQuestion.answer.includes(idx)
                    const hasSubmitted = ansState.submitted

                    let btnStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200'
                    let checkStyle = 'border-slate-300 dark:border-slate-700'

                    if (hasSubmitted) {
                      if (isCorrect) {
                        btnStyle = 'border-success bg-emerald-500/10 text-success font-medium'
                        checkStyle = 'bg-success border-success text-white'
                      } else if (isSelected) {
                        btnStyle = 'border-error bg-red-500/10 text-error font-medium'
                        checkStyle = 'bg-error border-error text-white'
                      } else {
                        btnStyle = 'border-slate-150 dark:border-slate-900 opacity-60 text-slate-455'
                      }
                    } else if (isSelected) {
                      btnStyle = 'border-primary bg-indigo-55/50 dark:bg-indigo-950/20 text-primary font-medium'
                      checkStyle = 'border-primary bg-primary text-white'
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleToggleMSQ(idx)}
                        disabled={hasSubmitted}
                        className={`w-full py-2.5 px-3.5 rounded-btn border text-left text-xs flex items-start gap-3 transition-all ${btnStyle}`}
                      >
                        <span className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 text-xs font-bold ${checkStyle}`}>
                          {isSelected || (hasSubmitted && isCorrect) ? <Check size={12} strokeWidth={3} /> : null}
                        </span>
                        <span className="flex-1 min-w-0 break-words mt-0.5">{option}</span>
                      </button>
                    )
                  })}
                </div>

                {!(selectedAnswers[currentQuestion.id]?.submitted) && (
                  <button
                    onClick={handleSubmitMSQ}
                    disabled={(selectedAnswers[currentQuestion.id]?.selected || []).length === 0}
                    className="w-full h-9 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn disabled:opacity-40 transition-all active:scale-95 shadow-sm"
                  >
                    Submit Answer
                  </button>
                )}
              </div>
            )}

            {/* NAT Input */}
            {currentQuestion.type === 'NAT' && (
              <div className="space-y-4 pt-1">
                {selectedAnswers[currentQuestion.id] === undefined ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id={`discussion-workspace-nat-input-${currentQuestion.id}`}
                      placeholder="Type numerical answer..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleNATSubmit(e.target.value)
                        }
                      }}
                      className="flex-1 h-9 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-880 rounded-input focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`discussion-workspace-nat-input-${currentQuestion.id}`)
                        if (input) handleNATSubmit(input.value)
                      }}
                      className="h-9 px-4 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn transition-all active:scale-95 shadow-sm shrink-0"
                    >
                      Submit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 font-medium">
                     <div className="grid grid-cols-2 gap-2 text-xs">
                       <div className={`p-2.5 rounded border ${
                         isNATCorrect(selectedAnswers[currentQuestion.id], currentQuestion.answer)
                           ? 'border-success bg-emerald-500/10 text-success'
                           : 'border-error bg-red-500/10 text-error'
                       }`}>
                         <span className="text-[9px] block font-bold text-slate-40 mt-0.5 uppercase mb-0.5">Your Answer:</span>
                         <span>{selectedAnswers[currentQuestion.id]}</span>
                       </div>
                       <div className="p-2.5 rounded border border-success bg-emerald-500/5 text-success">
                         <span className="text-[9px] block font-bold text-slate-40 mt-0.5 uppercase mb-0.5">Correct Key:</span>
                         <span>{currentQuestion.answer}</span>
                       </div>
                     </div>
                  </div>
                )}
              </div>
            )}

            {/* Explanation box */}
            {((currentQuestion.type === 'MCQ' && selectedAnswers[currentQuestion.id] !== undefined) ||
              (currentQuestion.type === 'MSQ' && selectedAnswers[currentQuestion.id]?.submitted) ||
              (currentQuestion.type === 'NAT' && selectedAnswers[currentQuestion.id] !== undefined)) && (
              <div className="p-4 rounded-card border border-primary/10 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                  <Check size={14} strokeWidth={2.5} />
                  <span>
                    {currentQuestion.type === 'MSQ' 
                      ? isMSQCorrect(selectedAnswers[currentQuestion.id]?.selected, currentQuestion.answer) ? 'Correct Answer!' : 'Incorrect Answer!'
                      : currentQuestion.type === 'NAT'
                      ? isNATCorrect(selectedAnswers[currentQuestion.id], currentQuestion.answer) ? 'Correct Answer!' : 'Incorrect Answer!'
                      : selectedAnswers[currentQuestion.id] === currentQuestion.answer ? 'Correct Answer!' : 'Incorrect Answer!'}
                  </span>
                </div>
                <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/40 pt-2">
                  {currentQuestion.explanation}
                </div>
              </div>
            )}
          </div>

          {/* Floating Vertical Reels column */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-10 p-2.5 rounded-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 dark:border-slate-800/25 shadow-lg">
            
            {/* Upvote */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => upvoteQuestion(currentQuestion.id)}
                className={`group relative h-9 w-9 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 ${
                  votes[currentQuestion.id] === 'up'
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <ThumbsUp size={14} className={votes[currentQuestion.id] === 'up' ? 'fill-white text-white' : 'text-slate-500'} />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                  Upvote
                </span>
              </button>
              <span className="text-[9px] font-bold text-slate-500 mt-0.5">
                {currentQuestion.likes + (votes[currentQuestion.id] === 'up' ? 1 : 0)}
              </span>
            </div>

            {/* Downvote */}
            <button
              onClick={() => downvoteQuestion(currentQuestion.id)}
              className={`group relative h-9 w-9 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 ${
                votes[currentQuestion.id] === 'down'
                  ? 'bg-error border-error text-white'
                  : 'bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-855 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <ThumbsDown size={14} className={votes[currentQuestion.id] === 'down' ? 'fill-white text-white' : 'text-slate-500'} />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                Downvote
              </span>
            </button>

            {/* Discussion (Highlighted since it's open) */}
            <div className="flex flex-col items-center">
              <button
                className="group relative h-9 w-9 rounded-full bg-primary border-primary text-white flex items-center justify-center shadow-md transition-all cursor-default"
              >
                <MessageSquare size={14} className="fill-white text-white" />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                  Discussion (Open)
                </span>
              </button>
              <span className="text-[9px] font-bold text-slate-500 mt-0.5">
                {currentQuestion.commentsCount}
              </span>
            </div>

            {/* Bookmark */}
            <button
              onClick={() => toggleBookmark(currentQuestion.id)}
              className={`group relative h-9 w-9 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 ${
                bookmarks.includes(currentQuestion.id)
                  ? 'bg-primary border-primary text-white'
                  : 'bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Bookmark size={14} className={bookmarks.includes(currentQuestion.id) ? 'fill-white text-white' : 'text-slate-500'} />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                Bookmark
              </span>
            </button>

            {/* Video Solution */}
            <button
              onClick={() => setActiveVideoSolutionUrl(currentQuestion.videoSolutionUrl)}
              className="group relative h-9 w-9 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-855 flex items-center justify-center shadow-md text-slate-500 hover:bg-slate-50 transition-all active:scale-90"
            >
              <Play size={14} className="fill-slate-500 text-slate-500" />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                Video Solution
              </span>
            </button>
          </div>
        </div>

        {/* --- RIGHT PANEL: DISCUSSION WORKSPACE --- */}
        <div 
          className={`flex-1 h-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 ${
            mobileTab === 'discussion' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 shrink-0">
            <div>
              <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark">Discussions</h3>
              <p className="text-[10px] text-slate-500">Ask a question, share doubts, or explain the solution</p>
            </div>
            
            <button
              onClick={() => setActiveDiscussionQuestionId(null)}
              className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors hidden md:block"
            >
              <X size={20} />
            </button>
          </div>

          {/* Comment Thread List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-slate-50 dark:bg-slate-900/10">
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
                      <p className="text-sm mt-1 text-slate-700 dark:text-slate-350 leading-relaxed break-words">{comment.content}</p>
                      
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
                        <p className="text-xs mt-0.5 text-slate-650 dark:text-slate-400 leading-relaxed break-words">{reply.content}</p>
                        
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
          <form onSubmit={handleAddComment} className="p-4 border-t border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shrink-0">
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
      </div>
    </div>
  )
}
