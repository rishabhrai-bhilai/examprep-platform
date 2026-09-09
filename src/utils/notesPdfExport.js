import { jsPDF } from 'jspdf'
import { PDFDocument } from 'pdf-lib'

/**
 * Convert base64 data URL to Uint8Array for pdf-lib processing
 */
function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  const binaryString = window.atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * Trigger browser file download from Uint8Array bytes
 */
function downloadBlob(bytes, filename, mimeType = 'application/pdf') {
  const blob = new Blob([bytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Render vector strokes or an image onto an offscreen canvas to produce a high-res image data URL.
 */
export const renderSheetToDataUrl = (strokes = [], width = 900, height = 600) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    // Clean white paper background for crisp PDF output
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Engineering dot grid subtle dots
    ctx.fillStyle = 'rgba(203, 213, 225, 0.45)'
    const gridSpacing = 30
    for (let x = 0; x < width; x += gridSpacing) {
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (!strokes || strokes.length === 0) {
      resolve(canvas.toDataURL('image/jpeg', 0.92))
      return
    }

    // Load any image strokes first
    const imageStrokes = strokes.filter(s => s.type === 'image')
    let imagesToLoad = imageStrokes.length
    const imageElements = new Map()

    const proceedDrawing = () => {
      strokes.forEach(stroke => {
        if (stroke.type === 'text') {
          let textColor = stroke.color
          if (textColor === '#f8fafc' || textColor === '#ffffff' || textColor === 'default') {
            textColor = '#0f172a'
          }
          ctx.fillStyle = textColor
          ctx.font = `bold ${stroke.size * 3 + 10}px Inter, sans-serif`
          ctx.textBaseline = 'middle'
          ctx.fillText(stroke.text, stroke.x, stroke.y)
          return
        }

        if (stroke.type === 'image') {
          const img = imageElements.get(stroke.imgData)
          if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, stroke.x, stroke.y, stroke.width, stroke.height)
          }
          return
        }

        const pts = stroke.points
        if (!pts || pts.length === 0) return

        ctx.beginPath()
        let strokeColor = stroke.color
        if (strokeColor === 'eraser') {
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = stroke.size
        } else {
          if (strokeColor === '#f8fafc' || strokeColor === '#ffffff' || strokeColor === 'default') {
            strokeColor = '#0f172a'
          }
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = stroke.size
        }
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

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

      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }

    if (imagesToLoad === 0) {
      proceedDrawing()
    } else {
      imageStrokes.forEach(s => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          imageElements.set(s.imgData, img)
          imagesToLoad--
          if (imagesToLoad <= 0) proceedDrawing()
        }
        img.onerror = () => {
          imagesToLoad--
          if (imagesToLoad <= 0) proceedDrawing()
        }
        img.src = s.imgData
      })
    }
  })
}

/**
 * Load image URL to data URL
 */
const loadImageToDataUrl = (src) => {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null)
      return
    }
    if (src.startsWith('data:')) {
      resolve(src)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth || 600
      c.height = img.naturalHeight || 400
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(c.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/**
 * Helper to add header banner to a question page
 */
const renderQuestionHeader = (doc, question, startY = 16) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const contentWidth = pageWidth - margin * 2

  // Background Header Card
  doc.setFillColor(243, 244, 246) // slate-100
  doc.roundedRect(margin, startY, contentWidth, 18, 2, 2, 'F')

  // Accent vertical stripe
  doc.setFillColor(79, 70, 229) // Indigo-600
  doc.rect(margin, startY, 3.5, 18, 'F')

  // Question Title & Meta
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text(`Question #${question.id}  •  ${question.subject}`, margin + 8, startY + 7)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text(`Topic: ${question.topic}   |   Year: ${question.year}   |   ${question.type} (${question.marks} Mark${question.marks > 1 ? 's' : ''})   |   ${question.difficulty}`, margin + 8, startY + 13)

  return startY + 24
}

/**
 * Helper to add question statement, diagram, options, and explanation
 */
const renderQuestionBody = async (doc, question, startY) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  let curY = startY

  // Question Text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  doc.text('QUESTION STATEMENT:', margin, curY)
  curY += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42)
  const questionLines = doc.splitTextToSize(question.question || '', contentWidth)
  doc.text(questionLines, margin, curY)
  curY += questionLines.length * 4.5 + 4

  // Question Diagram (if present)
  const diagramSrc = question.imageUrl || question.diagramUrl || question.image
  if (diagramSrc) {
    const diagDataUrl = await loadImageToDataUrl(diagramSrc)
    if (diagDataUrl) {
      if (curY + 65 > pageHeight - 20) {
        doc.addPage()
        curY = 18
      }
      const imgWidth = Math.min(130, contentWidth)
      const imgHeight = 60
      doc.setDrawColor(226, 232, 240)
      doc.rect(margin, curY, imgWidth, imgHeight)
      try {
        doc.addImage(diagDataUrl, 'JPEG', margin + 1, curY + 1, imgWidth - 2, imgHeight - 2)
      } catch {
        // Continue if image format parsing fails
      }
      curY += imgHeight + 6
    }
  }

  // Options (for MCQ / MSQ)
  if (question.options && question.options.length > 0) {
    if (curY + question.options.length * 7 > pageHeight - 20) {
      doc.addPage()
      curY = 18
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105)
    doc.text('OPTIONS:', margin, curY)
    curY += 4.5

    question.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx)
      const isCorrect = Array.isArray(question.answer)
        ? question.answer.includes(idx)
        : question.answer === idx

      doc.setFont('helvetica', isCorrect ? 'bold' : 'normal')
      doc.setTextColor(isCorrect ? 16 : 71, isCorrect ? 185 : 85, isCorrect ? 129 : 105)
      const optText = `${letter}.  ${opt} ${isCorrect ? '  [✓ Correct Answer]' : ''}`
      const optLines = doc.splitTextToSize(optText, contentWidth - 4)
      doc.text(optLines, margin + 2, curY)
      curY += optLines.length * 4.2 + 1
    })
    curY += 3
  } else if (question.type === 'NAT') {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(16, 185, 129)
    doc.text(`CORRECT KEY: ${question.answer}`, margin, curY)
    curY += 7
  }

  // Explanation box
  if (question.explanation) {
    const expLines = doc.splitTextToSize(`Explanation: ${question.explanation}`, contentWidth - 8)
    const boxHeight = expLines.length * 4 + 6

    if (curY + boxHeight > pageHeight - 20) {
      doc.addPage()
      curY = 18
    }

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(margin, curY, contentWidth, boxHeight, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.text(expLines, margin + 4, curY + 5)
    curY += boxHeight + 6
  }

  return curY
}

