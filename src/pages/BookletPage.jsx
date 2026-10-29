import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  BookOpen, BookText, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, 
  Search, Sparkles, Filter, Check, Bookmark, MessageSquare, 
  Lightbulb, CheckCircle2, ThumbsUp, ThumbsDown, CornerDownRight, 
  Send, Reply, Play, ArrowUpDown, X, ListTree, ArrowLeft,
  Maximize2, Minimize2, HelpCircle, FileText, Hash, ExternalLink
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useAuthStore } from '../store/useAuthStore'
import { TOPICS, getTags, hasTag } from '../utils/topics'
import { SUBJECTS, compareSubjects } from '../utils/subjects'
import QuestionText from '../components/QuestionText'
import QuestionImage from '../components/QuestionImage'
import FormattedContent from '../components/FormattedContent'
import AnswerProvenance from '../components/AnswerProvenance'

// Roman numerals for booklet subjects
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV']

export default function BookletPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const { 
    questions, 
    loadingQuestions, 
    fetchQuestions, 
    discussions, 
    fetchDiscussions, 
    bookmarks, 
    toggleQuestionInFolder,
    openVideoSolution,
    addSolution,
    addReply,
    upvoteSolution,
    downvoteSolution
  } = useAppStore()

  const { isAuthenticated, user, openAuthPrompt } = useAuthStore()

  // --- STATE ---
  // isContentsView: true = viewing full book Table of Contents; false = viewing split 2-pane questions/solutions
  const [isContentsView, setIsContentsView] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState(null)

  // Search & filter in Table of Contents
  const [contentsSearch, setContentsSearch] = useState('')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL')

  // Questions split view state
  const [activeQuestionId, setActiveQuestionId] = useState(null)
  const [activeRightTab, setActiveRightTab] = useState('solution') // 'solution' | 'discussion'
  const [sortAscending, setSortAscending] = useState(true) // Chronological year-wise (earliest -> latest) like classic textbooks

  // Discussion reply drafts
  const [newCommentText, setNewCommentText] = useState('')
  const [activeReplyId, setActiveReplyId] = useState(null)
  const [replyDrafts, setReplyDrafts] = useState({})
  const [submittingComment, setSubmittingComment] = useState(false)

  // Refs for scrolling to 1-mark and 2-mark sections
  const oneMarkRef = useRef(null)
  const twoMarkRef = useRef(null)
  const questionsContainerRef = useRef(null)

  // Fetch questions and discussions on mount
  useEffect(() => {
    fetchQuestions()
    fetchDiscussions()
  }, [fetchQuestions, fetchDiscussions])

  // --- HIERARCHY BUILDER: SUBJECTS -> TOPICS WITH COUNTS ---
  const { subjectsHierarchy, totalTopicsCount } = useMemo(() => {
    let topicCounter = 0

    // Build map of questions per subject and topic
    const subjectTopicMap = new Map()

    questions.forEach(q => {
      const tags = getTags(q)
      tags.forEach(({ subject, topic }) => {
        if (!subject || !topic) return
        if (!subjectTopicMap.has(subject)) {
          subjectTopicMap.set(subject, new Map())
        }
        const topicsMap = subjectTopicMap.get(subject)
        topicsMap.set(topic, (topicsMap.get(topic) || 0) + 1)
      })
    })

    // Order subjects according to standard GATE CS curriculum
    const sortedSubjectNames = Array.from(
      new Set([...SUBJECTS, ...Array.from(subjectTopicMap.keys())])
    ).sort(compareSubjects)

    const result = []

    sortedSubjectNames.forEach((subjectName) => {
      const definedTopics = TOPICS.find(t => t.subject === subjectName)?.topics || []
      const presentTopicsMap = subjectTopicMap.get(subjectName) || new Map()

      // Merge defined topics and any dynamic topics present in questions
      const allTopicNames = Array.from(
        new Set([...definedTopics, ...Array.from(presentTopicsMap.keys())])
      )

      const subjectTopics = []

      allTopicNames.forEach((topicName) => {
        const count = presentTopicsMap.get(topicName) || 0
        topicCounter++

        subjectTopics.push({
          topicName,
          questionCount: count
        })
      })

      const totalSubjectQuestions = subjectTopics.reduce((acc, t) => acc + t.questionCount, 0)

      if (subjectTopics.length > 0) {
        result.push({
          subjectName,
          topics: subjectTopics,
          totalQuestions: totalSubjectQuestions
        })
      }
    })

    return { subjectsHierarchy: result, totalTopicsCount: topicCounter }
  }, [questions])

  // Filter Table of Contents by search query & subject filter
  const filteredSubjectsHierarchy = useMemo(() => {
    let list = subjectsHierarchy
    if (selectedSubjectFilter !== 'ALL') {
      list = list.filter(s => s.subjectName === selectedSubjectFilter)
    }
    if (!contentsSearch.trim()) return list
    const q = contentsSearch.toLowerCase().trim()

    return list
      .map(subj => {
        const matchesSubject = subj.subjectName.toLowerCase().includes(q)
        const matchedTopics = subj.topics.filter(t => 
          matchesSubject || t.topicName.toLowerCase().includes(q)
        )
        if (matchesSubject || matchedTopics.length > 0) {
          return {
            ...subj,
            topics: matchesSubject ? subj.topics : matchedTopics
          }
        }
        return null
      })
      .filter(Boolean)
  }, [subjectsHierarchy, contentsSearch, selectedSubjectFilter])

  // --- FILTER & SEGREGATE QUESTIONS FOR SELECTED TOPIC ---
  const { oneMarkQuestions, twoMarkQuestions, allTopicQuestions } = useMemo(() => {
    if (!selectedSubject || !selectedTopic) {
      return { oneMarkQuestions: [], twoMarkQuestions: [], allTopicQuestions: [] }
    }

    const matched = questions.filter(q => hasTag(q, selectedSubject, selectedTopic))

    // Segregate into 1-mark and 2-mark questions
    const oneMark = matched.filter(q => q.marks === 1)
    const twoMark = matched.filter(q => q.marks === 2)

    // Year-wise sorting comparator
    const sortFn = (a, b) => {
      const yA = parseInt(a.year, 10) || 0
      const yB = parseInt(b.year, 10) || 0
      if (yA !== yB) {
        return sortAscending ? yA - yB : yB - yA
      }
      // If same year, order by question number or set
      return (a.questionNumber || 0) - (b.questionNumber || 0)
    }

    oneMark.sort(sortFn)
    twoMark.sort(sortFn)

    return {
      oneMarkQuestions: oneMark,
      twoMarkQuestions: twoMark,
      allTopicQuestions: [...oneMark, ...twoMark]
    }
  }, [questions, selectedSubject, selectedTopic, sortAscending])

  // Active question object in right pane
  const activeQuestion = useMemo(() => {
    if (!activeQuestionId) return allTopicQuestions[0] || null
    return allTopicQuestions.find(q => q.id === activeQuestionId) || allTopicQuestions[0] || null
  }, [allTopicQuestions, activeQuestionId])

  // Auto-set active question when topic changes
  useEffect(() => {
    if (allTopicQuestions.length > 0) {
      setActiveQuestionId(allTopicQuestions[0].id)
    }
  }, [selectedSubject, selectedTopic])

  // Helper to handle selecting a topic from Table of Contents
  const handleSelectTopic = (subjectName, topicName) => {
    setSelectedSubject(subjectName)
    setSelectedTopic(topicName)
    setIsContentsView(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Helper to switch active question and right tab
  const handleOpenQuestionPane = (qId, tab = 'solution') => {
    setActiveQuestionId(qId)
    setActiveRightTab(tab)
  }

  // --- DISCUSSION HANDLERS ---
  const activeDiscussionsList = useMemo(() => {
    if (!activeQuestion) return []
    return discussions[activeQuestion.id] || []
  }, [discussions, activeQuestion])

  const handlePostComment = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      openAuthPrompt('post in discussion', 'Sign in to share your explanation or join the peer study thread.')
      return
    }
    if (!newCommentText.trim() || !activeQuestion) return

    setSubmittingComment(true)
    try {
      await addSolution(activeQuestion.id, {
        content: newCommentText.trim(),
        author: user?.name || 'Aspirant',
        authorEmail: user?.email,
        authorId: user?.id,
        avatar: user?.avatar
      })
      setNewCommentText('')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handlePostReply = async (parentCommentId) => {
    if (!isAuthenticated) {
      openAuthPrompt('reply in discussion', 'Sign in to reply to comments.')
      return
    }
    const draft = replyDrafts[parentCommentId]
    if (!draft || !draft.trim() || !activeQuestion) return

    await addReply(activeQuestion.id, parentCommentId, {
      content: draft.trim(),
      author: user?.name || 'Aspirant',
      authorEmail: user?.email,
      authorId: user?.id,
      avatar: user?.avatar
    })
    setReplyDrafts(prev => ({ ...prev, [parentCommentId]: '' }))
    setActiveReplyId(null)
  }

  // Split filtered subjects into two visually balanced columns (left & right page)
  const [leftSubjects, rightSubjects] = useMemo(() => {
    if (!filteredSubjectsHierarchy || filteredSubjectsHierarchy.length === 0) {
      return [[], []]
    }
    if (filteredSubjectsHierarchy.length === 1) {
      return [filteredSubjectsHierarchy, []]
    }

    // Balance by topic weight so left and right pages have approximately equal vertical length
    let totalWeight = 0
    filteredSubjectsHierarchy.forEach(s => {
      totalWeight += (s.topics?.length || 1) + 2.5
    })

    const targetWeight = totalWeight / 2
    let accumulated = 0
    let splitIdx = 0

    for (let i = 0; i < filteredSubjectsHierarchy.length; i++) {
      const s = filteredSubjectsHierarchy[i]
      const weight = (s.topics?.length || 1) + 2.5
      if (i > 0 && (accumulated + weight / 2) >= targetWeight) {
        splitIdx = i
        break
      }
      accumulated += weight
      splitIdx = i + 1
    }

    if (splitIdx === 0) splitIdx = 1
    if (splitIdx >= filteredSubjectsHierarchy.length) splitIdx = filteredSubjectsHierarchy.length - 1

    return [
      filteredSubjectsHierarchy.slice(0, splitIdx),
      filteredSubjectsHierarchy.slice(splitIdx)
    ]
  }, [filteredSubjectsHierarchy])

  // Helper to render a single subject block with modern chapter styling
  const renderSubjectBlock = (subject, globalSubjectIndex) => {
    const chapterNumber = String(globalSubjectIndex + 1).padStart(2, '0')
    const topicsList = subject.topics || []

    return (
      <div 
        key={subject.subjectName} 
        className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-700"
      >
        {/* Subject Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shrink-0">
              Ch {chapterNumber}
            </span>
            <h2 className="font-bold text-sm sm:text-base text-text-primary-light dark:text-text-primary-dark tracking-tight truncate">
              {subject.subjectName}
            </h2>
          </div>
          
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
            {subject.totalQuestions} Questions
          </span>
        </div>

        {/* Topics list as modern interactive tiles in a responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
          {topicsList.map((topic, tIdx) => (
            <button
              key={topic.topicName}
              onClick={() => handleSelectTopic(subject.subjectName, topic.topicName)}
              title={`Open Chapter: ${topic.topicName}`}
              data-testid="topic-item"
              className="group flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-850 hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-left w-full cursor-pointer"
            >
              {/* Topic Index & Name */}
              <div className="flex items-center gap-2 min-w-0 pr-1.5">
                <span className="w-4 h-4 rounded text-slate-400 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 group-hover:text-primary transition-colors">
                  {tIdx + 1}.
                </span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors truncate">
                  {topic.topicName}
                </span>
              </div>
              
              {/* Questions count pill & subtle chevron */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {topic.questionCount} {topic.questionCount === 1 ? 'Q' : 'Qs'}
                </span>
                <ChevronRight size={12} className="text-slate-300 dark:text-slate-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------------------
  // VIEW 1: FULL BOOKLET TABLE OF CONTENTS (When isContentsView is true or no topic selected)
  // ---------------------------------------------------------------------------------------
  if (isContentsView || !selectedSubject || !selectedTopic) {
    return (
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-3 pb-20 font-sans space-y-4">
        
        {/* Sticky Header Section: Pins both Top Bar and Subject Filter Ribbon so it never moves up */}
        <div className="sticky top-0 z-30 bg-bg-light/95 dark:bg-bg-dark/95 backdrop-blur-md pt-2 pb-3 space-y-2.5 -mx-3 sm:-mx-6 px-3 sm:px-6 border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-all">
          
          {/* Top Bar Card: Content Heading on Left, Metadata & Search on Right */}
          <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-2xl px-4 sm:px-6 py-2.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Left: Heading & Subtitle */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BookOpen size={17} />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">
                  PYQ BOOKLET CONTENTS
                </h1>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  GATE Computer Science & Information Technology • 2007 – 2026
                </p>
              </div>
            </div>

            {/* Right: Metadata Badges & Search */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="text-primary font-bold">{subjectsHierarchy.length}</span> Subjects
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="text-primary font-bold">{totalTopicsCount}</span> Topics
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <span className="text-primary font-bold">{questions.length}</span> Solved Qs
                </span>
              </div>

              {/* Prominent Search Box */}
              <div className="relative w-full sm:w-64 md:w-80">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Search topic or subject (e.g. Graph, Cache, SQL)..."
                  value={contentsSearch}
                  onChange={(e) => setContentsSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-text-primary-light dark:text-text-primary-dark shadow-xs transition-all"
                />
                {contentsSearch && (
                  <button
                    onClick={() => setContentsSearch('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Fast Subject Filter Ribbon */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
            <button
              onClick={() => setSelectedSubjectFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
                selectedSubjectFilter === 'ALL'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-card-light dark:bg-card-dark text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-primary/40'
              }`}
            >
              All Subjects ({subjectsHierarchy.length})
            </button>
            {subjectsHierarchy.map(subj => (
              <button
                key={subj.subjectName}
                onClick={() => setSelectedSubjectFilter(subj.subjectName)}
                className={`px-3 py-1.5 rounded-xl font-semibold text-xs shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedSubjectFilter === subj.subjectName
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-card-light dark:bg-card-dark text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-primary/40'
                }`}
              >
                <span>{subj.subjectName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedSubjectFilter === subj.subjectName ? 'bg-white/20 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {subj.totalQuestions}
                </span>
              </button>
            ))}
          </div>

        </div>

        {/* Book Content Spread: Divided into 2 Parts (Left Page & Right Page) */}
        {filteredSubjectsHierarchy.length === 0 ? (
          <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center space-y-3">
            <BookOpen size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
              No subjects or topics match "{contentsSearch}"
            </p>
            <button
              onClick={() => { setContentsSearch(''); setSelectedSubjectFilter('ALL'); }}
              className="text-xs text-primary font-bold hover:underline"
            >
              Reset search and filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
            
            {/* LEFT SIDE (PAGE 1) */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Volume I • Syllabus Part A
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {leftSubjects.reduce((acc, s) => acc + s.totalQuestions, 0)} Questions
                </span>
              </div>

              <div className="space-y-3.5">
                {leftSubjects.map((subject, idx) => renderSubjectBlock(subject, idx))}
              </div>
            </div>

            {/* RIGHT SIDE (PAGE 2) */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Volume II • Syllabus Part B
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {rightSubjects.reduce((acc, s) => acc + s.totalQuestions, 0)} Questions
                </span>
              </div>

              <div className="space-y-3.5">
                {rightSubjects.length > 0 ? (
                  rightSubjects.map((subject, idx) => renderSubjectBlock(subject, leftSubjects.length + idx))
                ) : (
                  <div className="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
                    — End of Subjects —
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    )
  }

  // ---------------------------------------------------------------------------------------
  // VIEW 2: TWO-AREA SPLIT SCREEN (Questions on Left, Discussion/Solution on Right)
  // ---------------------------------------------------------------------------------------
  return (
    <div className="relative min-h-[calc(100vh-4rem)] pb-16">
      
      {/* 1. TOP BOOKLET HEADER & BREADCRUMBS */}
      <div className="sticky top-0 z-30 bg-card-light/95 dark:bg-card-dark/95 backdrop-blur-md border-b border-border-light dark:border-border-dark px-4 py-2.5 flex items-center justify-between gap-3 shadow-xs">
        
        {/* Breadcrumb path */}
        <div className="flex items-center gap-2 text-xs min-w-0">
          <button
            onClick={() => {
              setIsContentsView(true)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="inline-flex items-center gap-1.5 font-bold text-primary hover:text-primary-hover px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/15 transition-all text-xs shrink-0 cursor-pointer"
          >
            <BookText size={14} />
            <span>Contents</span>
          </button>
          
          <span className="text-slate-400">/</span>
          
          <span className="font-semibold text-slate-500 dark:text-slate-400 truncate">
            {selectedSubject}
          </span>
          
          <span className="text-slate-400">/</span>
          
          <span className="font-bold text-text-primary-light dark:text-text-primary-dark truncate">
            {selectedTopic}
          </span>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Jump: 1-Mark & 2-Marks */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold">
            <button
              onClick={() => oneMarkRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              1-Mark ({oneMarkQuestions.length})
            </button>
            <button
              onClick={() => twoMarkRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              2-Marks ({twoMarkQuestions.length})
            </button>
          </div>

          {/* Sort order toggle (earliest first vs newest first) */}
          <button
            onClick={() => setSortAscending(!sortAscending)}
            title={sortAscending ? "Sorted: Oldest first (2007 → 2026)" : "Sorted: Newest first (2026 → 2007)"}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-primary text-[11px] font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <ArrowUpDown size={12} />
            <span className="hidden md:inline">{sortAscending ? '2007 → 2026' : '2026 → 2007'}</span>
          </button>
        </div>
      </div>

      {/* 2. SPLIT-SCREEN 2-AREA CONTAINER: 40% QUESTIONS / 60% DISCUSSION & SOLUTION */}
      <div className="flex flex-col lg:flex-row gap-5 p-3 sm:p-5 max-w-[1700px] mx-auto">
        
        {/* ========================================================================= */}
        {/* LEFT AREA: QUESTION BOOKLET (40% width on Desktop) */}
        {/* ========================================================================= */}
        <div ref={questionsContainerRef} className="w-full lg:w-[40%] xl:w-[40%] shrink-0 space-y-5 min-w-0">

          {/* SECTION 1: ONE MARK QUESTIONS */}
          <div ref={oneMarkRef} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h2 className="font-bold text-sm sm:text-base text-text-primary-light dark:text-text-primary-dark uppercase tracking-wider">
                  One Mark Questions
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                  {oneMarkQuestions.length} {oneMarkQuestions.length === 1 ? 'Question' : 'Questions'}
                </span>
              </div>
            </div>

            {oneMarkQuestions.length === 0 ? (
              <div className="p-6 bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400">
                No 1-mark questions found for this topic.
              </div>
            ) : (
              <div className="space-y-4">
                {oneMarkQuestions.map((q, idx) => {
                  const isCurrentActive = activeQuestion?.id === q.id
                  const isBookmarked = (bookmarks || []).includes(q.id)
                  const commentsCount = (discussions[q.id] || []).length || q.commentsCount || 0
                  const qNumberStr = String(idx + 1).padStart(2, '0')

                  return (
                    <div
                      key={q.id}
                      id={`booklet-question-${q.id}`}
                      className={`bg-card-light dark:bg-card-dark border rounded-2xl p-4 sm:p-5 transition-all duration-200 ${
                        isCurrentActive 
                          ? 'border-primary ring-2 ring-primary/20 shadow-md' 
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                      }`}
                    >
                      {/* Question Top Meta */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            Q {qNumberStr}
                          </span>
                          
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                            {q.type}
                          </span>

                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            1 Mark
                          </span>
                        </div>

                        {/* GATE Year Tag */}
                        <div className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                          GATE {q.year}{q.set ? ` S${q.set}` : ''}
                        </div>
                      </div>

                      {/* Question Statement */}
                      <div className="text-xs sm:text-sm text-text-primary-light dark:text-text-primary-dark leading-relaxed font-medium mb-3">
                        <QuestionText text={q.question} />
                      </div>

                      {/* Question Image/Diagram if present */}
                      {(q.imageUrl || q.image) && (
                        <div className="mb-3">
                          <QuestionImage src={q.imageUrl || q.image} alt="Question Diagram" />
                        </div>
                      )}

                      {/* MCQ / MSQ Options Grid */}
                      {Array.isArray(q.options) && q.options.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 my-2.5 text-xs">
                          {q.options.map((opt, optIdx) => {
                            const optionLetter = String.fromCharCode(65 + optIdx)
                            return (
                              <div
                                key={optIdx}
                                className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:border-primary/30 transition-colors"
                              >
                                <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0 text-xs mt-0.5">
                                  ({optionLetter})
                                </span>
                                <div className="flex-1 font-medium leading-snug">
                                  <QuestionText text={opt} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Question Action Buttons Bar */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs mt-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          {/* Solution Button */}
                          <button
                            onClick={() => handleOpenQuestionPane(q.id, 'solution')}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                              isCurrentActive && activeRightTab === 'solution'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                            }`}
                          >
                            <Lightbulb size={13} />
                            <span>View Solution</span>
                          </button>

                          {/* Discussion Button */}
                          <button
                            onClick={() => handleOpenQuestionPane(q.id, 'discussion')}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                              isCurrentActive && activeRightTab === 'discussion'
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <MessageSquare size={13} />
                            <span>Discussion</span>
                            {commentsCount > 0 && (
                              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-white">
                                {commentsCount}
                              </span>
                            )}
                          </button>

                          {/* Video Solution Button if available */}
                          {q.videoUrl && (
                            <button
                              onClick={() => openVideoSolution(q.videoUrl)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                            >
                              <Play size={12} className="fill-current" />
                              <span>Video</span>
                            </button>
                          )}
                        </div>

                        {/* Bookmark Button */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleQuestionInFolder('General', q.id)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              isBookmarked
                                ? 'text-primary bg-primary/10'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
                          >
                            <Bookmark size={15} className={isBookmarked ? 'fill-primary' : ''} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: TWO MARK QUESTIONS */}
          <div ref={twoMarkRef} className="space-y-4 pt-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="font-bold text-sm sm:text-base text-text-primary-light dark:text-text-primary-dark uppercase tracking-wider">
                  Two Mark Questions
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  {twoMarkQuestions.length} {twoMarkQuestions.length === 1 ? 'Question' : 'Questions'}
                </span>
              </div>
            </div>

            {twoMarkQuestions.length === 0 ? (
              <div className="p-6 bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400">
                No 2-mark questions found for this topic.
              </div>
            ) : (
              <div className="space-y-4">
                {twoMarkQuestions.map((q, idx) => {
                  const isCurrentActive = activeQuestion?.id === q.id
                  const isBookmarked = (bookmarks || []).includes(q.id)
                  const commentsCount = (discussions[q.id] || []).length || q.commentsCount || 0
                  // Numbering continues after 1-mark questions or sequential
                  const qNumberStr = String(oneMarkQuestions.length + idx + 1).padStart(2, '0')

                  return (
                    <div
                      key={q.id}
                      id={`booklet-question-${q.id}`}
                      className={`bg-card-light dark:bg-card-dark border rounded-2xl p-4 sm:p-5 transition-all duration-200 ${
                        isCurrentActive 
                          ? 'border-primary ring-2 ring-primary/20 shadow-md' 
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                      }`}
                    >
                      {/* Question Top Meta */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            Q {qNumberStr}
                          </span>
                          
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                            {q.type}
                          </span>

                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            2 Marks
                          </span>
                        </div>

                        {/* GATE Year Tag */}
                        <div className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                          GATE {q.year}{q.set ? ` S${q.set}` : ''}
                        </div>
                      </div>

                      {/* Question Statement */}
                      <div className="text-xs sm:text-sm text-text-primary-light dark:text-text-primary-dark leading-relaxed font-medium mb-3">
                        <QuestionText text={q.question} />
                      </div>

                      {/* Question Image/Diagram if present */}
                      {(q.imageUrl || q.image) && (
                        <div className="mb-3">
                          <QuestionImage src={q.imageUrl || q.image} alt="Question Diagram" />
                        </div>
                      )}

                      {/* MCQ / MSQ Options Grid */}
                      {Array.isArray(q.options) && q.options.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 my-2.5 text-xs">
                          {q.options.map((opt, optIdx) => {
                            const optionLetter = String.fromCharCode(65 + optIdx)
                            return (
                              <div
                                key={optIdx}
                                className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:border-primary/30 transition-colors"
                              >
                                <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0 text-xs mt-0.5">
                                  ({optionLetter})
                                </span>
                                <div className="flex-1 font-medium leading-snug">
                                  <QuestionText text={opt} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Question Action Buttons Bar */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs mt-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          {/* Solution Button */}
                          <button
                            onClick={() => handleOpenQuestionPane(q.id, 'solution')}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                              isCurrentActive && activeRightTab === 'solution'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                            }`}
                          >
                            <Lightbulb size={13} />
                            <span>View Solution</span>
                          </button>

                          {/* Discussion Button */}
                          <button
                            onClick={() => handleOpenQuestionPane(q.id, 'discussion')}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                              isCurrentActive && activeRightTab === 'discussion'
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <MessageSquare size={13} />
                            <span>Discussion</span>
                            {commentsCount > 0 && (
                              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-white">
                                {commentsCount}
                              </span>
                            )}
                          </button>

                          {/* Video Solution Button if available */}
                          {q.videoUrl && (
                            <button
                              onClick={() => openVideoSolution(q.videoUrl)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                            >
                              <Play size={12} className="fill-current" />
                              <span>Video</span>
                            </button>
                          )}
                        </div>

                        {/* Bookmark Button */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleQuestionInFolder('General', q.id)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              isBookmarked
                                ? 'text-primary bg-primary/10'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={isBookmarked ? "Remove Bookmark" : "Save Bookmark"}
                          >
                            <Bookmark size={15} className={isBookmarked ? 'fill-primary' : ''} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT AREA: SOLUTION & DISCUSSION WORKSPACE (Remaining 60% width) */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-[60%] xl:w-[60%] lg:flex-1 min-w-0">
          <div className="sticky top-14 bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col max-h-[calc(100vh-5rem)]">
            
            {/* Split Panel Tab Switcher */}
            <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center gap-1.5">
              <button
                onClick={() => setActiveRightTab('solution')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeRightTab === 'solution'
                    ? 'bg-white dark:bg-slate-800 text-primary shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-text-primary-light dark:hover:text-text-primary-dark'
                }`}
              >
                <Lightbulb size={14} className={activeRightTab === 'solution' ? 'text-primary' : ''} />
                <span>Detailed Solution</span>
              </button>

              <button
                onClick={() => setActiveRightTab('discussion')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeRightTab === 'discussion'
                    ? 'bg-white dark:bg-slate-800 text-primary shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-text-primary-light dark:hover:text-text-primary-dark'
                }`}
              >
                <MessageSquare size={14} className={activeRightTab === 'discussion' ? 'text-primary' : ''} />
                <span>Discussion</span>
                {activeDiscussionsList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-white">
                    {activeDiscussionsList.length}
                  </span>
                )}
              </button>
            </div>

            {/* Active Question Info Bar in Right Pane */}
            {activeQuestion && (
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-b border-border-light dark:border-border-dark flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 font-semibold text-text-primary-light dark:text-text-primary-dark">
                  <span className="font-mono font-bold text-primary">
                    ID #{activeQuestion.id}
                  </span>
                  <span>•</span>
                  <span>GATE {activeQuestion.year}</span>
                  <span>•</span>
                  <span>{activeQuestion.marks} {activeQuestion.marks === 1 ? 'Mark' : 'Marks'}</span>
                </div>

                {activeQuestion.videoSolutionUrl && (
                  <button
                    onClick={() => openVideoSolution(activeQuestion)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 hover:underline"
                  >
                    <Play size={11} className="fill-red-500" />
                    <span>Video</span>
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Content Container */}
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {!activeQuestion ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Lightbulb size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-semibold">Select any question on the left to view its solution or discussion.</p>
                </div>
              ) : activeRightTab === 'solution' ? (
                /* ---------------------------------------------------- */
                /* TAB 1: DETAILED SOLUTION */
                /* ---------------------------------------------------- */
                <div className="space-y-4">
                  {/* Correct Answer Callout */}
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={13} />
                        Official / Curated Answer
                      </span>
                    </div>

                    <div className="font-mono font-black text-sm text-emerald-800 dark:text-emerald-300">
                      {activeQuestion.type === 'MCQ' || activeQuestion.type === 'MSQ' ? (
                        typeof activeQuestion.answer === 'number' ? (
                          <span>Option ({String.fromCharCode(65 + activeQuestion.answer)}) : {activeQuestion.options?.[activeQuestion.answer] || ''}</span>
                        ) : Array.isArray(activeQuestion.answer) ? (
                          <span>Options: {activeQuestion.answer.map(idx => String.fromCharCode(65 + Number(idx))).join(', ')}</span>
                        ) : (
                          <span>Option {String(activeQuestion.answer)}</span>
                        )
                      ) : (
                        <span>Answer: {String(activeQuestion.answer)}</span>
                      )}
                    </div>

                    <AnswerProvenance question={activeQuestion} />
                  </div>

                  {/* Step-by-Step Explanation */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <FileText size={13} />
                      Step-by-Step Solution
                    </span>

                    {activeQuestion.explanation ? (
                      <div className="text-xs text-text-primary-light dark:text-text-primary-dark leading-relaxed bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/70">
                        <FormattedContent content={activeQuestion.explanation} />
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-center text-xs text-slate-400">
                        Detailed explanation is being curated for this question. You can review the community discussion or post your own derivation.
                      </div>
                    )}
                  </div>

                  {/* Explanation Image if present */}
                  {activeQuestion.explanationImageUrl && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Solution Diagram
                      </span>
                      <QuestionImage src={activeQuestion.explanationImageUrl} alt="Solution Diagram" />
                    </div>
                  )}
                </div>
              ) : (
                /* ---------------------------------------------------- */
                /* TAB 2: COMMUNITY DISCUSSION FORUM THREAD */
                /* ---------------------------------------------------- */
                <div className="space-y-4">
                  {/* Post New Solution / Comment Form */}
                  <form onSubmit={handlePostComment} className="space-y-2 bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-border-light dark:border-border-dark">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Share Explanation or Doubt
                      </span>
                      {!isAuthenticated && (
                        <span className="text-[10px] text-amber-500 font-semibold">
                          Login required
                        </span>
                      )}
                    </div>

                    <textarea
                      rows={3}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder={isAuthenticated ? "Write your derivation, alternate approach, or ask a doubt..." : "Please log in to post comments or solutions."}
                      className="w-full text-xs p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-primary text-text-primary-light dark:text-text-primary-dark resize-none"
                    />

                    <div className="flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={submittingComment || !newCommentText.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 shadow-xs"
                      >
                        <Send size={12} />
                        <span>{submittingComment ? 'Posting...' : 'Post'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Comments List */}
                  <div className="space-y-3">
                    {activeDiscussionsList.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 space-y-1.5">
                        <MessageSquare size={24} className="mx-auto text-slate-300 dark:text-slate-600" />
                        <p className="text-xs font-semibold">No discussions yet on this question.</p>
                        <p className="text-[11px]">Be the first to share your steps or insights!</p>
                      </div>
                    ) : (
                      activeDiscussionsList.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-3 bg-slate-50/70 dark:bg-slate-900/50 rounded-xl border border-slate-200/70 dark:border-slate-800/70 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <img
                                src={comment.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(comment.author || 'User')}`}
                                alt={comment.author}
                                className="w-5 h-5 rounded-full object-cover bg-slate-200"
                              />
                              <span className="font-bold text-text-primary-light dark:text-text-primary-dark">
                                {comment.author}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {comment.createdAt || 'Recent'}
                            </span>
                          </div>

                          <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                            <FormattedContent content={comment.content} />
                          </div>

                          {/* Upvotes & Reply Action */}
                          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => upvoteSolution(activeQuestion.id, comment.id)}
                                className="inline-flex items-center gap-1 hover:text-emerald-500 transition-colors"
                              >
                                <ThumbsUp size={12} />
                                <span>{comment.upvotes || 0}</span>
                              </button>
                              <button
                                onClick={() => downvoteSolution(activeQuestion.id, comment.id)}
                                className="inline-flex items-center gap-1 hover:text-rose-500 transition-colors"
                              >
                                <ThumbsDown size={12} />
                                <span>{comment.downvotes || 0}</span>
                              </button>
                            </div>

                            <button
                              onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
                              className="inline-flex items-center gap-1 text-primary font-bold hover:underline"
                            >
                              <Reply size={12} />
                              <span>Reply</span>
                            </button>
                          </div>

                          {/* Reply Input Box */}
                          {activeReplyId === comment.id && (
                            <div className="pt-2 pl-3 border-l-2 border-primary/30 space-y-2">
                              <input
                                type="text"
                                placeholder="Type your reply..."
                                value={replyDrafts[comment.id] || ''}
                                onChange={(e) => setReplyDrafts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                className="w-full text-xs p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-primary text-text-primary-light dark:text-text-primary-dark"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setActiveReplyId(null)}
                                  className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-600"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePostReply(comment.id)}
                                  className="px-2.5 py-1 bg-primary text-white text-[10px] font-bold rounded-md"
                                >
                                  Send Reply
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Child Replies */}
                          {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                            <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-2 pt-1">
                              {comment.replies.map((childReply, crIdx) => (
                                <div key={childReply.id || crIdx} className="space-y-1 text-[11px]">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400">
                                    <CornerDownRight size={11} className="text-slate-400" />
                                    <span>{childReply.author}</span>
                                    <span className="text-[9px] text-slate-400 font-normal">{childReply.createdAt}</span>
                                  </div>
                                  <div className="pl-4 text-slate-700 dark:text-slate-300">
                                    <FormattedContent content={childReply.content} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
