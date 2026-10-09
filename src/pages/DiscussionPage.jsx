import React, { useState, useEffect, useMemo } from 'react'
import { 
  MessageSquare, Search, BookOpen, Clock, Calendar, Award, ThumbsUp, ThumbsDown, 
  CornerDownRight, Send, Check, Bookmark, Play, X, HelpCircle, Layers, Brain, Target, Zap, BarChart2, Settings2, Sparkles,
  ChevronLeft, Edit3, ArrowBigUp, ArrowBigDown, PenTool, ChevronDown, ChevronUp, Reply, Plus, Trash2
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import QuestionImage from '../components/QuestionImage'
import QuestionText from '../components/QuestionText'
import ScratchpadDrawer from '../components/ScratchpadDrawer'
import RichTextEditor from '../components/RichTextEditor'
import FormattedContent from '../components/FormattedContent'
import FilterDropdown from '../components/FilterDropdown'

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
  user,
  isAuthenticated,
  openAuthPrompt
}) {
  const hasChildren = reply.replies && reply.replies.length > 0
  const isReplying = activeReplyBox === reply.id
  const [showChildReplies, setShowChildReplies] = useState(false)
  const isAuthor = isCommentAuthor ? isCommentAuthor(reply, user) : false

  return (
    <div className={`space-y-2 ${depth > 0 ? (depth < 4 ? 'pl-3 sm:pl-5 border-l-2 border-slate-200 dark:border-slate-800' : 'pl-1 sm:pl-2') : ''}`}>
      <div className="flex items-start gap-2.5 bg-slate-50/70 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
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
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  openAuthPrompt && openAuthPrompt('reply to discussions', 'Please register or log in to reply to comments and discussions.')
                  return
                }
                setActiveReplyBox(isReplying ? null : reply.id)
              }}
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
              isAuthenticated={isAuthenticated}
              openAuthPrompt={openAuthPrompt}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DiscussionPage() {
  const { 
    questions, 
    bookmarks, 
    toggleBookmark, 
    votes, 
    upvoteQuestion, 
    downvoteQuestion,
    setActiveVideoSolutionUrl,
    scratchpadOpenQuestionId,
    setScratchpadOpenQuestionId,
    questionNotes,
    discussions,
    solutionVotes,
    addSolution,
    addReply,
    deleteComment,
    isCommentAuthor,
    voteSolution,
    activeDiscussionQuestionId,
    setActiveDiscussionQuestionId
  } = useAppStore()
  
  const { user, isAuthenticated, openAuthPrompt } = useAuthStore()

  // State
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'pyq' | 'trending' | 'unanswered' | 'aptitude'
  const [selectedSubject, setSelectedSubject] = useState('ALL')
  const [selectedYear, setSelectedYear] = useState('ALL')
  const [selectedTopic, setSelectedTopic] = useState('ALL')

  // Available filter options extracted from questions
  const availableSubjects = useMemo(() => {
    const subjects = new Set((questions || []).map(q => q.subject).filter(Boolean))
    return Array.from(subjects).sort()
  }, [questions])

  const parseSet = (s) => {
    if (typeof s === 'string') {
      const m = s.match(/\d+/)
      return m ? parseInt(m[0], 10) : 1
    }
    return Number(s) || 1
  }

  const availableYearOptions = useMemo(() => {
    const list = [{ value: 'ALL', label: 'All Years' }]
    const years = Array.from(new Set((questions || []).map(q => q.year).filter(Boolean)))
      .sort((a, b) => String(b).localeCompare(String(a)))
    
    years.forEach(yr => {
      const yrQuestions = (questions || []).filter(q => String(q.year) === String(yr))
      const sets = Array.from(new Set(yrQuestions.map(q => parseSet(q.set)))).sort((a, b) => a - b)
      if (sets.length > 1) {
        list.push({
          value: yr,
          label: `GATE ${yr} (All Sets)`,
          count: yrQuestions.length
        })
        sets.forEach(s => {
          const setCount = yrQuestions.filter(q => parseSet(q.set) === parseSet(s)).length
          list.push({
            value: `${yr}-S${s}`,
            label: `GATE ${yr} • Set ${s}`,
            count: setCount
          })
        })
      } else {
        list.push({
          value: yr,
          label: `GATE ${yr}`,
          count: yrQuestions.length
        })
      }
    })
    return list
  }, [questions])

  const availableTopics = useMemo(() => {
    const relevant = selectedSubject === 'ALL'
      ? (questions || [])
      : (questions || []).filter(q => q.subject === selectedSubject)
    const topics = new Set(relevant.map(q => q.topic).filter(Boolean))
    return Array.from(topics).sort()
  }, [questions, selectedSubject])
  
  // Discussion solution writing & reply state
  const [isWritingSolution, setIsWritingSolution] = useState(false)
  const [solutionDraft, setSolutionDraft] = useState('')
  const [replyDrafts, setReplyDrafts] = useState({}) // { [solutionId]: string }
  const [activeReplyBox, setActiveReplyBox] = useState(null) // solutionId or replyId
  const [questionRefExpanded, setQuestionRefExpanded] = useState(false)
  const [mobileTab, setMobileTab] = useState('question') // 'question' | 'discussion'
  const [expandedReplies, setExpandedReplies] = useState({}) // { [solutionId]: boolean }

  const toggleReplies = (id) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // Auto-select question if activeDiscussionQuestionId or URL query param is present
  useEffect(() => {
    if (questions && questions.length > 0) {
      const params = new URLSearchParams(window.location.search)
      const urlQId = params.get('questionId')
      const targetId = urlQId || activeDiscussionQuestionId
      if (targetId) {
        const found = questions.find(q => String(q.id) === String(targetId))
        if (found) {
          setSelectedQuestion(found)
        }
      }
    }
  }, [questions, activeDiscussionQuestionId])

  // Reset when selected question changes
  useEffect(() => {
    if (selectedQuestion) {
      setIsWritingSolution(false)
      setActiveReplyBox(null)
      setSolutionDraft('')
      setReplyDrafts({})
      setExpandedReplies({})
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
      // 1. Dropdown Filters
      if (selectedSubject !== 'ALL' && q.subject !== selectedSubject) return false
      if (selectedYear !== 'ALL') {
        if (selectedYear.includes('-S')) {
          const [yr, s] = selectedYear.split('-S')
          if (String(q.year) !== yr || parseSet(q.set) !== parseSet(s)) return false
        } else {
          if (String(q.year) !== String(selectedYear)) return false
        }
      }
      if (selectedTopic !== 'ALL' && q.topic !== selectedTopic) return false

      // 2. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const queryWords = query.split(/\s+/).filter(Boolean)
        const yearStr = q.year ? q.year.toString().toLowerCase() : ''
        const setStr = q.set ? `set ${q.set}` : ''
        const setShort = q.set ? `s${q.set}` : ''
        const questionText = (q.question || '').toLowerCase()
        const subjectText = (q.subject || '').toLowerCase()
        const topicText = (q.topic || '').toLowerCase()
        const idStr = (q.id || '').toString()

        // Direct year match (e.g. typing "2024", "2025", "gate 2024", "pyq 2024", "2025 set 2", "2024 s1")
        if (yearStr && (yearStr === query || yearStr.includes(query) || `gate ${yearStr}`.includes(query) || `pyq ${yearStr}`.includes(query) || (q.set && `gate ${yearStr} set ${q.set}`.includes(query)) || (q.set && `gate ${yearStr} s${q.set}`.includes(query)))) {
          // matched
        } else {
          // Multi-word matching across all fields including year and set
          const matchesAll = queryWords.every(word =>
            questionText.includes(word) ||
            subjectText.includes(word) ||
            topicText.includes(word) ||
            yearStr.includes(word) ||
            (setStr && setStr.includes(word)) ||
            (setShort && setShort === word) ||
            idStr === word ||
            `#${idStr}` === word
          )
          if (!matchesAll) return false
        }
      }

      // 3. Quick Filter Tabs
      if (activeFilter === 'pyq') {
        return q.year !== undefined && q.year !== null && q.year !== ''
      }
      if (activeFilter === 'unanswered') {
        const commentsList = discussions[q.id] || []
        return commentsList.length === 0 && (q.commentsCount === 0 || !q.commentsCount)
      }
      if (activeFilter === 'aptitude') {
        const sub = (q.subject || '').toLowerCase()
        const top = (q.topic || '').toLowerCase()
        return sub.includes('aptitude') || top.includes('aptitude')
      }
      return true
    })
    .sort((a, b) => {
      if (activeFilter === 'trending') {
        const aDiscussions = discussions[a.id] || []
        const bDiscussions = discussions[b.id] || []
        const aScore = (a.likes || 0) + (aDiscussions.length * 10)
        const bScore = (b.likes || 0) + (bDiscussions.length * 10)
        return bScore - aScore
      }
      return a.id - b.id // Default sort by ID
    })

  // Discussion Actions
  const handlePublishSolution = (contentOverride) => {
    const finalContent = (typeof contentOverride === 'string' && contentOverride.trim()) ? contentOverride : solutionDraft
    if (!finalContent.trim() || !selectedQuestion) return

    const authorName = isAuthenticated ? user.name : 'Anonymous Scholar'
    const authorAvatar = isAuthenticated
      ? user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`
      : `https://api.dicebear.com/7.x/adventurer/svg?seed=scholar-${Date.now()}`

    addSolution(selectedQuestion.id, {
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
    if (!text || !text.trim() || !selectedQuestion) return

    const authorName = isAuthenticated ? user.name : 'Anonymous Scholar'
    const authorAvatar = isAuthenticated
      ? user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`
      : `https://api.dicebear.com/7.x/adventurer/svg?seed=scholar-${Date.now()}`

    addReply(selectedQuestion.id, targetId, {
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
    if (!selectedQuestion || !commentId) return
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteComment(selectedQuestion.id, commentId)
    }
  }

  // Active question solutions sorted by net upvotes descending
  const currentSolutions = selectedQuestion ? (discussions[selectedQuestion.id] || []) : []
  const sortedSolutions = [...currentSolutions].sort((a, b) => {
    const netA = (a.upvotes || 0) - (a.downvotes || 0)
    const netB = (b.upvotes || 0) - (b.downvotes || 0)
    if (netB !== netA) return netB - netA
    return (b.timestamp || 0) - (a.timestamp || 0)
  })

  return (
    <div className="flex-1 bg-bg-light dark:bg-bg-dark h-[calc(100vh-4rem)] flex flex-col overflow-hidden relative transition-colors duration-200">
      
      {/* 1. QUESTIONS LIST VIEW */}
      {!selectedQuestion ? (
        <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8 max-w-5xl mx-auto w-full space-y-6 custom-scrollbar">
          {/* Header & Right-aligned Dropdown Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <MessageSquare className="text-primary" size={26} />
                <span>Discussion Forums</span>
              </h1>
              <p className="text-xs text-slate-500">Ask questions, share explanations, and discuss concepts with peers.</p>
            </div>

            {/* Dropdown Filters starting from right */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
              {/* All Subject Dropdown */}
              <FilterDropdown
                label={`All Subjects (${questions.length})`}
                value={selectedSubject}
                options={[
                  { value: 'ALL', label: `All Subjects (${questions.length})` },
                  ...availableSubjects.map(sub => ({
                    value: sub,
                    label: sub,
                    count: questions.filter(q => q.subject === sub).length
                  }))
                ]}
                onChange={(val) => {
                  setSelectedSubject(val)
                  setSelectedTopic('ALL')
                  if (val !== 'ALL' && activeFilter === 'aptitude' && !val.toLowerCase().includes('aptitude')) {
                    setActiveFilter('all')
                  }
                }}
                title="Filter by Subject"
                searchPlaceholder="Search subjects..."
              />

              {/* Year Wise Dropdown */}
              <FilterDropdown
                label="All Years"
                value={selectedYear}
                options={availableYearOptions}
                onChange={(val) => setSelectedYear(val)}
                title="Filter Year-wise"
                searchable={false}
              />

              {/* Topic Wise Dropdown */}
              <FilterDropdown
                label="All Topics"
                value={selectedTopic}
                options={[
                  { value: 'ALL', label: 'All Topics' },
                  ...availableTopics.map(top => ({
                    value: top,
                    label: top,
                    count: questions.filter(q => {
                      if (selectedSubject !== 'ALL' && q.subject !== selectedSubject) return false
                      return q.topic === top
                    }).length
                  }))
                ]}
                onChange={(val) => setSelectedTopic(val)}
                title="Filter Topic-wise"
                searchPlaceholder="Search topics..."
              />

              {/* Reset Dropdowns Button */}
              {(selectedSubject !== 'ALL' || selectedYear !== 'ALL' || selectedTopic !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject('ALL')
                    setSelectedYear('ALL')
                    setSelectedTopic('ALL')
                  }}
                  className="h-9 px-2.5 text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 rounded-btn transition-colors flex items-center gap-1 shrink-0"
                  title="Reset dropdown filters"
                >
                  <X size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-4 rounded-card shadow-soft">
            
            {/* Quick Filters */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-btn w-full sm:w-auto shrink-0 overflow-x-auto select-none">
              {[
                { id: 'all', label: 'All' },
                { id: 'pyq', label: 'PYQs' },
                { id: 'trending', label: 'Trending' },
                { id: 'unanswered', label: 'Unanswered' },
                { id: 'aptitude', label: 'Aptitude' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveFilter(tab.id)
                    if (tab.id === 'aptitude') {
                      if (selectedSubject !== 'ALL' && !selectedSubject.toLowerCase().includes('aptitude')) {
                        setSelectedSubject('ALL')
                        setSelectedTopic('ALL')
                      }
                    }
                  }}
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
                {(selectedSubject !== 'ALL' || selectedYear !== 'ALL' || selectedTopic !== 'ALL' || activeFilter !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedSubject('ALL')
                      setSelectedYear('ALL')
                      setSelectedTopic('ALL')
                      setActiveFilter('all')
                      setSearchQuery('')
                    }}
                    className="mt-3 px-3.5 py-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-btn transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Clear all filters</span>
                  </button>
                )}
              </div>
            ) : (
              filteredQuestions.map(q => {
                const config = getSubjectConfig(q.subject)
                const Icon = config?.icon || Brain
                const qDiscussions = (discussions && discussions[q.id]) || []
                const commentCount = qDiscussions.length + qDiscussions.reduce((acc, s) => acc + (s.replies?.length || 0), 0)

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
                            PYQ {q.year}{q.set ? ` • Set ${q.set}` : ''}
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
                        <span>{(Number(q?.likes) || 0) + (votes[q?.id] === 'up' ? 1 : 0)} Upvotes</span>
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
          {!isWritingSolution && (
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
                Discussions ({(discussions[selectedQuestion.id] || []).length})
              </button>
            </div>
          )}

          {/* LEFT PANEL: QUESTION VIEW */}
          <div 
            className={`w-full md:w-[460px] lg:w-[500px] shrink-0 border-r border-border-light dark:border-border-dark flex flex-col bg-card-light dark:bg-card-dark h-full relative ${
              isWritingSolution ? 'hidden' : (mobileTab === 'question' ? 'flex' : 'hidden md:flex')
            }`}
          >
            {/* Read-Only Question Details */}
            <div className="flex-1 overflow-y-auto p-5 pr-14 custom-scrollbar space-y-5 pb-16 relative">
              
              {/* Question Header: Line 1 (Back + Subject on left, Prominent Year on right) */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    onClick={() => setSelectedQuestion(null)}
                    className="flex items-center justify-center h-6 w-6 -ml-1 rounded-full text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/10 transition-colors group cursor-pointer shrink-0"
                    title="Back to Discussions"
                  >
                    <ChevronLeft size={18} className="text-primary group-hover:-translate-x-0.5 transition-transform" />
                  </button>
                  <span className="text-xs font-bold text-primary truncate">
                    {selectedQuestion.subject}
                  </span>
                </div>
                {selectedQuestion.year && (
                  <span className="text-[11px] font-extrabold text-white bg-primary px-2.5 py-0.5 rounded-full shadow-xs tracking-wide shrink-0">
                    GATE {selectedQuestion.year}{selectedQuestion.set ? ` • Set ${selectedQuestion.set}` : ''}
                  </span>
                )}
              </div>

              {/* Horizontal break line */}
              <hr className="border-slate-100 dark:border-slate-800 -mt-2" />

              {/* Line 2: Topic on left, then other badges (Type, Marks, Difficulty) appearing AFTER the horizontal break line */}
              <div className="flex flex-wrap items-center gap-2 -mt-2 text-xs">
                <span className="font-medium text-xs text-slate-600 dark:text-slate-300">
                  {selectedQuestion.topic}
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                {selectedQuestion.type && (
                  <span className="font-bold text-[9px] uppercase tracking-wide text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {selectedQuestion.type}
                  </span>
                )}
                {selectedQuestion.marks && (
                  <span className="font-bold text-[9px] uppercase tracking-wide text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {selectedQuestion.marks} {selectedQuestion.marks === 1 ? 'Mark' : 'Marks'}
                  </span>
                )}
                {selectedQuestion.difficulty && (
                  <span className="font-bold text-[9px] uppercase tracking-wide px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200/50 dark:border-slate-700/50 text-slate-500 dark:text-slate-400">
                    {selectedQuestion.difficulty}
                  </span>
                )}
              </div>

              {/* Question Text */}
              <div className="text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
                <QuestionText text={selectedQuestion.question} />
              </div>

              {/* Question Diagram / Image (if present) */}
              <QuestionImage 
                src={selectedQuestion.imageUrl || selectedQuestion.diagramUrl || selectedQuestion.image} 
                alt={selectedQuestion.imageAlt || 'Question Diagram'} 
              />

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
            <div className="absolute right-2 top-1/2 -translate-y-1/2 md:top-5 md:translate-y-0 md:right-3 flex flex-col gap-3.5 md:gap-2.5 z-10 p-2 md:p-0 rounded-full bg-white/60 dark:bg-slate-900/60 md:bg-transparent md:dark:bg-transparent backdrop-blur-md md:backdrop-blur-none border border-white/20 dark:border-slate-800/25 md:border-none shadow-lg md:shadow-none">
              
              {/* Upvote */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => upvoteQuestion(selectedQuestion.id)}
                  className={`group relative h-9 w-9 rounded-full flex items-center justify-center shadow-md md:shadow-sm border transition-all active:scale-90 ${
                    votes[selectedQuestion.id] === 'up'
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  <ThumbsUp size={14} className={votes[selectedQuestion.id] === 'up' ? 'fill-white text-white' : 'text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors'} />
                  <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10 z-20">
                    Upvote
                  </span>
                </button>
                <span className={`text-[9px] font-bold mt-0.5 transition-colors ${votes[selectedQuestion.id] === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}>
                  {(Number(selectedQuestion?.likes) || 0) + (votes[selectedQuestion.id] === 'up' ? 1 : 0)}
                </span>
              </div>

              {/* Downvote */}
              <button
                onClick={() => downvoteQuestion(selectedQuestion.id)}
                className={`group relative h-9 w-9 rounded-full flex items-center justify-center shadow-md md:shadow-sm border transition-all active:scale-90 ${
                  votes[selectedQuestion.id] === 'down'
                    ? 'bg-rose-500 border-rose-500 text-white shadow-rose-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400'
                }`}
              >
                <ThumbsDown size={14} className={votes[selectedQuestion.id] === 'down' ? 'fill-white text-white' : 'text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors'} />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10 z-20">
                  Downvote
                </span>
              </button>

              {/* Bookmark */}
              <button
                onClick={() => toggleBookmark(selectedQuestion.id)}
                className={`group relative h-9 w-9 rounded-full flex items-center justify-center shadow-md md:shadow-sm border transition-all active:scale-90 ${
                  bookmarks.includes(selectedQuestion.id)
                    ? 'bg-amber-500 border-amber-500 text-white shadow-amber-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
              >
                <Bookmark size={14} className={bookmarks.includes(selectedQuestion.id) ? 'fill-white text-white' : 'text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors'} />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10 z-20">
                  Bookmark
                </span>
              </button>

              {/* Scratchpad Button */}
              <button
                onClick={() => setScratchpadOpenQuestionId(selectedQuestion.id)}
                className="group relative h-9 w-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-md md:shadow-sm text-slate-500 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-90"
              >
                <Edit3 size={14} className="text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                {questionNotes[selectedQuestion.id] && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-white dark:border-slate-900 animate-pulse" />
                )}
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10 z-20">
                  Scratchpad
                </span>
              </button>

              {/* Video Solution Link */}
              <button
                onClick={() => setActiveVideoSolutionUrl(selectedQuestion.videoSolutionUrl, selectedQuestion)}
                className="group relative h-9 w-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-md md:shadow-sm text-slate-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-all active:scale-90"
              >
                <Play size={14} className="fill-slate-500 text-slate-500 group-hover:fill-red-600 group-hover:text-red-600 dark:group-hover:fill-red-400 dark:group-hover:text-red-400 transition-colors" />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10 z-20">
                  Video Solution
                </span>
              </button>
            </div>

            {/* Scratchpad Drawer */}
            {scratchpadOpenQuestionId === selectedQuestion?.id && (
              <ScratchpadDrawer
                currentQuestion={selectedQuestion}
                selectedAnswers={{ [selectedQuestion.id]: selectedQuestion.answer }}
                isMSQCorrect={() => true}
                isNATCorrect={() => true}
              />
            )}
          </div>

          {/* RIGHT PANEL: INTERACTIVE DISCUSSION WORKSPACE / DEDICATED SOLUTION STUDIO */}
          {isWritingSolution ? (
            /* DEDICATED FULL-PANE SOLUTION STUDIO */
            <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 p-3 md:p-5">
              {/* Studio Header Bar */}
              <div className="flex items-center justify-between mb-3 bg-card-light dark:bg-card-dark px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark shadow-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsWritingSolution(false)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                  >
                    <ChevronLeft size={16} />
                    <span>Back to Discussions</span>
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-xs md:text-sm font-extrabold text-text-primary-light dark:text-text-primary-dark">
                      Write Solution
                    </span>
                    {selectedQuestion.year && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                        GATE {selectedQuestion.year}{selectedQuestion.set ? ` • Set ${selectedQuestion.set}` : ''}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline truncate">
                      {selectedQuestion.topic}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setQuestionRefExpanded(!questionRefExpanded)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover px-2.5 py-1 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-colors shrink-0"
                >
                  <span className="hidden sm:inline">{questionRefExpanded ? 'Hide Question' : 'View Question Reference'}</span>
                  <span className="sm:hidden">{questionRefExpanded ? 'Hide' : 'Question'}</span>
                  {questionRefExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Collapsible Question Reference Accordion */}
              {questionRefExpanded && (
                <div className="mb-3 p-4 bg-card-light dark:bg-card-dark border border-primary/25 rounded-xl shadow-md max-h-56 overflow-y-auto custom-scrollbar space-y-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Question Prompt Reference
                    </span>
                    <span className="text-[10px] font-semibold text-primary">
                      {selectedQuestion.subject} • {selectedQuestion.topic}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                    <QuestionText text={selectedQuestion.question} />
                  </div>
                  {/* Diagram / Image */}
                  {(selectedQuestion.imageUrl || selectedQuestion.diagramUrl || selectedQuestion.image) && (
                    <QuestionImage
                      src={selectedQuestion.imageUrl || selectedQuestion.diagramUrl || selectedQuestion.image}
                      alt="Question Reference"
                    />
                  )}
                </div>
              )}

              {/* Expansive Full Rich Text Editor */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <RichTextEditor
                  mode="full"
                  value={solutionDraft}
                  onChange={setSolutionDraft}
                  onSubmit={handlePublishSolution}
                  onCancel={() => setIsWritingSolution(false)}
                  submitLabel="Publish Solution"
                  submitIcon={PenTool}
                  placeholder="Type your comprehensive solution step-by-step. Use the Math menu (∑) to insert LaTeX formulas, format code blocks, create comparison tables, or add key highlights..."
                  className="h-full"
                  autoFocus={true}
                />
              </div>
            </div>
          ) : (
            /* STANDARD DISCUSSION & SOLUTIONS STREAM */
            <div 
              className={`flex-1 h-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 ${
                mobileTab === 'discussion' ? 'flex' : 'hidden md:flex'
              }`}
            >
              {/* Thread Header */}
              <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm md:text-base text-text-primary-light dark:text-text-primary-dark">
                      Solutions & Discussions
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary">
                      {sortedSolutions.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Solutions ranked by net peer upvotes. Write down formulas and detailed proofs.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) {
                        openAuthPrompt('post solutions', 'Please register or log in to post your solutions and share insights with the community.')
                        return
                      }
                      setIsWritingSolution(true)
                      setMobileTab('discussion')
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-btn text-xs font-bold hover:bg-primary-hover active:scale-95 shadow-xs transition-all"
                  >
                    <PenTool size={13} />
                    <span>Write Solution</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedQuestion(null)}
                    className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors hidden md:block"
                    title="Close Discussion"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Solutions & Doubts Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50 dark:bg-slate-900/10">
                {sortedSolutions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-500 space-y-3 bg-card-light dark:bg-card-dark rounded-xl border border-dashed border-border-light dark:border-border-dark p-6">
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <PenTool size={22} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">No solutions posted yet</h4>
                      <p className="text-xs mt-1 text-slate-400 max-w-sm">
                        Be the pioneer to contribute an explanation, formula derivation, or key trick for this problem!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAuthenticated) {
                          openAuthPrompt('post solutions', 'Please register or log in to post your solutions and share insights with the community.')
                          return
                        }
                        setIsWritingSolution(true)
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-btn text-xs font-bold hover:bg-primary-hover shadow-xs active:scale-95 transition-all"
                    >
                      <Plus size={14} />
                      <span>Write First Solution</span>
                    </button>
                  </div>
                ) : (
                  sortedSolutions.map((solution, idx) => {
                    const netVotes = (solution.upvotes || 0) - (solution.downvotes || 0)
                    const userVote = solutionVotes[solution.id]
                    const isTopSolution = idx === 0 && netVotes > 0

                    return (
                      <div 
                        key={solution.id} 
                        className={`bg-card-light dark:bg-card-dark border rounded-xl p-4 shadow-xs transition-all space-y-3 ${
                          isTopSolution
                            ? 'border-indigo-500/30 dark:border-indigo-500/30 ring-1 ring-indigo-500/10'
                            : 'border-border-light dark:border-border-dark'
                        }`}
                      >
                        {/* Top Metadata Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={solution.avatar}
                              alt={solution.author}
                              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark">
                                  {solution.author}
                                </span>
                                {isTopSolution && (
                                  <span className="text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    ★ Top Solution
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {solution.createdAt || 'Recent'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Main Body with Left Vote Pillar & Right Content */}
                        <div className="flex items-start gap-3 pt-1">
                          {/* Left Voting Column (Upvote / Score / Downvote) */}
                          <div className="flex flex-col items-center bg-slate-100/70 dark:bg-slate-900/70 p-1 rounded-lg border border-slate-200/60 dark:border-slate-800/60 shrink-0 select-none">
                            {/* Upvote Button */}
                            <button
                              type="button"
                              onClick={() => voteSolution(selectedQuestion.id, solution.id, 'up')}
                              className={`p-1 rounded transition-all active:scale-90 ${
                                userVote === 'up'
                                  ? 'text-emerald-500 bg-emerald-500/10'
                                  : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                              }`}
                              title="Upvote Solution"
                            >
                              <ArrowBigUp size={18} className={userVote === 'up' ? 'fill-emerald-500' : ''} />
                            </button>

                            {/* Net Vote Score */}
                            <span className={`text-[11px] font-black my-0.5 font-mono ${
                              netVotes > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                              netVotes < 0 ? 'text-rose-600 dark:text-rose-400' :
                              'text-slate-500'
                            }`}>
                              {netVotes > 0 ? `+${netVotes}` : netVotes}
                            </span>

                            {/* Downvote Button */}
                            <button
                              type="button"
                              onClick={() => voteSolution(selectedQuestion.id, solution.id, 'down')}
                              className={`p-1 rounded transition-all active:scale-90 ${
                                userVote === 'down'
                                  ? 'text-rose-500 bg-rose-500/10'
                                  : 'text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                              }`}
                              title="Downvote Solution"
                            >
                              <ArrowBigDown size={18} className={userVote === 'down' ? 'fill-rose-500' : ''} />
                            </button>
                          </div>

                          {/* Right Content Area */}
                          <div className="flex-1 min-w-0">
                            <FormattedContent content={solution.content} />
                            
                            {/* Action Bar */}
                            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100 dark:border-slate-850 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isAuthenticated) {
                                    openAuthPrompt('reply to discussions', 'Please register or log in to reply to comments and discussions.')
                                    return
                                  }
                                  setActiveReplyBox(activeReplyBox === solution.id ? null : solution.id)
                                }}
                                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
                              >
                                <Reply size={13} />
                                <span>Reply</span>
                              </button>

                              {solution.replies && solution.replies.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleReplies(solution.id)}
                                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/15 px-2.5 py-1 rounded-md transition-all active:scale-95"
                                >
                                  {expandedReplies[solution.id] ? (
                                    <>
                                      <ChevronUp size={13} />
                                      <span>Hide {solution.replies.length === 1 ? 'reply' : `${solution.replies.length} replies`}</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown size={13} />
                                      <span>View {solution.replies.length === 1 ? 'reply' : `${solution.replies.length} replies`}</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {isCommentAuthor(solution, user) && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(solution.id)}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors ml-auto sm:ml-0"
                                  title="Delete your solution"
                                >
                                  <Trash2 size={13} />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Nested Replies Stream (WITHOUT UPVOTE/DOWNVOTE BUTTONS) */}
                        {solution.replies && solution.replies.length > 0 && expandedReplies[solution.id] && (
                          <div className="space-y-3 pt-2 pl-3 sm:pl-7 border-t border-slate-100 dark:border-slate-850 animate-in fade-in duration-200">
                            {solution.replies.map((reply) => (
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
                                isAuthenticated={isAuthenticated}
                                openAuthPrompt={openAuthPrompt}
                              />
                            ))}
                          </div>
                        )}

                        {/* Embedded Inline Rich Text Editor for Solution Reply */}
                        {activeReplyBox === solution.id && (
                          <div className="pt-3 pl-3 sm:pl-7">
                            <div className="p-3 bg-card-light dark:bg-card-dark rounded-xl border border-primary/30 shadow-sm space-y-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1.5 text-primary">
                                  <Reply size={12} />
                                  <span>Replying to {solution.author}</span>
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
                                value={replyDrafts[solution.id] || ''}
                                onChange={(val) => setReplyDrafts((prev) => ({ ...prev, [solution.id]: val }))}
                                onSubmit={(val) => handleAddReply(solution.id, solution.author, val)}
                                onCancel={() => setActiveReplyBox(null)}
                                submitLabel="Post Reply"
                                placeholder={`Write your formatted reply to ${solution.author}... (supports GATE math ∑, images, markdown)`}
                                autoFocus={true}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}

                {/* Bottom Call-to-action */}
                {sortedSolutions.length > 0 && (
                  <div className="p-4 bg-gradient-to-r from-primary/5 via-indigo-500/5 to-transparent rounded-xl border border-primary/15 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-bold text-text-primary-light dark:text-text-primary-dark block">
                        Have a different solving approach?
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        Share alternative formulas, quick tricks, or counter-examples.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAuthenticated) {
                          openAuthPrompt('post solutions', 'Please register or log in to post your solutions and share insights with the community.')
                          return
                        }
                        setIsWritingSolution(true)
                        setMobileTab('discussion')
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-btn text-xs font-bold hover:bg-primary-hover shadow-xs active:scale-95 transition-all shrink-0"
                    >
                      <PenTool size={13} />
                      <span>Write Solution</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
