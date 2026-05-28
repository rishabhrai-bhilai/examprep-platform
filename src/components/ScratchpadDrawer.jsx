import React, { useState, useEffect, useRef } from 'react'
import { 
  X, Edit3, FileText, Trash2, Save, Undo, RefreshCw, Download, Check, 
  ThumbsUp, ThumbsDown, MessageSquare, Bookmark, Play, Hand, ZoomIn, ZoomOut, Maximize2 
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function ScratchpadDrawer({
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
    scratchpadOpenQuestionId, 
    setScratchpadOpenQuestionId,
    questionNotes,
    saveQuestionNote,
    deleteQuestionNote,
    theme,
    bookmarks,
    toggleBookmark,
    votes,
    upvoteQuestion,
    downvoteQuestion,
    setActiveDiscussionQuestionId,
    setActiveVideoSolutionUrl
  } = useAppStore()

  // State to track selection: 'menu' | 'draw' | 'pdf' | 'view'
  const [mode, setMode] = useState('menu')
  const [activeColor, setActiveColor] = useState('default') // 'default', 'blue', 'red', 'green', 'yellow'
  const [penSize, setPenSize] = useState(4) // 2 (thin), 4 (medium), 8 (thick)
  const [isEraser, setIsEraser] = useState(false)
  const [pdfFile, setPdfFile] = useState(null) // { name, size, data }
  const [uploadError, setUploadError] = useState('')

  // Scribing Tool: Smooth Vector states
  const [strokes, setStrokes] = useState([])
  const [undoStack, setUndoStack] = useState([])
  const [currentPoints, setCurrentPoints] = useState([])
  
  // Scribing Tool: Infinite Panning and Zooming
  const [zoomScale, setZoomScale] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [toolMode, setToolMode] = useState('draw') // 'draw' | 'pan'

  // Mobile Tabs Layout
  const [mobileTab, setMobileTab] = useState('question') // 'question' | 'scratchpad'

  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  
  // Interaction Refs to prevent stale closures
  const isDrawingRef = useRef(false)
  const isPanningRef = useRef(false)
  const startPanPosRef = useRef({ x: 0, y: 0 })
  const initialPanOffsetRef = useRef({ x: 0, y: 0 })

  const savedNote = scratchpadOpenQuestionId ? questionNotes[scratchpadOpenQuestionId] : null

  // Sync refs with state values
  const zoomScaleRef = useRef(1)
  const panOffsetRef = useRef({ x: 0, y: 0 })
  
  useEffect(() => {
    zoomScaleRef.current = zoomScale
  }, [zoomScale])

  useEffect(() => {
    panOffsetRef.current = panOffset
  }, [panOffset])

  // Determine current mode on open
  useEffect(() => {
    if (scratchpadOpenQuestionId) {
      if (savedNote) {
        setMode('view')
        if (savedNote.type === 'canvas' && savedNote.strokes) {
          setStrokes(savedNote.strokes)
          setUndoStack([])
        } else {
          setStrokes([])
          setUndoStack([])
        }
      } else {
        setMode('menu')
        setStrokes([])
        setUndoStack([])
      }
      setPdfFile(null)
      setUploadError('')
      
      // Reset zoom, pan and tool
      setZoomScale(1)
      setPanOffset({ x: 0, y: 0 })
      setToolMode('draw')
      setMobileTab('question')
    }
  }, [scratchpadOpenQuestionId, savedNote])

  // Colors mapping
  const colorValues = {
    default: theme === 'dark' ? '#f8fafc' : '#0f172a',
    blue: '#3b82f6',
    red: '#ef4444',
    green: '#10b981',
    yellow: '#f59e0b'
  }

  // Draw Canvas Redraw loop
  const renderCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    
    // Clear the canvas area
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // White/Dark background base
    ctx.fillStyle = theme === 'dark' ? '#0f172a' : '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    ctx.save()
    
    // Apply pan & zoom transforms
    ctx.translate(panOffset.x, panOffset.y)
    ctx.scale(zoomScale, zoomScale)
    
    // Draw engineering grid dots
    ctx.fillStyle = theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(203, 213, 225, 0.6)'
    const gridSpacing = 30
    const startX = Math.floor(-panOffset.x / zoomScale / gridSpacing) * gridSpacing
    const startY = Math.floor(-panOffset.y / zoomScale / gridSpacing) * gridSpacing
    const endX = startX + (canvas.width / zoomScale) + gridSpacing * 2
    const endY = startY + (canvas.height / zoomScale) + gridSpacing * 2
    
    for (let x = startX; x < endX; x += gridSpacing) {
      for (let y = startY; y < endY; y += gridSpacing) {
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    // Helper to draw a single vector stroke
    const drawStroke = (stroke) => {
      const pts = stroke.points
      if (!pts || pts.length === 0) return
      
      ctx.beginPath()
      
      if (stroke.color === 'eraser') {
        ctx.strokeStyle = theme === 'dark' ? '#0f172a' : '#ffffff'
        ctx.lineWidth = stroke.size
      } else {
        ctx.strokeStyle = stroke.color
        ctx.lineWidth = stroke.size
      }
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      if (pts.length === 1) {
        ctx.beginPath()
        ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2)
        ctx.fillStyle = ctx.strokeStyle
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        
        // Quadratic bezier midpoint smoothing
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2
          const yc = (pts[i].y + pts[i + 1].y) / 2
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc)
        }
        
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
        ctx.stroke()
      }
    }
    
    // Draw completed strokes
    strokes.forEach(drawStroke)
    
    // Draw active drawing stroke in progress
    if (currentPoints.length > 0) {
      const activeColorVal = isEraser ? 'eraser' : colorValues[activeColor]
      const activeSize = isEraser ? 24 : penSize
      drawStroke({
        color: activeColorVal,
        size: activeSize,
        points: currentPoints
      })
    }
    
    ctx.restore()
  }

  // Force redraw whenever canvas drawing dependencies change
  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      renderCanvas()
    }
  }, [mode, strokes, currentPoints, zoomScale, panOffset, theme, isEraser, activeColor, penSize])

  // ResizeObserver to resize canvas when window/panels shift
  useEffect(() => {
    if (mode === 'draw' && canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current
      const container = containerRef.current
      
      const resizeCanvas = () => {
        const rect = container.getBoundingClientRect()
        canvas.width = rect.width || 600
        canvas.height = rect.height || 500
        renderCanvas()
      }
      
      resizeCanvas()
      
      const resizeObserver = new ResizeObserver(() => {
        resizeCanvas()
      })
      resizeObserver.observe(container)
      
      return () => {
        resizeObserver.disconnect()
      }
    }
  }, [mode])

  if (scratchpadOpenQuestionId === null || !currentQuestion) return null

  // Coordinate conversion screen-space to world-space
  const getConvertedCoords = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    
    let clientX, clientY
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    
    const x = (clientX - rect.left - panOffsetRef.current.x) / zoomScaleRef.current
    const y = (clientY - rect.top - panOffsetRef.current.y) / zoomScaleRef.current
    return { x, y }
  }

  // --- DRAWING & PANNING EVENTS ---
  const handleStart = (e) => {
    e.preventDefault()
    
    // Check for mobile 2-finger panning gesture
    if (e.touches && e.touches.length === 2) {
      isPanningRef.current = true
      isDrawingRef.current = false
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      startPanPosRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      }
      initialPanOffsetRef.current = { ...panOffsetRef.current }
      return
    }

    if (toolMode === 'pan') {
      isPanningRef.current = true
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      startPanPosRef.current = { x: clientX, y: clientY }
      initialPanOffsetRef.current = { ...panOffsetRef.current }
    } else {
      isDrawingRef.current = true
      const coords = getConvertedCoords(e)
      setCurrentPoints([coords])
    }
  }

  const handleMove = (e) => {
    e.preventDefault()
    
    if (isPanningRef.current) {
      let clientX, clientY
      if (e.touches && e.touches.length === 2) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        clientX = (touch1.clientX + touch2.clientX) / 2
        clientY = (touch1.clientY + touch2.clientY) / 2
      } else {
        clientX = e.touches ? e.touches[0].clientX : e.clientX
        clientY = e.touches ? e.touches[0].clientY : e.clientY
      }
      
      const dx = clientX - startPanPosRef.current.x
      const dy = clientY - startPanPosRef.current.y
      setPanOffset({
        x: initialPanOffsetRef.current.x + dx,
        y: initialPanOffsetRef.current.y + dy
      })
    } else if (isDrawingRef.current) {
      const coords = getConvertedCoords(e)
      setCurrentPoints(prev => [...prev, coords])
    }
  }

  const handleEnd = () => {
    isPanningRef.current = false
    if (isDrawingRef.current) {
      isDrawingRef.current = false
      if (currentPoints.length > 0) {
        const activeColorVal = isEraser ? 'eraser' : colorValues[activeColor]
        const activeSize = isEraser ? 24 : penSize
        setStrokes(prev => [...prev, { color: activeColorVal, size: activeSize, points: currentPoints }])
        setUndoStack([]) // clear redo on draw
      }
      setCurrentPoints([])
    }
  }

  // --- ACTIONS ---
  const handleUndo = () => {
    if (strokes.length === 0) return
    const lastStroke = strokes[strokes.length - 1]
    setUndoStack(prev => [...prev, lastStroke])
    setStrokes(prev => prev.slice(0, -1))
  }

  const handleRedo = () => {
    if (undoStack.length === 0) return
    const nextStroke = undoStack[undoStack.length - 1]
    setUndoStack(prev => prev.slice(0, -1))
    setStrokes(prev => [...prev, nextStroke])
  }

  const handleClearCanvas = () => {
    if (window.confirm('Wipe out all drawing on the board?')) {
      setStrokes([])
      setUndoStack([])
    }
  }

  const getCleanCanvasDataUrl = () => {
    const canvas = canvasRef.current
    if (!canvas) return ''
    
    // Render clean drawing on offscreen canvas at standard scale and coordinates
    const offscreen = document.createElement('canvas')
    offscreen.width = canvas.width
    offscreen.height = canvas.height
    
    const ctx = offscreen.getContext('2d')
    ctx.clearRect(0, 0, offscreen.width, offscreen.height)
    
    // Render backplate matching light/dark theme
    ctx.fillStyle = theme === 'dark' ? '#0f172a' : '#ffffff'
    ctx.fillRect(0, 0, offscreen.width, offscreen.height)
    
    strokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length === 0) return
      
      ctx.beginPath()
      if (stroke.color === 'eraser') {
        ctx.strokeStyle = theme === 'dark' ? '#0f172a' : '#ffffff'
        ctx.lineWidth = stroke.size
      } else {
        ctx.strokeStyle = stroke.color
        ctx.lineWidth = stroke.size
      }
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      const pts = stroke.points
      if (pts.length === 1) {
        ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2)
        ctx.fillStyle = ctx.strokeStyle
        ctx.fill()
      } else {
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2
          const yc = (pts[i].y + pts[i + 1].y) / 2
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc)
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
        ctx.stroke()
      }
    })
    
    return offscreen.toDataURL('image/png')
  }

  const handleSaveDrawing = () => {
    const dataUrl = getCleanCanvasDataUrl()
    saveQuestionNote(scratchpadOpenQuestionId, 'canvas', dataUrl, 'Sketch Note', strokes)
    setMode('view')
  }

  // --- PDF UPLOAD HANDLERS ---
  const handlePdfUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadError('')

    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are supported!')
      return
    }

    const maxBytes = 1.5 * 1024 * 1024
    if (file.size > maxBytes) {
      setUploadError('File is too large! PDFs must be under 1.5MB to fit in local quota.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setPdfFile({
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        data: reader.result
      })
    }
    reader.readAsDataURL(file)
  }

  const handleSavePdf = () => {
    if (pdfFile) {
      saveQuestionNote(scratchpadOpenQuestionId, 'pdf', pdfFile.data, pdfFile.name)
      setMode('view')
    }
  }

  const handleDeleteNote = () => {
    if (window.confirm('Delete this note? This action cannot be undone.')) {
      deleteQuestionNote(scratchpadOpenQuestionId)
      setStrokes([])
      setUndoStack([])
      setMode('menu')
    }
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
          onClick={() => setMobileTab('scratchpad')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all ${
            mobileTab === 'scratchpad'
              ? 'border-primary text-primary bg-indigo-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          }`}
        >
          Scratchpad
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
              onClick={() => setScratchpadOpenQuestionId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 font-bold text-xs transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
            >
              <X size={14} />
              <span>Exit Practice</span>
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
                      btnStyle = 'border-slate-100 dark:border-slate-900 opacity-60 text-slate-450'
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
                        btnStyle = 'border-slate-150 dark:border-slate-900 opacity-60 text-slate-450'
                      }
                    } else if (isSelected) {
                      btnStyle = 'border-primary bg-indigo-50/50 dark:bg-indigo-950/20 text-primary font-medium'
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
                      id={`workspace-nat-input-${currentQuestion.id}`}
                      placeholder="Type numerical answer..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleNATSubmit(e.target.value)
                        }
                      }}
                      className="flex-1 h-9 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`workspace-nat-input-${currentQuestion.id}`)
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
                        <span className="text-[9px] block font-bold text-slate-400 uppercase mb-0.5">Your Answer:</span>
                        <span>{selectedAnswers[currentQuestion.id]}</span>
                      </div>
                      <div className="p-2.5 rounded border border-success bg-emerald-500/5 text-success">
                        <span className="text-[9px] block font-bold text-slate-400 uppercase mb-0.5">Correct Key:</span>
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
                className={`h-9 w-9 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 ${
                  votes[currentQuestion.id] === 'up'
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-50'
                }`}
                title="Upvote question"
              >
                <ThumbsUp size={14} className={votes[currentQuestion.id] === 'up' ? 'fill-white text-white' : 'text-slate-500'} />
              </button>
              <span className="text-[9px] font-bold text-slate-500 mt-0.5">
                {currentQuestion.likes + (votes[currentQuestion.id] === 'up' ? 1 : 0)}
              </span>
            </div>

            {/* Downvote */}
            <button
              onClick={() => downvoteQuestion(currentQuestion.id)}
              className={`h-9 w-9 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 ${
                votes[currentQuestion.id] === 'down'
                  ? 'bg-error border-error text-white'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-50'
              }`}
              title="Downvote question"
            >
              <ThumbsDown size={14} className={votes[currentQuestion.id] === 'down' ? 'fill-white text-white' : 'text-slate-500'} />
            </button>

            {/* Discussion */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => setActiveDiscussionQuestionId(currentQuestion.id)}
                className="h-9 w-9 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 flex items-center justify-center shadow-md text-slate-500 hover:bg-slate-50 transition-all active:scale-90"
                title="Open discussion thread"
              >
                <MessageSquare size={14} />
              </button>
              <span className="text-[9px] font-bold text-slate-500 mt-0.5">
                {currentQuestion.commentsCount}
              </span>
            </div>

            {/* Bookmark */}
            <button
              onClick={() => toggleBookmark(currentQuestion.id)}
              className={`h-9 w-9 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 ${
                bookmarks.includes(currentQuestion.id)
                  ? 'bg-primary border-primary text-white'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-50'
              }`}
              title="Bookmark question"
            >
              <Bookmark size={14} className={bookmarks.includes(currentQuestion.id) ? 'fill-white text-white' : 'text-slate-500'} />
            </button>

            {/* Video Solution */}
            <button
              onClick={() => setActiveVideoSolutionUrl(currentQuestion.videoSolutionUrl)}
              className="h-9 w-9 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 flex items-center justify-center shadow-md text-slate-500 hover:bg-slate-50 transition-all active:scale-90"
              title="Watch video solution"
            >
              <Play size={14} className="fill-slate-500 text-slate-500" />
            </button>
          </div>
        </div>

        {/* --- RIGHT PANEL: DRAWING / PDF WORKSPACE --- */}
        <div 
          className={`flex-1 h-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 ${
            mobileTab === 'scratchpad' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 shrink-0">
            <div>
              <h3 className="font-bold text-text-primary-light dark:text-text-primary-dark">Workspace Note Pad</h3>
              <p className="text-[10px] text-slate-500">Scribble equations, solve problems, or load PDF reference notes</p>
            </div>
            
            {mode === 'view' && savedNote && (
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteNote}
                  className="px-3 py-1.5 text-xs text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 font-bold rounded-btn transition-colors flex items-center gap-1 border border-rose-500/20"
                >
                  <Trash2 size={12} />
                  <span>Delete Note</span>
                </button>
                <button
                  onClick={() => setMode(savedNote.type === 'canvas' ? 'draw' : 'pdf')}
                  className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-350 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 font-bold rounded-btn transition-colors border border-slate-200 dark:border-slate-700"
                >
                  {savedNote.type === 'canvas' ? 'Redraw Sketch' : 'Re-upload PDF'}
                </button>
              </div>
            )}
          </div>

          {/* --- VIEW MODE: MENU (Select Drawing vs PDF) --- */}
          {mode === 'menu' && (
            <div className="flex-1 p-6 space-y-6 flex flex-col justify-center max-w-xl mx-auto">
              <div className="text-center space-y-1 mb-4">
                <h4 className="font-bold text-base text-slate-750 dark:text-slate-200">How would you like to attach notes?</h4>
                <p className="text-xs text-slate-450">Save working notes directly to this practice question.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Option 1: Canvas Drawing */}
                <button 
                  onClick={() => setMode('draw')}
                  className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:border-primary dark:hover:border-primary hover:bg-indigo-50/10 text-left transition-all group flex gap-4 items-center shadow-sm"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Edit3 size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">Start Drawing</h5>
                    <p className="text-xs text-slate-400 mt-0.5">Write formulas, diagrams or sketches using custom pen sizes & colors.</p>
                  </div>
                </button>

                {/* Option 2: PDF Upload */}
                <button 
                  onClick={() => setMode('pdf')}
                  className="p-6 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark hover:border-primary dark:hover:border-primary hover:bg-indigo-50/10 text-left transition-all group flex gap-4 items-center shadow-sm"
                >
                  <div className="h-10 w-10 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">Upload PDF Reference</h5>
                    <p className="text-xs text-slate-400 mt-0.5">Attach a lecture note, cheatsheet or reference PDF copy (max 1.5MB).</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* --- VIEW MODE: DRAWING CANVAS --- */}
          {mode === 'draw' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Toolbar */}
              <div className="p-3 border-b border-border-light dark:border-border-dark flex flex-wrap gap-3 items-center justify-between bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
                
                {/* Colors */}
                <div className="flex items-center gap-1">
                  {Object.keys(colorValues).map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setActiveColor(c)
                        setIsEraser(false)
                      }}
                      disabled={toolMode === 'pan'}
                      className={`h-6 w-6 rounded-full border transition-all flex items-center justify-center shrink-0 ${
                        activeColor === c && !isEraser && toolMode === 'draw'
                          ? 'scale-110 ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950'
                          : 'opacity-85 hover:opacity-100 disabled:opacity-40'
                      }`}
                      style={{ 
                        backgroundColor: c === 'default' ? (theme === 'dark' ? '#334155' : '#e2e8f0') : colorValues[c],
                        borderColor: theme === 'dark' ? '#475569' : '#cbd5e1'
                      }}
                      title={`${c.charAt(0).toUpperCase() + c.slice(1)} Pen`}
                    >
                      {activeColor === c && !isEraser && toolMode === 'draw' && (
                        <span className={`h-1.5 w-1.5 rounded-full ${c === 'default' && theme !== 'dark' ? 'bg-slate-800' : 'bg-white'}`} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Pen sizes & Eraser */}
                <div className="flex gap-2 items-center">
                  <div className="flex border border-border-light dark:border-border-dark rounded-btn overflow-hidden bg-white dark:bg-slate-950">
                    {[2, 4, 8].map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          setPenSize(size)
                          setIsEraser(false)
                          setToolMode('draw')
                        }}
                        className={`h-7 px-2.5 text-xs font-bold transition-all ${
                          penSize === size && !isEraser && toolMode === 'draw'
                            ? 'bg-primary text-white'
                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        {size === 2 ? 'Thin' : size === 4 ? 'Med' : 'Thick'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setIsEraser(!isEraser)
                      if (!isEraser) setToolMode('draw')
                    }}
                    className={`h-7 px-2.5 text-xs font-bold rounded-btn border transition-all ${
                      isEraser && toolMode === 'draw'
                        ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                        : 'border-border-light dark:border-border-dark text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-950'
                    }`}
                  >
                    Eraser
                  </button>
                </div>

                {/* Draw vs Pan Tool */}
                <div className="flex border border-border-light dark:border-border-dark rounded-btn overflow-hidden bg-white dark:bg-slate-950">
                  <button
                    onClick={() => {
                      setToolMode('draw')
                      setIsEraser(false)
                    }}
                    className={`h-7 px-2.5 text-xs font-bold transition-all flex items-center gap-1 ${
                      toolMode === 'draw'
                        ? 'bg-primary text-white'
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                    title="Draw Tool (Write/Draw)"
                  >
                    <Edit3 size={12} />
                    <span className="hidden sm:inline">Draw</span>
                  </button>
                  <button
                    onClick={() => setToolMode('pan')}
                    className={`h-7 px-2.5 text-xs font-bold transition-all flex items-center gap-1 ${
                      toolMode === 'pan'
                        ? 'bg-primary text-white'
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                    title="Pan Tool (Move screen)"
                  >
                    <Hand size={12} />
                    <span className="hidden sm:inline">Pan</span>
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border border-border-light dark:border-border-dark rounded-btn p-0.5">
                  <button
                    onClick={() => setZoomScale(prev => Math.min(3.0, prev + 0.15))}
                    className="p-1 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500"
                    title="Zoom In"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 px-1.5 min-w-[40px] text-center">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomScale(prev => Math.max(0.4, prev - 0.15))}
                    className="p-1 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500"
                    title="Zoom Out"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setZoomScale(1)
                      setPanOffset({ x: 0, y: 0 })
                    }}
                    className="p-1 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500"
                    title="Reset Zoom"
                  >
                    <Maximize2 size={12} />
                  </button>
                </div>

                {/* Undo / Redo */}
                <div className="flex items-center gap-1 border border-border-light dark:border-border-dark rounded-btn overflow-hidden bg-white dark:bg-slate-950">
                  <button
                    onClick={handleUndo}
                    disabled={strokes.length === 0}
                    className="h-7 px-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40"
                    title="Undo stroke"
                  >
                    <Undo size={14} />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={undoStack.length === 0}
                    className="h-7 px-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-40"
                    title="Redo stroke"
                  >
                    <RefreshCw size={12} className="rotate-180" />
                  </button>
                </div>

                {/* Clear Board */}
                <button
                  onClick={handleClearCanvas}
                  className="h-7 px-2.5 text-xs font-bold rounded-btn text-rose-500 border border-rose-500/20 hover:bg-rose-500/5 transition-colors shrink-0"
                >
                  Clear
                </button>
              </div>

              {/* Drawing Board viewport */}
              <div 
                ref={containerRef} 
                className="flex-1 bg-slate-200 dark:bg-slate-950 relative overflow-hidden flex items-center justify-center select-none"
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleStart}
                  onMouseMove={handleMove}
                  onMouseUp={handleEnd}
                  onMouseLeave={handleEnd}
                  onTouchStart={handleStart}
                  onTouchMove={handleMove}
                  onTouchEnd={handleEnd}
                  className={`bg-white dark:bg-slate-900 shadow-inner w-full h-full touch-none select-none ${
                    toolMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
                  }`}
                />
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-border-light dark:border-border-dark flex gap-3 bg-card-light dark:bg-card-dark shrink-0">
                <button
                  onClick={() => setMode(savedNote ? 'view' : 'menu')}
                  className="flex-1 h-10 border border-border-light dark:border-border-dark text-slate-650 dark:text-slate-400 font-bold text-xs rounded-btn hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDrawing}
                  disabled={strokes.length === 0}
                  className="flex-1 h-10 bg-success text-white font-bold text-xs rounded-btn hover:bg-success/90 shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Save size={14} />
                  <span>Save Notes</span>
                </button>
              </div>
            </div>
          )}

          {/* --- VIEW MODE: PDF UPLOADER --- */}
          {mode === 'pdf' && (
            <div className="flex-1 p-6 space-y-6 flex flex-col justify-between overflow-y-auto custom-scrollbar max-w-xl mx-auto w-full">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">Attach Reference PDF</h4>
                  <p className="text-xs text-slate-400">PDF copy will be bound to this question for quick reviews.</p>
                </div>

                {/* Uploader Box */}
                {!pdfFile ? (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-card p-8 text-center bg-slate-50/50 dark:bg-slate-950/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer transition-colors relative flex flex-col items-center justify-center gap-3 min-h-[180px]">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="h-10 w-10 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center">
                      <FileText size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-primary hover:underline">Click to browse file</span>
                      <span className="text-xs text-slate-400 block mt-1">Accepts PDF format (max 1.5MB)</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-card border border-primary/20 bg-indigo-500/5 dark:bg-indigo-950/10 flex items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 bg-primary text-white rounded-btn flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">{pdfFile.name}</p>
                        <p className="text-[10px] text-slate-450">{pdfFile.size}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPdfFile(null)}
                      className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors shrink-0"
                      title="Remove PDF"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {uploadError && (
                  <div className="text-xs text-error font-medium bg-red-500/10 border border-red-500/20 p-3 rounded-btn animate-shake">
                    {uploadError}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-border-light dark:border-border-dark shrink-0">
                <button
                  onClick={() => setMode(savedNote ? 'view' : 'menu')}
                  className="flex-1 h-10 border border-border-light dark:border-border-dark text-slate-650 dark:text-slate-400 font-bold text-xs rounded-btn hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePdf}
                  disabled={!pdfFile}
                  className="flex-1 h-10 bg-success text-white font-bold text-xs rounded-btn hover:bg-success/90 shadow-sm disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Save PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* --- VIEW MODE: DISPLAY SAVED NOTE --- */}
          {mode === 'view' && savedNote && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
              <div className="flex-1 p-5 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center">
                
                {savedNote.type === 'canvas' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    <div className="text-center shrink-0">
                      <span className="text-[10px] font-bold text-primary bg-indigo-500/10 px-2.5 py-1 rounded uppercase tracking-wider">
                        Sketch Note
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1.5">Bound to practice question #{scratchpadOpenQuestionId}</p>
                    </div>
                    {/* Drawing Image representation */}
                    <div className="flex-1 w-full max-w-4xl border border-slate-200 dark:border-slate-800 rounded-card shadow-lg bg-white dark:bg-slate-900 overflow-hidden relative flex items-center justify-center min-h-[300px]">
                      <img
                        src={savedNote.data}
                        alt="Saved Sketchpad Note"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col gap-3">
                    <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-btn border border-slate-200 dark:border-slate-850 shrink-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded uppercase tracking-wide">
                          Attached PDF
                        </span>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate mt-1.5">{savedNote.name}</h4>
                      </div>
                      <a
                        href={savedNote.data}
                        download={savedNote.name || 'note.pdf'}
                        className="h-8 px-3 rounded-btn bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-350 font-bold text-xs flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </a>
                    </div>

                    <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-card bg-white dark:bg-slate-900 overflow-hidden relative shadow-inner min-h-[300px]">
                      <iframe
                        src={savedNote.data}
                        title="Uploaded Notes PDF"
                        className="w-full h-full absolute inset-0 border-0"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-border-light dark:border-border-dark flex gap-3 bg-card-light dark:bg-card-dark shrink-0">
                <button
                  onClick={() => setScratchpadOpenQuestionId(null)}
                  className="w-full h-10 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn transition-colors shadow-sm active:scale-99 flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Done & Exit Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