/**
 * Helper to add Scratchpad sheets and attached image references
 */
const renderNoteSheetsAndImages = async (doc, note, startY) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  let curY = startY

  // Normalize sheets
  let sheets = []
  if (note.sheets && note.sheets.length > 0) {
    sheets = note.sheets
  } else if (note.strokes && note.strokes.length > 0) {
    sheets = [{ id: 'sheet-1', title: 'Sheet 1', strokes: note.strokes }]
  } else if (note.data && note.type === 'canvas') {
    sheets = [{ id: 'sheet-1', title: 'Sheet 1', strokes: [], dataUrl: note.data }]
  }

  // Render Scratchpad Sheets
  if (sheets.length > 0) {
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i]
      
      if (curY + 115 > pageHeight - 20) {
        doc.addPage()
        curY = 18
      }

      // Sheet Header Badge
      doc.setFillColor(238, 242, 255) // Indigo-50
      doc.roundedRect(margin, curY, contentWidth, 7, 1, 1, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(79, 70, 229)
      doc.text(`SCRATCHPAD NOTE — ${sheet.title.toUpperCase()} (${i + 1} of ${sheets.length})`, margin + 4, curY + 5)
      curY += 10

      // Render sheet image
      let sheetDataUrl = sheet.dataUrl
      if (!sheetDataUrl && sheet.strokes) {
        sheetDataUrl = await renderSheetToDataUrl(sheet.strokes, 900, 560)
      }

      if (sheetDataUrl) {
        const imgWidth = contentWidth
        const imgHeight = 105
        doc.setDrawColor(203, 213, 225)
        doc.rect(margin, curY, imgWidth, imgHeight)
        try {
          doc.addImage(sheetDataUrl, 'JPEG', margin + 0.5, curY + 0.5, imgWidth - 1, imgHeight - 1)
        } catch {
          // Gracefully continue
        }
        curY += imgHeight + 8
      }
    }
  }

  // Render Attached Images
  const imageAttachments = (note.attachments || []).filter(a => a.type === 'image' && a.data)
  if (imageAttachments.length > 0) {
    if (curY + 30 > pageHeight - 20) {
      doc.addPage()
      curY = 18
    }

    doc.setFillColor(243, 244, 246)
    doc.roundedRect(margin, curY, contentWidth, 7, 1, 1, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(51, 65, 85)
    doc.text(`ATTACHED REFERENCE IMAGES (${imageAttachments.length})`, margin + 4, curY + 5)
    curY += 11

    for (const att of imageAttachments) {
      if (curY + 95 > pageHeight - 20) {
        doc.addPage()
        curY = 18
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text(`Image: ${att.name} (${att.size || ''})`, margin, curY)
      curY += 4

      const imgWidth = contentWidth
      const imgHeight = 85
      doc.setDrawColor(203, 213, 225)
      doc.rect(margin, curY, imgWidth, imgHeight)
      try {
        doc.addImage(att.data, 'JPEG', margin + 0.5, curY + 0.5, imgWidth - 1, imgHeight - 1)
      } catch {
        // Gracefully continue
      }
      curY += imgHeight + 6
    }
  }

  return curY
}

/**
 * Merge attached PDF files directly into the generated PDFDocument
 */
const mergePdfAttachments = async (basePdfArrayBuffer, attachments = []) => {
  const pdfAttachments = attachments.filter(a => a.type === 'pdf' && a.data)
  if (pdfAttachments.length === 0) {
    return new Uint8Array(basePdfArrayBuffer)
  }

  try {
    const mainPdfDoc = await PDFDocument.load(basePdfArrayBuffer)

    for (const att of pdfAttachments) {
      try {
        const attBytes = dataUrlToUint8Array(att.data)
        const attPdfDoc = await PDFDocument.load(attBytes)
        const pageIndices = attPdfDoc.getPageIndices()
        const copiedPages = await mainPdfDoc.copyPages(attPdfDoc, pageIndices)
        
        copiedPages.forEach(copiedPage => {
          mainPdfDoc.addPage(copiedPage)
        })
      } catch (err) {
        console.warn(`Could not merge attached PDF "${att.name}":`, err)
      }
    }

    return await mainPdfDoc.save()
  } catch (err) {
    console.warn('Error during PDF merging, returning base document:', err)
    return new Uint8Array(basePdfArrayBuffer)
  }
}

/**
 * Add footer with page numbers
 */
const addPageNumbers = (doc) => {
  const totalPages = doc.internal.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text('GATE Exam Preparation Platform • Practice Scratchpad Revision Notes', 14, pageHeight - 8)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 26, pageHeight - 8)
  }
}

