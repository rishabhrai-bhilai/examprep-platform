import React, { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered, Link, 
  Table, Eye, Edit2, RotateCcw, RotateCw, Sparkles, Send, X, 
  Maximize2, Minimize2, Check, Copy, Palette, FileCode, ChevronDown,
  Image as ImageIcon, Upload, ZoomIn, ZoomOut, Trash2, AlignLeft, 
  AlignCenter, AlignRight, ChevronsUpDown, Move, Plus, Minus,
  PenTool, Eraser, Undo2
} from 'lucide-react'
import FormattedContent from './FormattedContent'

/**
 * Composite floating images and drawn pen strokes onto a high-resolution canvas,
 * returning a PNG base64 data URL.
 */
/**
 * Composite floating images and drawn pen strokes onto a high-resolution canvas,
 * tightly cropping to the content's exact bounding box (plus 12px padding),
 * returning a PNG base64 data URL and exact dimensions.
 */
export async function compositeLayersToDataUrl(width, height, strokes = [], images = []) {
  if (strokes.length === 0 && images.length === 0) return null

  // Pre-load images to get real element and dimensions
  const loadedImages = []
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let hasValidContent = false

  for (const imgItem of images) {
    if (!imgItem.src) continue
    try {
      const img = await new Promise((resolve) => {
        const el = new window.Image()
        el.crossOrigin = 'anonymous'
        el.onload = () => resolve(el)
        el.onerror = () => resolve(null)
        el.src = imgItem.src
      })
      if (img) {
        const imgW = imgItem.width || (img.naturalWidth ? Math.min(img.naturalWidth, 600) : 320)
        const imgH = imgItem.height || (img.naturalHeight ? Math.round((imgW * img.naturalHeight) / (img.naturalWidth || 1)) : 220)
        const x = imgItem.x !== undefined ? imgItem.x : 0
        const y = imgItem.y !== undefined ? imgItem.y : 0
        loadedImages.push({ el: img, x, y, width: imgW, height: imgH })
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x + imgW)
        maxY = Math.max(maxY, y + imgH)
        hasValidContent = true
      }
    } catch (e) {
      console.warn('Image load error during composite:', e)
    }
  }

  // Include pen strokes in bounding box
  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length === 0) continue
    hasValidContent = true
    const sSize = (stroke.size || 3) * (stroke.isEraser ? 4 : 1)
    for (const pt of stroke.points) {
      minX = Math.min(minX, pt.x - sSize)
      minY = Math.min(minY, pt.y - sSize)
      maxX = Math.max(maxX, pt.x + sSize)
      maxY = Math.max(maxY, pt.y + sSize)
    }
  }

  if (!hasValidContent) return null

  // Tight, clean padding around the outermost bounding box (no wasted space)
  const padding = 12
  const cropX = Math.max(0, minX - padding)
  const cropY = Math.max(0, minY - padding)
  const cropW = Math.max(40, (maxX - minX) + padding * 2)
  const cropH = Math.max(30, (maxY - minY) + padding * 2)

  const canvas = document.createElement('canvas')
  const dpr = 2
  canvas.width = Math.round(cropW * dpr)
  canvas.height = Math.round(cropH * dpr)
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  // Translate context so content top-left aligns with (cropX, cropY)
  ctx.translate(-cropX, -cropY)

  // Draw floating images
  for (const item of loadedImages) {
    ctx.drawImage(item.el, item.x, item.y, item.width, item.height)
  }

  // Draw pen strokes
  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length === 0) continue
    ctx.save()
    ctx.strokeStyle = stroke.color || '#6366f1'
    ctx.lineWidth = stroke.size || 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (stroke.isEraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = (stroke.size || 3) * 4
    } else {
      ctx.globalCompositeOperation = 'source-over'
    }

    ctx.beginPath()
    const pts = stroke.points
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y)
    }
    ctx.stroke()
    ctx.restore()
  }

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: Math.round(cropW),
    height: Math.round(cropH)
  }
}

/**
 * Separate markdown text from embedded image tags for initializing the layered workspace.
 */
