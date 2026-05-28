import React, { useState, useEffect } from 'react'
import { X, Play, BookOpen, Check } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function VideoSolutionModal() {
  const { activeVideoSolutionUrl, setActiveVideoSolutionUrl, activeQuestionIndex, questions } = useAppStore()
  
  // Find current question object
  const currentQuestion = questions[activeQuestionIndex]
  const questionId = currentQuestion?.id

  const [note, setNote] = useState('')
  const [isSaved, setIsSaved] = useState(false)

  // Load saved notes from LocalStorage when active question/modal changes
  useEffect(() => {
    if (questionId) {
      const savedNote = localStorage.getItem(`note_question_${questionId}`) || ''
      setNote(savedNote)
    }
  }, [questionId, activeVideoSolutionUrl])

  if (!activeVideoSolutionUrl) return null

  const handleNoteChange = (e) => {
    const value = e.target.value
    setNote(value)
    setIsSaved(false)
    localStorage.setItem(`note_question_${questionId}`, value)
    
    // Simple mock debounce auto-saved visual feedback
    const timer = setTimeout(() => {
      setIsSaved(true)
    }, 400)
    
    return () => clearTimeout(timer)
  }

  // Recommended mock videos
  const recommendations = [
    { id: 1, title: `${currentQuestion?.topic || 'Topic'} - Crash Course`, duration: '12:45' },
    { id: 2, title: `Important PYQs on ${currentQuestion?.subject || 'Subject'}`, duration: '25:10' },
    { id: 3, title: `Top Mistakes to Avoid in ${currentQuestion?.topic || 'Topic'}`, duration: '08:30' }
  ]

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-modal shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[650px]">
        
        {/* Left/Main Column: Video Player */}
        <div className="flex-1 bg-black flex flex-col justify-between relative min-h-[250px] md:min-h-0">
          
          {/* Iframe */}
          <div className="flex-1 relative w-full h-full">
            <iframe
              src={activeVideoSolutionUrl}
              title="YouTube video player"
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          
          {/* Video Title and info */}
          <div className="p-4 bg-slate-900 text-white">
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary px-2 py-0.5 bg-primary/10 rounded">
              {currentQuestion?.subject} • {currentQuestion?.topic}
            </span>
            <h4 className="font-semibold text-sm mt-2 line-clamp-2">
              Video Solution: {currentQuestion?.question}
            </h4>
          </div>

          {/* Close button inside video player (mobile convenience) */}
          <button
            onClick={() => setActiveVideoSolutionUrl(null)}
            className="absolute top-3 left-3 md:hidden p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Right Column: Personal Notes & Recommended Lectures */}
        <div className="w-full md:w-80 flex flex-col border-t md:border-t-0 md:border-l border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark">
          
          {/* Header */}
          <div className="hidden md:flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
            <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Study Companion</h3>
            <button
              onClick={() => setActiveVideoSolutionUrl(null)}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
            
            {/* Notes Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-primary" />
                  <span>My Study Notes</span>
                </label>
                {note.trim() && (
                  <span className="text-[10px] text-success flex items-center gap-1">
                    <Check size={12} />
                    <span>Auto-saved</span>
                  </span>
                )}
              </div>
              <textarea
                placeholder="Write formulas, shortcuts, or key tips here..."
                value={note}
                onChange={handleNoteChange}
                className="w-full h-32 p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark resize-none font-mono"
              />
            </div>

            {/* Recommended Videos */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1.5">
                <Play size={14} className="text-primary" />
                <span>Related Lectures</span>
              </label>
              
              <div className="space-y-2">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-2.5 rounded-btn bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800/40 cursor-pointer transition-all flex gap-3 items-center"
                  >
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Play size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text-primary-light dark:text-text-primary-dark truncate">{rec.title}</p>
                      <span className="text-[10px] text-slate-400">{rec.duration} mins</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
