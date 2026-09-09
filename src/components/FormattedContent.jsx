import React, { useState } from 'react'
import { 
  Copy, Check, ZoomIn, ZoomOut, Maximize2, Minimize2, X, 
  Trash2, AlignLeft, AlignCenter, AlignRight, Download 
} from 'lucide-react'

// Simple helper to format math symbols to clean Unicode math or styled formulas
function formatMathString(mathStr) {
  return mathStr
    .replace(/\\sum/g, '∑')
    .replace(/\\int/g, '∫')
    .replace(/\\prod/g, '∏')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sqrt/g, '√')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\neq/g, '≠')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\approx/g, '≈')
    .replace(/\\in/g, '∈')
    .replace(/\\notin/g, '∉')
    .replace(/\\subset/g, '⊂')
    .replace(/\\subseteq/g, '⊆')
    .replace(/\\cup/g, '∪')
    .replace(/\\cap/g, '∩')
    .replace(/\\emptyset/g, '∅')
    .replace(/\\forall/g, '∀')
    .replace(/\\exists/g, '∃')
    .replace(/\\to/g, '→')
    .replace(/\\implies/g, '⟹')
    .replace(/\\iff/g, '⟺')
    .replace(/\\Theta/g, 'Θ')
    .replace(/\\Omega/g, 'Ω')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\pi/g, 'π')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\phi/g, 'φ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\infty/g, '∞')
    .replace(/\^\{([^}]+)\}/g, '^($1)')
    .replace(/\_\{([^}]+)\}/g, '_($1)')
}

function ImageRenderer({ rawToken, rawAlt = '', src, onImageAction }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Parse options: "Alt label|align:center|size:medium"
  const parts = (rawAlt || '').split('|')
  const captionCandidate = (parts[0] || '').trim()
  const isGeneric = !captionCandidate || ['image', 'diagram', 'solution diagram & notes', 'pasted screenshot'].includes(captionCandidate.toLowerCase())
  const cleanAlt = isGeneric ? '' : captionCandidate

  let align = 'center'
  let size = 'medium'
  let customWidth = null

  parts.slice(1).forEach(opt => {
    const trimmed = opt.trim()
    if (trimmed.startsWith('align:')) align = trimmed.replace('align:', '').trim()
    if (trimmed.startsWith('size:')) size = trimmed.replace('size:', '').trim()
    if (trimmed.startsWith('w:')) {
      const parsed = parseInt(trimmed.replace('w:', '').trim(), 10)
      if (!isNaN(parsed) && parsed > 50) customWidth = parsed
    }
  })

  const alignContainerClasses = {
    left: 'justify-start text-left',
    center: 'justify-center text-center mx-auto',
    right: 'justify-end text-right ml-auto'
  }[align] || 'justify-center text-center mx-auto'

  const handleUpdate = (newAlign, newSize) => {
    if (!onImageAction) return
    const effAlign = newAlign !== undefined ? newAlign : align
    const effSize = newSize !== undefined ? newSize : size
    const nextAlt = `${cleanAlt}|align:${effAlign}|size:${effSize}`
    const nextToken = `![${nextAlt}](${src})`
    onImageAction({ action: 'replace', oldToken: rawToken, newToken: nextToken })
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    if (onImageAction) {
      onImageAction({ action: 'delete', oldToken: rawToken })
    }
  }

  return (
    <div className={`my-2 flex ${alignContainerClasses} group/img relative select-none w-full`}>
      <div 
        style={customWidth ? { width: `${customWidth}px`, maxWidth: '100%' } : { maxWidth: '100%' }}
        className="relative rounded-xl border border-border-light/70 dark:border-border-dark/70 overflow-hidden shadow-xs transition-all inline-block bg-transparent"
      >
        {/* Floating Action Controls on Hover */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/75 backdrop-blur-xs text-white p-1 rounded-md opacity-0 group-hover/img:opacity-100 transition-opacity z-10 text-xs shadow-lg">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(true) }}
            className="p-1 hover:bg-white/25 rounded transition-colors text-white"
            title="Enlarge Image (Zoom)"
          >
            <ZoomIn size={13} />
          </button>
          {onImageAction && (
            <>
              <span className="w-px h-3 bg-white/30 mx-0.5" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleUpdate('left') }}
                className={`p-1 hover:bg-white/25 rounded transition-colors ${align === 'left' ? 'text-primary font-black bg-white/30' : 'text-white'}`}
                title="Align Left"
              >
                <AlignLeft size={13} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleUpdate('center') }}
                className={`p-1 hover:bg-white/25 rounded transition-colors ${align === 'center' ? 'text-primary font-black bg-white/30' : 'text-white'}`}
                title="Align Center"
              >
                <AlignCenter size={13} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleUpdate('right') }}
                className={`p-1 hover:bg-white/25 rounded transition-colors ${align === 'right' ? 'text-primary font-black bg-white/30' : 'text-white'}`}
                title="Align Right"
              >
                <AlignRight size={13} />
              </button>
              <span className="w-px h-3 bg-white/30 mx-0.5" />
              <button
                type="button"
                onClick={handleDelete}
                className="p-1 hover:bg-rose-600 rounded transition-colors text-rose-300 hover:text-white"
                title="Delete Image"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>

        {/* The Image */}
        <img
          src={src}
          alt={cleanAlt}
          onClick={() => setLightboxOpen(true)}
          className="max-w-full h-auto object-contain cursor-zoom-in block mx-auto rounded-xl hover:opacity-95 transition-opacity"
          loading="lazy"
        />

        {/* Caption only if user provided an actual custom caption */}
        {cleanAlt && (
          <div className="p-1.5 text-center text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900/80 border-t border-border-light dark:border-border-dark truncate">
            {cleanAlt}
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in select-none"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Lightbox Toolbar */}
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
              onClick={() => setLightboxOpen(false)}
              className="p-1.5 hover:bg-rose-600 rounded transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Lightbox Image Container */}
          <div
            className="max-w-[90vw] max-h-[85vh] overflow-auto flex items-center justify-center cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={cleanAlt}
              style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
              className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl origin-center"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function renderInlineFormatting(text, onImageAction) {
  if (!text) return null

  // Split by inline math: $...$
  const parts = text.split(/(\$[^$]+\$)/g)

  return parts.map((part, idx) => {
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      const mathContent = part.slice(1, -1)
      return (
        <span
          key={idx}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded font-mono text-[0.88em] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40 font-semibold select-all"
        >
          {formatMathString(mathContent)}
        </span>
      )
    }

    // Process bold, italic, inline code, strikethrough, links, badges, images
    return renderMarkdownTokens(part, `inline-${idx}`, onImageAction)
  })
}