function parseInitialContent(raw = '') {
  if (!raw || typeof raw !== 'string') return { text: '', images: [] }

  const imageRegex = /!\[([^\]]*)\]\(((?:data:image\/[^;]+;base64,[A-Za-z0-9+/=]+|\S+?))\)/g
  const images = []
  let cleanText = raw
  let match
  let idx = 0

  while ((match = imageRegex.exec(raw)) !== null) {
    const rawAlt = match[1] || ''
    const parts = rawAlt.split('|')
    const captionCandidate = parts[0] ? parts[0].trim() : ''
    const cleanAlt = ['diagram', 'image', 'solution diagram & notes', 'pasted screenshot'].includes(captionCandidate.toLowerCase())
      ? ''
      : captionCandidate
    let customWidth = 340

    parts.slice(1).forEach(opt => {
      const trimmed = opt.trim()
      if (trimmed.startsWith('w:')) {
        const parsed = parseInt(trimmed.replace('w:', '').trim(), 10)
        if (!isNaN(parsed) && parsed > 50) customWidth = parsed
      }
    })

    images.push({
      id: `img-${idx}-${Date.now()}`,
      src: match[2],
      alt: cleanAlt,
      x: 40 + idx * 30,
      y: 40 + idx * 30,
      width: customWidth,
      height: 220
    })
    idx++
  }

  cleanText = cleanText.replace(imageRegex, '').replace(/\n{3,}/g, '\n\n').trim()
  return { text: cleanText, images }
}

