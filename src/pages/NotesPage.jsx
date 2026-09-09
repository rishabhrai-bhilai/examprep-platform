import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  NotebookPen, Search, Filter, Download, Edit3, Trash2, CheckSquare, Square, 
  ChevronLeft, ChevronRight, Paperclip, FileText, Image as ImageIcon, Eye, Check, X,
  Layers, ArrowRight, ArrowLeft, BookOpen, Clock, Calendar, Sparkles, AlertCircle
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import QuestionImage from '../components/QuestionImage'
import ScratchpadDrawer from '../components/ScratchpadDrawer'
import FilterDropdown from '../components/FilterDropdown'
import { exportQuestionNotePdf, exportBulkNotesPdf, renderSheetToDataUrl } from '../utils/notesPdfExport'

export default function NotesPage() {
  const { 
    questions, 
    questionNotes, 
    deleteQuestionNote,
    scratchpadOpenQuestionId,
    setScratchpadOpenQuestionId,
    theme 
  } = useAppStore()

  // Navigation mode: 'list' (all questions cards) | 'focus' (single question + readable PDF-style notes)
  const [viewMode, setViewMode] = useState('list')
  const [selectedQuestionId, setSelectedQuestionId] = useState(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('ALL')
  const [selectedYear, setSelectedYear] = useState('ALL')
  const [selectedTopic, setSelectedTopic] = useState('ALL')
  const [selectedIdsForBulk, setSelectedIdsForBulk] = useState([])
  const [isExporting, setIsExporting] = useState(false)

  // Lightbox modal for attachment previews
  const [activePreviewAttachment, setActivePreviewAttachment] = useState(null)

  // 1. Filter questions that have notes saved
  const questionsWithNotes = useMemo(() => {
    return questions.filter(q => !!questionNotes[q.id])
  }, [questions, questionNotes])

  // Extract unique subjects, years & topics from questions with notes
  const availableSubjects = useMemo(() => {
    const subjects = new Set(questionsWithNotes.map(q => q.subject).filter(Boolean))
    return Array.from(subjects).sort()
  }, [questionsWithNotes])

  const availableYears = useMemo(() => {
    const years = new Set(questionsWithNotes.map(q => q.year).filter(y => y !== undefined && y !== null && y !== ''))
    return Array.from(years).sort((a, b) => String(b).localeCompare(String(a)))
  }, [questionsWithNotes])

  const availableTopics = useMemo(() => {
    const relevant = selectedSubject === 'ALL'
      ? questionsWithNotes
      : questionsWithNotes.filter(q => q.subject === selectedSubject)
    const topics = new Set(relevant.map(q => q.topic).filter(Boolean))
    return Array.from(topics).sort()
  }, [questionsWithNotes, selectedSubject])

  // 2. Filter questions based on search and filters
  const filteredQuestions = useMemo(() => {
    return questionsWithNotes.filter(q => {
      const note = questionNotes[q.id] || {}

      if (selectedSubject !== 'ALL' && q.subject !== selectedSubject) return false
      if (selectedYear !== 'ALL' && String(q.year) !== String(selectedYear)) return false
      if (selectedTopic !== 'ALL' && q.topic !== selectedTopic) return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchSubject = q.subject?.toLowerCase().includes(query)
        const matchTopic = q.topic?.toLowerCase().includes(query)
        const matchYear = q.year?.toString().includes(query)
        const matchQuestion = q.question?.toLowerCase().includes(query)
        const matchNoteName = note.name?.toLowerCase().includes(query)
        return matchSubject || matchTopic || matchYear || matchQuestion || matchNoteName
      }

      return true
    })
  }, [questionsWithNotes, questionNotes, selectedSubject, selectedYear, selectedTopic, searchQuery])

  // Currently focused question
  const activeQuestion = useMemo(() => {
    if (selectedQuestionId) {
      return questions.find(q => q.id === selectedQuestionId) || null
    }
    return null
  }, [selectedQuestionId, questions])

  const currentNote = activeQuestion ? questionNotes[activeQuestion.id] : null

  // Normalize sheets for active question
  const currentSheets = useMemo(() => {
    if (!currentNote) return []
    if (currentNote.sheets && currentNote.sheets.length > 0) return currentNote.sheets
    if (currentNote.strokes && currentNote.strokes.length > 0) {
      return [{ id: 'sheet-1', title: 'Sheet 1', strokes: currentNote.strokes }]
    }
    if (currentNote.data && currentNote.type === 'canvas') {
      return [{ id: 'sheet-1', title: 'Sheet 1', strokes: [], dataUrl: currentNote.data }]
    }
    return []
  }, [currentNote])

  // Pre-rendered high-res images for all sheets of active question
  const [renderedSheetImages, setRenderedSheetImages] = useState({})

  useEffect(() => {
    let isMounted = true
    if (currentSheets.length > 0) {
      const renderAll = async () => {
        const imageMap = {}
        for (let idx = 0; idx < currentSheets.length; idx++) {
          const sheet = currentSheets[idx]
          if (sheet.dataUrl) {
            imageMap[sheet.id || idx] = sheet.dataUrl
          } else if (sheet.strokes) {
            const url = await renderSheetToDataUrl(sheet.strokes, 900, 580)
            imageMap[sheet.id || idx] = url
          }
        }
        if (isMounted) {
          setRenderedSheetImages(imageMap)
        }
      }
      renderAll()
    } else {
      setRenderedSheetImages({})
    }
    return () => { isMounted = false }
  }, [currentSheets])

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIdsForBulk.length === filteredQuestions.length) {
      setSelectedIdsForBulk([])
    } else {
      setSelectedIdsForBulk(filteredQuestions.map(q => q.id))
    }
  }

  const toggleSelectQuestion = (qId) => {
    setSelectedIdsForBulk(prev => 
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    )
  }

  // Open focused question
  const openQuestionFocus = (qId) => {
    setSelectedQuestionId(qId)
    setViewMode('focus')
  }

  // Back to list
  const handleBackToList = () => {
    setViewMode('list')
  }

  // Stepper inside focused mode
  const currentFocusedIndex = activeQuestion 
    ? filteredQuestions.findIndex(q => q.id === activeQuestion.id) 
    : -1

  const handlePrevQuestion = () => {
    if (currentFocusedIndex > 0) {
      setSelectedQuestionId(filteredQuestions[currentFocusedIndex - 1].id)
    }
  }

  const handleNextQuestion = () => {
    if (currentFocusedIndex >= 0 && currentFocusedIndex < filteredQuestions.length - 1) {
      setSelectedQuestionId(filteredQuestions[currentFocusedIndex + 1].id)
    }
  }

  // Export handlers
  const handleExportSingleNote = async () => {
    if (!activeQuestion || !currentNote) return
    setIsExporting(true)
    try {
      await exportQuestionNotePdf(activeQuestion, currentNote)
    } catch (err) {
      console.error('Failed to export PDF:', err)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSelected = async () => {
    const questionsToExport = questionsWithNotes.filter(q => selectedIdsForBulk.includes(q.id))
    if (questionsToExport.length === 0) return
    setIsExporting(true)
    try {
      await exportBulkNotesPdf(
        questionsToExport, 
        questionNotes, 
        `GATE-Selected-${questionsToExport.length}-Notes.pdf`
      )
    } catch (err) {
      console.error('Failed to export bulk PDF:', err)
      alert('Failed to generate bulk PDF. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportAll = async () => {
    if (questionsWithNotes.length === 0) return
    setIsExporting(true)
    try {
      await exportBulkNotesPdf(
        questionsWithNotes, 
        questionNotes, 
        `GATE-All-Scratchpad-Notes.pdf`
      )
    } catch (err) {
      console.error('Failed to export all PDF:', err)
      alert('Failed to generate PDF document. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteCurrentNote = () => {
    if (!activeQuestion) return
    if (window.confirm(`Delete scratchpad notes for Question #${activeQuestion.id}? This will remove all sheets and attached files.`)) {
      deleteQuestionNote(activeQuestion.id)
      setSelectedIdsForBulk(prev => prev.filter(id => id !== activeQuestion.id))
      setViewMode('list')
      setSelectedQuestionId(null)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">
      
      <AnimatePresence mode="wait">
        {/* ========================================================================= */}
        {/* SCREEN 1: CLEAN ALL QUESTIONS LIST VIEW                                   */}
        {/* ========================================================================= */}
        {viewMode === 'list' && (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            {/* Header Banner */}
            <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-border-light dark:border-border-dark flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-btn bg-indigo-500/10 text-primary flex items-center justify-center font-bold shadow-xs">
                  <NotebookPen size={22} />
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                    <span>Scratchpad Notes</span>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {questionsWithNotes.length} {questionsWithNotes.length === 1 ? 'Question' : 'Questions'}
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click any question to view its complete question statement and scrollable scratchpad notes
                  </p>
                </div>
              </div>

              {/* Bulk PDF Actions */}
              <div className="flex items-center gap-2.5">
                {selectedIdsForBulk.length > 0 && (
                  <button
                    onClick={handleExportSelected}
                    disabled={isExporting}
                    className="h-9 px-3.5 rounded-btn bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Download size={14} />
                    <span>Download Selected ({selectedIdsForBulk.length}) PDF</span>
                  </button>
                )}

                {questionsWithNotes.length > 0 && (
                  <button
                    onClick={handleExportAll}
                    disabled={isExporting}
                    className="h-9 px-4 rounded-btn border border-primary/30 bg-indigo-50 dark:bg-indigo-950/40 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Download size={14} />
                    <span>Download All Notes (PDF)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            {questionsWithNotes.length > 0 && (
              <div className="px-6 py-3 bg-slate-50/90 dark:bg-slate-900/40 border-b border-border-light dark:border-border-dark flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by subject, topic, year, or question..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8.5 pl-8.5 pr-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-btn focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100 placeholder:text-slate-400 shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Subject, Year & Topic Selectors */}
                <div className="flex items-center gap-2 overflow-x-visible py-0.5 flex-wrap sm:flex-nowrap">
                  {/* Subject Dropdown */}
                  <FilterDropdown
                    label={`All Subjects (${questionsWithNotes.length})`}
                    value={selectedSubject}
                    options={[
                      { value: 'ALL', label: `All Subjects (${questionsWithNotes.length})` },
                      ...availableSubjects.map(sub => ({
                        value: sub,
                        label: sub,
                        count: questionsWithNotes.filter(q => q.subject === sub).length
                      }))
                    ]}
                    onChange={(val) => {
                      setSelectedSubject(val)
                      setSelectedTopic('ALL')
                    }}
                    title="Filter by Subject"
                    searchPlaceholder="Search subjects..."
                    align="left"
                  />

                  {/* Year Dropdown */}
                  <FilterDropdown
                    label="All Years"
                    value={selectedYear}
                    options={[
                      { value: 'ALL', label: 'All Years' },
                      ...availableYears.map(yr => ({
                        value: yr,
                        label: `GATE ${yr}`,
                        count: questionsWithNotes.filter(q => String(q.year) === String(yr)).length
                      }))
                    ]}
                    onChange={(val) => setSelectedYear(val)}
                    title="Filter Year-wise"
                    searchable={false}
                    align="left"
                  />

                  {/* Topic Dropdown */}
                  <FilterDropdown
                    label="All Topics"
                    value={selectedTopic}
                    options={[
                      { value: 'ALL', label: 'All Topics' },
                      ...availableTopics.map(top => ({
                        value: top,
                        label: top,
                        count: questionsWithNotes.filter(q => {
                          if (selectedSubject !== 'ALL' && q.subject !== selectedSubject) return false
                          return q.topic === top
                        }).length
                      }))
                    ]}
                    onChange={(val) => setSelectedTopic(val)}
                    title="Filter Topic-wise"
                    searchPlaceholder="Search topics..."
                    align="left"
                  />

                  {/* Reset Filters Button */}
                  {(selectedSubject !== 'ALL' || selectedYear !== 'ALL' || selectedTopic !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubject('ALL')
                        setSelectedYear('ALL')
                        setSelectedTopic('ALL')
                      }}
                      className="h-9 px-2 text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 rounded-btn transition-colors flex items-center gap-1 shrink-0"
                      title="Reset filters to All"
                    >
                      <X size={13} />
                      <span>Reset</span>
                    </button>
                  )}

                  {/* Select All Checkbox */}
                  {filteredQuestions.length > 0 && (
                    <button
                      onClick={toggleSelectAll}
                      className="h-9 px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-primary flex items-center gap-1.5 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 ml-auto sm:ml-0"
                      title="Select all filtered questions for bulk PDF export"
                    >
                      {selectedIdsForBulk.length === filteredQuestions.length && filteredQuestions.length > 0 ? (
                        <CheckSquare size={16} className="text-primary" />
                      ) : (
                        <Square size={16} />
                      )}
                      <span>Select All</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Questions Grid/List */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              {questionsWithNotes.length === 0 ? (
                /* Empty state */
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 py-16">
                  <div className="h-16 w-16 rounded-full bg-indigo-500/10 text-primary flex items-center justify-center">
                    <NotebookPen size={32} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No Scratchpad Notes Yet</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Draft notes, write equations, or attach reference diagrams while practicing questions in <strong>Practice PYQs</strong> or exploring the <strong>Discussion Forum</strong>. All your notes will appear here.
                    </p>
                  </div>
                  <a
                    href="/pyq"
                    className="h-9 px-4 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-btn transition-colors shadow-xs inline-flex items-center gap-1.5"
                  >
                    <span>Practice Questions</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No notes matched your search query or filters.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedSubject('ALL')
                      setSelectedYear('ALL')
                    }}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Clear Search & Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
                  {filteredQuestions.map((q) => {
                    const note = questionNotes[q.id] || {}
                    const isChecked = selectedIdsForBulk.includes(q.id)
                    const sheetsCount = (note.sheets && note.sheets.length) || (note.strokes ? 1 : 0)
                    const attsCount = (note.attachments && note.attachments.length) || (note.type === 'pdf' ? 1 : 0)
                    
                    // Extract first 30-40 characters of actual question text
                    const rawQuestion = (q.question || '').trim()
                    const previewText = rawQuestion.length > 38 ? `${rawQuestion.slice(0, 38)}...` : rawQuestion

                    return (
                      <div
                        key={q.id}
                        onClick={() => openQuestionFocus(q.id)}
                        className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 rounded-card p-4.5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3.5"
                      >
                        <div className="space-y-2.5">
                          {/* Top Row: Q#ID, Year, Checkbox */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-primary bg-indigo-500/10 px-2 py-0.5 rounded">
                                Q#{q.id}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-primary text-white shadow-xs">
                                {q.year}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-wide text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                {q.type}
                              </span>
                            </div>

                            {/* Multi-select checkbox */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleSelectQuestion(q.id)
                              }}
                              className="text-slate-400 hover:text-primary transition-colors p-0.5"
                              title="Select for bulk PDF export"
                            >
                              {isChecked ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                            </button>
                          </div>

                          {/* Subject & Topic Badges */}
                          <div>
                            <span className="text-[11px] font-bold text-slate-450 block truncate">
                              {q.subject}
                            </span>
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors line-clamp-1 mt-0.5">
                              {q.topic}
                            </h3>
                          </div>

                          {/* Starting 30-40 characters of question statement */}
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-100 dark:border-slate-800/80">
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">
                              "{previewText}"
                            </p>
                          </div>
                        </div>

                        {/* Card Bottom Footer: Sheets Badge & Open button */}
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3 text-xs">
                          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                            <Layers size={13} />
                            <span>{sheetsCount} {sheetsCount === 1 ? 'Sheet' : 'Sheets'}</span>
                            {attsCount > 0 && <span>• {attsCount} {attsCount === 1 ? 'File' : 'Files'}</span>}
                          </div>

                          <div className="flex items-center gap-1 text-primary font-bold text-xs group-hover:translate-x-0.5 transition-transform">
                            <span>Open Notes</span>
                            <ArrowRight size={13} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: FOCUSED SINGLE QUESTION & CONTINUOUS READABLE SCRATCHPAD NOTES  */}
        {/* ========================================================================= */}
        {viewMode === 'focus' && activeQuestion && (
          <motion.div
            key="focus-view"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            {/* Top Navigation Bar: Back to List, Stepper & Action Buttons */}
            <div className="px-5 py-3 bg-white dark:bg-slate-900 border-b border-border-light dark:border-border-dark flex items-center justify-between gap-4 shrink-0 shadow-xs">
              
              {/* BACK TO ALL NOTES BUTTON */}
              <button
                onClick={handleBackToList}
                className="h-8.5 px-3.5 rounded-btn bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs transition-all active:scale-95 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-xs"
                title="Return to all questions list"
              >
                <ArrowLeft size={15} />
                <span>Back to All Notes</span>
              </button>

              {/* Question Stepper */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">
                  Question {currentFocusedIndex + 1} of {filteredQuestions.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevQuestion}
                    disabled={currentFocusedIndex <= 0}
                    className="p-1 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30"
                    title="Previous Question"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={handleNextQuestion}
                    disabled={currentFocusedIndex >= filteredQuestions.length - 1}
                    className="p-1 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30"
                    title="Next Question"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Action Buttons: Edit Note, Download PDF, Delete Note */}
              <div className="flex items-center gap-2">
                {/* EDIT IN SCRATCHPAD */}
                <button
                  onClick={() => setScratchpadOpenQuestionId(activeQuestion.id)}
                  className="h-8.5 px-3.5 rounded-btn bg-primary hover:bg-primary-hover text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5"
                  title="Open Scratchpad to edit drawings, add sheets, or upload files"
                >
                  <Edit3 size={13} />
                  <span>Edit Note</span>
                </button>

                {/* DOWNLOAD PDF */}
                <button
                  onClick={handleExportSingleNote}
                  disabled={isExporting}
                  className="h-8.5 px-3 rounded-btn border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  title="Download complete PDF note with attached documents merged"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </button>

                {/* DELETE NOTE */}
                <button
                  onClick={handleDeleteCurrentNote}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-btn transition-colors"
                  title="Delete this note"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Main 2-Column Split: Question (Left) vs Readable Continuous Scratchpad (Right) */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              
              {/* === LEFT COLUMN: QUESTION DETAILS === */}
              <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark flex flex-col min-h-0 overflow-hidden">
                <div className="p-3.5 border-b border-border-light dark:border-border-dark bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-primary uppercase tracking-wider">
                      Question #{activeQuestion.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary text-white shadow-xs">
                      {activeQuestion.year}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[9px] uppercase tracking-wide text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {activeQuestion.type}
                    </span>
                    <span className="font-bold text-[9px] uppercase tracking-wide text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                      {activeQuestion.marks} Marks
                    </span>
                    <span className="font-semibold text-[9px] uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-400">
                      {activeQuestion.difficulty}
                    </span>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-5">
                  {/* Subject & Topic */}
                  <div className="pb-3 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="text-xs font-bold text-primary">{activeQuestion.subject}</span>
                    <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                      {activeQuestion.topic}
                    </h2>
                  </div>

                  {/* Question Statement */}
                  <div className="text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                    {activeQuestion.question}
                  </div>

                  {/* Diagram */}
                  <QuestionImage 
                    src={activeQuestion.imageUrl || activeQuestion.diagramUrl || activeQuestion.image} 
                    alt={activeQuestion.imageAlt || 'Question Diagram'} 
                  />

                  {/* Options */}
                  {activeQuestion.options && activeQuestion.options.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block">
                        Options:
                      </span>
                      {activeQuestion.options.map((opt, idx) => {
                        const isCorrect = Array.isArray(activeQuestion.answer)
                          ? activeQuestion.answer.includes(idx)
                          : activeQuestion.answer === idx

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-btn border text-xs flex items-start gap-3 transition-colors ${
                              isCorrect 
                                ? 'border-success bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-semibold' 
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold ${
                              isCorrect ? 'bg-success border-success text-white' : 'border-slate-300 dark:border-slate-700 text-slate-500'
                            }`}>
                              {isCorrect ? <Check size={12} strokeWidth={3} /> : String.fromCharCode(65 + idx)}
                            </span>
                            <span className="flex-1 mt-0.5">{opt}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* NAT answer */}
                  {activeQuestion.type === 'NAT' && (
                    <div className="p-3.5 bg-emerald-500/10 border border-success/30 rounded-btn text-xs text-success font-bold flex items-center gap-2">
                      <Check size={16} strokeWidth={3} />
                      <span>Correct Numerical Key: {activeQuestion.answer}</span>
                    </div>
                  )}

                  {/* Explanation */}
                  {activeQuestion.explanation && (
                    <div className="p-4 rounded-card bg-indigo-50/30 dark:bg-indigo-950/20 border border-primary/20 space-y-1.5">
                      <span className="text-xs font-bold text-primary block">Official Solution & Explanation:</span>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {activeQuestion.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* === RIGHT COLUMN: READABLE CONTINUOUS SCROLLABLE SCRATCHPAD & ATTACHMENTS === */}
              <div className="w-full lg:w-1/2 bg-slate-100 dark:bg-slate-950 flex flex-col min-h-0 overflow-hidden">
                {/* Header */}
                <div className="p-3.5 border-b border-border-light dark:border-border-dark bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      {currentNote?.name || 'Scratchpad Solution Document'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Scroll to read all solution sheets & embedded reference files
                    </p>
                  </div>

                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    {currentSheets.length} {currentSheets.length === 1 ? 'Sheet' : 'Sheets'}
                  </span>
                </div>

                {/* Vertical Scrollable Document View */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
                  
                  {/* Render Each Sheet Consecutively */}
                  {currentSheets.map((sheet, idx) => {
                    const sheetImg = renderedSheetImages[sheet.id || idx]

                    return (
                      <div 
                        key={sheet.id || idx}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-sm overflow-hidden flex flex-col"
                      >
                        {/* Sheet Card Top Strip */}
                        <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-extrabold text-primary flex items-center gap-1.5">
                            <Layers size={13} />
                            <span>{sheet.title || `Sheet ${idx + 1}`}</span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            Page {idx + 1} of {currentSheets.length}
                          </span>
                        </div>

                        {/* Sheet High-Res Canvas Image */}
                        <div className="p-3 min-h-[300px] flex items-center justify-center bg-white dark:bg-slate-900">
                          {sheetImg ? (
                            <img
                              src={sheetImg}
                              alt={sheet.title}
                              className="w-full h-auto object-contain rounded shadow-xs"
                            />
                          ) : (
                            <div className="text-center text-slate-400 text-xs py-12">
                              Rendering sheet canvas...
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Attached References: Embedded PDFs and Images */}
                  {currentNote?.attachments && currentNote.attachments.length > 0 && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                        <Paperclip size={15} className="text-primary" />
                        <h4 className="font-extrabold text-xs text-slate-750 dark:text-slate-200 uppercase tracking-wider">
                          Attached Reference Documents & Images ({currentNote.attachments.length})
                        </h4>
                      </div>

                      {currentNote.attachments.map((att) => (
                        <div 
                          key={att.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card shadow-sm overflow-hidden flex flex-col"
                        >
                          {/* Attachment Card Top Header */}
                          <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {att.type === 'image' ? (
                                <ImageIcon size={14} className="text-primary shrink-0" />
                              ) : (
                                <FileText size={14} className="text-indigo-500 shrink-0" />
                              )}
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate" title={att.name}>
                                {att.name}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">({att.size})</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={att.data}
                                download={att.name}
                                className="p-1 text-slate-500 hover:text-primary rounded transition-colors"
                                title="Download reference file"
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          </div>

                          {/* Embedded Content: PDF Viewer iframe or Full-width Image */}
                          <div className="p-3 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                            {att.type === 'image' ? (
                              <img
                                src={att.data}
                                alt={att.name}
                                className="w-full max-h-[500px] object-contain rounded shadow-xs"
                              />
                            ) : (
                              /* Embedded PDF viewer so user can read attached PDF right here! */
                              <div className="w-full h-[520px] rounded overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner">
                                <iframe
                                  src={att.data}
                                  title={att.name}
                                  className="w-full h-full border-0"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bottom Edit Floating/Sticky Prompt */}
                  <div className="pt-4 pb-8 flex justify-center">
                    <button
                      onClick={() => setScratchpadOpenQuestionId(activeQuestion.id)}
                      className="h-10 px-5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn transition-all shadow-md flex items-center gap-2"
                    >
                      <Edit3 size={15} />
                      <span>Edit or Add More Sheets to this Note</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- LIVE SCRATCHPAD DRAWER FOR EDITING --- */}
      {scratchpadOpenQuestionId && activeQuestion && (
        <ScratchpadDrawer
          currentQuestion={activeQuestion}
          selectedAnswers={{}}
          setSelectedAnswers={() => {}}
          isMSQCorrect={() => false}
          isNATCorrect={() => false}
        />
      )}
    </div>
  )
}