function renderMarkdownTokens(str, keyPrefix, onImageAction) {
  // CRITICAL: Inner groups are non-capturing (?:...) to prevent leak of duplicate text in split chunks
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[badge:[a-z]+:[^\]]+\]|!\[(?:[^\]]*)\]\((?:[^)]+)\)|\[(?:[^\]]+)\]\((?:[^)]+)\))/g
  const chunks = str.split(tokenRegex)

  const elements = []
  let i = 0
  while (i < chunks.length) {
    const chunk = chunks[i]
    if (!chunk) {
      i++
      continue
    }

    if (chunk.startsWith('`') && chunk.endsWith('`')) {
      elements.push(
        <code
          key={`${keyPrefix}-${i}`}
          className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 font-mono text-[0.85em] text-pink-600 dark:text-pink-400 border border-slate-300/60 dark:border-slate-700"
        >
          {chunk.slice(1, -1)}
        </code>
      )
    } else if (chunk.startsWith('**') && chunk.endsWith('**')) {
      elements.push(
        <strong key={`${keyPrefix}-${i}`} className="font-extrabold text-slate-900 dark:text-slate-100">
          {chunk.slice(2, -2)}
        </strong>
      )
    } else if (chunk.startsWith('*') && chunk.endsWith('*')) {
      elements.push(
        <em key={`${keyPrefix}-${i}`} className="italic">
          {chunk.slice(1, -1)}
        </em>
      )
    } else if (chunk.startsWith('~~') && chunk.endsWith('~~')) {
      elements.push(
        <span key={`${keyPrefix}-${i}`} className="line-through text-slate-400">
          {chunk.slice(2, -2)}
        </span>
      )
    } else if (chunk.startsWith('[badge:')) {
      const badgeMatch = chunk.match(/\[badge:([a-z]+):([^\]]+)\]/)
      if (badgeMatch) {
        const color = badgeMatch[1]
        const label = badgeMatch[2]
        const colorClasses = {
          blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        }[color] || 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'

        elements.push(
          <span
            key={`${keyPrefix}-${i}`}
            className={`inline-block px-2 py-0.5 mx-1 rounded text-[0.8em] font-bold uppercase tracking-wider border ${colorClasses}`}
          >
            {label}
          </span>
        )
      }
    } else if (chunk.startsWith('![') && chunk.includes('](')) {
      const imgMatch = chunk.match(/^!\[(.*?)\]\((.*?)\)$/)
      if (imgMatch) {
        elements.push(
          <ImageRenderer
            key={`${keyPrefix}-${i}`}
            rawToken={chunk}
            rawAlt={imgMatch[1]}
            src={imgMatch[2]}
            onImageAction={onImageAction}
          />
        )
      }
    } else if (chunk.startsWith('[') && chunk.includes('](')) {
      const linkMatch = chunk.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        elements.push(
          <a
            key={`${keyPrefix}-${i}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-semibold"
          >
            {linkMatch[1]}
          </a>
        )
      }
    } else {
      elements.push(<React.Fragment key={`${keyPrefix}-${i}`}>{chunk}</React.Fragment>)
    }
    i++
  }

  return elements
}

function CodeBlockRenderer({ code, language }) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-slate-750 bg-slate-900 text-slate-100 text-xs font-mono shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400">
        <span className="font-semibold uppercase tracking-wider">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400 text-[10px]">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto custom-scrollbar leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function TableRenderer({ lines }) {
  if (lines.length < 2) return null

  const parseRow = (line) => {
    return line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim())
  }

  const header = parseRow(lines[0])
  const rows = lines.slice(2).map(parseRow)

  return (
    <div className="my-3 overflow-x-auto rounded border border-border-light dark:border-border-dark shadow-xs">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-slate-100 dark:bg-slate-800 text-text-primary-light dark:text-text-primary-dark font-bold border-b border-border-light dark:border-border-dark">
          <tr>
            {header.map((h, i) => (
              <th key={i} className="p-2 border-r last:border-r-0 border-border-light dark:border-border-dark">
                {renderInlineFormatting(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light dark:divide-border-dark bg-card-light dark:bg-card-dark">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="p-2 border-r last:border-r-0 border-border-light dark:border-border-dark text-slate-700 dark:text-slate-300">
                  {renderInlineFormatting(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function FormattedContent({ content, className = '', onImageAction = null }) {
  if (!content) return null

  const rawLines = content.split('\n')
  const blocks = []
  let currentBlock = []
  let inCodeBlock = false
  let codeLanguage = ''
  let codeBuffer = []
  let inTable = false
  let tableBuffer = []

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx]

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({
          type: 'code',
          language: codeLanguage,
          code: codeBuffer.join('\n')
        })
        inCodeBlock = false
        codeBuffer = []
        codeLanguage = ''
      } else {
        if (currentBlock.length > 0) {
          blocks.push({ type: 'paragraph', lines: [...currentBlock] })
          currentBlock = []
        }
        inCodeBlock = true
        codeLanguage = line.trim().slice(3).trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(line)
      continue
    }

    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!inTable) {
        if (currentBlock.length > 0) {
          blocks.push({ type: 'paragraph', lines: [...currentBlock] })
          currentBlock = []
        }
        inTable = true
      }
      tableBuffer.push(line)
      continue
    } else if (inTable) {
      blocks.push({ type: 'table', lines: [...tableBuffer] })
      inTable = false
      tableBuffer = []
    }

    if (line.trim().startsWith('$$') && line.trim().endsWith('$$') && line.trim().length > 4) {
      if (currentBlock.length > 0) {
        blocks.push({ type: 'paragraph', lines: [...currentBlock] })
        currentBlock = []
      }
      blocks.push({
        type: 'display-math',
        math: line.trim().slice(2, -2)
      })
      continue
    }

    const blockImgMatch = line.trim().match(/^!\[(.*?)\]\((.*?)\)$/)
    if (blockImgMatch) {
      if (currentBlock.length > 0) {
        blocks.push({ type: 'paragraph', lines: [...currentBlock] })
        currentBlock = []
      }
      blocks.push({
        type: 'image',
        rawToken: line.trim(),
        rawAlt: blockImgMatch[1],
        src: blockImgMatch[2]
      })
      continue
    }

    if (!line.trim()) {
      if (currentBlock.length > 0) {
        blocks.push({ type: 'paragraph', lines: [...currentBlock] })
        currentBlock = []
      }
      continue
    }

    if (line.startsWith('#')) {
      if (currentBlock.length > 0) {
        blocks.push({ type: 'paragraph', lines: [...currentBlock] })
        currentBlock = []
      }
      const level = line.match(/^#+/)[0].length
      const text = line.replace(/^#+\s*/, '')
      blocks.push({ type: 'heading', level, text })
      continue
    }

    if (line.startsWith('>')) {
      if (currentBlock.length > 0) {
        blocks.push({ type: 'paragraph', lines: [...currentBlock] })
        currentBlock = []
      }
      blocks.push({ type: 'blockquote', text: line.replace(/^>\s*/, '') })
      continue
    }

    if (/^(\*|-|\d+\.)\s+/.test(line.trim())) {
      if (currentBlock.length > 0) {
        blocks.push({ type: 'paragraph', lines: [...currentBlock] })
        currentBlock = []
      }
      const isNumbered = /^\d+\.\s+/.test(line.trim())
      const text = line.trim().replace(/^(\*|-|\d+\.)\s+/, '')
      blocks.push({ type: 'list-item', isNumbered, text })
      continue
    }

    currentBlock.push(line)
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push({ type: 'code', language: codeLanguage, code: codeBuffer.join('\n') })
  }

  if (inTable && tableBuffer.length > 0) {
    blocks.push({ type: 'table', lines: [...tableBuffer] })
  }

  if (currentBlock.length > 0) {
    blocks.push({ type: 'paragraph', lines: [...currentBlock] })
  }

  return (
    <div className={`space-y-2.5 leading-relaxed text-slate-700 dark:text-slate-300 ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlockRenderer key={idx} code={block.code} language={block.language} />
        }

        if (block.type === 'table') {
          return <TableRenderer key={idx} lines={block.lines} />
        }

        if (block.type === 'image') {
          return (
            <ImageRenderer
              key={idx}
              rawToken={block.rawToken}
              rawAlt={block.rawAlt}
              src={block.src}
              onImageAction={onImageAction}
            />
          )
        }

        if (block.type === 'display-math') {
          return (
            <div
              key={idx}
              className="my-3 py-2.5 px-4 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-center font-mono text-indigo-900 dark:text-indigo-200 text-sm font-semibold tracking-wide overflow-x-auto select-all"
            >
              {formatMathString(block.math)}
            </div>
          )
        }

        if (block.type === 'heading') {
          const Tag = block.level === 1 ? 'h2' : block.level === 2 ? 'h3' : 'h4'
          const headingStyles = {
            1: 'text-base font-extrabold text-slate-900 dark:text-slate-100 border-b border-border-light dark:border-border-dark pb-1 mt-3',
            2: 'text-sm font-bold text-slate-900 dark:text-slate-100 mt-2',
            3: 'text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mt-2'
          }[block.level] || 'text-sm font-bold'

          return (
            <Tag key={idx} className={headingStyles}>
              {renderInlineFormatting(block.text, onImageAction)}
            </Tag>
          )
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={idx}
              className="my-2 pl-3.5 py-1 border-l-3 border-primary/60 bg-slate-100/60 dark:bg-slate-850/50 rounded-r text-xs text-slate-600 dark:text-slate-300 italic"
            >
              {renderInlineFormatting(block.text, onImageAction)}
            </blockquote>
          )
        }

        if (block.type === 'list-item') {
          return (
            <div key={idx} className="flex items-start gap-2 text-xs pl-2">
              <span className="font-bold text-primary select-none mt-0.5">•</span>
              <span className="flex-1">{renderInlineFormatting(block.text, onImageAction)}</span>
            </div>
          )
        }

        if (block.type === 'paragraph') {
          return (
            <p key={idx} className="text-xs md:text-sm whitespace-pre-wrap break-words">
              {block.lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {renderInlineFormatting(line, onImageAction)}
                  {lIdx < block.lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          )
        }

        return null
      })}
    </div>
  )
}