export default function RichTextEditor({
  value = '',
  onChange,
  onSubmit,
  onCancel,
  placeholder = 'Write your solution or comment here...',
  mode = 'full', // 'full' | 'compact'
  submitLabel = 'Post Solution',
  submitIcon = Send,
  autoFocus = false,
  className = ''
}) {
  const containerRef = useRef(null)
  const textareaRef = useRef(null)
  const drawingCanvasRef = useRef(null)
  const imageFileInputRef = useRef(null)

  // Layer 1: Unified Text Area
  const [textContent, setTextContent] = useState(() => parseInitialContent(value).text)

  // Layer 2: Freeform Floating Images
  const [images, setImages] = useState(() => parseInitialContent(value).images)
  const [selectedImageId, setSelectedImageId] = useState(null)

  // Layer 3: Pen Drawing Layer ("Draw" Mode)
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [strokes, setStrokes] = useState([])
  const [currentStroke, setCurrentStroke] = useState([])
  const [penColor, setPenColor] = useState('#6366f1')
  const [penSize, setPenSize] = useState(3)
  const [isEraser, setIsEraser] = useState(false)
  const isDrawingRef = useRef(false)

  // Merged Output State
  const [mergedMarkdown, setMergedMarkdown] = useState(value)
  const lastSerializedRef = useRef(value)

  // History for Undo/Redo
  const [history, setHistory] = useState([value])
  const [historyIndex, setHistoryIndex] = useState(0)

  // View States
  const [activeTab, setActiveTab] = useState('write') // 'write' | 'preview' | 'split'
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Dropdown & Modal States (Higher Z-Index)
  const [showMathMenu, setShowMathMenu] = useState(false)
  const [showColorMenu, setShowColorMenu] = useState(false)
  const [showFormatMenu, setShowFormatMenu] = useState(false)
  const [showImageMenu, setShowImageMenu] = useState(false)

  // Link & Image Dialogs
  const [linkInputOpen, setLinkInputOpen] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrlInputOpen, setImageUrlInputOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')

  // Lightbox
  const [enlargedImageSrc, setEnlargedImageSrc] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Active Height calculation
  const activeHeight = isFullscreen
    ? 'calc(100vh - 160px)'
    : mode === 'full'
      ? (isExpanded ? '560px' : '400px')
      : (isExpanded ? '340px' : '180px')

  // Close all menus helper
  const closeAllMenus = () => {
    setShowMathMenu(false)
    setShowColorMenu(false)
    setShowFormatMenu(false)
    setShowImageMenu(false)
  }

  // Synchronize when value changes externally (e.g. question switch)
  useEffect(() => {
    if (value === lastSerializedRef.current) return
    lastSerializedRef.current = value
    const parsed = parseInitialContent(value)
    setTextContent(parsed.text)
    if (parsed.images.length > 0) {
      setImages(parsed.images)
    }
    setMergedMarkdown(value)
  }, [value])

  // Sync initial autofocus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  // Resize and redraw drawing canvas
  useEffect(() => {
    const canvas = drawingCanvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    canvas.width = rect.width || 800
    canvas.height = rect.height || 500

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Redraw all completed strokes
    strokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length === 0) return
      ctx.save()
      ctx.strokeStyle = stroke.color || '#6366f1'
      ctx.lineWidth = stroke.size || 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (stroke.isEraser) {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = (stroke.size || 3) * 4
      } else {
        ctx.globalCompositeOperation = 'source-over'
      }

      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
      ctx.restore()
    })

    // Redraw current active stroke
    if (currentStroke.length > 0) {
      ctx.save()
      ctx.strokeStyle = isEraser ? '#ffffff' : penColor
      ctx.lineWidth = isEraser ? penSize * 4 : penSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (isEraser) ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y)
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y)
      }
      ctx.stroke()
      ctx.restore()
    }
  }, [strokes, currentStroke, isEraser, penColor, penSize, activeHeight, isFullscreen, isExpanded])

  // Synchronize and composite all layers into single markdown string
  const syncLayers = useCallback(async (text, currentImages, currentStrokes) => {
    let finalMd = text ? text.trim() : ''

    // If NO pen strokes were drawn, keep each image clean with its exact original quality and chosen width
    if (currentStrokes.length === 0 && currentImages.length > 0) {
      const imgTags = currentImages
        .filter(img => img.src)
        .map(img => {
          const rawCaption = img.alt ? img.alt.trim() : ''
          const isGeneric = ['image', 'diagram', 'pasted screenshot', 'solution diagram & notes'].includes(rawCaption.toLowerCase())
          const cleanCaption = isGeneric ? '' : rawCaption
          const wOpt = img.width ? `|w:${img.width}` : ''
          return `![${cleanCaption}${wOpt}](${img.src})`
        })
        .join('\n\n')

      if (imgTags) {
        finalMd = finalMd ? `${finalMd}\n\n${imgTags}` : imgTags
      }
    } else if (currentStrokes.length > 0 || currentImages.length > 0) {
      // Pen strokes exist (or strokes + images combined)
      const container = containerRef.current
      const w = container?.clientWidth || 800
      const h = container?.clientHeight || 500
      const compositeResult = await compositeLayersToDataUrl(w, h, currentStrokes, currentImages)
      if (compositeResult && compositeResult.dataUrl) {
        const wOpt = compositeResult.width ? `|w:${compositeResult.width}` : ''
        finalMd = finalMd ? `${finalMd}\n\n![${wOpt}](${compositeResult.dataUrl})` : `![${wOpt}](${compositeResult.dataUrl})`
      }
    }

    setMergedMarkdown(finalMd)
    lastSerializedRef.current = finalMd
    if (onChange) onChange(finalMd)
    return finalMd
  }, [onChange])

  // Record history
  const recordHistory = useCallback((newVal) => {
    const nextHistory = history.slice(0, historyIndex + 1)
    nextHistory.push(newVal)
    if (nextHistory.length > 50) nextHistory.shift()
    setHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
  }, [history, historyIndex])

  // Handle Text Content Change
  const handleTextChange = (newText) => {
    setTextContent(newText)
    syncLayers(newText, images, strokes).then(md => recordHistory(md))
  }

  // Formatting helpers for the unified textarea
  const insertFormatting = (prefix, suffix = '', defaultText = '') => {
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

  // Keyboard Shortcuts
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      insertFormatting('**', '**', 'bold text')
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault()
      insertFormatting('*', '*', 'italic text')
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      setLinkInputOpen(true)
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  // --- FLOATING IMAGE MANIPULATION (LAYER 2) ---
  const addFloatingImage = (src, alt = 'Diagram') => {
    const container = containerRef.current
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

    const updated = [...images, newImg]
    setImages(updated)
    setSelectedImageId(newImg.id)
    syncLayers(textContent, updated, strokes).then(md => recordHistory(md))
  }

  // Drag image freely across workspace
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

      const container = containerRef.current
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
      setImages(latest => {
        syncLayers(textContent, latest, strokes).then(md => recordHistory(md))
        return latest
      })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
  }

  // Corner resize drag handler
  const handleCornerResize = (e, imgId) => {
    e.preventDefault()
    e.stopPropagation()

    const startX = e.touches ? e.touches[0].clientX : e.clientX
    const targetImg = images.find(i => i.id === imgId)
    if (!targetImg) return
    const initialW = targetImg.width || 320

    const onMove = (moveEvt) => {
      const curX = moveEvt.touches ? moveEvt.touches[0].clientX : moveEvt.clientX
      const diffX = curX - startX
      const newW = Math.max(120, Math.min(900, initialW + diffX))
      const newH = Math.round((newW * 220) / 320)
      setImages(prev => prev.map(i => i.id === imgId ? { ...i, width: newW, height: newH } : i))
    }

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      setImages(latest => {
        syncLayers(textContent, latest, strokes).then(md => recordHistory(md))
        return latest
      })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
  }

  // Scratchpad-style 15% scaling
  const scaleImage = (imgId, factor) => {
    const updated = images.map(img => {
      if (img.id !== imgId) return img
      const curW = img.width || 320
      const newW = Math.max(120, Math.min(900, Math.round(curW * factor)))
      const newH = Math.round((newW * 220) / 320)
      return { ...img, width: newW, height: newH }
    })
    setImages(updated)
    syncLayers(textContent, updated, strokes).then(md => recordHistory(md))
  }

  // Delete an image
  const deleteImage = (imgId) => {
    const updated = images.filter(i => i.id !== imgId)
    setImages(updated)
    setSelectedImageId(null)
    syncLayers(textContent, updated, strokes).then(md => recordHistory(md))
  }

  // Global Delete / Backspace key to remove selected image
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return
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
  }, [selectedImageId, images, textContent, strokes])

  // Clipboard Paste listener
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

  // File picker image upload
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

  // URL image insert
  const handleInsertImageUrl = (e) => {
    e.preventDefault()
    if (!imageUrl.trim()) return
    addFloatingImage(imageUrl.trim(), imageAlt.trim() || 'Diagram')
    setImageUrl('')
    setImageAlt('')
    setImageUrlInputOpen(false)
  }

  // --- PEN DRAWING LAYER (LAYER 3) ---
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
      const updatedStrokes = [...strokes, newStroke]
      setStrokes(updatedStrokes)
      setCurrentStroke([])
      syncLayers(textContent, images, updatedStrokes).then(md => recordHistory(md))
    }
  }

  const undoLastStroke = () => {
    if (strokes.length > 0) {
      const updated = strokes.slice(0, -1)
      setStrokes(updated)
      syncLayers(textContent, images, updated).then(md => recordHistory(md))
    }
  }

  const clearAllDrawings = () => {
    setStrokes([])
    setCurrentStroke([])
    syncLayers(textContent, images, []).then(md => recordHistory(md))
  }

  // Submit Handler
  const handleSubmit = async () => {
    if (!onSubmit) return
    const finalMd = await syncLayers(textContent, images, strokes)
    if (finalMd && finalMd.trim()) {
      onSubmit(finalMd)
    }
  }

  // Math equations palette for GATE
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

  const insertMathSnippet = (snippet) => {
    insertFormatting(snippet, '', '')
    setShowMathMenu(false)
  }

  const insertTableTemplate = () => {
    const tableTemplate = `\n| Concept / Attribute | Description | Details |\n|---|---|---|\n| State 1 | Description 1 | Valid |\n| State 2 | Description 2 | Checked |\n\n`
    insertFormatting(tableTemplate, '', '')
  }

  const insertBadge = (color, label) => {
    insertFormatting(`[badge:${color}:${label}] `, '', '')
    setShowColorMenu(false)
  }

  const handleInsertLink = (e) => {
    e.preventDefault()
    if (!linkUrl) return
    const text = linkText.trim() || linkUrl.trim()
    insertFormatting(`[${text}](${linkUrl.trim()}) `, '', '')
    setLinkText('')
    setLinkUrl('')
    setLinkInputOpen(false)
  }

  const clearFormatting = () => {
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

  // Word & character counts
  const charCount = textContent.length
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0

  return (
    <div 
      className={`flex flex-col bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm transition-all ${
        isFullscreen ? 'fixed inset-0 z-[200] rounded-none shadow-2xl h-screen' : className
      }`}
    >
      {/* 1. TOOLBAR HEADER (High Z-Index, No Clipping) */}
      <div className="border-b border-border-light dark:border-border-dark bg-slate-50/90 dark:bg-slate-900/80 backdrop-blur-xs select-none relative z-40">
        {/* ROW 1: Action Controls & Tabs */}
        <div className="relative z-30 flex items-center justify-between px-3 py-1.5 border-b border-border-light/60 dark:border-border-dark/60 gap-2">
          {/* Left: Undo, Redo, Link, Table, Math, Badges, Image, DRAW */}
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-350 flex-wrap">
            {/* Undo / Redo */}
            <button
              type="button"
              onClick={() => {
                if (historyIndex > 0) {
                  const prev = history[historyIndex - 1]
                  setHistoryIndex(historyIndex - 1)
                  const p = parseInitialContent(prev)
                  setTextContent(p.text)
                  setImages(p.images)
                  setMergedMarkdown(prev)
                  if (onChange) onChange(prev)
                }
              }}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (historyIndex < history.length - 1) {
                  const next = history[historyIndex + 1]
                  setHistoryIndex(historyIndex + 1)
                  const p = parseInitialContent(next)
                  setTextContent(p.text)
                  setImages(p.images)
                  setMergedMarkdown(next)
                  if (onChange) onChange(next)
                }
              }}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Redo (Ctrl+Shift+Z)"
            >
              <RotateCw size={14} />
            </button>

            <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

            {/* Link Modal Toggle */}
            <button
              type="button"
              onClick={() => { setLinkInputOpen(!linkInputOpen); closeAllMenus() }}
              className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${
                linkInputOpen ? 'text-primary bg-primary/10' : ''
              }`}
              title="Insert Link (Ctrl+K)"
            >
              <Link size={14} />
            </button>

            {/* Table Template */}
            <button
              type="button"
              onClick={insertTableTemplate}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Insert Table"
            >
              <Table size={14} />
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
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-colors ${
                  showMathMenu ? 'bg-primary text-white shadow-xs' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-primary'
                }`}
                title="LaTeX Math & Formula Palette"
              >
                <span>∑ Math</span>
                <ChevronDown size={12} />
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
                className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${
                  showColorMenu ? 'text-primary bg-primary/10' : ''
                }`}
                title="Highlight Badge"
              >
                <Palette size={14} />
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
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                  showImageMenu ? 'bg-primary/10 text-primary' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350'
                }`}
                title="Insert Image (Upload, Paste, or URL)"
              >
                <ImageIcon size={14} className="text-primary" />
                <span className="hidden sm:inline">Image</span>
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
                    <Link size={13} />
                    <span>Insert from Web URL</span>
                  </button>
                  <div className="px-2.5 py-1 text-[10px] text-slate-400 border-t border-border-light dark:border-border-dark pt-1.5">
                    Tip: Press <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Ctrl+V</kbd> to paste screenshots
                  </div>
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={imageFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileImageUpload}
            />

            <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

            {/* SPECIAL BUTTON: "DRAW" MODE (LAYER 3) */}
            <button
              type="button"
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                isDrawingMode
                  ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30 animate-pulse'
                  : 'bg-primary/10 hover:bg-primary/20 text-primary'
              }`}
              title="Toggle Freehand Pen Drawing Layer"
            >
              <PenTool size={13} />
              <span>{isDrawingMode ? 'Drawing Mode ON' : 'Draw'}</span>
            </button>
          </div>

          {/* Right: Mode Switchers (Write, Preview, Split), Height Expander, Fullscreen */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Tabs */}
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'write'
                    ? 'bg-card-light dark:bg-card-dark text-primary shadow-xs font-bold'
                    : 'hover:text-slate-850 dark:hover:text-slate-100'
                }`}
              >
                <Edit2 size={12} />
                <span>Write</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  syncLayers(textContent, images, strokes)
                  setActiveTab('preview')
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'preview'
                    ? 'bg-card-light dark:bg-card-dark text-primary shadow-xs font-bold'
                    : 'hover:text-slate-850 dark:hover:text-slate-100'
                }`}
              >
                <Eye size={12} />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  syncLayers(textContent, images, strokes)
                  setActiveTab('split')
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'split'
                    ? 'bg-card-light dark:bg-card-dark text-primary shadow-xs font-bold'
                    : 'hover:text-slate-850 dark:hover:text-slate-100'
                }`}
                title="Side-by-side Live Preview"
              >
                <span>Split</span>
              </button>
            </div>

            {/* Expand / Collapse Height Toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${
                isExpanded ? 'text-primary bg-primary/10' : 'text-slate-500'
              }`}
              title={isExpanded ? 'Collapse Height' : 'Expand Editor Height'}
            >
              <ChevronsUpDown size={13} />
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>

        {/* ROW 2: Formatting Buttons (relative z-20 so Row 1 dropdowns paint over it) */}
        <div className="relative z-20 flex flex-wrap items-center px-2.5 py-1 text-slate-700 dark:text-slate-350 text-xs gap-0.5">
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
              className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-medium"
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
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-bold"
            title="Bold (Ctrl+B)"
          >
            <Bold size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('*', '*', 'italic text')}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded italic"
            title="Italic (Ctrl+I)"
          >
            <Italic size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('~~', '~~', 'strikethrough text')}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
            title="Strikethrough"
          >
            <Strikethrough size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertFormatting('`', '`', 'code')}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-mono"
            title="Inline Code"
          >
            <Code size={13} />
          </button>

          <span className="w-px h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Lists & Quotes */}
          <button
            type="button"
            onClick={() => insertLinePrefix('- ')}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
            title="Bulleted List"
          >
            <List size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('1. ')}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
            title="Numbered List"
          >
            <ListOrdered size={13} />
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('> ')}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
            title="Blockquote"
          >
            <Quote size={13} />
          </button>

          <span className="w-px h-3.5 bg-slate-300 dark:bg-slate-700 mx-0.5" />

          {/* Clear Formatting */}
          <button
            type="button"
            onClick={clearFormatting}
            className="px-1.5 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-[11px] font-mono text-slate-500"
            title="Clear Formatting"
          >
            Tx
          </button>
        </div>

        {/* SUB-BAR: DRAWING CONTROLS (WHEN DRAW MODE IS ACTIVE) */}
        {isDrawingMode && (
          <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/40 border-t border-primary/20 text-xs animate-in fade-in gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Pen / Eraser Mode */}
              <div className="flex items-center bg-white dark:bg-slate-900 border border-primary/30 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setIsEraser(false)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                    !isEraser ? 'bg-primary text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <PenTool size={11} />
                  <span>Pen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEraser(true)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                    isEraser ? 'bg-primary text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Eraser size={11} />
                  <span>Eraser</span>
                </button>
              </div>

              {/* Color Palette */}
              {!isEraser && (
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-primary/20 rounded-lg px-2 py-1">
                  {[
                    { color: '#6366f1', label: 'Indigo' },
                    { color: '#0f172a', label: 'Dark' },
                    { color: '#10b981', label: 'Emerald' },
                    { color: '#14b8a6', label: 'Teal' },
                    { color: '#f59e0b', label: 'Amber' },
                    { color: '#f43f5e', label: 'Rose' },
                    { color: '#a855f7', label: 'Purple' }
                  ].map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setPenColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`h-4 w-4 rounded-full transition-transform ${
                        penColor === c.color ? 'scale-125 ring-2 ring-primary ring-offset-1 dark:ring-offset-slate-900' : 'hover:scale-110'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              )}

              {/* Pen Size */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-primary/20 rounded-lg px-2 py-0.5">
                {[
                  { size: 2, label: 'Fine' },
                  { size: 4, label: 'Med' },
                  { size: 7, label: 'Bold' }
                ].map(s => (
                  <button
                    key={s.size}
                    type="button"
                    onClick={() => setPenSize(s.size)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      penSize === s.size ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Undo & Clear */}
              <button
                type="button"
                onClick={undoLastStroke}
                disabled={strokes.length === 0}
                className="p-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] flex items-center gap-1"
                title="Undo Stroke"
              >
                <Undo2 size={12} />
              </button>

              <button
                type="button"
                onClick={clearAllDrawings}
                disabled={strokes.length === 0}
                className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[11px] font-medium"
                title="Clear All Drawings"
              >
                Clear Ink
              </button>
            </div>

            {/* Done Drawing Button */}
            <button
              type="button"
              onClick={() => setIsDrawingMode(false)}
              className="flex items-center gap-1 px-3 py-1 rounded-btn bg-primary text-white font-bold text-xs hover:bg-primary-hover shadow-xs active:scale-95 transition-all"
            >
              <Check size={12} />
              <span>Done Drawing</span>
            </button>
          </div>
        )}

        {/* Link Input Floating Dialog */}
        {linkInputOpen && (
          <form onSubmit={handleInsertLink} className="flex items-center gap-2 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 border-t border-border-light dark:border-border-dark text-xs animate-in fade-in">
            <input
              type="text"
              placeholder="Display text (e.g., Gate Overflow proof)"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="flex-1 h-7 px-2.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs focus:outline-none focus:border-primary"
            />
            <input
              type="url"
              placeholder="Link URL (https://...)"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              required
              className="flex-1 h-7 px-2.5 rounded bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark text-xs focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="h-7 px-3 bg-primary text-white font-semibold rounded text-xs hover:bg-primary-hover"
            >
              Insert
            </button>
            <button
              type="button"
              onClick={() => setLinkInputOpen(false)}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
            >
              <X size={13} />
            </button>
          </form>
        )}

        {/* Image URL Floating Dialog */}
        {imageUrlInputOpen && (
          <form onSubmit={handleInsertImageUrl} className="flex items-center gap-2 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 border-t border-border-light dark:border-border-dark text-xs animate-in fade-in">
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
      </div>

      {/* 2. MAIN LAYERED EDITOR CANVAS WORKSPACE */}
      <div 
        style={{ height: activeHeight }}
        className="flex-1 flex overflow-hidden relative transition-all duration-200 min-h-[160px]"
      >
        {/* EDIT PANE (LAYERS 1, 2, & 3) */}
        {(activeTab === 'write' || activeTab === 'split') && (
          <div 
            ref={containerRef}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedImageId(null)
              }
            }}
            className={`flex-1 relative flex flex-col h-full overflow-hidden bg-card-light dark:bg-card-dark ${
              activeTab === 'split' ? 'border-r border-border-light dark:border-border-dark' : ''
            }`}
          >
            {/* LAYER 1: UNIFIED TEXT EDITING AREA (Expansive Full Workspace) */}
            <textarea
              ref={textareaRef}
              value={textContent}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder}
              className={`w-full flex-1 p-4 bg-transparent resize-none focus:outline-none text-slate-800 dark:text-slate-100 font-sans leading-relaxed custom-scrollbar placeholder:text-slate-400 dark:placeholder:text-slate-600 z-0 ${
                mode === 'full' ? 'text-sm md:text-base' : 'text-xs md:text-sm'
              }`}
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
              className={`absolute inset-0 w-full h-full ${
                isDrawingMode 
                  ? 'pointer-events-auto cursor-crosshair z-20' 
                  : 'pointer-events-none z-10'
              }`}
            />

            {/* LAYER 3: FREEFORM FLOATING IMAGES (DRAGGABLE ANYWHERE) */}
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
                  {/* Scratchpad-Style Floating Action Badge on Selected Image */}
                  {isSelected && (
                    <div 
                      className="absolute -top-11 left-0 flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-primary/40 shadow-xl rounded-btn text-xs px-2 py-1 gap-1.5 z-40 animate-in fade-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Drag to Move Handle */}
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

                      {/* Scale Down (-) / Scale Up (+) */}
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

                      {/* Enlarge Lightbox */}
                      <button
                        type="button"
                        onClick={() => setEnlargedImageSrc(img.src)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-primary transition-colors"
                        title="Enlarge Image"
                      >
                        <ZoomIn size={12} />
                      </button>

                      {/* Delete Button (Scratchpad-style red button) */}
                      <button
                        type="button"
                        onClick={() => deleteImage(img.id)}
                        className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded text-xs font-bold transition-all flex items-center gap-1"
                        title="Delete image (or press Delete / Backspace)"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>

                      {/* Deselect */}
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

                  {/* The Image Itself */}
                  <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-border-light dark:border-border-dark cursor-move">
                    <img 
                      src={img.src} 
                      alt={img.alt} 
                      draggable={false}
                      onMouseDown={(e) => handleImageDragStart(e, img.id)}
                      onTouchStart={(e) => handleImageDragStart(e, img.id)}
                      className="w-full h-auto object-contain rounded-xl max-h-[460px] pointer-events-auto"
                    />

                    {/* Caption */}
                    {img.alt && (
                      <div className="absolute bottom-1.5 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[10px] rounded pointer-events-none font-medium">
                        {img.alt}
                      </div>
                    )}

                    {/* Bottom-Right Corner Resize Handle */}
                    {isSelected && (
                      <div 
                        onMouseDown={(e) => handleCornerResize(e, img.id)}
                        onTouchStart={(e) => handleCornerResize(e, img.id)}
                        className="absolute bottom-1 right-1 h-5 w-5 bg-primary text-white rounded-br-lg flex items-center justify-center cursor-nwse-resize shadow-md hover:scale-110 active:scale-95 transition-all z-40"
                        title="Drag corner to resize image"
                      >
                        <ChevronsUpDown size={12} className="rotate-45" />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* PREVIEW PANE */}
        {(activeTab === 'preview' || activeTab === 'split') && (
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/30">
            {mergedMarkdown.trim() ? (
              <FormattedContent content={mergedMarkdown} />
            ) : (
              <div className="text-slate-400 dark:text-slate-500 text-xs italic">
                Live formatting preview will appear here as you write text, equations, and add diagrams...
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. FOOTER ACTION BAR */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border-light dark:border-border-dark bg-slate-50/80 dark:bg-slate-900/60 rounded-b-xl text-xs">
        {/* Word / Char Count */}
        <div className="flex items-center gap-2.5 text-slate-400 text-[11px] font-medium">
          <span>{charCount} chars</span>
          <span>•</span>
          <span>{wordCount} words</span>
          {images.length > 0 && (
            <>
              <span>•</span>
              <span className="text-primary font-semibold">{images.length} image{images.length > 1 ? 's' : ''}</span>
            </>
          )}
          {strokes.length > 0 && (
            <>
              <span>•</span>
              <span className="text-emerald-500 font-semibold">{strokes.length} sketch strokes</span>
            </>
          )}
          <span className="hidden sm:inline text-slate-400 ml-1">
            (Press <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-[10px]">Ctrl+Enter</kbd> to submit)
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg border border-border-light dark:border-border-dark text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}

          {onSubmit && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!textContent.trim() && images.length === 0 && strokes.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all"
            >
              {submitIcon && React.createElement(submitIcon, { size: 14 })}
              <span>{submitLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. LIGHTBOX MODAL FOR ENLARGING IMAGES */}
      {enlargedImageSrc && (
        <div
          className="fixed inset-0 z-[350] bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in select-none"
          onClick={() => setEnlargedImageSrc(null)}
        >
          <div
            className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/90 border border-slate-700 text-white px-3 py-1.5 rounded-lg shadow-2xl z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors text-xs flex items-center gap-1"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors text-xs flex items-center gap-1"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="px-2 py-1 hover:bg-slate-800 rounded transition-colors text-xs font-mono"
              title="Reset Zoom"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <span className="w-px h-4 bg-slate-700" />
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors text-xs"
              title="100%"
            >
              100%
            </button>
            <button
              type="button"
              onClick={() => setEnlargedImageSrc(null)}
              className="p-1.5 hover:bg-rose-600 rounded transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div
            className="max-w-[90vw] max-h-[85vh] overflow-auto flex items-center justify-center cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={enlargedImageSrc}
              alt="Enlarged preview"
              style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
              className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl origin-center"
            />
          </div>
        </div>
      )}
    </div>
  )
}
