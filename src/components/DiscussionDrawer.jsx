import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  X, Send, ThumbsUp, ThumbsDown, CornerDownRight, Bookmark, Play, Check, 
  MessageSquare, ArrowBigUp, ArrowBigDown, Reply, Edit3, ExternalLink, ChevronLeft,
  ChevronDown, ChevronUp, Trash2
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import QuestionImage from './QuestionImage'
import FormattedContent from './FormattedContent'
import RichTextEditor from './RichTextEditor'

// Recursive component for rendering multi-level threaded replies
function ThreadedReplyNode({
  reply,
  depth = 0,
  activeReplyBox,
  setActiveReplyBox,
  replyDrafts,
  setReplyDrafts,
  handleAddReply,
  handleDeleteComment,
  isCommentAuthor,
  user
}) {
  const hasChildren = reply.replies && reply.replies.length > 0
  const isReplying = activeReplyBox === reply.id
  const [showChildReplies, setShowChildReplies] = useState(false)
  const isAuthor = isCommentAuthor ? isCommentAuthor(reply, user) : false

  return (
    <div className={`space-y-2 ${depth > 0 ? (depth < 4 ? 'pl-3 sm:pl-5 border-l-2 border-slate-200 dark:border-slate-800' : 'pl-1 sm:pl-2') : ''}`}>
      <div className="flex items-start gap-2.5 bg-slate-50/70 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
        <CornerDownRight size={13} className="text-slate-400 mt-1 shrink-0" />
        <img
          src={reply.avatar}
          alt={reply.author}
          className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shrink-0 mt-0.5 object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark">
              {reply.author}
            </span>
            {reply.replyToAuthor && (
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                Replying to @{reply.replyToAuthor}
              </span>
            )}
            <span className="text-[10px] text-slate-400">
              {reply.createdAt || 'Just now'}
            </span>
          </div>

          <div className="mt-1 text-xs text-slate-700 dark:text-slate-300">
            <FormattedContent content={reply.content} />
          </div>

          {/* Action Row: Reply button, View/Hide Child Replies, and Delete button */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveReplyBox(isReplying ? null : reply.id)}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-primary transition-colors"
            >
              <Reply size={12} />
              <span>Reply</span>
            </button>

            {hasChildren && (
              <button
                type="button"
                onClick={() => setShowChildReplies(!showChildReplies)}
                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/15 px-2 py-0.5 rounded transition-all active:scale-95"
              >
                {showChildReplies ? (
                  <>
                    <ChevronUp size={12} />
                    <span>Hide {reply.replies.length === 1 ? 'reply' : `${reply.replies.length} replies`}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown size={12} />
                    <span>View {reply.replies.length === 1 ? 'reply' : `${reply.replies.length} replies`}</span>
                  </>
                )}
              </button>
            )}

            {isAuthor && handleDeleteComment && (
              <button
                type="button"
                onClick={() => handleDeleteComment(reply.id)}
                className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition-colors ml-auto sm:ml-0"
                title="Delete your reply"
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Inline Rich Text Editor for this specific reply */}
      {isReplying && (
        <div className="pt-2 pl-3 sm:pl-5">
          <div className="p-3 bg-card-light dark:bg-card-dark rounded-xl border border-primary/30 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 text-primary">
                <Reply size={12} />
                <span>Replying to {reply.author}</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveReplyBox(null)}
                className="hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X size={13} />
              </button>
            </div>

            <RichTextEditor
              mode="compact"
              value={replyDrafts[reply.id] || ''}
              onChange={(val) => setReplyDrafts((prev) => ({ ...prev, [reply.id]: val }))}
              onSubmit={(val) => {
                handleAddReply(reply.id, reply.author, val)
                setShowChildReplies(true)
              }}
              onCancel={() => setActiveReplyBox(null)}
              submitLabel="Post Reply"
              placeholder={`Write your formatted reply to ${reply.author}... (supports GATE math ∑, images, markdown)`}
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Child Nested Replies */}
      {hasChildren && showChildReplies && (
        <div className="space-y-2 pt-1 animate-in fade-in duration-200">
          {reply.replies.map((childReply) => (
            <ThreadedReplyNode
              key={childReply.id}
              reply={childReply}
              depth={depth + 1}
              activeReplyBox={activeReplyBox}
              setActiveReplyBox={setActiveReplyBox}
              replyDrafts={replyDrafts}
              setReplyDrafts={setReplyDrafts}
              handleAddReply={handleAddReply}
              handleDeleteComment={handleDeleteComment}
              isCommentAuthor={isCommentAuthor}
              user={user}
            />
          ))}
        </div>
      )}
    </div>
  )
}

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
  const navigate = useNavigate()
  const { 
    activeDiscussionQuestionId, 
    setActiveDiscussionQuestionId,
    theme,
    bookmarks,
    toggleBookmark,
    votes,
    upvoteQuestion,
    downvoteQuestion,
    setActiveVideoSolutionUrl,
    discussions,
    solutionVotes,
    addSolution,
    addReply,
    deleteComment,
    isCommentAuthor,
    voteSolution
  } = useAppStore()
  
  const { user, isAuthenticated } = useAuthStore()
  const [isWritingSolution, setIsWritingSolution] = useState(false)
  const [solutionDraft, setSolutionDraft] = useState('')
  const [replyDrafts, setReplyDrafts] = useState({}) // { [targetId]: text }
  const [activeReplyBox, setActiveReplyBox] = useState(null) // targetId
  const [mobileTab, setMobileTab] = useState('question') // 'question' | 'discussion'
  const [expandedReplies, setExpandedReplies] = useState({}) // { [commentId]: boolean }

  const toggleReplies = (id) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // Reset state when discussion drawer is opened
  useEffect(() => {
    if (activeDiscussionQuestionId) {
      setMobileTab('question')
      setActiveReplyBox(null)
      setIsWritingSolution(false)
      setSolutionDraft('')
      setReplyDrafts({})
      setExpandedReplies({})
    }
  }, [activeDiscussionQuestionId])

  if (activeDiscussionQuestionId === null || !currentQuestion) return null

  const comments = (discussions[activeDiscussionQuestionId] || []).slice().sort((a, b) => {
    const netA = (a.upvotes || 0) - (a.downvotes || 0)
    const netB = (b.upvotes || 0) - (b.downvotes || 0)
    if (netB !== netA) return netB - netA
    return (b.timestamp || 0) - (a.timestamp || 0)
  })

  const handlePublishSolution = (contentOverride) => {
    const finalContent = (typeof contentOverride === 'string' && contentOverride.trim()) ? contentOverride : solutionDraft
    if (!finalContent.trim()) return

    const authorName = isAuthenticated ? user.name : 'Anonymous Scholar'
    const authorAvatar = isAuthenticated
      ? user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`
      : `https://api.dicebear.com/7.x/adventurer/svg?seed=scholar-${Date.now()}`

    addSolution(activeDiscussionQuestionId, {
      content: finalContent,
      author: authorName,
      avatar: authorAvatar,
      authorEmail: user?.email || null,
      authorId: user?.email || user?.id || null
    })

    setSolutionDraft('')
    setIsWritingSolution(false)
    setMobileTab('discussion')
  }

  const handleAddReply = (targetId, targetAuthor = null, contentOverride = null) => {
    const text = (typeof contentOverride === 'string' && contentOverride.trim()) ? contentOverride : replyDrafts[targetId]
    if (!text || !text.trim()) return

    const authorName = isAuthenticated ? user.name : 'Anonymous Scholar'
    const authorAvatar = isAuthenticated
      ? user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`
      : `https://api.dicebear.com/7.x/adventurer/svg?seed=scholar-${Date.now()}`

    addReply(activeDiscussionQuestionId, targetId, {
      content: text,
      author: authorName,
      avatar: authorAvatar,
      authorEmail: user?.email || null,
      authorId: user?.email || user?.id || null,
      replyToAuthor: targetAuthor
    })

    setReplyDrafts((prev) => ({ ...prev, [targetId]: '' }))
    setActiveReplyBox(null)
    setExpandedReplies((prev) => ({ ...prev, [targetId]: true }))
  }

  const handleDeleteComment = (commentId) => {
    if (!activeDiscussionQuestionId || !commentId) return
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteComment(activeDiscussionQuestionId, commentId)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] w-screen h-screen flex flex-col bg-black/50 md:bg-slate-50 md:dark:bg-slate-950 overflow-hidden font-sans">
      
      <div className="flex flex-1 relative min-h-0 w-full h-full">
        
        {/* --- LEFT PANEL: QUESTION VIEW (Desktop & Mobile background) --- */}
        <div 
          className="w-full md:w-[380px] lg:w-[440px] shrink-0 border-r border-border-light dark:border-border-dark flex flex-col bg-card-light dark:bg-card-dark h-full relative"
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
          <div className="flex-1 overflow-y-auto p-5 pr-6 custom-scrollbar space-y-5 pb-20 md:pb-16 relative">
            
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

            {/* Question Diagram / Image (if present) */}
            <QuestionImage 
              src={currentQuestion.imageUrl || currentQuestion.diagramUrl || currentQuestion.image} 
              alt={currentQuestion.imageAlt || 'Question Diagram'} 
            />

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
        </div>

        {/* --- RIGHT PANEL: DISCUSSION WORKSPACE (YouTube style Bottom Sheet on Mobile) --- */}
        <div 
          className="fixed bottom-0 left-0 right-0 h-[72vh] md:h-full md:relative md:flex-1 flex flex-col overflow-hidden bg-card-light dark:bg-card-dark md:bg-slate-100 md:dark:bg-slate-950 rounded-t-2xl md:rounded-none shadow-2xl md:shadow-none border-t border-border-light dark:border-border-dark md:border-t-0 z-50 animate-slide-up"
        >
          {/* YouTube Bottom Sheet Drag Handle */}
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0 md:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm md:text-base text-text-primary-light dark:text-text-primary-dark">
                  {isWritingSolution ? '✍️ Write Solution' : 'Discussions'}
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  {comments.length} {comments.length === 1 ? 'Solution' : 'Solutions'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                {isWritingSolution ? 'Compose structured proofs, equations & formulas' : 'Peer explanations, alternate tricks & discussions'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveDiscussionQuestionId(null)
                  navigate(`/discussion?questionId=${currentQuestion.id}`)
                }}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700"
                title="Open in Dedicated Discussion Tab"
              >
                <span>Full Tab</span>
                <ExternalLink size={12} />
              </button>

              <button
                onClick={() => setActiveDiscussionQuestionId(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Close Discussions"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Solution Studio Mode */}
          {isWritingSolution ? (
            <div className="flex-1 flex flex-col p-4 overflow-hidden bg-card-light dark:bg-card-dark">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-light dark:border-border-dark text-xs">
                <button
                  type="button"
                  onClick={() => setIsWritingSolution(false)}
                  className="flex items-center gap-1 text-slate-500 hover:text-primary font-semibold"
                >
                  <ChevronLeft size={14} />
                  <span>Back to Discussions</span>
                </button>
                <span className="text-[11px] text-slate-400">GATE Solution Studio</span>
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                <RichTextEditor
                  mode="full"
                  value={solutionDraft}
                  onChange={setSolutionDraft}
                  onSubmit={handlePublishSolution}
                  onCancel={() => setIsWritingSolution(false)}
                  submitLabel="Publish Solution"
                  placeholder="Explain the solution step-by-step using formulas, LaTeX math, diagrams, code, and highlight badges..."
                  autoFocus
                  className="h-full flex-1"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Top Action Bar */}
              <div className="p-3 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark flex items-center justify-between gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Solutions & Peer Explanations
                </span>
                <button
                  type="button"
                  onClick={() => setIsWritingSolution(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-xs active:scale-95 transition-all"
                >
                  <Edit3 size={13} />
                  <span>Write Solution</span>
                </button>
              </div>

              {/* Comment / Solution Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20">
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 dark:text-slate-500">
                    <MessageSquare size={32} className="mb-2 opacity-50 text-primary" />
                    <span className="text-sm font-semibold">No solutions posted yet.</span>
                    <span className="text-xs mt-1">Be the first to share your steps or ask a doubt!</span>
                    <button
                      type="button"
                      onClick={() => setIsWritingSolution(true)}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors"
                    >
                      Write First Solution
                    </button>
                  </div>
                ) : (
                  comments.map((comment, idx) => {
                    const netVotes = (comment.upvotes || 0) - (comment.downvotes || 0)
                    const userVote = solutionVotes[comment.id]
                    const isTopSolution = idx === 0 && netVotes > 0

                    return (
                      <div 
                        key={comment.id} 
                        className={`bg-card-light dark:bg-card-dark border rounded-xl p-4 shadow-xs space-y-3 ${
                          isTopSolution 
                            ? 'border-indigo-500/30 ring-1 ring-indigo-500/10' 
                            : 'border-border-light dark:border-border-dark'
                        }`}
                      >
                        {/* Author info */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={comment.avatar}
                              alt={comment.author}
                              className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark">
                                  {comment.author}
                                </span>
                                {isTopSolution && (
                                  <span className="text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    ★ Top Solution
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {comment.createdAt || 'Recent'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Body with Voting column */}
                        <div className="flex items-start gap-3">
                          {/* Upvote / Downvote column */}
                          <div className="flex flex-col items-center bg-slate-100/70 dark:bg-slate-900/70 p-1 rounded-lg border border-slate-200/60 dark:border-slate-800/60 shrink-0 select-none">
                            <button
                              type="button"
                              onClick={() => voteSolution(activeDiscussionQuestionId, comment.id, 'up')}
                              className={`p-1 rounded transition-all active:scale-90 ${
                                userVote === 'up'
                                  ? 'text-emerald-500 bg-emerald-500/10'
                                  : 'text-slate-400 hover:text-emerald-500'
                              }`}
                              title="Upvote"
                            >
                              <ArrowBigUp size={16} className={userVote === 'up' ? 'fill-emerald-500' : ''} />
                            </button>

                            <span className={`text-[11px] font-black my-0.5 font-mono ${
                              netVotes > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                              netVotes < 0 ? 'text-rose-600 dark:text-rose-400' :
                              'text-slate-500'
                            }`}>
                              {netVotes > 0 ? `+${netVotes}` : netVotes}
                            </span>

                            <button
                              type="button"
                              onClick={() => voteSolution(activeDiscussionQuestionId, comment.id, 'down')}
                              className={`p-1 rounded transition-all active:scale-90 ${
                                userVote === 'down'
                                  ? 'text-rose-500 bg-rose-500/10'
                                  : 'text-slate-400 hover:text-rose-500'
                              }`}
                              title="Downvote"
                            >
                              <ArrowBigDown size={16} className={userVote === 'down' ? 'fill-rose-500' : ''} />
                            </button>
                          </div>

                          {/* Content Area */}
                          <div className="flex-1 min-w-0">
                            <FormattedContent content={comment.content} />

                            {/* Reply Action */}
                            <div className="flex items-center gap-3 mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-850 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setActiveReplyBox(activeReplyBox === comment.id ? null : comment.id)}
                                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
                              >
                                <Reply size={12} />
                                <span>Reply</span>
                              </button>

                              {comment.replies && comment.replies.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleReplies(comment.id)}
                                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/15 px-2 py-0.5 rounded-md transition-all active:scale-95"
                                >
                                  {expandedReplies[comment.id] ? (
                                    <>
                                      <ChevronUp size={12} />
                                      <span>Hide {comment.replies.length === 1 ? 'reply' : `${comment.replies.length} replies`}</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown size={12} />
                                      <span>View {comment.replies.length === 1 ? 'reply' : `${comment.replies.length} replies`}</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {isCommentAuthor(comment, user) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors ml-auto sm:ml-0"
                                  title="Delete your comment"
                                >
                                  <Trash2 size={12} />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Threaded Nested Replies (WITHOUT VOTE BUTTONS) */}
                        {comment.replies && comment.replies.length > 0 && expandedReplies[comment.id] && (
                          <div className="space-y-3 pt-2 pl-3 sm:pl-6 border-t border-slate-100 dark:border-slate-850 animate-in fade-in duration-200">
                            {comment.replies.map((reply) => (
                              <ThreadedReplyNode
                                key={reply.id}
                                reply={reply}
                                depth={0}
                                activeReplyBox={activeReplyBox}
                                setActiveReplyBox={setActiveReplyBox}
                                replyDrafts={replyDrafts}
                                setReplyDrafts={setReplyDrafts}
                                handleAddReply={handleAddReply}
                                handleDeleteComment={handleDeleteComment}
                                isCommentAuthor={isCommentAuthor}
                                user={user}
                              />
                            ))}
                          </div>
                        )}

                        {/* Inline Rich Reply Editor for Solution */}
                        {activeReplyBox === comment.id && (
                          <div className="pt-2 pl-3 sm:pl-6">
                            <div className="p-3 bg-card-light dark:bg-card-dark rounded-xl border border-primary/30 shadow-sm space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1.5 text-primary">
                                  <Reply size={12} />
                                  <span>Replying to {comment.author}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveReplyBox(null)}
                                  className="hover:text-slate-700 dark:hover:text-slate-200"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                              <RichTextEditor
                                mode="compact"
                                value={replyDrafts[comment.id] || ''}
                                onChange={(val) => setReplyDrafts((prev) => ({ ...prev, [comment.id]: val }))}
                                onSubmit={(val) => handleAddReply(comment.id, comment.author, val)}
                                onCancel={() => setActiveReplyBox(null)}
                                submitLabel="Post Reply"
                                placeholder={`Write your formatted reply to ${comment.author}... (supports GATE math ∑, images, markdown)`}
                                autoFocus
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Bottom Call to Action */}
              <div className="p-3 border-t border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shrink-0 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Know a quicker shortcut or alternative formula?</span>
                <button
                  type="button"
                  onClick={() => setIsWritingSolution(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-hover active:scale-95 transition-all shadow-xs"
                >
                  <Edit3 size={13} />
                  <span>Share Solution</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