/**
 * EXPORT 1: Export a Single Question Note as PDF (with full attached PDFs merged!)
 */
export const exportQuestionNotePdf = async (question, note) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let y = renderQuestionHeader(doc, question, 16)
  y = await renderQuestionBody(doc, question, y)
  await renderNoteSheetsAndImages(doc, note, y)

  addPageNumbers(doc)

  const basePdfArrayBuffer = doc.output('arraybuffer')

  // Merge actual pages of any attached PDF documents
  const finalPdfBytes = await mergePdfAttachments(basePdfArrayBuffer, note.attachments || [])

  const safeFilename = `GATE-Q${question.id}-${question.subject}-${question.topic}-Notes.pdf`
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '-')

  downloadBlob(finalPdfBytes, safeFilename)
}

/**
 * EXPORT 2: Export Multiple or All Question Notes as a Unified PDF Document
 */
export const exportBulkNotesPdf = async (questionsList = [], questionNotesMap = {}, documentTitle = 'GATE-ExamPrep-All-Notes.pdf') => {
  if (questionsList.length === 0) return

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // --- COVER PAGE ---
  doc.setFillColor(79, 70, 229) // Indigo-600
  doc.rect(0, 0, pageWidth, 45, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('GATE EXAM REVISION NOTES', 16, 24)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(224, 231, 255)
  doc.text(`Comprehensive compilation of ${questionsList.length} question note${questionsList.length > 1 ? 's' : ''} with scratchpad sketches`, 16, 34)

  let coverY = 56
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text('TABLE OF CONTENTS', 16, coverY)
  coverY += 8

  questionsList.forEach((q, idx) => {
    if (coverY > pageHeight - 20) return
    const note = questionNotesMap[q.id] || {}
    const sheetsCount = (note.sheets && note.sheets.length) || (note.strokes ? 1 : 0)
    const attsCount = (note.attachments && note.attachments.length) || (note.type === 'pdf' ? 1 : 0)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(51, 65, 85)
    doc.text(`${idx + 1}.  Q#${q.id}  [${q.subject}]  —  ${q.topic} (${q.year})`, 16, coverY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text(`${sheetsCount} Sheet${sheetsCount !== 1 ? 's' : ''} • ${attsCount} File${attsCount !== 1 ? 's' : ''}`, pageWidth - 45, coverY)

    coverY += 6.5
  })

  // Date of generation
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text(`Generated on ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`, 16, pageHeight - 12)

  // Collect all PDF attachments across all questions for merging
  const allPdfAttachments = []

  // --- QUESTION PAGES ---
  for (let i = 0; i < questionsList.length; i++) {
    const question = questionsList[i]
    const note = questionNotesMap[question.id]

    doc.addPage()
    let y = renderQuestionHeader(doc, question, 16)
    y = await renderQuestionBody(doc, question, y)
    if (note) {
      await renderNoteSheetsAndImages(doc, note, y)
      if (note.attachments) {
        allPdfAttachments.push(...note.attachments.filter(a => a.type === 'pdf' && a.data))
      }
    }
  }

  addPageNumbers(doc)

  const basePdfArrayBuffer = doc.output('arraybuffer')

  // Merge actual pages of any attached PDF documents
  const finalPdfBytes = await mergePdfAttachments(basePdfArrayBuffer, allPdfAttachments)

  downloadBlob(finalPdfBytes, documentTitle)
}
