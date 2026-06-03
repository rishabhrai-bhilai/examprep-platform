import React, { useState, useEffect } from 'react'
import { 
  MessageSquare, Search, BookOpen, Clock, Calendar, Award, ThumbsUp, ThumbsDown, 
  CornerDownRight, Send, Check, Bookmark, Play, X, HelpCircle, Layers, Brain, Target, Zap, BarChart2, Settings2, Sparkles
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import { dummyDiscussions } from '../utils/dummyData'

export default function DiscussionPage() {
  const { 
    questions, 
    bookmarks, 
    toggleBookmark, 
    votes, 
    upvoteQuestion, 
    downvoteQuestion,
    setActiveVideoSolutionUrl
  } = useAppStore()
  
  const { user, isAuthenticated } = useAuthStore()

  // State
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'pyq' | 'trending' | 'unanswered'
  
  // Comments detail state
  const [comments, setComments] = useState([])
  const [newCommentText, setNewCommentText] = useState('')
  const [replyTexts, setReplyTexts] = useState({}) // { commentId: string }
  const [activeReplyBox, setActiveReplyBox] = useState(null) // commentId
  const [mobileTab, setMobileTab] = useState('question') // 'question' | 'discussion'

  // Load comments when selected question changes
  useEffect(() => {
    if (selectedQuestion) {
      const mockComments = dummyDiscussions[selectedQuestion.id] || []
      setComments(mockComments)
      setMobileTab('question')
    }
  }, [selectedQuestion])

  // Subject Configurations for Styling
  const getSubjectConfig = (subject) => {
    switch (subject) {
      case 'Algorithms & Data Structures':
        return {
          icon: Layers,
          colorClass: 'text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/20',
          gradientClass: 'from-indigo-500/5 to-violet-500/5 hover:border-indigo-500 dark:hover:border-indigo-500',
          badgeColor: 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400',
        }
      case 'Operating Systems':
        return {
          icon: Brain,
          colorClass: 'text-teal-500 bg-teal-500/10 dark:bg-teal-500/20 border-teal-500/20',
          gradientClass: 'from-teal-500/5 to-emerald-500/5 hover:border-teal-500 dark:hover:border-teal-500',
          badgeColor: 'bg-teal-500/10 text-teal-650 dark:text-teal-400',
        }
      case 'Databases (DBMS)':
        return {
          icon: Target,
          colorClass: 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20',
          gradientClass: 'from-blue-500/5 to-cyan-500/5 hover:border-blue-500 dark:hover:border-blue-500',
          badgeColor: 'bg-blue-500/10 text-blue-650 dark:text-blue-400',
        }
      case 'Computer Networks':
        return {
          icon: Zap,
          colorClass: 'text-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/20',
          gradientClass: 'from-cyan-500/5 to-sky-500/5 hover:border-cyan-500 dark:hover:border-cyan-500',
          badgeColor: 'bg-cyan-500/10 text-cyan-650 dark:text-cyan-400',
        }
      case 'Theory of Computation':
        return {
          icon: BarChart2,
          colorClass: 'text-purple-500 bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/20',
          gradientClass: 'from-purple-500/5 to-pink-500/5 hover:border-purple-500 dark:hover:border-purple-500',
          badgeColor: 'bg-purple-500/10 text-purple-650 dark:text-purple-400',
        }
      case 'Compiler Design':
        return {
          icon: Settings2,
          colorClass: 'text-violet-500 bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/20',
          gradientClass: 'from-violet-500/5 to-fuchsia-500/5 hover:border-violet-500 dark:hover:border-violet-500',
          badgeColor: 'bg-violet-500/10 text-violet-650 dark:text-violet-400',
        }
      case 'Computer Organization & Architecture':
        return {
          icon: Brain,
          colorClass: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20',
          gradientClass: 'from-amber-500/5 to-orange-500/5 hover:border-amber-500 dark:hover:border-amber-500',
          badgeColor: 'bg-amber-500/10 text-amber-650 dark:text-amber-400',
        }
      case 'Digital Logic':
        return {
          icon: Settings2,
          colorClass: 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20',
          gradientClass: 'from-rose-500/5 to-red-500/5 hover:border-rose-500 dark:hover:border-rose-500',
          badgeColor: 'bg-rose-500/10 text-rose-650 dark:text-rose-400',
        }
      case 'Discrete Mathematics':
        return {
          icon: Award,
          colorClass: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20',
          gradientClass: 'from-emerald-500/5 to-green-500/5 hover:border-emerald-500 dark:hover:border-emerald-500',
          badgeColor: 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400',
        }
      case 'Engineering Mathematics':
        return {
          icon: HelpCircle,
          colorClass: 'text-fuchsia-500 bg-fuchsia-500/10 dark:bg-fuchsia-500/20 border-fuchsia-500/20',
          gradientClass: 'from-fuchsia-500/5 to-pink-500/5 hover:border-fuchsia-500 dark:hover:border-fuchsia-500',
          badgeColor: 'bg-fuchsia-500/10 text-fuchsia-650 dark:text-fuchsia-400',
        }
      case 'General Aptitude':
      default:
        return {
          icon: Brain,
          colorClass: 'text-orange-500 bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/20',
          gradientClass: 'from-orange-500/5 to-yellow-500/5 hover:border-orange-500 dark:hover:border-orange-500',
          badgeColor: 'bg-orange-500/10 text-orange-650 dark:text-orange-400',
        }
    }
  }

  // Filter & Sort logic
  const filteredQuestions = [...questions]
    .filter(q => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        q.question.toLowerCase().includes(query) ||
        q.subject.toLowerCase().includes(query) ||
        q.topic.toLowerCase().includes(query)
      )
    })
    .filter(q => {
      if (activeFilter === 'pyq') {
        return q.year !== undefined && q.year !== null && q.year !== ''
      }
      if (activeFilter === 'unanswered') {
        const commentsList = dummyDiscussions[q.id] || []
        return commentsList.length === 0 && (q.commentsCount === 0 || !q.commentsCount)
      }
      return true
    })
    .sort((a, b) => {
      if (activeFilter === 'trending') {
        const aScore = (a.likes || 0) + (a.commentsCount || 0) + (dummyDiscussions[a.id]?.length || 0) * 10
        const bScore = (b.likes || 0) + (b.commentsCount || 0) + (dummyDiscussions[b.id]?.length || 0) * 10
        return bScore - aScore
      }
      return a.id - b.id // Default sort by ID
    })

  // Discussion Actions
  const handleAddComment = (e) => {
    e.preventDefault()
    if (!newCommentText.trim() || !selectedQuestion) return

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

    if (!dummyDiscussions[selectedQuestion.id]) {
      dummyDiscussions[selectedQuestion.id] = []
    }
    dummyDiscussions[selectedQuestion.id].push(newComment)
    
    // Sync comments count locally for visual update
    selectedQuestion.commentsCount = (selectedQuestion.commentsCount || 0) + 1
  }

  const handleAddReply = (commentId) => {
    const text = replyTexts[commentId]
    if (!text || !text.trim() || !selectedQuestion) return

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
    const qComments = dummyDiscussions[selectedQuestion.id] || []
    const targetComment = qComments.find((c) => c.id === commentId)
    if (targetComment) {
      if (!targetComment.replies) targetComment.replies = []
      targetComment.replies.push(newReply)
    }

    // Sync comments count locally for visual update
    selectedQuestion.commentsCount = (selectedQuestion.commentsCount || 0) + 1
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

    // Sync to global mock database
    const qComments = dummyDiscussions[selectedQuestion.id] || []
    if (!isReply) {
      const targetComment = qComments.find((c) => c.id === commentId)
      if (targetComment) targetComment.likes = (targetComment.likes || 0) + 1
    } else {
      const parent = qComments.find((c) => c.id === parentId)
      if (parent && parent.replies) {
        const reply = parent.replies.find((r) => r.id === commentId)
        if (reply) reply.likes = (reply.likes || 0) + 1
      }
    }
  }

  return (
    <div className="flex-1 bg-bg-light dark:bg-bg-dark h-[calc(100vh-4rem)] flex flex-col overflow-hidden relative transition-colors duration-200">
      
      {/* 1. QUESTIONS LIST VIEW */}
      {!selectedQuestion ? (
        <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8 max-w-5xl mx-auto w-full space-y-6 custom-scrollbar">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <MessageSquare className="text-primary" size={26} />
              <span>Discussion Forums</span>
            </h1>
            <p className="text-xs text-slate-500">Ask questions, share explanations, and discuss concepts with peers.</p>
          </div>

          {/* Quick Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-4 rounded-card shadow-soft">
            
            {/* Quick Filters */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-btn w-full sm:w-auto shrink-0 overflow-x-auto select-none">
              {[
                { id: 'all', label: 'All' },
                { id: 'pyq', label: 'PYQs' },
                { id: 'trending', label: 'Trending' },
                { id: 'unanswered', label: 'Unanswered' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-btn transition-all whitespace-nowrap ${
                    activeFilter === tab.id
                      ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-350'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search subjects, topics, question..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Questions Feed Cards */}
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-16 bg-card-light dark:bg-card-dark rounded-card border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                <p className="font-bold text-sm">No matching questions found.</p>
                <p className="text-xs mt-1">Try relaxing your search terms or choosing another category.</p>
              </div>
            ) : (
              filteredQuestions.map(q => {
                const config = getSubjectConfig(q.subject)
                const Icon = config.icon
                const commentCount = (dummyDiscussions[q.id]?.length || 0) + (q.commentsCount || 0)

                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuestion(q)}
                    className="p-5 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-card hover:border-slate-300 dark:hover:border-slate-800 hover:shadow-soft cursor-pointer transition-all duration-200 flex flex-col justify-between gap-4 relative group"
                  >
                    {/* Top Row: Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className={`h-6 w-6 rounded flex items-center justify-center shrink-0 border ${config.colorClass}`}>
                          <Icon size={12} />
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                          {q.subject}
                        </span>
                        <span className="text-slate-300 dark:text-slate-800">•</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {q.topic}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {q.year && (
                          <span className="text-[9px] font-extrabold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded uppercase border border-indigo-500/10">
                            PYQ {q.year}
                          </span>
                        )}
                        <span className="text-[9px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded uppercase border border-amber-500/10">
                          {q.marks} Marks
                        </span>
                        <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase">
                          {q.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Question text snippet */}
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-150 leading-relaxed break-words line-clamp-2 pl-0.5">
                      {q.question.replace(/\n/g, ' ')}
                    </div>

                    {/* Bottom Row: Stats Counters */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-900/60 flex items-center gap-4 text-xs font-bold text-slate-450 dark:text-slate-500">
                      <span className="flex items-center gap-1 hover:text-slate-655 transition-colors">
                        <ThumbsUp size={13} className="fill-none text-slate-400" />
                        <span>{q.likes + (votes[q.id] === 'up' ? 1 : 0)} Upvotes</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 hover:text-slate-655 transition-colors">
                        <MessageSquare size={13} className="fill-none text-slate-400" />
                        <span>{commentCount} Comments</span>
                      </span>
                      
                      <span className="ml-auto text-[10px] font-extrabold text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex items-center gap-0.5">
                        <span>Join Discussion</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : (
        
        // 2. DETAILED SPLIT-PANE DISCUSSIONS VIEW
        <div className="flex-1 w-full h-full flex flex-col md:flex-row overflow-hidden font-sans">
          
          {/* Mobile view tabs */}
          <div className="flex md:hidden border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900 shrink-0">
            <button
              onClick={() => setMobileTab('question')}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
                mobileTab === 'question'
                  ? 'border-primary text-primary bg-indigo-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-750 dark:hover:text-slate-350'
              }`}
            >
              Question Details
            </button>
            <button
              onClick={() => setMobileTab('discussion')}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
                mobileTab === 'discussion'
                  ? 'border-primary text-primary bg-indigo-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-750 dark:hover:text-slate-350'
              }`}
            >
              Discussions ({comments.length})
            </button>
          </div>

          {/* LEFT PANEL: QUESTION VIEW */}
          <div 
            className={`w-full md:w-[460px] lg:w-[500px] shrink-0 border-r border-border-light dark:border-border-dark flex flex-col bg-card-light dark:bg-card-dark h-full relative ${
              mobileTab === 'question' ? 'flex' : 'hidden md:flex'
            }`}
          >
            {/* Left Panel Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 shrink-0">
              <button
                onClick={() => setSelectedQuestion(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-350 font-bold text-xs transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
              >
                <X size={14} />
                <span>Back to Forums</span>
              </button>
              <span className="text-xs font-extrabold text-slate-450 uppercase tracking-wider">Question #{selectedQuestion.id}</span>
            </div>

            {/* Read-Only Question Details */}
            <div className="flex-1 overflow-y-auto p-5 pr-14 custom-scrollbar space-y-5 pb-16 relative">
              
              {/* Subject & Topics Badge */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3 text-[10px] text-slate-400">
                <span className="text-primary font-bold">{selectedQuestion.subject}</span>
                <span>•</span>
                <span className="truncate max-w-[130px]">{selectedQuestion.topic}</span>
                {selectedQuestion.year && (
                  <>
                    <span>•</span>
                    <span className="font-semibold">GATE {selectedQuestion.year}</span>
                  </>
                )}
              </div>

              {/* Weight badges */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[9px] uppercase tracking-wide text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/10">
                  {selectedQuestion.type}
                </span>
                <span className="font-bold text-[9px] uppercase tracking-wide text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/10">
                  {selectedQuestion.marks} Marks
                </span>
                <span className="font-bold text-[9px] uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-400">
                  {selectedQuestion.difficulty}
                </span>
              </div>

              {/* Question Text */}
              <div className="text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                {selectedQuestion.question}
              </div>

              {/* Options Section - Read Only Form */}
              <div className="space-y-2.5 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Question Options Key</span>
                
                {selectedQuestion.type === 'MCQ' && (
                  <div className="space-y-2">
                    {selectedQuestion.options.map((option, idx) => {
                      const isCorrect = selectedQuestion.answer === idx
                      return (
                        <div
                          key={idx}
                          className={`w-full py-2.5 px-3.5 rounded-btn border text-xs flex items-start gap-3 transition-colors ${
                            isCorrect
                              ? 'border-success bg-emerald-500/10 text-success font-medium'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 text-slate-400'
                          }`}
                        >
                          <span className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold ${
                            isCorrect ? 'bg-success border-success text-white' : 'border-slate-300 dark:border-slate-700 text-slate-400'
                          }`}>
                            {isCorrect ? <Check size={12} strokeWidth={3} /> : String.fromCharCode(65 + idx)}
                          </span>
                          <span className="flex-1 min-w-0 break-words mt-0.5">{option}</span>
                          {isCorrect && (
                            <span className="text-[8px] uppercase tracking-wide font-black bg-success/20 px-1.5 py-0.5 rounded">
                              Correct Answer
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {selectedQuestion.type === 'MSQ' && (
                  <div className="space-y-2">
                    {selectedQuestion.options.map((option, idx) => {
                      const isCorrect = selectedQuestion.answer.includes(idx)
                      return (
                        <div
                          key={idx}
                          className={`w-full py-2.5 px-3.5 rounded-btn border text-xs flex items-start gap-3 transition-colors ${
                            isCorrect
                              ? 'border-success bg-emerald-500/10 text-success font-medium'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 text-slate-400'
                          }`}
                        >
                          <span className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 text-xs font-bold ${
                            isCorrect ? 'bg-success border-success text-white' : 'border-slate-300 dark:border-slate-700 text-slate-400'
                          }`}>
                            {isCorrect ? <Check size={12} strokeWidth={3} /> : null}
                          </span>
                          <span className="flex-1 min-w-0 break-words mt-0.5">{option}</span>
                          {isCorrect && (
                            <span className="text-[8px] uppercase tracking-wide font-black bg-success/20 px-1.5 py-0.5 rounded">
                              Key
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {selectedQuestion.type === 'NAT' && (
                  <div className="p-3.5 rounded border border-success bg-emerald-500/5 text-success text-xs font-medium flex justify-between items-center">
                    <div>
                      <span className="text-[8px] block font-bold text-slate-400 uppercase tracking-wide mb-0.5">Numerical Answer Key:</span>
                      <span className="text-sm font-mono font-extrabold">{selectedQuestion.answer}</span>
                    </div>
                    <span className="text-[9px] uppercase font-black bg-success/20 px-2 py-0.5 rounded">
                      Correct Key
                    </span>
                  </div>
                )}
              </div>

              {/* Solution Explanation Box */}
              <div className="p-4.5 rounded-card border border-primary/10 bg-indigo-50/25 dark:bg-indigo-950/10 space-y-2">
                <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                  <Sparkles size={14} />
                  <span>Solutions Explanation</span>
                </div>
                <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/40 pt-2 whitespace-pre-wrap">
                  {selectedQuestion.explanation}
                </div>
              </div>

            </div>

            {/* Left Pane Action Floating Reel */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-10 p-2.5 rounded-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 dark:border-slate-800/25 shadow-lg">
              
              {/* Upvote */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => upvoteQuestion(selectedQuestion.id)}
                  className={`group relative h-9 w-9 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 ${
                    votes[selectedQuestion.id] === 'up'
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-5'
                  }`}
                >
                  <ThumbsUp size={14} className={votes[selectedQuestion.id] === 'up' ? 'fill-white text-white' : 'text-slate-500'} />
                  <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                    Upvote
                  </span>
                </button>
                <span className="text-[9px] font-bold text-slate-500 mt-0.5">
                  {selectedQuestion.likes + (votes[selectedQuestion.id] === 'up' ? 1 : 0)}
                </span>
              </div>

              {/* Downvote */}
              <button
                onClick={() => downvoteQuestion(selectedQuestion.id)}
                className={`group relative h-9 w-9 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 ${
                  votes[selectedQuestion.id] === 'down'
                    ? 'bg-error border-error text-white'
                    : 'bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-855 text-slate-500 hover:bg-slate-5'
                }`}
              >
                <ThumbsDown size={14} className={votes[selectedQuestion.id] === 'down' ? 'fill-white text-white' : 'text-slate-500'} />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                  Downvote
                </span>
              </button>

              {/* Bookmark */}
              <button
                onClick={() => toggleBookmark(selectedQuestion.id)}
                className={`group relative h-9 w-9 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 ${
                  bookmarks.includes(selectedQuestion.id)
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-5'
                }`}
              >
                <Bookmark size={14} className={bookmarks.includes(selectedQuestion.id) ? 'fill-white text-white' : 'text-slate-500'} />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                  Bookmark
                </span>
              </button>

              {/* Video Solution Link */}
              <button
                onClick={() => setActiveVideoSolutionUrl(selectedQuestion.videoSolutionUrl)}
                className="group relative h-9 w-9 rounded-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-850 flex items-center justify-center shadow-md text-slate-500 hover:bg-slate-5 transition-all active:scale-90"
              >
                <Play size={14} className="fill-slate-500 text-slate-500" />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                  Video Solution
                </span>
              </button>
            </div>
          </div>

          {/* RIGHT PANEL: INTERACTIVE DISCUSSION WORKSPACE */}
          <div 
            className={`flex-1 h-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 ${
              mobileTab === 'discussion' ? 'flex' : 'hidden md:flex'
            }`}
          >
            {/* Workspace Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 shrink-0">
              <div>
                <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark">Peers Discussion Thread</h3>
                <p className="text-[10px] text-slate-500">Ask questions, share explanations, or write down math formulas.</p>
              </div>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="p-1.5 rounded-full hover:bg-slate-250 dark:hover:bg-slate-800 text-slate-500 transition-colors hidden md:block"
              >
                <X size={20} />
              </button>
            </div>

            {/* Comment Thread Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-slate-50 dark:bg-slate-900/10">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 text-center text-slate-400 dark:text-slate-500">
                  <span className="text-sm font-bold">No posts in this thread yet.</span>
                  <span className="text-xs mt-1">Submit your solution approach or doubts below!</span>
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
                          <span className="text-xs font-semibold text-text-primary-light dark:text-text-primary-dark">
                            {comment.author}
                          </span>
                          <span className="text-[10px] text-slate-400">Just now</span>
                        </div>
                        <p className="text-sm mt-1 text-slate-700 dark:text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                          {comment.content}
                        </p>
                        
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

                    {/* Sub Replies list */}
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
                            <span className="text-[11px] font-semibold text-text-primary-light dark:text-text-primary-dark">
                              {reply.author}
                            </span>
                            <span className="text-[10px] text-slate-400">Just now</span>
                          </div>
                          <p className="text-xs mt-0.5 text-slate-650 dark:text-slate-400 leading-relaxed break-words">
                            {reply.content}
                          </p>
                          
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

                    {/* Reply Input Form */}
                    {activeReplyBox === comment.id && (
                      <div className="flex gap-2 mt-2 pl-8">
                        <input
                          type="text"
                          placeholder="Write a response..."
                          value={replyTexts[comment.id] || ''}
                          onChange={(e) => setReplyTexts((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                          className="flex-1 h-8 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary text-text-primary-light dark:text-text-primary-dark"
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

            {/* Add Comment Input Form */}
            <form onSubmit={handleAddComment} className="p-4 border-t border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question, share ideas..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 h-10 px-4 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary text-text-primary-light dark:text-text-primary-dark"
                />
                <button
                  type="submit"
                  className="h-10 px-4 flex items-center justify-center rounded-btn bg-primary text-white hover:bg-primary-hover transition-colors font-semibold text-sm"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>

        </div>
      )}
    </div>
  )
}
