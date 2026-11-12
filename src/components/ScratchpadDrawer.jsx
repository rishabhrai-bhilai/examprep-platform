import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { 
  X, ArrowLeft, Edit3, FileText, Type, Trash2, Save, RotateCcw, RotateCw, Download, Check, 
  ThumbsUp, ThumbsDown, MessageSquare, Bookmark, Play,
  Plus, ChevronLeft, ChevronRight, ChevronDown, Image as ImageIcon, Paperclip, Eye, UploadCloud, Copy,
  Move, PanelLeftClose, PanelLeftOpen, Eraser, PenTool, GripVertical,
  Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered, Table, Palette, Undo2, Upload
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import QuestionImage from './QuestionImage'
import QuestionText from './QuestionText'
import AnswerProvenance from './AnswerProvenance'
import FormattedContent from './FormattedContent'
import { formatAnswer, isAcceptedOption, isAnswerCorrect } from '../utils/answers'
import { parseInk, buildInkToken, renderInkOverlay } from '../utils/ink'

// Math symbols for GATE
const mathSymbols = [
  { label: 'Inline Math', snippet: '$E = mc^2$', desc: 'LaTeX inline' },
  { label: 'Block Math', snippet: '$$\nT(n) = 2T(n/2) + O(n)\n$$', desc: 'Display formula' },
  { label: 'Summation', snippet: '$\\sum_{i=1}^{n} i$', desc: '∑ summation' },
  { label: 'Square Root', snippet: '$\\sqrt{n}$', desc: '√ radical' },
  { label: 'Fraction', snippet: '$\\frac{a}{b}$', desc: 'Fraction' },
  { label: 'Theta / Big-O', snippet: '$\\Theta(n \\log n)$', desc: 'Asymptotic notation' },
  { label: 'Integral', snippet: '$\\int_{0}^{\\infty} f(x)dx$', desc: '∫ integral' },
  { label: 'Logarithm', snippet: '$\\log_2(n)$', desc: 'log base 2' },
  { label: 'Set / Logic', snippet: '$\\land, \\lor, \\neg, \\subseteq, \\in$', desc: 'Boolean / set symbols' },
  { label: 'Greek (λ, α, β)', snippet: '$\\alpha, \\beta, \\lambda, \\pi$', desc: 'Greek letters' }
]

export default function ScratchpadDrawer({
  currentQuestion,
  selectedAnswers = {},
  setSelectedAnswers,
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

  // Workspace Mode: 'draw' (editing) | 'view' (read saved notes)
  const [mode, setMode] = useState('draw')
  // Sub-Tab moved to bottom: 'canvas' | 'attachments'
  const [workspaceTab, setWorkspaceTab] = useState('canvas')

  // Multi-Sheet drafting state
  // Each sheet: { id, title, text: '', strokes: [], images: [], undoStack: [] }
  const [sheets, setSheets] = useState([
    { id: 'sheet-1', title: 'Sheet 1', text: '', strokes: [], images: [], undoStack: [] }
  ])
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)

  // Active Sheet Working State
  const [textContent, setTextContent] = useState('')
  const [strokes, setStrokes] = useState([])
  const [images, setImages] = useState([])
  const [selectedImageId, setSelectedImageId] = useState(null)

  // Pen Drawing Layer State
  // Draw toggles vertical floating toolbar on right & enables canvas pointer-events
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [currentStroke, setCurrentStroke] = useState([])
  const [penColor, setPenColor] = useState(theme === 'dark' ? '#f8fafc' : '#0f172a')
  const [penSize, setPenSize] = useState(4) // 2 | 4 | 7
  const [isEraser, setIsEraser] = useState(false)
  const isDrawingRef = useRef(false)
  const [contentHeight, setContentHeight] = useState(0)
  const [isSaved, setIsSaved] = useState(false)

  // Attachments State: Array<{ id, name, type: 'pdf'|'image', size, data }>
  const [attachments, setAttachments] = useState([])
  const [activePreviewAttachment, setActivePreviewAttachment] = useState(null)
  const [uploadError, setUploadError] = useState('')

  // Copy Question ID State
  const [copiedQuestionId, setCopiedQuestionId] = useState(false)
  const handleCopyQuestionId = () => {
    const qid = currentQuestion?.code || `#${currentQuestion?.id || ''}`
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(qid)
    }
    setCopiedQuestionId(true)
    setTimeout(() => setCopiedQuestionId(false), 2000)
  }

  // Floating Vertical Bar State & Draggable Position
  const [barPos, setBarPos] = useState({ x: null, y: 110 })
  const [isDraggingBar, setIsDraggingBar] = useState(false)
  const barDragStartRef = useRef({ startX: 0, startY: 0, originX: 0, originY: 0 })

  // Initialize bar position on right side
  useEffect(() => {
    if (barPos.x === null && typeof window !== 'undefined') {
      setBarPos({ x: Math.max(16, window.innerWidth - 64), y: 110 })
    }
  }, [barPos.x])

  // Window resize bounds clamping for floating toolbar
  useEffect(() => {
    const handleResize = () => {
      setBarPos(prev => {
        if (prev.x === null) return prev
        const maxX = Math.max(10, window.innerWidth - 64)
        const maxY = Math.max(50, window.innerHeight - 80)
        return {
          x: Math.min(prev.x, maxX),
          y: Math.min(prev.y, maxY)
        }
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Floating bar drag start with synchronous window listeners
  const handleBarDragStart = (e) => {
    if (e.target.closest('button')) return
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const startX = clientX
    const startY = clientY
    const originX = barPos.x ?? (window.innerWidth - 64)
    const originY = barPos.y ?? 110

    setIsDraggingBar(true)

    const onMove = (moveEvt) => {
      const curX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX
      const curY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY
      const dx = curX - startX
      const dy = curY - startY

      const maxX = Math.max(10, window.innerWidth - 64)
      const maxY = Math.max(50, window.innerHeight - 80)

      const nextX = Math.max(10, Math.min(maxX, originX + dx))
      const nextY = Math.max(50, Math.min(maxY, originY + dy))

      setBarPos({ x: nextX, y: nextY })
    }

    const onEnd = () => {
      setIsDraggingBar(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
  }

  // Layout Controls: Collapsible Panels
  const [isQuestionCollapsed, setIsQuestionCollapsed] = useState(false)
  const [mobileTab, setMobileTab] = useState('question') // 'question' | 'scratchpad'

  // Dropdowns
  const [showMathMenu, setShowMathMenu] = useState(false)
  const [showColorMenu, setShowColorMenu] = useState(false)
  const [showFormatMenu, setShowFormatMenu] = useState(false)
  const [showImageMenu, setShowImageMenu] = useState(false)
  const [imageUrlInputOpen, setImageUrlInputOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')

  // Refs
  const editorContainerRef = useRef(null)
  const textareaRef = useRef(null)
  const drawingCanvasRef = useRef(null)
  const imageFileInputRef = useRef(null)

  const savedNote = scratchpadOpenQuestionId ? questionNotes[scratchpadOpenQuestionId] : null

  // Colors mapping for drawing
  const colorValues = {
    default: theme === 'dark' ? '#f8fafc' : '#0f172a',
    indigo: '#6366f1',
    blue: '#3b82f6',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#ef4444',
    purple: '#a855f7'
  }

  // Keyboard shortcuts: Q for question toggle, D for draw toggle
  useEffect(() => {
    const handleKey = (e) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      if (e.key === 'q' || e.key === 'Q') {
        setIsQuestionCollapsed(prev => !prev)
      } else if (e.key === 'd' || e.key === 'D') {
        setIsDrawingMode(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Close menus helper
  const closeAllMenus = () => {
    setShowMathMenu(false)
    setShowColorMenu(false)
    setShowFormatMenu(false)
    setShowImageMenu(false)
  }

  // Toggle Draw Mode & handle auto text mode switch
  const toggleDrawMode = () => {
    setIsDrawingMode(prev => !prev)
  }

  // Stop drawing mode & switch directly to text mode
  const switchToTextMode = () => {
    setIsDrawingMode(false)
    setIsEraser(false)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 15)
  }

  // Load question note when scratchpad is opened
  useEffect(() => {
    if (scratchpadOpenQuestionId) {
      if (savedNote) {
        setMode('draw')
        let loadedSheets = []
        if (savedNote.sheets && savedNote.sheets.length > 0) {
          loadedSheets = savedNote.sheets.map((sheet, idx) => ({
            id: sheet.id || `sheet-${idx + 1}`,
            title: sheet.title || `Sheet ${idx + 1}`,
            text: sheet.text || '',
            strokes: (sheet.strokes || []).filter(s => s.type !== 'image'),
            images: sheet.images || (sheet.strokes || []).filter(s => s.type === 'image').map(s => ({
              id: s.id || `img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              src: s.imgData || s.src,
              alt: s.alt || 'Diagram',
              x: s.x || 30,
              y: s.y || 30,
              width: s.width || 320,
              height: s.height || 220
            })),
            undoStack: []
          }))
        } else if (savedNote.strokes) {
          loadedSheets = [{
            id: 'sheet-1',
            title: 'Sheet 1',
            text: savedNote.text || '',
            strokes: (savedNote.strokes || []).filter(s => s.type !== 'image'),
            images: (savedNote.strokes || []).filter(s => s.type === 'image').map(s => ({
              id: s.id || `img-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              src: s.imgData || s.src,
              alt: s.alt || 'Diagram',
              x: s.x || 30,
              y: s.y || 30,
              width: s.width || 320,
              height: s.height || 220
            })),
            undoStack: []
          }]
        } else {
          loadedSheets = [{
            id: 'sheet-1',
            title: 'Sheet 1',
            text: savedNote.text || savedNote.content || '',
            strokes: [],
            images: [],
            undoStack: []
          }]
        }

        setSheets(loadedSheets)
        setActiveSheetIndex(0)
        const first = loadedSheets[0]
        setTextContent(first?.text || '')
        setStrokes(first?.strokes || [])
        setImages(first?.images || [])

        if (savedNote.attachments && savedNote.attachments.length > 0) {
          setAttachments(savedNote.attachments)
        } else if (savedNote.type === 'pdf') {
          setAttachments([{
            id: 'legacy-pdf-1',
            name: savedNote.name || 'Attached PDF.pdf',
            type: 'pdf',
            size: 'Saved PDF',
            data: savedNote.data
          }])
        } else {
          setAttachments([])
        }
      } else {
        setMode('draw')
        const initialSheet = { id: 'sheet-1', title: 'Sheet 1', text: '', strokes: [], images: [], undoStack: [] }
        setSheets([initialSheet])
        setActiveSheetIndex(0)
        setTextContent('')
        setStrokes([])
        setImages([])
        setAttachments([])
      }

      setSelectedImageId(null)
      setIsDrawingMode(false)
      setIsEraser(false)
      setMobileTab('question')
      setWorkspaceTab('canvas')
      setActivePreviewAttachment(null)
      setUploadError('')
    }
  }, [scratchpadOpenQuestionId, savedNote])

  // Adjust textarea auto-grow
  useLayoutEffect(() => {
    const ta = textareaRef.current
    const container = editorContainerRef.current
    if (!ta || !container) return
    ta.style.height = 'auto'
    const inkBottom = images.reduce((m, img) => Math.max(m, (img.y || 0) + (img.height || 0)), 0)
    const strokeBottom = strokes.reduce((m, st) => Math.max(m, ...(st.points || []).map(pt => pt.y + 20)), 0)
    const next = Math.max(container.clientHeight - 40, ta.scrollHeight, inkBottom, strokeBottom)
    ta.style.height = `${next}px`
    setContentHeight(next)
  }, [textContent, images, strokes])

  // Redraw Drawing Canvas
  const redrawCanvas = useCallback(() => {
    const canvas = drawingCanvasRef.current
    const container = editorContainerRef.current
    if (!canvas || !container) return

    const targetWidth = container.clientWidth || 800
    const targetHeight = Math.max(contentHeight || 0, container.clientHeight || 500)

    if (canvas.width !== targetWidth) canvas.width = targetWidth
    if (canvas.height !== targetHeight) canvas.height = targetHeight

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Redraw all completed strokes
    strokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length === 0) return
      ctx.save()
      ctx.strokeStyle = stroke.color || '#6366f1'
      ctx.lineWidth = stroke.size || 4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = (stroke.size || 4) * 4
      } else {
        ctx.globalCompositeOperation = 'source-over'
      }

      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      if (stroke.points.length === 1) {
        ctx.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y + 0.1)
      } else {
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
        }
      }
      ctx.stroke()
      ctx.restore()
    })

    // Redraw active stroke in progress
    if (currentStroke && currentStroke.length > 0) {
      ctx.save()
      ctx.strokeStyle = isEraser ? '#ffffff' : penColor
      ctx.lineWidth = isEraser ? penSize * 4 : penSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (isEraser) ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y)
      if (currentStroke.length === 1) {
        ctx.lineTo(currentStroke[0].x + 0.1, currentStroke[0].y + 0.1)
      } else {
        for (let i = 1; i < currentStroke.length; i++) {
          ctx.lineTo(currentStroke[i].x, currentStroke[i].y)
        }
      }
      ctx.stroke()
      ctx.restore()
    }
  }, [strokes, currentStroke, isEraser, penColor, penSize, contentHeight])

  // Canvas Redraw Effect (immediate + rAF + layout settling timer)
  useEffect(() => {
    redrawCanvas()
    const rafId = requestAnimationFrame(() => {
      redrawCanvas()
    })
    const timer = setTimeout(() => {
      redrawCanvas()
    }, 60)
    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timer)
    }
  }, [redrawCanvas, mode, workspaceTab, activeSheetIndex, isQuestionCollapsed])

  // Canvas Resize Observer on container
  useEffect(() => {
    const container = editorContainerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      redrawCanvas()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [redrawCanvas])

  // --- SHEET MANAGEMENT ---
  const switchToSheet = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= sheets.length || nextIndex === activeSheetIndex) return
    // 1. Commit active state to current sheet
    setSheets(prev => prev.map((s, idx) => {
      if (idx === activeSheetIndex) {
        return { ...s, text: textContent, strokes, images }
      }
      return s
    }))
    // 2. Load target sheet
    const target = sheets[nextIndex]
    if (target) {
      setTextContent(target.text || '')
      setStrokes(target.strokes || [])
      setImages(target.images || [])
    }
    setActiveSheetIndex(nextIndex)
    setSelectedImageId(null)
    setCurrentStroke([])
  }

  const addSheet = () => {
    const currentCommitted = sheets.map((s, idx) => {
      if (idx === activeSheetIndex) {
        return { ...s, text: textContent, strokes, images }
      }
      return s
    })
    const nextNum = currentCommitted.length + 1
    const newSheet = {
      id: `sheet-${Date.now()}`,
      title: `Sheet ${nextNum}`,
      text: '',
      strokes: [],
      images: [],
      undoStack: []
    }
    const nextSheets = [...currentCommitted, newSheet]
    setSheets(nextSheets)
    setActiveSheetIndex(nextSheets.length - 1)
    setTextContent('')
    setStrokes([])
    setImages([])
    setSelectedImageId(null)
    setCurrentStroke([])
  }

  const deleteActiveSheet = () => {
    if (sheets.length <= 1) {
      if (window.confirm('Clear all content on Sheet 1?')) {
        setTextContent('')
        setStrokes([])
        setImages([])
        setSelectedImageId(null)
        setCurrentStroke([])
        setSheets([{ id: 'sheet-1', title: 'Sheet 1', text: '', strokes: [], images: [], undoStack: [] }])
      }
      return
    }
    if (window.confirm(`Delete ${sheets[activeSheetIndex]?.title || 'sheet'}? This sheet's contents will be removed.`)) {
      const nextSheets = sheets.filter((_, idx) => idx !== activeSheetIndex)
      const nextIndex = Math.max(0, activeSheetIndex - 1)
      setSheets(nextSheets)
      setActiveSheetIndex(nextIndex)
      const target = nextSheets[nextIndex]
      setTextContent(target?.text || '')
      setStrokes(target?.strokes || [])
      setImages(target?.images || [])
      setSelectedImageId(null)
      setCurrentStroke([])
    }
  }

  const clearActiveSheet = () => {
    if (window.confirm(`Wipe all content on ${sheets[activeSheetIndex]?.title || 'this sheet'}?`)) {
      setTextContent('')
      setStrokes([])
      setImages([])
      setSelectedImageId(null)
      setCurrentStroke([])
      setSheets(prev => prev.map((s, idx) => idx === activeSheetIndex ? { ...s, text: '', strokes: [], images: [], undoStack: [] } : s))
    }
  }

  // --- TEXT FORMATTING HELPERS ---
  const handleTextChange = (val) => {
    setTextContent(val)
  }

  const insertFormatting = (prefix, suffix = '', defaultText = '') => {
    // When inserting text formatting, automatically stop drawing mode & collapse vertical bar (Point 3.4)
    if (isDrawingMode) setIsDrawingMode(false)

    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentVal = textContent
    const selectedText = currentVal.substring(start, end) || defaultText

    const replacement = `${prefix}${selectedText}${suffix}`
    const updatedVal = currentVal.substring(0, start) + replacement + currentVal.substring(end)

    handleTextChange(updatedVal)

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + prefix.length + selectedText.length
      textarea.setSelectionRange(
        selectedText ? newCursorPos : start + prefix.length,
        selectedText ? newCursorPos : start + prefix.length
      )
    }, 15)
  }

  const insertLinePrefix = (prefix) => {
    if (isDrawingMode) setIsDrawingMode(false)

    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentVal = textContent

    const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1
    const lineEnd = currentVal.indexOf('\n', end)
    const effectiveLineEnd = lineEnd === -1 ? currentVal.length : lineEnd

    const lineText = currentVal.substring(lineStart, effectiveLineEnd)
    const updatedLine = `${prefix}${lineText}`
    const updatedVal = currentVal.substring(0, lineStart) + updatedLine + currentVal.substring(effectiveLineEnd)

    handleTextChange(updatedVal)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart + updatedLine.length, lineStart + updatedLine.length)
    }, 15)
  }

  const insertTableTemplate = () => {
    if (isDrawingMode) setIsDrawingMode(false)
    const tableTemplate = `\n| Concept / Attribute | Description | Details |\n|---|---|---|\n| State 1 | Description 1 | Valid |\n| State 2 | Description 2 | Checked |\n\n`
    insertFormatting(tableTemplate, '', '')
  }

  const insertBadge = (color, label) => {
    if (isDrawingMode) setIsDrawingMode(false)
    insertFormatting(`[badge:${color}:${label}] `, '', '')
    setShowColorMenu(false)
  }

  const insertMathSnippet = (snippet) => {
    if (isDrawingMode) setIsDrawingMode(false)
    insertFormatting(snippet, '', '')
    setShowMathMenu(false)
  }

  const clearFormatting = () => {
    if (isDrawingMode) setIsDrawingMode(false)
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentVal = textContent
    if (start === end) return

    const selectedText = currentVal.substring(start, end)
    const cleaned = selectedText
      .replace(/(\*\*|\*|~~|`|\$)/g, '')
      .replace(/^#+\s*/gm, '')
      .replace(/^>\s*/gm, '')
      .replace(/^[-*]\s*/gm, '')
      .replace(/^\d+\.\s*/gm, '')

    const updatedVal = currentVal.substring(0, start) + cleaned + currentVal.substring(end)
    handleTextChange(updatedVal)
  }

  // --- FLOATING IMAGE MANIPULATION ---
  const addFloatingImage = (src, alt = 'Diagram') => {
    const container = editorContainerRef.current
    const initialX = Math.max(30, Math.min(container ? container.clientWidth - 380 : 80, 50 + images.length * 30))
    const initialY = Math.max(30, Math.min(container ? container.clientHeight - 260 : 80, 50 + images.length * 30))

    const newImg = {
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      src,
      alt,
      x: initialX,
      y: initialY,
      width: 320,
      height: 220
    }

    setImages(prev => [...prev, newImg])
    setSelectedImageId(newImg.id)
  }

  const handleImageDragStart = (e, imgId) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedImageId(imgId)

    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const targetImg = images.find(i => i.id === imgId)
    if (!targetImg) return

    const offsetX = clientX - targetImg.x
    const offsetY = clientY - targetImg.y

    const onMove = (moveEvt) => {
      const curX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX
      const curY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY

      const container = editorContainerRef.current
      const maxX = container ? container.clientWidth - 50 : 1000
      const maxY = container ? container.clientHeight - 50 : 1000

      const newX = Math.max(0, Math.min(maxX, curX - offsetX))
      const newY = Math.max(0, Math.min(maxY, curY - offsetY))

      setImages(prev => prev.map(i => i.id === imgId ? { ...i, x: newX, y: newY } : i))
    }

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
  }

  const scaleImage = (imgId, factor) => {
    setImages(prev => prev.map(img => {
      if (img.id !== imgId) return img
      const curW = img.width || 320
      const newW = Math.max(120, Math.min(900, Math.round(curW * factor)))
      const newH = Math.round((newW * 220) / 320)
      return { ...img, width: newW, height: newH }
    }))
  }

  const deleteImage = (imgId) => {
    setImages(prev => prev.filter(i => i.id !== imgId))
    setSelectedImageId(null)
  }

  // Keyboard shortcut to delete selected image
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      if (!selectedImageId) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteImage(selectedImageId)
      } else if (e.key === 'Escape') {
        setSelectedImageId(null)
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [selectedImageId])

  // Clipboard Paste listener (Ctrl+V)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        const blob = item.getAsFile()
        const reader = new FileReader()
        reader.onload = (event) => {
          addFloatingImage(event.target.result, 'Pasted Screenshot')
        }
        reader.readAsDataURL(blob)
        return
      }
    }
  }

  // File image upload
  const handleFileImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const name = file.name.replace(/\.[^/.]+$/, "") || 'Diagram'
      addFloatingImage(event.target.result, name)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
    setShowImageMenu(false)
  }

  const handleInsertImageUrl = (e) => {
    e.preventDefault()
    if (!imageUrl.trim()) return
    addFloatingImage(imageUrl.trim(), imageAlt.trim() || 'Diagram')
    setImageUrl('')
    setImageAlt('')
    setImageUrlInputOpen(false)
  }

  // --- PEN DRAWING CANVAS OVERLAY ---
  const getCanvasCoords = (e) => {
    const canvas = drawingCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const handleDrawingStart = (e) => {
    if (!isDrawingMode) return
    e.preventDefault()
    isDrawingRef.current = true
    const coords = getCanvasCoords(e)
    setCurrentStroke([coords])
  }

  const handleDrawingMove = (e) => {
    if (!isDrawingMode || !isDrawingRef.current) return
    e.preventDefault()
    const coords = getCanvasCoords(e)
    setCurrentStroke(prev => [...prev, coords])
  }

  const handleDrawingEnd = () => {
    if (!isDrawingMode || !isDrawingRef.current) return
    isDrawingRef.current = false

    if (currentStroke.length > 0) {
      const newStroke = {
        points: currentStroke,
        color: penColor,
        size: penSize,
        isEraser
      }
      setStrokes(prev => [...prev, newStroke])
      setCurrentStroke([])
    }
  }

  const undoLastStroke = () => {
    if (strokes.length > 0) {
      setStrokes(prev => prev.slice(0, -1))
    }
  }

  const clearAllDrawings = () => {
    setStrokes([])
    setCurrentStroke([])
  }

  // --- MULTI-ATTACHMENT PROCESSOR (PDFs & Images) ---
  const processUploadedFiles = (files) => {
    if (!files || files.length === 0) return
    setUploadError('')

    Array.from(files).forEach(file => {
      const isPdf = file.type === 'application/pdf'
      const isImage = file.type.startsWith('image/')

      if (!isPdf && !isImage) {
        setUploadError(`"${file.name}" is not supported. Please upload PDF or image files.`)
        return
      }

      if (file.size > 3 * 1024 * 1024) {
        setUploadError(`"${file.name}" is too large! Max file size is 3MB.`)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target.result

        if (isImage) {
          const img = new Image()
          img.onload = () => {
            const maxDim = 1400
            let w = img.naturalWidth
            let h = img.naturalHeight
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w)
                w = maxDim
              } else {
                w = Math.round((w * maxDim) / h)
                h = maxDim
              }
              const off = document.createElement('canvas')
              off.width = w
              off.height = h
              const ctx = off.getContext('2d')
              ctx.drawImage(img, 0, 0, w, h)
              const compressedUrl = off.toDataURL('image/jpeg', 0.85)

              setAttachments(prev => [
                ...prev,
                {
                  id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  name: file.name,
                  type: 'image',
                  size: `${(file.size / 1024).toFixed(1)} KB`,
                  data: compressedUrl
                }
              ])
            } else {
              setAttachments(prev => [
                ...prev,
                {
                  id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  name: file.name,
                  type: 'image',
                  size: `${(file.size / 1024).toFixed(1)} KB`,
                  data: dataUrl
                }
              ])
            }
          }
          img.src = dataUrl
        } else {
          setAttachments(prev => [
            ...prev,
            {
              id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              type: 'pdf',
              size: `${(file.size / 1024).toFixed(1)} KB`,
              data: dataUrl
            }
          ])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  // --- SAVE & EXPORT ---
  const handleSaveAllNotes = async () => {
    // Commit current active sheet state
    const updatedSheets = sheets.map((s, idx) => {
      if (idx === activeSheetIndex) {
        return { ...s, text: textContent, strokes, images }
      }
      return s
    })

    const activeWidth = editorContainerRef.current?.clientWidth || 800
    let thumbnail = null
    try {
      const comp = await renderInkOverlay(activeWidth, strokes, images)
      thumbnail = comp?.src || null
    } catch (e) {
      console.warn('Could not generate thumbnail', e)
    }

    const title = `Scratchpad (${updatedSheets.length} sheet${updatedSheets.length > 1 ? 's' : ''}, ${attachments.length} attachment${attachments.length !== 1 ? 's' : ''})`

    saveQuestionNote(
      scratchpadOpenQuestionId,
      'canvas',
      thumbnail,
      title,
      strokes,
      updatedSheets,
      attachments
    )

    setSheets(updatedSheets)
    setSelectedImageId(null)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2500)
  }

  const handleDeleteNote = () => {
    if (window.confirm('Delete this note and all associated sheets and attachments?')) {
      deleteQuestionNote(scratchpadOpenQuestionId)
      setSheets([{ id: 'sheet-1', title: 'Sheet 1', text: '', strokes: [], images: [], undoStack: [] }])
      setActiveSheetIndex(0)
      setTextContent('')
      setStrokes([])
      setImages([])
      setSelectedImageId(null)
      setAttachments([])
      setMode('draw')
    }
  }

  const handleDownloadSheet = async () => {
    const activeWidth = editorContainerRef.current?.clientWidth || 800
    const overlay = await renderInkOverlay(activeWidth, strokes, images)
    if (!overlay?.src) return
    const a = document.createElement('a')
    a.href = overlay.src
    a.download = `question-${scratchpadOpenQuestionId}-${sheets[activeSheetIndex]?.title.toLowerCase().replace(/\s+/g, '-')}.png`
    a.click()
  }

  if (!scratchpadOpenQuestionId || !currentQuestion) return null

  const activeSheet = sheets[activeSheetIndex] || sheets[0]

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      
      {/* =========================================================================
          ROW 1: FIRST ROW HEADER (Fixed Full-Width Header)
          Point 1: First row header & second row tools remain fixed across full width.
          The collapsible question box opens below this toolbar.
          ========================================================================= */}
      <div className="h-14 border-b border-border-light dark:border-border-dark bg-slate-50/95 dark:bg-slate-900/90 backdrop-blur-xs select-none relative z-40 flex items-center justify-between px-3 sm:px-4 shrink-0">
        
        {/* LEFT SECTION: Back & Persistent Collapse Toggle + Workspace Scratchpad Heading */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Back button */}
          <button
            onClick={() => setScratchpadOpenQuestionId(null)}
            className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shrink-0"
            title="Back to Practice"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Collapsible Question Panel Button: Opens and closes with same button at same place */}
          <button
            onClick={() => setIsQuestionCollapsed(!isQuestionCollapsed)}
            className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
              isQuestionCollapsed
                ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-650 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title={isQuestionCollapsed ? "Expand Question Panel (Q)" : "Collapse Question Panel (Q)"}
          >
            {isQuestionCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            <span className="hidden sm:inline">{isQuestionCollapsed ? 'Show Question' : 'Hide Question'}</span>
          </button>

          <span className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block shrink-0" />

          {/* Heading: "Workspace Scratchpad" on the left side */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <span className="font-extrabold text-xs sm:text-sm text-slate-850 dark:text-slate-100 tracking-tight whitespace-nowrap">
              Workspace Scratchpad
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-primary border border-primary/20 whitespace-nowrap">
              {sheets.length} Sheet{sheets.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* RIGHT SECTION: Save All Notes button + Close Scratchpad */}
        <div className="flex items-center justify-end gap-2 shrink-0 ml-auto">
          {savedNote && (
            <button
              onClick={handleDeleteNote}
              className="h-8 px-2.5 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="Delete saved note for this question"
            >
              <Trash2 size={13} />
              <span className="hidden md:inline">Delete Note</span>
            </button>
          )}

          <button
            onClick={handleSaveAllNotes}
            className={`h-8 px-3.5 text-white font-bold text-xs rounded-btn shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              isSaved ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-success hover:bg-success/90'
            }`}
            title="Save all notes & sheets"
          >
            {isSaved ? <Check size={14} strokeWidth={2.5} /> : <Save size={13} />}
            <span>{isSaved ? 'Saved!' : `Save All Notes (${sheets.length} Sheet${sheets.length !== 1 ? 's' : ''})`}</span>
          </button>

          {/* Close Scratchpad 'X' button on far right */}
          <button
            onClick={() => setScratchpadOpenQuestionId(null)}
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close Scratchpad"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: UNIFIED FIXED TOOLBAR (Full Width Across Top)
          Left: Workspace Mode Toggle (Canvas vs Files) + Formatting Tools
          Right: Sheet Navigation & Management (No scrollbar, extends to middle)
          ========================================================================= */}
      {mode === 'draw' && (
        <div 
          className="relative z-30 flex items-center justify-between px-4 py-1.5 text-slate-700 dark:text-slate-350 text-xs gap-2 border-b border-border-light/60 dark:border-border-dark/60 bg-white/80 dark:bg-slate-900/60 shrink-0 select-none overflow-x-auto no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Left: Mode Switcher + Formatting Tools */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Workspace Mode: Canvas vs Reference Files */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setWorkspaceTab('canvas')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                  workspaceTab === 'canvas'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-bold'
                    : 'text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Canvas & Notes Mode"
              >
                <Edit3 size={11} />
                <span>Canvas</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceTab('attachments')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                  workspaceTab === 'attachments'
                    ? 'bg-white dark:bg-slate-900 text-primary shadow-xs font-bold'
                    : 'text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Reference Files & PDFs"
              >
                <Paperclip size={11} />
                <span>Files ({attachments.length})</span>
              </button>
            </div>

            <span className="w-px h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />

            {workspaceTab === 'canvas' && (
              <>
                {/* Paragraph Style Dropdown */}
          <div className="relative mr-1">
            <button
              type="button"
              onClick={() => {
                setShowFormatMenu(!showFormatMenu)
                setShowMathMenu(false)
                setShowColorMenu(false)
                setShowImageMenu(false)
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              <span>Format</span>
              <ChevronDown size={11} />
            </button>
            {showFormatMenu && (
              <div className="absolute left-0 top-full mt-1 w-40 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl z-[90] p-1 space-y-0.5 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => { insertLinePrefix('# '); setShowFormatMenu(false) }}
                  className="w-full text-left px-2.5 py-1 text-sm font-bold rounded hover:bg-primary/10 hover:text-primary"
                >
                  Heading 1
                </button>
                <button
                  type="button"
                  onClick={() => { insertLinePrefix('## '); setShowFormatMenu(false) }}
                  className="w-full text-left px-2.5 py-1 text-xs font-bold rounded hover:bg-primary/10 hover:text-primary"
                >
                  Heading 2
                </button>
                <button
                  type="button"
                  onClick={() => { insertLinePrefix('### '); setShowFormatMenu(false) }}
                  className="w-full text-left px-2.5 py-1 text-xs font-semibold rounded hover:bg-primary/10 hover:text-primary"
                >
                  Heading 3
                </button>
                <button
                  type="button"
                  onClick={() => { insertFormatting('```\n', '\n```', 'code block'); setShowFormatMenu(false) }}
                  className="w-full text-left px-2.5 py-1 text-xs font-mono rounded hover:bg-primary/10 hover:text-primary"
                >
                  Code Block
                </button>
              </div>
            )}
          </div>

          <span className="w-px h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Inline Text Styles */}
          <button
            type="button"
            onClick={() => insertFormatting('**', '**', 'bold text')}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-bold cursor-pointer"
            title="Bold (Ctrl+B)"
          >
            <Bold size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('*', '*', 'italic text')}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded italic cursor-pointer"
            title="Italic (Ctrl+I)"
          >
            <Italic size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('~~', '~~', 'strikethrough text')}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer"
            title="Strikethrough"
          >
            <Strikethrough size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('`', '`', 'code')}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-mono cursor-pointer"
            title="Inline Code"
          >
            <Code size={13} />
          </button>

          <span className="w-px h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Lists & Quotes */}
          <button
            type="button"
            onClick={() => insertLinePrefix('- ')}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer"
            title="Bulleted List"
          >
            <List size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('1. ')}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer"
            title="Numbered List"
          >
            <ListOrdered size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('> ')}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer"
            title="Blockquote"
          >
            <Quote size={13} />
          </button>

          <span className="w-px h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={clearFormatting}
            className="px-1.5 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-[11px] font-mono text-slate-500 cursor-pointer"
            title="Clear Formatting"
          >
            Tx
          </button>

          <span className="w-px h-3.5 bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={undoLastStroke}
            disabled={strokes.length === 0}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
            title="Undo Stroke"
          >
            <RotateCcw size={13} />
          </button>
          <button
            type="button"
            onClick={clearAllDrawings}
            disabled={strokes.length === 0}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
            title="Clear Ink"
          >
            <RotateCw size={13} />
          </button>

          <span className="w-px h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Table Template */}
          <button
            type="button"
            onClick={insertTableTemplate}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Insert Table Template"
          >
            <Table size={13} />
          </button>

          {/* GATE Math & Formula Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowMathMenu(!showMathMenu)
                setShowColorMenu(false)
                setShowFormatMenu(false)
                setShowImageMenu(false)
              }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                showMathMenu ? 'bg-primary text-white shadow-xs' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-primary'
              }`}
              title="LaTeX Math & Formula Palette"
            >
              <span>∑ Math</span>
              <ChevronDown size={11} />
            </button>

            {showMathMenu && (
              <div className="absolute left-0 top-full mt-1.5 w-72 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl z-[100] p-2 space-y-1 animate-in fade-in">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                  <span>GATE Math & Formulas</span>
                  <button onClick={() => setShowMathMenu(false)} className="hover:text-slate-600"><X size={12} /></button>
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                  {mathSymbols.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertMathSnippet(item.snippet)}
                      className="text-left px-2 py-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-xs flex flex-col"
                    >
                      <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Color Highlight Badges */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColorMenu(!showColorMenu)
                setShowMathMenu(false)
                setShowFormatMenu(false)
                setShowImageMenu(false)
              }}
              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                showColorMenu ? 'text-primary bg-primary/10' : ''
              }`}
              title="Highlight Badge"
            >
              <Palette size={13} />
            </button>

            {showColorMenu && (
              <div className="absolute left-0 top-full mt-1.5 w-48 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl z-[100] p-2 space-y-1 animate-in fade-in">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Highlight Pill
                </div>
                <button
                  type="button"
                  onClick={() => insertBadge('blue', 'Key Concept')}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center gap-2"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Blue: Key Concept</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertBadge('emerald', 'Important Trick')}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center gap-2"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Emerald: Trick</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertBadge('amber', 'Formula')}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center gap-2"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Amber: Formula</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertBadge('rose', 'Common Pitfall')}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center gap-2"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Rose: Pitfall</span>
                </button>
              </div>
            )}
          </div>

          {/* Image Insertion Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowImageMenu(!showImageMenu)
                setShowMathMenu(false)
                setShowColorMenu(false)
                setShowFormatMenu(false)
              }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                showImageMenu ? 'bg-primary/10 text-primary' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350'
              }`}
              title="Insert Image (Upload, Paste, or URL)"
            >
              <ImageIcon size={13} className="text-primary" />
              <span className="hidden sm:inline text-xs">Image</span>
              <ChevronDown size={11} />
            </button>

            {showImageMenu && (
              <div className="absolute left-0 top-full mt-1.5 w-56 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-2xl z-[100] p-1.5 space-y-1 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => {
                    imageFileInputRef.current?.click()
                    setShowImageMenu(false)
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-xs flex items-center gap-2 font-medium"
                >
                  <Upload size={13} />
                  <span>Upload from Device</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageUrlInputOpen(true)
                    setShowImageMenu(false)
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-xs flex items-center gap-2 font-medium"
                >
                  <Paperclip size={13} />
                  <span>Insert from Web URL</span>
                </button>
                <div className="px-2.5 py-1 text-[10px] text-slate-400 border-t border-border-light dark:border-border-dark pt-1.5">
                  Tip: Press <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Ctrl+V</kbd> to paste screenshots
                </div>
              </div>
            )}
          </div>
              </>
            )}

            {workspaceTab === 'attachments' && (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium py-1">
                <span className="font-bold text-slate-700 dark:text-slate-200">Reference Attachments</span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">• Upload formula sheets, diagrams, or PDFs</span>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={imageFileInputRef}
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileImageUpload}
          />

          {/* Right: If canvas mode, show Sheet controls; if attachments mode, show Upload button */}
          {workspaceTab === 'canvas' ? (
            <div className="flex items-center gap-1 min-w-0 max-w-2xl flex-1 justify-end ml-auto pl-2 border-l border-slate-200 dark:border-slate-800">
              <button
                onClick={() => switchToSheet(Math.max(0, activeSheetIndex - 1))}
                disabled={activeSheetIndex === 0}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer shrink-0"
                title="Previous Sheet"
              >
                <ChevronLeft size={13} />
              </button>

              <div 
                className="no-scrollbar scrollbar-none sheets-scroll-container flex items-center gap-1 overflow-x-auto min-w-0"
                data-no-scrollbar="true"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onWheel={(e) => {
                  if (e.deltaY !== 0) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
              >
                {sheets.map((sheet, idx) => (
                  <button
                    key={sheet.id}
                    onClick={() => switchToSheet(idx)}
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-lg transition-all shrink-0 flex items-center gap-1 border cursor-pointer ${
                      activeSheetIndex === idx
                        ? 'bg-primary border-primary text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/50'
                    }`}
                  >
                    <span>{sheet.title}</span>
                    {(sheet.text || sheet.strokes?.length > 0 || sheet.images?.length > 0) && (
                      <span className={`h-1.5 w-1.5 rounded-full ${activeSheetIndex === idx ? 'bg-white' : 'bg-primary'}`} />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => switchToSheet(Math.min(sheets.length - 1, activeSheetIndex + 1))}
                disabled={activeSheetIndex === sheets.length - 1}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer shrink-0"
                title="Next Sheet"
              >
                <ChevronRight size={13} />
              </button>

              <button
                onClick={addSheet}
                className="h-6 px-1.5 text-[11px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all flex items-center gap-0.5 cursor-pointer shrink-0"
                title="Add Sheet"
              >
                <Plus size={11} strokeWidth={2.5} />
                <span className="hidden md:inline">Sheet</span>
              </button>

              <button
                onClick={clearActiveSheet}
                className="h-6 px-1.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 rounded border border-rose-500/20 transition-colors cursor-pointer shrink-0"
                title="Clear Active Sheet"
              >
                Clear
              </button>

              {sheets.length > 1 && (
                <button
                  onClick={deleteActiveSheet}
                  className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer shrink-0"
                  title="Delete Sheet"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <button
                onClick={() => imageFileInputRef.current?.click()}
                className="h-6 px-2.5 text-[11px] font-bold rounded-md bg-primary text-white hover:bg-primary-hover transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>Upload Files</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Image URL Floating Dialog */}
      {imageUrlInputOpen && (
        <form onSubmit={handleInsertImageUrl} className="flex items-center gap-2 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-border-light dark:border-border-dark text-xs animate-in fade-in shrink-0">
          <input
            type="text"
            placeholder="Image caption / label"
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            className="flex-1 h-7 px-2.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            placeholder="Image URL or Data URI (https://... or data:...)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            required
            className="flex-1 h-7 px-2.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            className="h-7 px-3 bg-primary text-white font-semibold rounded text-xs hover:bg-primary-hover"
          >
            Add Floating Image
          </button>
          <button
            type="button"
            onClick={() => setImageUrlInputOpen(false)}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
          >
            <X size={13} />
          </button>
        </form>
      )}

      {/* =========================================================================
          MAIN WORKSPACE SPLIT (Left Question vs Right Scratchpad)
          ========================================================================= */}
      <div className="flex flex-1 relative min-h-0 w-full h-full overflow-hidden">
        
        {/* --- LEFT PANEL: QUESTION VIEW --- */}
        <div 
          className={`shrink-0 border-r border-border-light dark:border-border-dark flex flex-col bg-card-light dark:bg-card-dark h-full relative transition-all duration-200 ${
            isQuestionCollapsed 
              ? 'hidden' 
              : mobileTab === 'question' 
                ? 'flex w-full md:w-[360px] lg:w-[390px]' 
                : 'hidden md:flex md:w-[360px] lg:w-[390px]'
          }`}
        >
          {/* Question Contents Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4 pb-6 relative">
            {/* Copy-pastable Question ID in small text inside question box */}
            <div className="flex items-center justify-between bg-slate-100/90 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Question ID:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 select-all truncate text-xs">
                  {currentQuestion.code || `#${currentQuestion.id}`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyQuestionId}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-primary transition-colors cursor-pointer shrink-0 ml-2 py-0.5 px-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                title="Copy Question ID to clipboard"
              >
                {copiedQuestionId ? (
                  <>
                    <Check size={12} className="text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span className="text-[10px]">Copy</span>
                  </>
                )}
              </button>
            </div>

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
            <div className="text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
              <QuestionText text={currentQuestion.question} />
            </div>

            {/* Question Diagram / Image */}
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
                  const isCorrect = isAcceptedOption(currentQuestion, idx)
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
                      onClick={() => handleSelectMCQ?.(idx)}
                      disabled={hasAnswered}
                      className={`w-full py-2.5 px-3.5 rounded-btn border text-left text-xs flex items-start gap-3 transition-all ${
                        !hasAnswered ? 'active:scale-99 cursor-pointer' : ''
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
                    const isCorrect = isAcceptedOption(currentQuestion, idx)
                    const hasSubmitted = ansState.submitted

                    let btnStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200'
                    let checkStyle = 'border-slate-300 dark:border-slate-700'

                    if (hasSubmitted) {
                      if (isCorrect && isSelected) {
                        btnStyle = 'border-success bg-emerald-500/10 text-success font-medium'
                        checkStyle = 'bg-success border-success text-white'
                      } else if (isCorrect && !isSelected) {
                        btnStyle = 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400'
                        checkStyle = 'border-amber-500 text-amber-500'
                      } else if (!isCorrect && isSelected) {
                        btnStyle = 'border-error bg-red-500/10 text-error font-medium'
                        checkStyle = 'bg-error border-error text-white'
                      } else {
                        btnStyle = 'border-slate-100 dark:border-slate-900 opacity-60 text-slate-450'
                      }
                    } else if (isSelected) {
                      btnStyle = 'border-primary bg-primary/5 text-primary'
                      checkStyle = 'bg-primary border-primary text-white'
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => !hasSubmitted && handleToggleMSQ?.(idx)}
                        disabled={hasSubmitted}
                        className={`w-full py-2.5 px-3.5 rounded-btn border text-left text-xs flex items-start gap-3 transition-all ${
                          !hasSubmitted ? 'active:scale-99 cursor-pointer' : ''
                        } ${btnStyle}`}
                      >
                        <span className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 text-xs font-bold ${checkStyle}`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </span>
                        <span className="flex-1 min-w-0 break-words mt-0.5">{option}</span>
                      </button>
                    )
                  })}
                </div>

                {!(selectedAnswers[currentQuestion.id]?.submitted) && (
                  <button
                    onClick={() => handleSubmitMSQ?.()}
                    disabled={(selectedAnswers[currentQuestion.id]?.selected || []).length === 0}
                    className="w-full h-9 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn disabled:opacity-40 transition-all active:scale-95 shadow-sm cursor-pointer"
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
                          handleNATSubmit?.(e.target.value)
                        }
                      }}
                      className="flex-1 h-9 px-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`workspace-nat-input-${currentQuestion.id}`)
                        if (input) handleNATSubmit?.(input.value)
                      }}
                      className="h-9 px-4 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer"
                    >
                      Submit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 font-medium">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`p-2.5 rounded border ${
                        isAnswerCorrect(currentQuestion, selectedAnswers[currentQuestion.id])
                          ? 'border-success bg-emerald-500/10 text-success'
                          : 'border-error bg-red-500/10 text-error'
                      }`}>
                        <span className="text-[9px] block font-bold text-slate-400 uppercase mb-0.5">Your Answer:</span>
                        <span>{selectedAnswers[currentQuestion.id]}</span>
                      </div>
                      <div className="p-2.5 rounded border border-success bg-emerald-500/5 text-success">
                        <span className="text-[9px] block font-bold text-slate-400 uppercase mb-0.5">Correct Key:</span>
                        <QuestionText inline text={formatAnswer(currentQuestion)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            {((currentQuestion.type === 'MCQ' && selectedAnswers[currentQuestion.id] !== undefined) ||
              (currentQuestion.type === 'MSQ' && selectedAnswers[currentQuestion.id]?.submitted) ||
              (currentQuestion.type === 'NAT' && selectedAnswers[currentQuestion.id] !== undefined)) && (
              <div className="p-4 rounded-card border border-primary/10 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                  <Check size={14} strokeWidth={2.5} />
                  <span>
                    {currentQuestion.type === 'MSQ' 
                      ? isAnswerCorrect(currentQuestion, selectedAnswers[currentQuestion.id]?.selected) ? 'Correct Answer!' : 'Incorrect Answer!'
                      : currentQuestion.type === 'NAT'
                      ? isAnswerCorrect(currentQuestion, selectedAnswers[currentQuestion.id]) ? 'Correct Answer!' : 'Incorrect Answer!'
                      : isAnswerCorrect(currentQuestion, selectedAnswers[currentQuestion.id]) ? 'Correct Answer!' : 'Incorrect Answer!'}
                  </span>
                </div>
                <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/40 pt-2">
                  <QuestionText text={currentQuestion.explanation} />
                  <AnswerProvenance question={currentQuestion} />
                </div>
              </div>
            )}
          </div>

          {/* POINT 1: LEFT BOTTOM FOOTER (Exact h-14 height matching right bottom footer) */}
          <div className="h-14 px-4 border-t border-border-light dark:border-border-dark bg-slate-50/90 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => upvoteQuestion(currentQuestion.id)}
                className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  votes[currentQuestion.id] === 'up'
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
                title="Upvote Question"
              >
                <ThumbsUp size={13} className={votes[currentQuestion.id] === 'up' ? 'fill-white' : ''} />
                <span className="text-[11px]">{(Number(currentQuestion?.likes) || 0) + (votes[currentQuestion.id] === 'up' ? 1 : 0)}</span>
              </button>

              <button
                onClick={() => downvoteQuestion(currentQuestion.id)}
                className={`h-8 w-8 rounded-lg flex items-center justify-center border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  votes[currentQuestion.id] === 'down'
                    ? 'bg-rose-500 border-rose-500 text-white'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
                title="Downvote Question"
              >
                <ThumbsDown size={13} className={votes[currentQuestion.id] === 'down' ? 'fill-white' : ''} />
              </button>

              <button
                onClick={() => setActiveDiscussionQuestionId(currentQuestion.id)}
                className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary hover:border-primary/40 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
                title="Open Discussion"
              >
                <MessageSquare size={13} />
                <span className="text-[11px]">{currentQuestion.commentsCount || 0}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleBookmark(currentQuestion.id)}
                className={`h-8 px-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  bookmarks.includes(currentQuestion.id)
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
                title="Bookmark Question"
              >
                <Bookmark size={13} className={bookmarks.includes(currentQuestion.id) ? 'fill-white' : ''} />
                <span className="text-[11px]">Bookmark</span>
              </button>

              {currentQuestion.videoSolutionUrl && (
                <button
                  onClick={() => setActiveVideoSolutionUrl(currentQuestion.videoSolutionUrl)}
                  className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary hover:border-primary/40 flex items-center gap-1 text-xs font-bold transition-all cursor-pointer"
                  title="Watch Video Solution"
                >
                  <Play size={12} className="fill-current text-slate-500" />
                  <span className="text-[11px] hidden sm:inline">Video</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* --- RIGHT PANEL: ADVANCED SCRATCHPAD WORKSPACE --- */}
        <div 
          className={`flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 ${
            mobileTab === 'scratchpad' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* MAIN EDITING AREA (When on Canvas Mode) */}
          {mode === 'draw' && workspaceTab === 'canvas' && (
            <div className="flex-1 flex overflow-hidden relative">
              <div 
                ref={editorContainerRef}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setSelectedImageId(null)
                }}
                className="flex-1 relative flex flex-col h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-card-light dark:bg-card-dark"
              >
                {/* LAYER 1: UNIFIED TEXTAREA */}
                <textarea
                  ref={textareaRef}
                  value={textContent}
                  onChange={(e) => handleTextChange(e.target.value)}
                  onFocus={() => {
                    // Clicking into text automatically switches to text mode & collapses floating bar
                    if (isDrawingMode) setIsDrawingMode(false)
                  }}
                  onPaste={handlePaste}
                  placeholder="Type notes, formulas ($E=mc^2$), solution steps, or click the Draw tool on the floating bar..."
                  className="w-full shrink-0 p-5 bg-transparent resize-none overflow-hidden focus:outline-none text-slate-800 dark:text-slate-100 font-sans text-sm md:text-base leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600 z-0"
                />

                {/* LAYER 2: PEN DRAWING CANVAS OVERLAY */}
                <canvas
                  ref={drawingCanvasRef}
                  onMouseDown={handleDrawingStart}
                  onMouseMove={handleDrawingMove}
                  onMouseUp={handleDrawingEnd}
                  onMouseLeave={handleDrawingEnd}
                  onTouchStart={handleDrawingStart}
                  onTouchMove={handleDrawingMove}
                  onTouchEnd={handleDrawingEnd}
                  style={{ height: contentHeight || '100%' }}
                  className={`absolute top-0 left-0 w-full ${
                    isDrawingMode 
                      ? 'pointer-events-auto cursor-crosshair z-20' 
                      : 'pointer-events-none z-10'
                  }`}
                />

                {/* LAYER 3: FREEFORM FLOATING IMAGES */}
                {images.map((img) => {
                  const isSelected = selectedImageId === img.id
                  return (
                    <div
                      key={img.id}
                      style={{
                        position: 'absolute',
                        left: `${img.x}px`,
                        top: `${img.y}px`,
                        width: `${img.width}px`,
                        zIndex: isSelected ? 30 : 15
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedImageId(img.id)
                      }}
                      className={`group/floatimg select-none ${
                        isSelected 
                          ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900 shadow-2xl rounded-xl' 
                          : 'hover:ring-1 hover:ring-primary/40 rounded-xl shadow-md'
                      }`}
                    >
                      {/* Floating Action Badge on Selected Image */}
                      {isSelected && (
                        <div 
                          className="absolute -top-11 left-0 flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-primary/40 shadow-xl rounded-btn text-xs px-2 py-1 gap-1.5 z-40 animate-in fade-in"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            onMouseDown={(e) => handleImageDragStart(e, img.id)}
                            onTouchStart={(e) => handleImageDragStart(e, img.id)}
                            className="flex items-center gap-1 text-slate-600 dark:text-slate-350 font-bold cursor-grab active:cursor-grabbing hover:text-primary transition-colors select-none px-1 py-0.5"
                            title="Click and drag to move image anywhere freely on workspace"
                          >
                            <Move size={13} className="text-primary" />
                            <span>Drag to Move</span>
                          </div>

                          <span className="text-slate-300 dark:text-slate-700">|</span>

                          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded p-0.5">
                            <button
                              type="button"
                              onClick={() => scaleImage(img.id, 0.85)}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-350 transition-colors"
                              title="Scale Down (-15%)"
                            >
                              <Minus size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => scaleImage(img.id, 1.15)}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-350 transition-colors"
                              title="Scale Up (+15%)"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <span className="text-slate-300 dark:text-slate-700">|</span>

                          <button
                            type="button"
                            onClick={() => deleteImage(img.id)}
                            className="p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                            title="Delete Image"
                          >
                            <Trash2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedImageId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                            title="Deselect"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}

                      <img
                        src={img.src}
                        alt={img.alt || 'Diagram'}
                        draggable={false}
                        className="w-full h-auto rounded-xl object-contain bg-white dark:bg-slate-800 pointer-events-auto cursor-pointer"
                      />
                    </div>
                  )
                })}
              </div>

              {/* FLOATING DRAGGABLE VERTICAL TOOLBAR
                  Initially 2 buttons: Text and Draw.
                  When Draw is clicked: vertical box opens up to show all editing options.
                  When Text is clicked: vertical box collapses back to 2 buttons.
                  Draggable anywhere across the screen. */}
              <div 
                style={{ 
                  left: barPos.x !== null ? `${barPos.x}px` : undefined, 
                  right: barPos.x === null ? '18px' : undefined, 
                  top: `${barPos.y}px`,
                  touchAction: 'none'
                }}
                onMouseDown={handleBarDragStart}
                onTouchStart={handleBarDragStart}
                className={`fixed z-50 flex flex-col items-center p-1.5 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl select-none transition-shadow ${
                  isDraggingBar ? 'ring-2 ring-primary/50 shadow-indigo-500/20 cursor-grabbing' : 'cursor-grab'
                }`}
              >
                {/* Drag Grip Handle */}
                <div 
                  className="w-full flex items-center justify-center py-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-grab active:cursor-grabbing"
                  title="Drag to move toolbar anywhere"
                >
                  <GripVertical size={14} />
                </div>

                {/* Button 1: Text Mode Button */}
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={switchToTextMode}
                  className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    !isDrawingMode 
                      ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30' 
                      : 'text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary'
                  }`}
                  title={!isDrawingMode ? "Text Mode (Active)" : "Switch to Text Mode (Collapses drawing tools)"}
                >
                  <Type size={15} />
                </button>

                {/* Button 2: Pen Tool (When collapsed, clicking activates Draw mode. When expanded, toggles pen active) */}
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    if (!isDrawingMode) {
                      setIsDrawingMode(true)
                      setIsEraser(false)
                    } else if (isEraser) {
                      setIsEraser(false)
                    }
                  }}
                  className={`relative h-8 w-8 rounded-xl flex items-center justify-center mt-1 transition-all cursor-pointer ${
                    isDrawingMode && !isEraser
                      ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30' 
                      : 'text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary'
                  }`}
                  title={!isDrawingMode ? "Activate Drawing Mode (Opens tools)" : "Pen Tool (Active)"}
                >
                  <PenTool size={15} />
                  {isDrawingMode && (
                    <span
                      className="absolute bottom-1 right-1 h-2 w-2 rounded-full border border-white dark:border-slate-900 shadow-xs"
                      style={{ backgroundColor: penColor }}
                    />
                  )}
                </button>

                {/* EXPANDED DRAWING OPTIONS (When Draw is clicked) */}
                {isDrawingMode && (
                  <div className="flex flex-col items-center gap-1.5 pt-1 animate-in fade-in duration-200">
                    {/* Eraser Tool */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => setIsEraser(!isEraser)}
                      className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isEraser ? 'bg-rose-500 text-white shadow-sm ring-2 ring-rose-500/30' : 'text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={isEraser ? "Eraser Active (Click to switch to Pen)" : "Eraser Tool"}
                    >
                      <Eraser size={14} />
                    </button>

                    <div className="h-px w-6 bg-border-light dark:border-border-dark my-0.5" />

                    {/* Color palette */}
                    <div className="flex flex-col items-center gap-1.5">
                      {['default', 'indigo', 'blue', 'emerald', 'amber', 'rose', 'purple'].map(c => {
                        const isSelected = penColor === colorValues[c] && !isEraser
                        return (
                          <div key={c} className="h-6 w-6 flex items-center justify-center">
                            <button
                              type="button"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={() => {
                                setPenColor(colorValues[c])
                                setIsEraser(false)
                              }}
                              className={`h-4 w-4 rounded-full transition-all cursor-pointer ${
                                isSelected
                                  ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900 shadow-xs'
                                  : 'hover:scale-110 opacity-80 hover:opacity-100'
                              }`}
                              style={{
                                backgroundColor: colorValues[c],
                                border: c === 'default' && theme === 'light' ? '1px solid #cbd5e1' : undefined
                              }}
                              title={`Color ${c}`}
                            />
                          </div>
                        )
                      })}
                    </div>

                    <div className="h-px w-6 bg-border-light dark:border-border-dark my-0.5" />

                    {/* Stroke Width Presets */}
                    <div className="flex flex-col items-center gap-1">
                      {[
                        { size: 2, label: 'Fine (2px)', dot: 'h-1.5 w-1.5' },
                        { size: 4, label: 'Medium (4px)', dot: 'h-2.5 w-2.5' },
                        { size: 7, label: 'Bold (7px)', dot: 'h-3.5 w-3.5' }
                      ].map(preset => (
                        <button
                          key={preset.size}
                          type="button"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => setPenSize(preset.size)}
                          className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            penSize === preset.size
                              ? 'bg-primary/15 text-primary ring-1 ring-primary'
                              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title={preset.label}
                        >
                          <span
                            className={`rounded-full ${preset.dot} ${
                              penSize === preset.size ? 'bg-primary' : 'bg-slate-400 dark:bg-slate-500'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <div className="h-px w-6 bg-border-light dark:border-border-dark my-0.5" />

                    {/* Undo Stroke */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={undoLastStroke}
                      disabled={strokes.length === 0}
                      className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors flex items-center justify-center cursor-pointer"
                      title="Undo Stroke"
                    >
                      <Undo2 size={13} />
                    </button>

                    {/* Clear Ink */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={clearAllDrawings}
                      disabled={strokes.length === 0}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Clear Ink"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB: FILES & PDFs (UPLOADING & ATTACHMENTS) */}
          {mode === 'draw' && workspaceTab === 'attachments' && (
            <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-5 bg-slate-50 dark:bg-slate-950">
              <div className="max-w-3xl mx-auto space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">
                      Reference Attachments ({attachments.length})
                    </h4>
                    <p className="text-xs text-slate-400">
                      Attach multiple diagrams, formula sheets, or lecture PDFs to this question.
                    </p>
                  </div>

                  <button
                    onClick={() => imageFileInputRef.current?.click()}
                    className="h-8 px-3.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Upload Files</span>
                  </button>
                </div>

                {/* Upload Drop Area */}
                <div 
                  onClick={() => imageFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-card p-6 text-center bg-white/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/80 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Click to upload multiple PDFs or Images
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Supports PNG, JPG, WebP, SVG, and PDF documents (max 3MB per file)
                    </p>
                  </div>
                </div>

                {uploadError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-error text-xs font-semibold rounded-btn">
                    {uploadError}
                  </div>
                )}

                {/* Attachments List */}
                {attachments.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No files attached yet. Upload reference images or PDFs above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachments.map((att) => (
                      <div 
                        key={att.id}
                        className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-card flex flex-col justify-between gap-3 shadow-xs hover:border-primary/40 transition-all"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {att.type === 'image' ? (
                            <div className="h-12 w-12 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                              <img src={att.data} alt={att.name} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 border border-indigo-500/20">
                              <FileText size={22} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate" title={att.name}>
                              {att.name}
                            </p>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{att.size}</span>
                            <span className="inline-block mt-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {att.type.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 gap-2">
                          {att.type === 'image' && (
                            <button
                              onClick={() => {
                                addFloatingImage(att.data, att.name)
                                setWorkspaceTab('canvas')
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors flex items-center gap-1 cursor-pointer"
                              title="Insert this image into active sheet"
                            >
                              <Copy size={11} />
                              <span>Use on Sheet</span>
                            </button>
                          )}

                          <div className="flex items-center gap-1 ml-auto">
                            <button
                              onClick={() => setActivePreviewAttachment(att)}
                              className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Preview File"
                            >
                              <Eye size={14} />
                            </button>
                            <a
                              href={att.data}
                              download={att.name}
                              className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                              title="Download File"
                            >
                              <Download size={14} />
                            </a>
                            <button
                              onClick={() => {
                                if (window.confirm(`Remove attachment "${att.name}"?`)) {
                                  setAttachments(prev => prev.filter(a => a.id !== att.id))
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                              title="Delete attachment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}



          {/* --- WORKSPACE IN VIEW MODE (Saved Notes Display) --- */}
          {mode === 'view' && savedNote && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
              {/* Sheets Navigation in View Mode */}
              <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-border-light dark:border-border-dark flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sheet:</span>
                  <div className="flex items-center gap-1">
                    {sheets.map((sheet, idx) => (
                      <button
                        key={sheet.id}
                        onClick={() => switchToSheet(idx)}
                        className={`px-3 py-1 text-xs font-bold rounded-btn transition-all cursor-pointer ${
                          activeSheetIndex === idx
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {sheet.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadSheet}
                    className="h-7 px-2.5 rounded-btn bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Download active sheet as image"
                  >
                    <Download size={12} />
                    <span>Download PNG</span>
                  </button>
                </div>
              </div>

              {/* Main View Display */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
                <div className="border border-slate-200 dark:border-slate-800 rounded-card bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3">
                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                      {activeSheet?.title}
                    </h3>
                    <span className="text-xs text-slate-400">
                      Sheet {activeSheetIndex + 1} of {sheets.length}
                    </span>
                  </div>

                  {/* Formatted Text Note */}
                  {activeSheet?.text?.trim() ? (
                    <div className="prose dark:prose-invert max-w-none">
                      <FormattedContent content={activeSheet.text} />
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">No text written on this sheet.</div>
                  )}

                  {/* Freehand Drawing Strokes in View Mode */}
                  {activeSheet?.strokes?.length > 0 && (
                    <div className="pt-4 border-t border-border-light dark:border-border-dark">
                      <div className="text-xs font-bold text-slate-500 mb-2">Saved Drawing</div>
                      <div className="border border-border-light dark:border-border-dark rounded-xl p-3 bg-white dark:bg-slate-950 overflow-hidden">
                        <canvas
                          ref={(el) => {
                            if (!el) return
                            const containerW = el.parentElement?.clientWidth || 800
                            el.width = containerW
                            el.height = 360
                            const ctx = el.getContext('2d')
                            ctx.clearRect(0, 0, el.width, el.height)
                            activeSheet.strokes.forEach(stroke => {
                              if (!stroke.points || stroke.points.length === 0) return
                              ctx.save()
                              ctx.strokeStyle = stroke.color || '#6366f1'
                              ctx.lineWidth = stroke.size || 4
                              ctx.lineCap = 'round'
                              ctx.lineJoin = 'round'
                              ctx.beginPath()
                              ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
                              for (let i = 1; i < stroke.points.length; i++) {
                                ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
                              }
                              ctx.stroke()
                              ctx.restore()
                            })
                          }}
                          className="w-full h-auto max-h-96"
                        />
                      </div>
                    </div>
                  )}

                  {/* Freehand Strokes or Placed Diagrams */}
                  {activeSheet?.images?.length > 0 && (
                    <div className="pt-4 border-t border-border-light dark:border-border-dark">
                      <div className="text-xs font-bold text-slate-500 mb-2">Diagrams & Images ({activeSheet.images.length})</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeSheet.images.map(img => (
                          <div key={img.id} className="border border-border-light dark:border-border-dark rounded-xl p-2 bg-slate-50 dark:bg-slate-950">
                            <img src={img.src} alt={img.alt} className="w-full h-auto rounded-lg max-h-56 object-contain" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Attached Files Bar in View Mode */}
                {attachments.length > 0 && (
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-card border border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
                    <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Paperclip size={13} className="text-primary" />
                      <span>Attached References ({attachments.length})</span>
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-btn bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          {att.type === 'image' ? <ImageIcon size={13} className="text-primary" /> : <FileText size={13} className="text-indigo-500" />}
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{att.name}</span>
                          <button
                            onClick={() => setActivePreviewAttachment(att)}
                            className="p-1 hover:text-primary transition-colors text-slate-400 cursor-pointer"
                            title="View"
                          >
                            <Eye size={12} />
                          </button>
                          <a
                            href={att.data}
                            download={att.name}
                            className="p-1 hover:text-primary transition-colors text-slate-400"
                            title="Download"
                          >
                            <Download size={12} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>


            </div>
          )}
        </div>
      </div>

      {/* --- MODAL PREVIEW FOR ATTACHMENTS (Images & PDFs) --- */}
      {activePreviewAttachment && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-card max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn">
            <div className="p-3.5 border-b border-border-light dark:border-border-dark flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {activePreviewAttachment.type === 'image' ? (
                  <ImageIcon size={16} className="text-primary shrink-0" />
                ) : (
                  <FileText size={16} className="text-indigo-500 shrink-0" />
                )}
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                  {activePreviewAttachment.name}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {activePreviewAttachment.type === 'image' && mode === 'draw' && (
                  <button
                    onClick={() => {
                      addFloatingImage(activePreviewAttachment.data, activePreviewAttachment.name)
                      setActivePreviewAttachment(null)
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-btn transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>Insert onto Sheet</span>
                  </button>
                )}

                <a
                  href={activePreviewAttachment.data}
                  download={activePreviewAttachment.name}
                  className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-btn transition-colors"
                  title="Download File"
                >
                  <Download size={14} />
                </a>

                <button
                  onClick={() => setActivePreviewAttachment(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-btn transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[350px] bg-slate-100 dark:bg-slate-950">
              {activePreviewAttachment.type === 'image' ? (
                <img
                  src={activePreviewAttachment.data}
                  alt={activePreviewAttachment.name}
                  className="max-w-full max-h-[75vh] object-contain rounded shadow"
                />
              ) : (
                <iframe
                  src={activePreviewAttachment.data}
                  title={activePreviewAttachment.name}
                  className="w-full h-[75vh] border-0 rounded"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
