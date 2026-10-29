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

  // Questions split view state
  const [activeQuestionId, setActiveQuestionId] = useState(null)
  const [activeRightTab, setActiveRightTab] = useState('solution') // 'solution' | 'discussion'
  const [sortAscending, setSortAscending] = useState(true) // Chronological year-wise (earliest -> latest) like classic textbooks

  // Discussion reply drafts
  const [newCommentText, setNewCommentText] = useState('')
  const [activeReplyId, setActiveReplyId] = useState(null)
  const [replyDrafts, setReplyDrafts] = useState({})
  const [submittingComment, setSubmittingComment] = useState(false)

  // Floating button hover animation state
  const [isHoveringFloatingWidget, setIsHoveringFloatingWidget] = useState(false)

  // Refs for scrolling to 1-mark and 2-mark sections
  const oneMarkRef = useRef(null)
  const twoMarkRef = useRef(null)
  const questionsContainerRef = useRef(null)

  // Fetch questions and discussions on mount
  useEffect(() => {
    fetchQuestions()
    fetchDiscussions()
  }, [fetchQuestions, fetchDiscussions])

  // --- HIERARCHY BUILDER: SUBJECTS -> TOPICS WITH COUNTS & SIMULATED PAGE NUMBERS ---
  const { subjectsHierarchy, totalTopicsCount } = useMemo(() => {
    let currentPage = 1
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

      // Calculate subject topics with question counts and page ranges
      const subjectTopics = []
      const subjectStartPage = currentPage

      allTopicNames.forEach((topicName) => {
        const count = presentTopicsMap.get(topicName) || 0
        // Calculate simulated page allocation based on question volume (avg 2-3 questions per booklet page)
        const pagesSpan = Math.max(1, Math.ceil(count / 2.5))
        const startPg = currentPage
        const endPg = currentPage + pagesSpan - 1
        currentPage = endPg + 1
        topicCounter++

        subjectTopics.push({
          topicName,
          questionCount: count,
          startPage: startPg,
          endPage: endPg,
          pageLabel: `${String(startPg).padStart(2, '0')} - ${String(endPg).padStart(2, '0')}`
        })
      })

      const subjectEndPage = Math.max(subjectStartPage, currentPage - 1)
      const totalSubjectQuestions = subjectTopics.reduce((acc, t) => acc + t.questionCount, 0)

      if (subjectTopics.length > 0) {
        result.push({
          subjectName,
          topics: subjectTopics,
          totalQuestions: totalSubjectQuestions,
          startPage: subjectStartPage,
          endPage: subjectEndPage,
          pageLabel: `${String(subjectStartPage).padStart(2, '0')} - ${String(subjectEndPage).padStart(2, '0')}`
        })
      }
    })

    return { subjectsHierarchy: result, totalTopicsCount: topicCounter }
  }, [questions])

  // Filter Table of Contents by search query
  const filteredSubjectsHierarchy = useMemo(() => {
    if (!contentsSearch.trim()) return subjectsHierarchy
    const q = contentsSearch.toLowerCase().trim()

    return subjectsHierarchy
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
  }, [subjectsHierarchy, contentsSearch])

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

  // ---------------------------------------------------------------------------------------
  // VIEW 1: FULL BOOKLET TABLE OF CONTENTS (When isContentsView is true or no topic selected)
  // ---------------------------------------------------------------------------------------
  if (isContentsView || !selectedSubject || !selectedTopic) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 pb-24">
        {/* Book Container with vintage/academic ruled border styling */}
        <div className="bg-card-light dark:bg-card-dark border-2 border-slate-300 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden relative transition-all">
          
          {/* Classical Double Border Motif at Top (Matching Image 1) */}
          <div className="border-b-4 border-double border-slate-300 dark:border-slate-800 py-6 px-6 sm:px-12 text-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-card-dark">
            <div className="flex items-center justify-center gap-3 text-slate-400 dark:text-slate-600 mb-1">
              <span className="text-xs font-serif tracking-widest">❖ ❖ ❖</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl font-serif font-black tracking-widest text-text-primary-light dark:text-text-primary-dark uppercase">
              CONTENTS
            </h1>
            
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
              GATE Computer Science & Information Technology • Topicwise Previous Years' Questions (2007 – 2026)
            </p>

            {/* Quick Search & Summary Row */}
            <div className="mt-5 max-w-md mx-auto relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search subject or topic (e.g. Graph Theory, Parsing, SQL)..."
                value={contentsSearch}
                onChange={(e) => setContentsSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary text-text-primary-light dark:text-text-primary-dark shadow-xs"
              />
              {contentsSearch && (
                <button
                  onClick={() => setContentsSearch('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen size={13} className="text-primary" />
                {subjectsHierarchy.length} Subjects
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <ListTree size={13} className="text-primary" />
                {totalTopicsCount} Topics
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <FileText size={13} className="text-primary" />
                {questions.length} Solved Questions
              </span>
            </div>
          </div>

          {/* Table Header: Name of the Subject vs Page No. (as in Image 1) */}
          <div className="border-b border-slate-300 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 px-6 sm:px-12 py-3 flex items-center justify-between font-serif font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <span>Name of the Subject & Topic</span>
            <span className="text-right">Questions • Page No.</span>
          </div>

          {/* Book Content List */}
          <div className="p-6 sm:p-12 space-y-10">
            {filteredSubjectsHierarchy.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <BookOpen size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
                  No subjects or topics match "{contentsSearch}"
                </p>
                <button
                  onClick={() => setContentsSearch('')}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Clear search query
                </button>
              </div>
            ) : (
              filteredSubjectsHierarchy.map((subject, sIdx) => {
                const romanNumeral = ROMAN_NUMERALS[sIdx % ROMAN_NUMERALS.length] || `${sIdx + 1}.`

                return (
                  <div key={subject.subjectName} className="space-y-3">
                    {/* Subject Header Row (e.g. "I. Discrete Mathematics ........... 01 - 262") */}
                    <div className="flex items-baseline justify-between border-b border-slate-200 dark:border-slate-800/80 pb-1.5">
                      <div className="flex items-baseline gap-2 font-serif font-black text-base sm:text-lg text-text-primary-light dark:text-text-primary-dark tracking-wide">
                        <span className="text-primary font-bold">{romanNumeral}.</span>
                        <span>{subject.subjectName}</span>
                      </div>
                      
                      <div className="flex items-baseline gap-2 font-serif font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 shrink-0">
                        <span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                          {subject.totalQuestions} Qs
                        </span>
                        <span className="font-mono">{subject.pageLabel}</span>
                      </div>
                    </div>

                    {/* Topics Sub-List under Subject */}
                    <div className="space-y-1 pl-4 sm:pl-7">
                      {subject.topics.map((topic, tIdx) => (
                        <button
                          key={topic.topicName}
                          onClick={() => handleSelectTopic(subject.subjectName, topic.topicName)}
                          title={`Open Chapter: ${topic.topicName}`}
                          data-testid="topic-item"
                          className="w-full text-left py-1.5 px-2 rounded-lg group flex items-baseline justify-between hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          {/* Topic Name */}
                          <div className="flex items-baseline gap-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors shrink-0 max-w-[65%] sm:max-w-[70%]">
                            <span className="text-slate-400 font-mono text-[11px] w-5 text-right shrink-0">
                              {tIdx + 1}.
                            </span>
                            <span className="group-hover:underline underline-offset-4 decoration-primary/40 truncate">
                              {topic.topicName}
                            </span>
                          </div>

                          {/* Dotted Leader Line (connecting title to page range as in Image 1) */}
                          <span className="flex-1 mx-2 sm:mx-3 border-b border-dotted border-slate-300 dark:border-slate-700/80 group-hover:border-primary/40" />

                          {/* Questions count and Page Number */}
                          <div className="flex items-baseline gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 group-hover:text-primary shrink-0">
                            <span className="text-[10px] text-slate-400 group-hover:text-primary/70 font-sans">
                              {topic.questionCount} {topic.questionCount === 1 ? 'question' : 'questions'}
                            </span>
                            <span className="text-slate-600 dark:text-slate-300 font-bold">
                              {topic.pageLabel}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Book Bottom Ornamental Footer */}
          <div className="border-t-4 border-double border-slate-300 dark:border-slate-800 py-4 px-6 text-center text-xs text-slate-400 font-serif">
            <span>— End of Contents —</span>
          </div>
        </div>
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
            onClick={() => setIsContentsView(true)}
            className="inline-flex items-center gap-1.5 font-bold text-primary hover:text-primary-hover px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/15 transition-all text-xs shrink-0"
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
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              1-Mark ({oneMarkQuestions.length})
            </button>
            <button
              onClick={() => twoMarkRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              2-Marks ({twoMarkQuestions.length})
            </button>
          </div>

          {/* Sort order toggle (earliest first vs newest first) */}
          <button
            onClick={() => setSortAscending(!sortAscending)}
            title={sortAscending ? "Sorted: Oldest first (2007 → 2026)" : "Sorted: Newest first (2026 → 2007)"}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-primary text-[11px] font-semibold transition-colors shadow-xs"
          >
            <ArrowUpDown size={12} />
            <span className="hidden md:inline">{sortAscending ? '2007 → 2026' : '2026 → 2007'}</span>
          </button>

          {/* Full-screen Contents Switcher */}
          <button
            onClick={() => setIsContentsView(true)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
            title="Expand Full Table of Contents"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* 2. SPLIT-SCREEN 2-AREA CONTAINER */}
      <div className="flex flex-col lg:flex-row gap-4 p-3 sm:p-5 max-w-[1600px] mx-auto">
        
        {/* ========================================================================= */}
        {/* LEFT AREA: QUESTION BOOKLET (Takes ~60% width on Desktop) */}
        {/* ========================================================================= */}
        <div ref={questionsContainerRef} className="flex-1 min-w-0 space-y-6">
          
          {/* Chapter Banner Styled like Image 2 */}
          <div className="bg-card-light dark:bg-card-dark border-2 border-slate-300 dark:border-slate-800 rounded-2xl p-5 shadow-soft relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    Chapter • {selectedSubject}
                  </span>
                  <span className="text-xs text-slate-400">
                    {allTopicQuestions.length} Questions
                  </span>
                </div>
                
                <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-text-primary-light dark:text-text-primary-dark">
                  {selectedTopic}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsContentsView(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  <BookText size={14} />
                  <span>Browse other topics</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 1: ONE MARK QUESTIONS */}
          <div ref={oneMarkRef} className="space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-slate-300 dark:border-slate-800 pb-2">
              <span className="font-serif font-black text-lg text-text-primary-light dark:text-text-primary-dark uppercase tracking-wider">
                One Mark Questions
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black">
                {oneMarkQuestions.length} {oneMarkQuestions.length === 1 ? 'Question' : 'Questions'}
              </span>
            </div>

            {oneMarkQuestions.length === 0 ? (
              <div className="p-6 bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400">
                No 1-mark questions found for this topic.
              </div>
            ) : (
              <div className="space-y-5">
                {oneMarkQuestions.map((q, idx) => {
                  const isCurrentActive = activeQuestion?.id === q.id
                  const isBookmarked = (bookmarks || []).includes(q.id)
                  const commentsCount = (discussions[q.id] || []).length || q.commentsCount || 0
                  const qNumberStr = String(idx + 1).padStart(2, '0')

                  return (
                    <div
                      key={q.id}
                      id={`booklet-question-${q.id}`}
                      className={`bg-card-light dark:bg-card-dark border rounded-xl p-4 sm:p-5 transition-all ${
                        isCurrentActive 
                          ? 'border-primary ring-2 ring-primary/20 shadow-md' 
                          : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-soft'
                      }`}
                    >
                      {/* Question Top Meta */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-primary">
                            {qNumberStr}.
                          </span>
                          
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                            {q.type}
                          </span>

                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            1 Mark
                          </span>
                        </div>

                        {/* GATE Year Tag (e.g. "(GATE 2024)") */}
                        <div className="font-serif font-black text-xs text-slate-700 dark:text-slate-300 shrink-0">
                          (GATE - {q.year}{q.set ? ` S${q.set}` : ''})
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3 text-xs">
                          {q.options.map((opt, optIdx) => {
                            const optionLetter = String.fromCharCode(65 + optIdx)
                            return (
                              <div
                                key={optIdx}
                                className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                              >
                                <span className="font-bold text-slate-500 shrink-0">
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
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
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
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                              isCurrentActive && activeRightTab === 'discussion'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <MessageSquare size={13} />
                            <span>Discussion</span>
                            {commentsCount > 0 && (
                              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-primary/20 text-primary">
                                {commentsCount}
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Bookmark Button */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleQuestionInFolder('General', q.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isBookmarked
                                ? 'text-primary bg-primary/10'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
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
            <div className="flex items-center gap-3 border-b-2 border-slate-300 dark:border-slate-800 pb-2">
              <span className="font-serif font-black text-lg text-text-primary-light dark:text-text-primary-dark uppercase tracking-wider">
                Two Mark Questions
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black">
                {twoMarkQuestions.length} {twoMarkQuestions.length === 1 ? 'Question' : 'Questions'}
              </span>
            </div>

            {twoMarkQuestions.length === 0 ? (
              <div className="p-6 bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400">
                No 2-mark questions found for this topic.
              </div>
            ) : (
              <div className="space-y-5">
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
                      className={`bg-card-light dark:bg-card-dark border rounded-xl p-4 sm:p-5 transition-all ${
                        isCurrentActive 
                          ? 'border-primary ring-2 ring-primary/20 shadow-md' 
                          : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-soft'
                      }`}
                    >
                      {/* Question Top Meta */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-primary">
                            {qNumberStr}.
                          </span>
                          
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                            {q.type}
                          </span>

                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            2 Marks
                          </span>
                        </div>

                        {/* GATE Year Tag (e.g. "(GATE 2023)") */}
                        <div className="font-serif font-black text-xs text-slate-700 dark:text-slate-300 shrink-0">
                          (GATE - {q.year}{q.set ? ` S${q.set}` : ''})
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3 text-xs">
                          {q.options.map((opt, optIdx) => {
                            const optionLetter = String.fromCharCode(65 + optIdx)
                            return (
                              <div
                                key={optIdx}
                                className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850 bg-slate-50/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
                              >
                                <span className="font-bold text-slate-500 shrink-0">
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
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
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
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                              isCurrentActive && activeRightTab === 'discussion'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <MessageSquare size={13} />
                            <span>Discussion</span>
                            {commentsCount > 0 && (
                              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-primary/20 text-primary">
                                {commentsCount}
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Bookmark Button */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleQuestionInFolder('General', q.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isBookmarked
                                ? 'text-primary bg-primary/10'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
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
        {/* RIGHT AREA: SOLUTION & DISCUSSION WORKSPACE (Sticky Split Panel) */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0">
          <div className="sticky top-14 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-2xl shadow-soft overflow-hidden flex flex-col max-h-[calc(100vh-5rem)]">
            
            {/* Split Panel Tab Switcher */}
            <div className="p-2 border-b border-border-light dark:border-border-dark bg-slate-50/70 dark:bg-slate-900/60 flex items-center gap-1.5">
              <button
                onClick={() => setActiveRightTab('solution')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
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
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  activeRightTab === 'discussion'
                    ? 'bg-white dark:bg-slate-800 text-primary shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-text-primary-light dark:hover:text-text-primary-dark'
                }`}
              >
                <MessageSquare size={14} className={activeRightTab === 'discussion' ? 'text-primary' : ''} />
                <span>Discussion</span>
                {activeDiscussionsList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-primary/20 text-primary">
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

      {/* ========================================================================= */}
      {/* 3. FLOATING CIRCULAR CONTENTS WIDGET (Exact User Requirement) */}
      {/* "the book content page collapse in in a small cirlcle like floating div box */}
      {/* or what ever you think will look best UI vise, which can be clicked later on */}
      {/* to again take the entire screen" */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            setIsContentsView(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onMouseEnter={() => setIsHoveringFloatingWidget(true)}
          onMouseLeave={() => setIsHoveringFloatingWidget(false)}
          className="group relative flex items-center justify-center p-3.5 sm:px-4 sm:py-3.5 rounded-full bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-hover hover:to-indigo-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform active:scale-90 border-2 border-white/20 cursor-pointer"
          aria-label="Open Table of Contents (Full Screen)"
          title="Open Table of Contents (Full Screen)"
        >
          {/* Animated Glow Ring */}
          <span className="absolute -inset-1 rounded-full bg-primary/30 blur-sm group-hover:blur-md transition-all animate-pulse" />

          {/* Book Icon */}
          <BookText size={20} className="relative z-10 shrink-0 transform group-hover:scale-110 transition-transform" />

          {/* Expandable Label on Desktop */}
          <span className="relative z-10 hidden sm:inline ml-2 text-xs font-black tracking-wide uppercase whitespace-nowrap">
            Table of Contents
          </span>

          {/* Mobile Tooltip */}
          <span className="sm:hidden absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10 z-20">
            Table of Contents
          </span>
        </button>
      </div>

    </div>
  )
}
