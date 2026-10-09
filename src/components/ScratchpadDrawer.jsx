import React, { useState, useEffect, useRef } from 'react'
import { 
  X, Edit3, FileText, Trash2, Save, Undo, RefreshCw, Download, Check, 
  ThumbsUp, ThumbsDown, MessageSquare, Bookmark, Play, Hand, ZoomIn, ZoomOut, Maximize2,
  Plus, ChevronLeft, ChevronRight, Image as ImageIcon, Paperclip, Eye, UploadCloud, Copy,
  MousePointer, Move, Minus
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import QuestionImage from './QuestionImage'
import QuestionText from './QuestionText'

export default function ScratchpadDrawer({
  currentQuestion,
  selectedAnswers = {},
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

  // Workspace View Mode: 'draw' | 'view'
  const [mode, setMode] = useState('draw')
  // Workspace Sub-Tab: 'canvas' | 'attachments'
  const [workspaceTab, setWorkspaceTab] = useState('canvas')

  // Multi-Sheet drafting state
  const [sheets, setSheets] = useState([
    { id: 'sheet-1', title: 'Sheet 1', strokes: [], undoStack: [] }
  ])
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)

  // Multi-Attachment state: Array<{ id, name, type: 'pdf'|'image', size, data }>
  const [attachments, setAttachments] = useState([])
  const [activePreviewAttachment, setActivePreviewAttachment] = useState(null)
  const [uploadError, setUploadError] = useState('')

  // Drawing Tools: 'draw' | 'select' | 'text' | 'pan'
  const [toolMode, setToolMode] = useState('draw')
  const [activeColor, setActiveColor] = useState('default') // 'default' | 'blue' | 'red' | 'green' | 'yellow'
  const [penSize, setPenSize] = useState(4) // 2 | 4 | 8
  const [isEraser, setIsEraser] = useState(false)
  const [currentPoints, setCurrentPoints] = useState([])
  const [activeTextInput, setActiveTextInput] = useState(null) // null | { x, y, screenX, screenY, value }

  // Image Selection & Manipulation state
  const [selectedImageId, setSelectedImageId] = useState(null)

  // Limited Zoom & Pan (Bounded: 0.5x to 2.5x)
  const MIN_ZOOM = 0.5
  const MAX_ZOOM = 2.5
  const ZOOM_STEP = 0.15
  const [zoomScale, setZoomScale] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isSpacePressed, setIsSpacePressed] = useState(false)

  // Mobile Tabs
  const [mobileTab, setMobileTab] = useState('question') // 'question' | 'scratchpad'

  // Refs for rendering and interaction
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const imageInputRef = useRef(null)
  const multiFileInputRef = useRef(null)
  const imageElementsRef = useRef(new Map())

  const isDrawingRef = useRef(false)
  const isPanningRef = useRef(false)
  const isDraggingImageRef = useRef(false)
  const isResizingImageRef = useRef(false)

  const dragStartWorldRef = useRef({ x: 0, y: 0 })
  const imageInitialRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 })
  const startPanPosRef = useRef({ x: 0, y: 0 })
  const initialPanOffsetRef = useRef({ x: 0, y: 0 })

  const zoomScaleRef = useRef(1)
  const panOffsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    zoomScaleRef.current = zoomScale
  }, [zoomScale])

  useEffect(() => {
    panOffsetRef.current = panOffset
  }, [panOffset])

  const savedNote = scratchpadOpenQuestionId ? questionNotes[scratchpadOpenQuestionId] : null

  // Safe accessor for current active sheet
  const activeSheet = sheets[activeSheetIndex] || sheets[0] || { id: 'sheet-1', title: 'Sheet 1', strokes: [], undoStack: [] }

  // Accessor for selected image stroke
  const selectedImage = activeSheet.strokes.find(s => s.type === 'image' && s.id === selectedImageId)

  // Colors mapping
  const colorValues = {
    default: theme === 'dark' ? '#f8fafc' : '#0f172a',
    blue: '#3b82f6',
    red: '#ef4444',
    green: '#10b981',
    yellow: '#f59e0b'
  }

  // Load question note when scratchpad is opened
  useEffect(() => {
    if (scratchpadOpenQuestionId) {
      if (savedNote) {
        setMode('view')
        // Load sheets if present
        if (savedNote.sheets && savedNote.sheets.length > 0) {
          // Ensure each image stroke has an id
          const normalizedSheets = savedNote.sheets.map(sheet => ({
            ...sheet,
            strokes: (sheet.strokes || []).map(s => s.type === 'image' && !s.id ? { ...s, id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` } : s)
          }))
          setSheets(normalizedSheets)
        } else if (savedNote.strokes) {
          const normalizedStrokes = (savedNote.strokes || []).map(s => s.type === 'image' && !s.id ? { ...s, id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` } : s)
          setSheets([{ id: 'sheet-1', title: 'Sheet 1', strokes: normalizedStrokes, undoStack: [] }])
        } else {
          setSheets([{ id: 'sheet-1', title: 'Sheet 1', strokes: [], undoStack: [] }])
        }

        // Load attachments if present
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
        setSheets([{ id: 'sheet-1', title: 'Sheet 1', strokes: [], undoStack: [] }])
        setAttachments([])
      }

      setActiveSheetIndex(0)
      setSelectedImageId(null)
      setZoomScale(1)
      setPanOffset({ x: 0, y: 0 })
      setToolMode('draw')
      setIsEraser(false)
      setMobileTab('question')
      setWorkspaceTab('canvas')
      setActiveTextInput(null)
      setActivePreviewAttachment(null)
      setUploadError('')
    }
  }, [scratchpadOpenQuestionId, savedNote])

  // --- SHEET OPERATIONS ---
  const updateActiveSheet = (updater) => {
    setSheets(prev => {
      const next = [...prev]
      const current = next[activeSheetIndex] || next[0]
      next[activeSheetIndex] = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
      return next
    })
  }

  const addSheet = () => {
    const nextNum = sheets.length + 1
    const newSheet = {
      id: `sheet-${Date.now()}`,
      title: `Sheet ${nextNum}`,
      strokes: [],
      undoStack: []
    }
    setSheets(prev => [...prev, newSheet])
    setActiveSheetIndex(sheets.length)
    setSelectedImageId(null)
    setZoomScale(1)
    setPanOffset({ x: 0, y: 0 })
  }

  const deleteActiveSheet = () => {
    if (sheets.length <= 1) {
      if (window.confirm('Clear all content on Sheet 1?')) {
        updateActiveSheet({ strokes: [], undoStack: [] })
        setSelectedImageId(null)
      }
      return
    }
    if (window.confirm(`Delete ${activeSheet.title}? This sheet's contents will be removed.`)) {
      setSheets(prev => prev.filter((_, idx) => idx !== activeSheetIndex))
      setActiveSheetIndex(prev => Math.max(0, prev - 1))
      setSelectedImageId(null)
    }
  }

  const clearActiveSheet = () => {
    if (window.confirm(`Wipe all strokes on ${activeSheet.title}?`)) {
      updateActiveSheet({ strokes: [], undoStack: [] })
      setSelectedImageId(null)
    }
  }

  // --- ZOOM & PAN ENGINE ---
  const zoomAtPoint = (targetScale, screenX, screenY) => {
    const clampedScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, targetScale))
    const prevScale = zoomScaleRef.current
    if (clampedScale === prevScale) return

    const panX = panOffsetRef.current.x
    const panY = panOffsetRef.current.y
    const ratio = clampedScale / prevScale
    const newPanX = screenX - (screenX - panX) * ratio
    const newPanY = screenY - (screenY - panY) * ratio

    setZoomScale(clampedScale)
    setPanOffset({ x: newPanX, y: newPanY })
  }

  const handleZoomIn = () => {
    const canvas = canvasRef.current
    const cx = canvas ? canvas.width / 2 : 300
    const cy = canvas ? canvas.height / 2 : 250
    zoomAtPoint(zoomScale + ZOOM_STEP, cx, cy)
  }

  const handleZoomOut = () => {
    const canvas = canvasRef.current
    const cx = canvas ? canvas.width / 2 : 300
    const cy = canvas ? canvas.height / 2 : 250
    zoomAtPoint(zoomScale - ZOOM_STEP, cx, cy)
  }

  const handleResetZoom = () => {
    setZoomScale(1)
    setPanOffset({ x: 0, y: 0 })
  }

  // Spacebar panning shortcut
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        setIsSpacePressed(true)
      }
    }
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Canvas MouseWheel Zoom & Pan listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey || toolMode === 'pan') {
        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89
        const rect = container.getBoundingClientRect()
        zoomAtPoint(zoomScaleRef.current * zoomFactor, e.clientX - rect.left, e.clientY - rect.top)
      } else {
        setPanOffset(p => ({
          x: p.x - e.deltaX,
          y: p.y - e.deltaY
        }))
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [toolMode])

  // --- HIT TESTING ON IMAGES & HANDLES ---
  const hitTestImage = (worldX, worldY) => {
    const strokes = activeSheet.strokes
    // Scan in reverse so topmost image is selected
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i]
      if (s.type === 'image') {
        if (
          worldX >= s.x &&
          worldX <= s.x + s.width &&
          worldY >= s.y &&
          worldY <= s.y + s.height
        ) {
          return s
        }
      }
    }
    return null
  }

  const hitTestResizeHandle = (worldX, worldY, imageStroke) => {
    if (!imageStroke) return false
    const handleThreshold = 18 / zoomScaleRef.current
    const hx = imageStroke.x + imageStroke.width
    const hy = imageStroke.y + imageStroke.height
    return Math.abs(worldX - hx) <= handleThreshold && Math.abs(worldY - hy) <= handleThreshold
  }

  // --- DRAWING RENDER LOOP ---
  const renderCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Base background
    ctx.fillStyle = theme === 'dark' ? '#0f172a' : '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()

    // Apply pan & zoom transforms
    ctx.translate(panOffset.x, panOffset.y)
    ctx.scale(zoomScale, zoomScale)

    // Engineering dot grid
    ctx.fillStyle = theme === 'dark' ? 'rgba(51, 65, 85, 0.45)' : 'rgba(203, 213, 225, 0.6)'
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

    // Helper to draw a single stroke
    const drawStroke = (stroke) => {
      if (stroke.type === 'text') {
        ctx.fillStyle = stroke.color
        ctx.font = `bold ${stroke.size * 3 + 10}px Inter, sans-serif`
        ctx.textBaseline = 'middle'
        ctx.fillText(stroke.text, stroke.x, stroke.y)
        return
      }

      if (stroke.type === 'image') {
        let img = imageElementsRef.current.get(stroke.imgData)
        if (!img) {
          img = new Image()
          img.onload = () => renderCanvas()
          img.src = stroke.imgData
          imageElementsRef.current.set(stroke.imgData, img)
        }
        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, stroke.x, stroke.y, stroke.width, stroke.height)
          
          const isSelected = stroke.id === selectedImageId
          if (isSelected) {
            // Distinct active selection border
            ctx.strokeStyle = '#6366f1' // Indigo-500
            ctx.lineWidth = 2 / zoomScale
            ctx.setLineDash([])
            ctx.strokeRect(stroke.x, stroke.y, stroke.width, stroke.height)

            // 4 Corner handles
            const handleSize = 8 / zoomScale
            ctx.fillStyle = '#ffffff'
            ctx.strokeStyle = '#4f46e5'
            ctx.lineWidth = 2 / zoomScale

            const corners = [
              { x: stroke.x, y: stroke.y },
              { x: stroke.x + stroke.width, y: stroke.y },
              { x: stroke.x, y: stroke.y + stroke.height },
              { x: stroke.x + stroke.width, y: stroke.y + stroke.height }
            ]

            corners.forEach((c, i) => {
              ctx.fillRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize)
              ctx.strokeRect(c.x - handleSize / 2, c.y - handleSize / 2, handleSize, handleSize)
              // Make bottom-right resize handle prominent
              if (i === 3) {
                ctx.fillStyle = '#6366f1'
                ctx.fillRect(c.x - handleSize / 4, c.y - handleSize / 4, handleSize / 2, handleSize / 2)
                ctx.fillStyle = '#ffffff'
              }
            })
          } else {
            // Subtle boundary when idle
            ctx.strokeStyle = theme === 'dark' ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.25)'
            ctx.lineWidth = 1 / zoomScale
            ctx.setLineDash([4, 4])
            ctx.strokeRect(stroke.x, stroke.y, stroke.width, stroke.height)
            ctx.setLineDash([])
          }
        }
        return
      }

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
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2
          const yc = (pts[i].y + pts[i + 1].y) / 2
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc)
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
        ctx.stroke()
      }
    }

    // Draw active sheet strokes
    activeSheet.strokes.forEach(drawStroke)

    // Draw active live stroke in progress
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

  useEffect(() => {
    if (mode === 'draw' && workspaceTab === 'canvas' && canvasRef.current) {
      renderCanvas()
    }
  }, [mode, workspaceTab, activeSheet, currentPoints, zoomScale, panOffset, theme, isEraser, activeColor, penSize, selectedImageId])

  // Canvas ResizeObserver
  useEffect(() => {
    if (mode === 'draw' && workspaceTab === 'canvas' && canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current
      const container = containerRef.current

      const resizeCanvas = () => {
        const rect = container.getBoundingClientRect()
        canvas.width = rect.width || 600
        canvas.height = rect.height || 500
        renderCanvas()
      }

      resizeCanvas()
      const resizeObserver = new ResizeObserver(() => resizeCanvas())
      resizeObserver.observe(container)

      return () => resizeObserver.disconnect()
    }
  }, [mode, workspaceTab])

  // Convert screen coordinate to canvas world coordinate
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

  // --- TEXT TOOL COMMIT ---
  const commitTextInput = () => {
    if (activeTextInput && activeTextInput.value.trim()) {
      const activeColorVal = colorValues[activeColor]
      const newStroke = {
        type: 'text',
        text: activeTextInput.value,
        x: activeTextInput.x,
        y: activeTextInput.y,
        color: activeColorVal,
        size: penSize
      }
      updateActiveSheet(sheet => ({
        ...sheet,
        strokes: [...sheet.strokes, newStroke],
        undoStack: []
      }))
    }
    setActiveTextInput(null)
  }

  // --- CANVAS INTERACTION HANDLERS (Draw, Select, Move, Resize, Pan) ---
  const handleStart = (e) => {
    if (activeTextInput) {
      commitTextInput()
      return
    }

    // Middle mouse button or spacebar drag enables instant panning
    const isMiddleClick = e.button === 1
    const isPanActive = toolMode === 'pan' || isSpacePressed || isMiddleClick

    if (e.touches && e.touches.length === 2) {
      isPanningRef.current = true
      isDrawingRef.current = false
      isDraggingImageRef.current = false
      isResizingImageRef.current = false
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      startPanPosRef.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      }
      initialPanOffsetRef.current = { ...panOffsetRef.current }
      return
    }

    if (isPanActive) {
      isPanningRef.current = true
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      startPanPosRef.current = { x: clientX, y: clientY }
      initialPanOffsetRef.current = { ...panOffsetRef.current }
      return
    }

    const coords = getConvertedCoords(e)

    // SELECT TOOL: Hit test resize handle or image
    if (toolMode === 'select') {
      // 1. Check if user clicked on resize handle of currently selected image
      if (selectedImage && hitTestResizeHandle(coords.x, coords.y, selectedImage)) {
        isResizingImageRef.current = true
        isDraggingImageRef.current = false
        dragStartWorldRef.current = { x: coords.x, y: coords.y }
        imageInitialRectRef.current = {
          x: selectedImage.x,
          y: selectedImage.y,
          width: selectedImage.width,
          height: selectedImage.height
        }
        return
      }

      // 2. Check if user clicked on an image
      const hitImg = hitTestImage(coords.x, coords.y)
      if (hitImg) {
        setSelectedImageId(hitImg.id)
        isDraggingImageRef.current = true
        isResizingImageRef.current = false
        dragStartWorldRef.current = { x: coords.x, y: coords.y }
        imageInitialRectRef.current = {
          x: hitImg.x,
          y: hitImg.y,
          width: hitImg.width,
          height: hitImg.height
        }
        return
      }

      // 3. Clicked on empty space: deselect image
      setSelectedImageId(null)
      return
    }

    if (toolMode === 'text') {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()

      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY

      const screenX = clientX - rect.left
      const screenY = clientY - rect.top

      setActiveTextInput({
        x: coords.x,
        y: coords.y,
        screenX,
        screenY,
        value: ''
      })
      return
    }

    // Default: Drawing mode
    isDrawingRef.current = true
    setCurrentPoints([coords])
  }

  const handleMove = (e) => {
    if (isPanningRef.current) {
      let clientX, clientY
      if (e.touches && e.touches.length === 2) {
        clientX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        clientY = (e.touches[0].clientY + e.touches[1].clientY) / 2
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
      return
    }

    const coords = getConvertedCoords(e)

    // DRAGGING IMAGE (MOVE)
    if (isDraggingImageRef.current && selectedImageId) {
      const dx = coords.x - dragStartWorldRef.current.x
      const dy = coords.y - dragStartWorldRef.current.y
      const newX = Math.round(imageInitialRectRef.current.x + dx)
      const newY = Math.round(imageInitialRectRef.current.y + dy)

      updateActiveSheet(sheet => ({
        ...sheet,
        strokes: sheet.strokes.map(s => s.id === selectedImageId ? { ...s, x: newX, y: newY } : s)
      }))
      return
    }

    // RESIZING IMAGE
    if (isResizingImageRef.current && selectedImageId) {
      const dx = coords.x - dragStartWorldRef.current.x
      const origW = imageInitialRectRef.current.width
      const origH = imageInitialRectRef.current.height
      const newW = Math.max(60, Math.round(origW + dx))
      const newH = Math.round((newW * origH) / origW)

      updateActiveSheet(sheet => ({
        ...sheet,
        strokes: sheet.strokes.map(s => s.id === selectedImageId ? { ...s, width: newW, height: newH } : s)
      }))
      return
    }

    // DRAWING
    if (isDrawingRef.current) {
      setCurrentPoints(prev => [...prev, coords])
    }
  }

  const handleEnd = () => {
    isPanningRef.current = false

    if (isDraggingImageRef.current || isResizingImageRef.current) {
      isDraggingImageRef.current = false
      isResizingImageRef.current = false
      return
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false
      if (currentPoints.length > 0) {
        const activeColorVal = isEraser ? 'eraser' : colorValues[activeColor]
        const activeSize = isEraser ? 24 : penSize
        updateActiveSheet(sheet => ({
          ...sheet,
          strokes: [...sheet.strokes, { color: activeColorVal, size: activeSize, points: currentPoints }],
          undoStack: []
        }))
      }
      setCurrentPoints([])
    }
  }

  // --- IMAGE SCALING & DELETION HELPERS ---
  const scaleSelectedImage = (factor) => {
    if (!selectedImage) return
    const newW = Math.max(60, Math.min(1600, Math.round(selectedImage.width * factor)))
    const newH = Math.round((newW * selectedImage.height) / selectedImage.width)
    updateActiveSheet(sheet => ({
      ...sheet,
      strokes: sheet.strokes.map(s => s.id === selectedImageId ? { ...s, width: newW, height: newH } : s)
    }))
  }

  const deleteSelectedImage = () => {
    if (!selectedImageId) return
    const current = sheets[activeSheetIndex]
    const imgToDelete = current.strokes.find(s => s.id === selectedImageId)
    if (imgToDelete) {
      updateActiveSheet(sheet => ({
        ...sheet,
        strokes: sheet.strokes.filter(s => s.id !== selectedImageId),
        undoStack: [...sheet.undoStack, imgToDelete]
      }))
    }
    setSelectedImageId(null)
  }

  // Keyboard shortcuts (Delete, Backspace, Escape, Arrow nudging)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return
      if (!selectedImageId) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelectedImage()
      } else if (e.key === 'Escape') {
        setSelectedImageId(null)
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const step = e.shiftKey ? 15 : 4
        let dx = 0, dy = 0
        if (e.key === 'ArrowUp') dy = -step
        if (e.key === 'ArrowDown') dy = step
        if (e.key === 'ArrowLeft') dx = -step
        if (e.key === 'ArrowRight') dx = step

        updateActiveSheet(sheet => ({
          ...sheet,
          strokes: sheet.strokes.map(s => s.id === selectedImageId ? { ...s, x: s.x + dx, y: s.y + dy } : s)
        }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedImageId, activeSheetIndex])

  // Undo / Redo
  const handleUndo = () => {
    if (activeSheet.strokes.length === 0) return
    const lastStroke = activeSheet.strokes[activeSheet.strokes.length - 1]
    updateActiveSheet(sheet => ({
      ...sheet,
      strokes: sheet.strokes.slice(0, -1),
      undoStack: [...sheet.undoStack, lastStroke]
    }))
    if (lastStroke.id === selectedImageId) {
      setSelectedImageId(null)
    }
  }

  const handleRedo = () => {
    if (activeSheet.undoStack.length === 0) return
    const nextStroke = activeSheet.undoStack[activeSheet.undoStack.length - 1]
    updateActiveSheet(sheet => ({
      ...sheet,
      strokes: [...sheet.strokes, nextStroke],
      undoStack: sheet.undoStack.slice(0, -1)
    }))
  }

  // --- CANVAS IMAGE STAMP & CLIPBOARD PASTE ---
  const insertImageOnActiveSheet = (dataUrl) => {
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      const maxWidth = 380
      let w = img.naturalWidth || 320
      let h = img.naturalHeight || 240
      if (w > maxWidth) {
        h = (h * maxWidth) / w
        w = maxWidth
      }

      const cx = canvas ? (canvas.width / 2 - panOffsetRef.current.x) / zoomScaleRef.current - w / 2 : 50
      const cy = canvas ? (canvas.height / 2 - panOffsetRef.current.y) / zoomScaleRef.current - h / 2 : 50

      const newImageId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      const newStroke = {
        id: newImageId,
        type: 'image',
        imgData: dataUrl,
        x: Math.round(cx),
        y: Math.round(cy),
        width: Math.round(w),
        height: Math.round(h)
      }

      updateActiveSheet(sheet => ({
        ...sheet,
        strokes: [...sheet.strokes, newStroke],
        undoStack: []
      }))

      // Auto-select and switch to Select tool so user can immediately move/resize
      setSelectedImageId(newImageId)
      setToolMode('select')
      setWorkspaceTab('canvas')
    }
    img.src = dataUrl
  }

  // Clipboard Paste (Ctrl+V) listener
  useEffect(() => {
    const handlePaste = (e) => {
      if (mode !== 'draw') return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
              insertImageOnActiveSheet(event.target.result)
            }
            reader.readAsDataURL(file)
          }
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [mode, activeSheetIndex])

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

  // --- CLEAN DATA EXPORT FOR THUMBNAILS & SAVING ---
  const getCleanCanvasDataUrl = (sheetStrokes) => {
    const canvas = canvasRef.current
    const w = canvas ? canvas.width : 800
    const h = canvas ? canvas.height : 600

    const offscreen = document.createElement('canvas')
    offscreen.width = w
    offscreen.height = h
    const ctx = offscreen.getContext('2d')

    ctx.fillStyle = theme === 'dark' ? '#0f172a' : '#ffffff'
    ctx.fillRect(0, 0, offscreen.width, offscreen.height)

    sheetStrokes.forEach(stroke => {
      if (stroke.type === 'text') {
        ctx.fillStyle = stroke.color
        ctx.font = `bold ${stroke.size * 3 + 10}px Inter, sans-serif`
        ctx.textBaseline = 'middle'
        ctx.fillText(stroke.text, stroke.x, stroke.y)
        return
      }

      if (stroke.type === 'image') {
        let img = imageElementsRef.current.get(stroke.imgData)
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, stroke.x, stroke.y, stroke.width, stroke.height)
        }
        return
      }

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

  // --- SAVE & DELETE HANDLERS ---
  const handleSaveAllNotes = () => {
    const activeThumbnail = getCleanCanvasDataUrl(activeSheet.strokes)
    const title = `Scratchpad (${sheets.length} sheet${sheets.length > 1 ? 's' : ''}, ${attachments.length} attachment${attachments.length !== 1 ? 's' : ''})`

    saveQuestionNote(
      scratchpadOpenQuestionId,
      'canvas',
      activeThumbnail,
      title,
      activeSheet.strokes,
      sheets,
      attachments
    )
    setSelectedImageId(null)
    setMode('view')
  }

  const handleDeleteNote = () => {
    if (window.confirm('Delete this note and all associated sheets and attachments?')) {
      deleteQuestionNote(scratchpadOpenQuestionId)
      setSheets([{ id: 'sheet-1', title: 'Sheet 1', strokes: [], undoStack: [] }])
      setActiveSheetIndex(0)
      setSelectedImageId(null)
      setAttachments([])
      setMode('draw')
    }
  }

  const handleDownloadActiveSheet = () => {
    const dataUrl = getCleanCanvasDataUrl(activeSheet.strokes)
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `question-${scratchpadOpenQuestionId}-${activeSheet.title.toLowerCase().replace(/\s+/g, '-')}.png`
    a.click()
  }

  if (!scratchpadOpenQuestionId || !currentQuestion) return null

  // Compute screen coordinates for floating image toolbar
  const selectedImageScreenCoords = selectedImage ? {
    x: selectedImage.x * zoomScale + panOffset.x,
    y: selectedImage.y * zoomScale + panOffset.y,
    width: selectedImage.width * zoomScale,
    height: selectedImage.height * zoomScale
  } : null

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
          Scratchpad ({sheets.length} Sheet{sheets.length > 1 ? 's' : ''})
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
            <div className="text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
              <QuestionText text={currentQuestion.question} />
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
                      btnStyle = 'border-slate-100 dark:border-slate-900 opacity-60 text-slate-450'
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectMCQ?.(idx)}
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
                        onClick={() => handleToggleMSQ?.(idx)}
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
                    onClick={() => handleSubmitMSQ?.()}
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
                {(Number(currentQuestion?.likes) || 0) + (votes[currentQuestion?.id] === 'up' ? 1 : 0)}
              </span>
            </div>

            {/* Downvote */}
            <button
              onClick={() => downvoteQuestion(currentQuestion.id)}
              className={`group relative h-9 w-9 rounded-full flex items-center justify-center shadow-md border transition-all active:scale-90 ${
                votes[currentQuestion.id] === 'down'
                  ? 'bg-error border-error text-white'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <ThumbsDown size={14} className={votes[currentQuestion.id] === 'down' ? 'fill-white text-white' : 'text-slate-500'} />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                Downvote
              </span>
            </button>

            {/* Discussion */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => setActiveDiscussionQuestionId(currentQuestion.id)}
                className="group relative h-9 w-9 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 flex items-center justify-center shadow-md text-slate-500 hover:bg-slate-50 transition-all active:scale-90"
              >
                <MessageSquare size={14} />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                  Discussion
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
              className="group relative h-9 w-9 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 flex items-center justify-center shadow-md text-slate-500 hover:bg-slate-50 transition-all active:scale-90"
            >
              <Play size={14} className="fill-slate-500 text-slate-500" />
              <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-white/10">
                Video Solution
              </span>
            </button>
          </div>
        </div>

        {/* --- RIGHT PANEL: ADVANCED SCRATCHPAD & REFERENCES --- */}
        <div 
          className={`flex-1 h-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 ${
            mobileTab === 'scratchpad' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Top Panel Bar */}
          <div className="flex items-center justify-between p-3.5 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900/50 shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark flex items-center gap-2">
                  <span>Workspace Scratchpad</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {sheets.length} {sheets.length === 1 ? 'Sheet' : 'Sheets'}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500">Multi-sheet vector canvas, image move/scale/delete & multi-file attachments</p>
              </div>

              {/* Sub-tab switcher in edit mode */}
              {mode === 'draw' && (
                <div className="hidden sm:flex border border-border-light dark:border-border-dark rounded-btn p-0.5 bg-white dark:bg-slate-950 ml-2">
                  <button
                    onClick={() => setWorkspaceTab('canvas')}
                    className={`px-3 py-1 text-xs font-bold rounded-btn transition-all flex items-center gap-1.5 ${
                      workspaceTab === 'canvas'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Edit3 size={12} />
                    <span>Canvas ({sheets.length})</span>
                  </button>
                  <button
                    onClick={() => setWorkspaceTab('attachments')}
                    className={`px-3 py-1 text-xs font-bold rounded-btn transition-all flex items-center gap-1.5 ${
                      workspaceTab === 'attachments'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Paperclip size={12} />
                    <span>Files & PDFs ({attachments.length})</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* View Mode Actions */}
            {mode === 'view' && savedNote && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDeleteNote}
                  className="px-3 py-1.5 text-xs text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 font-bold rounded-btn transition-colors flex items-center gap-1 border border-rose-500/20"
                >
                  <Trash2 size={12} />
                  <span className="hidden sm:inline">Delete Note</span>
                </button>
                <button
                  onClick={() => setMode('draw')}
                  className="px-3.5 py-1.5 text-xs text-white bg-primary hover:bg-primary-hover font-bold rounded-btn transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Edit3 size={12} />
                  <span>Edit Scratchpad</span>
                </button>
              </div>
            )}
          </div>

          {/* Sub-tab switcher on mobile when in draw mode */}
          {mode === 'draw' && (
            <div className="flex sm:hidden border-b border-border-light dark:border-border-dark bg-white dark:bg-slate-900 shrink-0">
              <button
                onClick={() => setWorkspaceTab('canvas')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all ${
                  workspaceTab === 'canvas' ? 'border-primary text-primary' : 'border-transparent text-slate-500'
                }`}
              >
                Canvas Sheets ({sheets.length})
              </button>
              <button
                onClick={() => setWorkspaceTab('attachments')}
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all ${
                  workspaceTab === 'attachments' ? 'border-primary text-primary' : 'border-transparent text-slate-500'
                }`}
              >
                PDFs & Images ({attachments.length})
              </button>
            </div>
          )}

          {/* --- WORKSPACE IN EDIT MODE --- */}
          {mode === 'draw' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* TAB 1: CANVAS SHEETS */}
              {workspaceTab === 'canvas' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  
                  {/* Sheets Header Bar */}
                  <div className="px-3 py-2 bg-white dark:bg-slate-900 border-b border-border-light dark:border-border-dark flex items-center justify-between gap-2 overflow-x-auto shrink-0 custom-scrollbar">
                    {/* Sheet Selector & Pills */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setActiveSheetIndex(prev => Math.max(0, prev - 1))
                          setSelectedImageId(null)
                        }}
                        disabled={activeSheetIndex === 0}
                        className="p-1 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30"
                        title="Previous Sheet"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] sm:max-w-md custom-scrollbar py-0.5">
                        {sheets.map((sheet, idx) => (
                          <button
                            key={sheet.id}
                            onClick={() => {
                              setActiveSheetIndex(idx)
                              setSelectedImageId(null)
                            }}
                            className={`px-3 py-1 text-xs font-bold rounded-btn transition-all shrink-0 flex items-center gap-1.5 border ${
                              activeSheetIndex === idx
                                ? 'bg-primary border-primary text-white shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/50'
                            }`}
                          >
                            <span>{sheet.title}</span>
                            {sheet.strokes.length > 0 && (
                              <span className={`h-1.5 w-1.5 rounded-full ${activeSheetIndex === idx ? 'bg-white' : 'bg-primary'}`} />
                            )}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setActiveSheetIndex(prev => Math.min(sheets.length - 1, prev + 1))
                          setSelectedImageId(null)
                        }}
                        disabled={activeSheetIndex === sheets.length - 1}
                        className="p-1 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30"
                        title="Next Sheet"
                      >
                        <ChevronRight size={16} />
                      </button>

                      {/* Add Sheet button */}
                      <button
                        onClick={addSheet}
                        className="h-7 px-2.5 text-xs font-bold rounded-btn bg-indigo-50 dark:bg-indigo-950/40 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all flex items-center gap-1 shrink-0 ml-1"
                        title="Add Another Sheet to write more"
                      >
                        <Plus size={13} strokeWidth={2.5} />
                        <span>Add Sheet</span>
                      </button>
                    </div>

                    {/* Sheet Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={clearActiveSheet}
                        className="px-2.5 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 rounded-btn border border-rose-500/20 transition-colors"
                        title="Clear all strokes on this sheet"
                      >
                        Clear Sheet
                      </button>
                      {sheets.length > 1 && (
                        <button
                          onClick={deleteActiveSheet}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-btn transition-colors"
                          title="Delete current sheet"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Canvas Main Toolbar */}
                  <div className="p-2.5 border-b border-border-light dark:border-border-dark flex flex-wrap gap-2.5 items-center justify-between bg-slate-50/70 dark:bg-slate-900/30 shrink-0">
                    
                    {/* Left: Tools & Pen Colors */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Pen Colors */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 border border-border-light dark:border-border-dark rounded-btn">
                        {Object.keys(colorValues).map((c) => (
                          <button
                            key={c}
                            onClick={() => {
                              setActiveColor(c)
                              setIsEraser(false)
                              setToolMode('draw')
                            }}
                            className={`h-6 w-6 rounded-full border transition-all flex items-center justify-center shrink-0 ${
                              activeColor === c && !isEraser && toolMode === 'draw'
                                ? 'scale-110 ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950'
                                : 'opacity-85 hover:opacity-100'
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

                      {/* Stroke Thickness */}
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

                      {/* Eraser */}
                      <button
                        onClick={() => {
                          setIsEraser(!isEraser)
                          if (!isEraser) setToolMode('draw')
                        }}
                        className={`h-7 px-2.5 text-xs font-bold rounded-btn border transition-all ${
                          isEraser && toolMode === 'draw'
                            ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                            : 'border-border-light dark:border-border-dark text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-950'
                        }`}
                        title="Eraser tool"
                      >
                        Eraser
                      </button>

                      {/* Tool Modes: Draw | Select (Move/Resize/Delete) | Text | Pan */}
                      <div className="flex border border-border-light dark:border-border-dark rounded-btn overflow-hidden bg-white dark:bg-slate-950">
                        <button
                          onClick={() => {
                            setToolMode('draw')
                            setIsEraser(false)
                          }}
                          className={`h-7 px-2.5 text-xs font-bold transition-all flex items-center gap-1 ${
                            toolMode === 'draw' && !isEraser
                              ? 'bg-primary text-white'
                              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                          }`}
                          title="Freehand Draw Tool"
                        >
                          <Edit3 size={12} />
                          <span className="hidden sm:inline">Draw</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setToolMode('select')
                            setIsEraser(false)
                          }}
                          className={`h-7 px-2.5 text-xs font-bold transition-all flex items-center gap-1 ${
                            toolMode === 'select'
                              ? 'bg-primary text-white'
                              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                          }`}
                          title="Select Tool: Click images to move, resize, or delete"
                        >
                          <MousePointer size={12} />
                          <span className="hidden sm:inline">Select</span>
                        </button>

                        <button
                          onClick={() => {
                            setToolMode('text')
                            setIsEraser(false)
                            setSelectedImageId(null)
                          }}
                          className={`h-7 px-2.5 text-xs font-bold transition-all flex items-center gap-1 ${
                            toolMode === 'text'
                              ? 'bg-primary text-white'
                              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                          }`}
                          title="Text Tool (Click canvas to type formulas/notes)"
                        >
                          <FileText size={12} />
                          <span className="hidden sm:inline">Text</span>
                        </button>

                        <button
                          onClick={() => {
                            setToolMode('pan')
                            setSelectedImageId(null)
                          }}
                          className={`h-7 px-2.5 text-xs font-bold transition-all flex items-center gap-1 ${
                            toolMode === 'pan'
                              ? 'bg-primary text-white'
                              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'
                          }`}
                          title="Pan Tool (Click and drag to scroll board)"
                        >
                          <Hand size={12} />
                          <span className="hidden sm:inline">Pan</span>
                        </button>
                      </div>

                      {/* Insert Image onto Sheet */}
                      <input
                        type="file"
                        ref={imageInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (ev) => insertImageOnActiveSheet(ev.target.result)
                            reader.readAsDataURL(file)
                          }
                          e.target.value = ''
                        }}
                      />
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="h-7 px-2.5 text-xs font-bold rounded-btn border border-border-light dark:border-border-dark bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:border-primary transition-all flex items-center gap-1.5"
                        title="Insert an image or screenshot onto this sheet (or press Ctrl+V)"
                      >
                        <ImageIcon size={13} className="text-primary" />
                        <span className="hidden sm:inline">Add Image</span>
                      </button>
                    </div>

                    {/* Right: Zoom & History */}
                    <div className="flex items-center gap-2">
                      {/* Bounded Zoom Controls */}
                      <div className="flex items-center gap-0.5 bg-white dark:bg-slate-950 border border-border-light dark:border-border-dark rounded-btn p-0.5">
                        <button
                          onClick={handleZoomIn}
                          disabled={zoomScale >= MAX_ZOOM}
                          className="p-1 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 disabled:opacity-30"
                          title="Zoom In (max 250%)"
                        >
                          <ZoomIn size={14} />
                        </button>
                        <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 px-1.5 min-w-[42px] text-center">
                          {Math.round(zoomScale * 100)}%
                        </span>
                        <button
                          onClick={handleZoomOut}
                          disabled={zoomScale <= MIN_ZOOM}
                          className="p-1 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 disabled:opacity-30"
                          title="Zoom Out (min 50%)"
                        >
                          <ZoomOut size={14} />
                        </button>
                        <button
                          onClick={handleResetZoom}
                          className="p-1 rounded-btn hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500"
                          title="Reset Zoom to 100%"
                        >
                          <Maximize2 size={12} />
                        </button>
                      </div>

                      {/* Undo / Redo */}
                      <div className="flex items-center gap-1 border border-border-light dark:border-border-dark rounded-btn overflow-hidden bg-white dark:bg-slate-950">
                        <button
                          onClick={handleUndo}
                          disabled={activeSheet.strokes.length === 0}
                          className="h-7 px-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30"
                          title="Undo stroke or image deletion"
                        >
                          <Undo size={14} />
                        </button>
                        <button
                          onClick={handleRedo}
                          disabled={activeSheet.undoStack.length === 0}
                          className="h-7 px-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30"
                          title="Redo"
                        >
                          <RefreshCw size={12} className="rotate-180" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Canvas Viewport */}
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
                        toolMode === 'pan' || isSpacePressed
                          ? 'cursor-grab active:cursor-grabbing' 
                          : toolMode === 'select'
                          ? (selectedImage ? 'cursor-move' : 'cursor-default')
                          : toolMode === 'text' 
                          ? 'cursor-text' 
                          : 'cursor-crosshair'
                      }`}
                    />
                    
                    {/* Active Text Input overlay */}
                    {activeTextInput && (
                      <input
                        type="text"
                        autoFocus
                        value={activeTextInput.value}
                        onChange={(e) => setActiveTextInput(prev => ({ ...prev, value: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            commitTextInput()
                          } else if (e.key === 'Escape') {
                            setActiveTextInput(null)
                          }
                        }}
                        onBlur={commitTextInput}
                        placeholder="Type formula or note..."
                        className="absolute bg-white/95 dark:bg-slate-900/95 border border-primary/50 shadow-md rounded px-2 py-1 outline-none text-text-primary-light dark:text-text-primary-dark z-[80]"
                        style={{
                          left: `${activeTextInput.screenX}px`,
                          top: `${activeTextInput.screenY}px`,
                          fontSize: `${Math.max(12, (penSize * 3 + 10) * zoomScale)}px`,
                          color: colorValues[activeColor],
                          transform: 'translate(-5px, -50%)',
                          minWidth: '150px'
                        }}
                      />
                    )}

                    {/* Floating Action Badge for Selected Image */}
                    {selectedImage && selectedImageScreenCoords && (
                      <div 
                        className="absolute z-[85] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-primary/40 shadow-xl rounded-btn px-2 py-1 flex items-center gap-2 pointer-events-auto transition-all animate-fadeIn"
                        style={{
                          left: `${Math.max(10, Math.min(containerRef.current ? containerRef.current.clientWidth - 260 : 300, selectedImageScreenCoords.x))}px`,
                          top: `${Math.max(10, selectedImageScreenCoords.y - 42)}px`
                        }}
                      >
                        {/* Drag indicator */}
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px] font-bold cursor-move" title="Click and drag image to move anywhere on canvas">
                          <Move size={12} className="text-primary" />
                          <span>Drag to Move</span>
                        </div>

                        <span className="text-slate-300 dark:text-slate-700">|</span>

                        {/* Dimensions readout */}
                        <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                          {selectedImage.width}×{selectedImage.height}
                        </span>

                        {/* Scaling buttons */}
                        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded p-0.5">
                          <button
                            onClick={() => scaleSelectedImage(0.85)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
                            title="Scale Down (-15%)"
                          >
                            <Minus size={11} />
                          </button>
                          <button
                            onClick={() => scaleSelectedImage(1.15)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
                            title="Scale Up (+15%)"
                          >
                            <Plus size={11} />
                          </button>
                        </div>

                        {/* Delete Image button */}
                        <button
                          onClick={deleteSelectedImage}
                          className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded text-xs font-bold transition-all flex items-center gap-1"
                          title="Delete this image (or press Delete / Backspace)"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>

                        {/* Deselect button */}
                        <button
                          onClick={() => setSelectedImageId(null)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                          title="Deselect (Escape)"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    )}

                    {/* Helpful Pan & Zoom hint pill */}
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] text-white/80 pointer-events-none hidden md:block">
                      <span>Select tool: Drag image to move, bottom-right handle to scale • Press Del to remove image • Space + Drag to pan</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ATTACHMENTS (Multiple PDFs & Multiple Images) */}
              {workspaceTab === 'attachments' && (
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
                        onClick={() => multiFileInputRef.current?.click()}
                        className="h-8 px-3.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <Plus size={14} />
                        <span>Upload Files</span>
                      </button>
                    </div>

                    {/* Hidden Multi-file input */}
                    <input
                      type="file"
                      ref={multiFileInputRef}
                      multiple
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        processUploadedFiles(e.target.files)
                        e.target.value = ''
                      }}
                    />

                    {/* Upload Drop Area */}
                    <div 
                      onClick={() => multiFileInputRef.current?.click()}
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

                    {/* Attachments List / Grid */}
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
                              {/* If image, option to stamp directly onto active sheet */}
                              {att.type === 'image' && (
                                <button
                                  onClick={() => insertImageOnActiveSheet(att.data)}
                                  className="px-2 py-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors flex items-center gap-1"
                                  title="Stamp this image onto the active sheet to annotate on it"
                                >
                                  <Copy size={11} />
                                  <span>Use on Sheet</span>
                                </button>
                              )}

                              <div className="flex items-center gap-1 ml-auto">
                                <button
                                  onClick={() => setActivePreviewAttachment(att)}
                                  className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
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
                                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
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

              {/* Bottom Footer Actions */}
              <div className="p-3.5 border-t border-border-light dark:border-border-dark flex items-center justify-between bg-card-light dark:bg-card-dark shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedImageId(null)
                      setMode(savedNote ? 'view' : 'draw')
                    }}
                    className="h-9 px-4 border border-border-light dark:border-border-dark text-slate-650 dark:text-slate-400 font-bold text-xs rounded-btn hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addSheet}
                    className="h-9 px-3 text-primary bg-indigo-50 dark:bg-indigo-950/30 border border-primary/20 font-bold text-xs rounded-btn hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    <span>Add Another Sheet</span>
                  </button>
                </div>

                <button
                  onClick={handleSaveAllNotes}
                  className="h-9 px-5 bg-success hover:bg-success/90 text-white font-bold text-xs rounded-btn shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Save All Notes ({sheets.length} Sheets)</span>
                </button>
              </div>
            </div>
          )}

          {/* --- WORKSPACE IN VIEW MODE (Saved Notes Display) --- */}
          {mode === 'view' && savedNote && (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
              
              {/* Sheets & Attachments Navigation in View Mode */}
              <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-border-light dark:border-border-dark flex items-center justify-between gap-3 shrink-0">
                {/* Switch between Sheets */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sheet:</span>
                  <div className="flex items-center gap-1">
                    {sheets.map((sheet, idx) => (
                      <button
                        key={sheet.id}
                        onClick={() => setActiveSheetIndex(idx)}
                        className={`px-3 py-1 text-xs font-bold rounded-btn transition-all ${
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

                {/* Actions: Download Sheet PNG */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadActiveSheet}
                    className="h-7 px-2.5 rounded-btn bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-650 dark:text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors"
                    title="Download active sheet as image"
                  >
                    <Download size={12} />
                    <span>Download PNG</span>
                  </button>
                </div>
              </div>

              {/* Main View Display */}
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                
                {/* Active Sheet Display */}
                <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-card bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center p-2 min-h-[360px] shadow-sm relative">
                  <img
                    src={getCleanCanvasDataUrl(activeSheet.strokes)}
                    alt={activeSheet.title}
                    className="max-w-full max-h-full object-contain rounded"
                  />
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded text-[11px] font-bold text-white">
                    {activeSheet.title} ({activeSheetIndex + 1} of {sheets.length})
                  </div>
                </div>

                {/* Attached Files Bar in View Mode */}
                {attachments.length > 0 && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-card border border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
                    <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Paperclip size={12} className="text-primary" />
                      <span>Attached References ({attachments.length})</span>
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-btn bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          {att.type === 'image' ? <ImageIcon size={12} className="text-primary" /> : <FileText size={12} className="text-indigo-500" />}
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{att.name}</span>
                          <button
                            onClick={() => setActivePreviewAttachment(att)}
                            className="p-1 hover:text-primary transition-colors text-slate-400"
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

              {/* View Mode Footer */}
              <div className="p-3.5 border-t border-border-light dark:border-border-dark flex items-center justify-between bg-card-light dark:bg-card-dark shrink-0">
                <button
                  onClick={() => setScratchpadOpenQuestionId(null)}
                  className="h-9 px-4 border border-border-light dark:border-border-dark text-slate-650 dark:text-slate-400 font-bold text-xs rounded-btn hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  Close Scratchpad
                </button>

                <button
                  onClick={() => setMode('draw')}
                  className="h-9 px-5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-btn transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Edit3 size={14} />
                  <span>Continue Writing / Add Sheet</span>
                </button>
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
                      insertImageOnActiveSheet(activePreviewAttachment.data)
                      setActivePreviewAttachment(null)
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-btn transition-colors flex items-center gap-1"
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
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-btn transition-colors"
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
