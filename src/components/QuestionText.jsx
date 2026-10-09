import React from 'react'
import katex from 'katex'

// Helper to safely render KaTeX string
function renderKaTeXHtml(math, displayMode = false) {
  try {
    return katex.renderToString(math, {
      displayMode,
      throwOnError: false,
      trust: false,
      output: 'htmlAndMathml'
    })
  } catch (err) {
    console.error('KaTeX rendering error:', err)
    return null
  }
}

const SUB_MAP = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ'
}

const SUP_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
  'i': 'ⁱ', 'k': 'ᵏ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ',
  'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
  'x': 'ˣ', 'y': 'ʸ', 'T': 'ᵀ'
}

function toSubscript(str) {
  if (!str) return ''
  return Array.from(str).map(c => SUB_MAP[c] || c).join('')
}

function toSuperscript(str) {
  if (!str) return ''
  if (str === 'th' || str === '\\text{th}') return 'ᵗʰ'
  if (str === 'st' || str === '\\text{st}') return 'ˢᵗ'
  if (str === 'nd' || str === '\\text{nd}') return 'ⁿᵈ'
  if (str === 'rd' || str === '\\text{rd}') return 'ʳᵈ'
  if (str === '1/2') return '¹ᐟ²'
  return Array.from(str).map(c => SUP_MAP[c] || c).join('')
}

// Convert common LaTeX math constructs to clean readable Unicode math
export function formatMathString(str) {
  if (!str) return ''
  return str
    // Percent
    .replace(/\\%/g, '%')
    // Parentheses / Brackets
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']')
    .replace(/\\left\\{/g, '{')
    .replace(/\\right\\}/g, '}')
    .replace(/\\left\|/g, '|')
    .replace(/\\right\|/g, '|')
    .replace(/\\left\\langle/g, '⟨')
    .replace(/\\right\\rangle/g, '⟩')
    // Arrows & Logic (Must run BEFORE standalone \left and \right stripping)
    .replace(/\\longleftrightarrow/g, '↔')
    .replace(/\\leftrightarrow/g, '↔')
    .replace(/\\Leftrightarrow/g, '⟺')
    .replace(/\\iff/g, '⟺')
    .replace(/\\longrightarrow/g, '→')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\to(?![a-zA-Z])/g, '→')
    .replace(/\\longleftarrow/g, '←')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\Leftarrow/g, '⇐')
    .replace(/\\implies/g, '⟹')
    .replace(/\\Rightarrow/g, '⟹')
    .replace(/\\land|\\wedge/g, '∧')
    .replace(/\\lor|\\vee/g, '∨')
    .replace(/\\neg/g, '¬')
    // Now safe to strip standalone \left and \right
    .replace(/\\left(?![a-zA-Z])/g, '')
    .replace(/\\right(?![a-zA-Z])/g, '')
    // Fractions & roots
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sqrt(?![a-zA-Z])/g, '√')
    .replace(/\\overline\{([^}]+)\}/g, '$1̄')
    .replace(/\\bar\{([^}]+)\}/g, '$1̄')
    // Sets, infinity & operators (ORDER: subsets and infinity before in!)
    .replace(/\\infty(?![a-zA-Z])/g, '∞')
    .replace(/\\subseteq(?![a-zA-Z])/g, '⊆')
    .replace(/\\supseteq(?![a-zA-Z])/g, '⊇')
    .replace(/\\subset(?![a-zA-Z])/g, '⊂')
    .replace(/\\supset(?![a-zA-Z])/g, '⊃')
    .replace(/\\notin(?![a-zA-Z])/g, '∉')
    .replace(/\\in(?![a-zA-Z])/g, '∈')
    .replace(/\\sum(?![a-zA-Z])/g, '∑')
    .replace(/\\prod(?![a-zA-Z])/g, '∏')
    .replace(/\\int(?![a-zA-Z])/g, '∫')
    .replace(/\\times(?![a-zA-Z])/g, '×')
    .replace(/\\cdot(?![a-zA-Z])/g, '·')
    .replace(/\\div(?![a-zA-Z])/g, '÷')
    .replace(/\\pm(?![a-zA-Z])/g, '±')
    .replace(/\\neq(?![a-zA-Z])/g, '≠')
    .replace(/\\ne(?![a-zA-Z])/g, '≠')
    .replace(/\\leq(?![a-zA-Z])/g, '≤')
    .replace(/\\geq(?![a-zA-Z])/g, '≥')
    .replace(/\\le(?![a-zA-Z])/g, '≤')
    .replace(/\\ge(?![a-zA-Z])/g, '≥')
    .replace(/\\approx(?![a-zA-Z])/g, '≈')
    .replace(/\\mid(?![a-zA-Z])/g, '|')
    .replace(/\\setminus(?![a-zA-Z])/g, '\\')
    .replace(/\\cup(?![a-zA-Z])/g, '∪')
    .replace(/\\cap(?![a-zA-Z])/g, '∩')
    .replace(/\\emptyset(?![a-zA-Z])/g, '∅')
    .replace(/\\forall(?![a-zA-Z])/g, '∀')
    .replace(/\\exists(?![a-zA-Z])/g, '∃')
    .replace(/\\langle(?![a-zA-Z])/g, '⟨')
    .replace(/\\rangle(?![a-zA-Z])/g, '⟩')
    .replace(/\\perp|\\bot(?![a-zA-Z])/g, '⊥')
    .replace(/\\parallel(?![a-zA-Z])/g, '∥')
    .replace(/\\circ|\^\\circ|\\degree/g, '°')
    .replace(/\\angle(?![a-zA-Z])/g, '∠')
    .replace(/\\dots|\\cdots|\\ldots/g, '...')
    .replace(/\\quad|\\qquad|\\;|\\,|\\!/g, ' ')
    // Greek letters
    .replace(/\\Theta(?![a-zA-Z])/g, 'Θ')
    .replace(/\\Omega(?![a-zA-Z])/g, 'Ω')
    .replace(/\\Sigma(?![a-zA-Z])/g, 'Σ')
    .replace(/\\Gamma(?![a-zA-Z])/g, 'Γ')
    .replace(/\\Delta(?![a-zA-Z])/g, 'Δ')
    .replace(/\\Phi(?![a-zA-Z])/g, 'Φ')
    .replace(/\\Psi(?![a-zA-Z])/g, 'Ψ')
    .replace(/\\alpha(?![a-zA-Z])/g, 'α')
    .replace(/\\beta(?![a-zA-Z])/g, 'β')
    .replace(/\\gamma(?![a-zA-Z])/g, 'γ')
    .replace(/\\delta(?![a-zA-Z])/g, 'δ')
    .replace(/\\lambda(?![a-zA-Z])/g, 'λ')
    .replace(/\\pi(?![a-zA-Z])/g, 'π')
    .replace(/\\sigma(?![a-zA-Z])/g, 'σ')
    .replace(/\\phi(?![a-zA-Z])/g, 'φ')
    .replace(/\\omega(?![a-zA-Z])/g, 'ω')
    .replace(/\\theta(?![a-zA-Z])/g, 'θ')
    .replace(/\\mu(?![a-zA-Z])/g, 'μ')
    .replace(/\\epsilon(?![a-zA-Z])/g, 'ε')
    .replace(/\\varepsilon(?![a-zA-Z])/g, 'ε')
    // Math functions
    .replace(/\\(det|log|ln|min|max|lim|sin|cos|tan|sec|csc|cot)(?![a-zA-Z])/g, '$1')
    .replace(/\\bmod(?![a-zA-Z])/g, 'mod')
    // Styles and text
    .replace(/\\mathbb\{([A-Za-z]+)\}/g, '$1')
    .replace(/\\mathcal\{([A-Za-z]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\\mathbf\{([^}]+)\}/g, '$1')
    .replace(/\\mathit\{([^}]+)\}/g, '$1')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    // Ordinals & superscripts
    .replace(/\^\{\\text\{th\}\}|\^\{\\text\{st\}\}|\^\{\\text\{nd\}\}|\^\{\\text\{rd\}\}/g, m => {
      if (m.includes('th')) return 'ᵗʰ'
      if (m.includes('st')) return 'ˢᵗ'
      if (m.includes('nd')) return 'ⁿᵈ'
      if (m.includes('rd')) return 'ʳᵈ'
      return m
    })
    .replace(/\^\{([^}]+)\}/g, (_, inner) => toSuperscript(inner))
    .replace(/_\{([^}]+)\}/g, (_, inner) => toSubscript(inner))
    // Single-char sub/superscripts
    .replace(/\^([0-9a-zA-Z+T])/g, (_, ch) => SUP_MAP[ch] || `^${ch}`)
    .replace(/_([0-9a-zA-Z])/g, (_, ch) => SUB_MAP[ch] || `_${ch}`)
    // Matrices fallback representation in string
    .replace(/\\begin\{(?:bmatrix|matrix)\}([\s\S]*?)\\end\{(?:bmatrix|matrix)\}/g, (_, inner) => {
      const rows = inner.trim().split(/\\\\|\n/).map(l => l.trim()).filter(Boolean)
      return `[ ${rows.map(r => r.split('&').map(c => c.trim()).join('  ')).join(' | ')} ]`
    })
    .replace(/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g, (_, inner) => {
      const rows = inner.trim().split(/\\\\|\n/).map(l => l.trim()).filter(Boolean)
      return `( ${rows.map(r => r.split('&').map(c => c.trim()).join('  ')).join(' | ')} )`
    })
    .replace(/\\\\/g, '\n')
    .replace(/&/g, ' ')
}

// Render matrix as a styled HTML table with bracket borders
function renderMatrix(type, body, key) {
  const rows = body.trim().split(/\\\\|\n/).map(r => r.trim()).filter(Boolean)
  const parsedRows = rows.map(r => r.split('&').map(c => c.trim()))
  const isParen = type === 'pmatrix'
  return (
    <span
      key={key}
      className={`inline-flex items-center align-middle mx-1.5 my-1 px-2 py-0.5 border-slate-750 dark:border-slate-300 font-mono text-xs sm:text-sm bg-slate-100/60 dark:bg-slate-800/60 ${
        isParen
          ? 'border-l-2 border-r-2 rounded-lg'
          : 'border-l-2 border-r-2 rounded-xs'
      }`}
    >
      <table className="border-collapse text-center">
        <tbody>
          {parsedRows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-2 py-0.5 text-slate-800 dark:text-slate-200">
                  {formatMathString(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </span>
  )
}

// Render math content including embedded matrices
function renderMathContent(mathRaw, keyPrefix = 'math') {
  const matrixRegex = /(\\begin\{(?:bmatrix|pmatrix|vmatrix|matrix)\}[\s\S]*?\\end\{(?:bmatrix|pmatrix|vmatrix|matrix)\})/g
  if (!matrixRegex.test(mathRaw)) {
    return <span key={keyPrefix}>{formatMathString(mathRaw)}</span>
  }

  const parts = mathRaw.split(matrixRegex)
  return parts.map((part, idx) => {
    if (!part) return null
    const key = `${keyPrefix}-${idx}`
    const match = part.match(/^\\begin\{(bmatrix|pmatrix|vmatrix|matrix)\}([\s\S]*?)\\end\{\1\}$/)
    if (match) {
      return renderMatrix(match[1], match[2], key)
    }
    return <span key={key}>{formatMathString(part)}</span>
  })
}

// Render inline elements: underline, bold, italic, inline code, math ($...$), sup, sub, matrices
function renderInline(text, keyPrefix = 'inline') {
  if (!text) return null

  const tokenRegex = /(<br\s*\/?>|\$[^$]+\$|\\begin\{(?:bmatrix|pmatrix|vmatrix|matrix)\}[\s\S]*?\\end\{(?:bmatrix|pmatrix|vmatrix|matrix)\}|<u>[\s\S]*?<\/u>|<ins>[\s\S]*?<\/ins>|(?<=^|\s)_[a-zA-Z\s]{2,}_(?=[\s.,!?;:]|$)|(?:\*\*[^*\n]+\*\*)|<b>[\s\S]*?<\/b>|<i>[\s\S]*?<\/i>|<em>[\s\S]*?<\/em>|<sup>[\s\S]*?<\/sup>|<sub>[\s\S]*?<\/sub>|`[^`\n]+`|!\[.*?\]\(.*?\))/gi

  const chunks = text.split(tokenRegex)
  return chunks.map((chunk, idx) => {
    if (!chunk) return null
    const key = `${keyPrefix}-${idx}`

    // Image: ![alt](url)
    if (chunk.startsWith('![') && chunk.endsWith(')')) {
      const imgMatch = chunk.match(/^!\[(.*?)\]\((.*?)\)$/)
      if (imgMatch) {
        return (
          <img
            key={key}
            src={imgMatch[2]}
            alt={imgMatch[1] || 'Diagram'}
            className="max-h-24 sm:max-h-28 my-1 rounded inline-block object-contain bg-white px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 shadow-2xs"
          />
        )
      }
    }

    // Line break: <br> or <br/>
    if (/^<br\s*\/?>$/i.test(chunk)) {
      return <br key={key} />
    }

    // Math: $...$
    if (chunk.startsWith('$') && chunk.endsWith('$') && chunk.length > 2) {
      const mathRaw = chunk.slice(1, -1).trim()
      const katexHtml = renderKaTeXHtml(mathRaw, false)
      if (katexHtml) {
        return (
          <span
            key={key}
            className="katex-inline inline-block text-indigo-700 dark:text-indigo-300 font-medium px-0.5 align-baseline"
            dangerouslySetInnerHTML={{ __html: katexHtml }}
          />
        )
      }
      return (
        <span key={key} className="font-mono text-[0.95em] font-semibold text-indigo-700 dark:text-indigo-300">
          {renderMathContent(mathRaw, `${key}-m`)}
        </span>
      )
    }

    // Direct matrix block
    const matrixMatch = chunk.match(/^\\begin\{(bmatrix|pmatrix|vmatrix|matrix)\}([\s\S]*?)\\end\{\1\}$/)
    if (matrixMatch) {
      const katexHtml = renderKaTeXHtml(chunk, false)
      if (katexHtml) {
        return (
          <span
            key={key}
            className="katex-inline inline-block text-indigo-700 dark:text-indigo-300 font-medium mx-1 align-middle"
            dangerouslySetInnerHTML={{ __html: katexHtml }}
          />
        )
      }
      return renderMatrix(matrixMatch[1], matrixMatch[2], key)
    }

    // Underline: <u>...</u> or <ins>...</ins>
    if ((chunk.startsWith('<u>') && chunk.endsWith('</u>')) || (chunk.startsWith('<ins>') && chunk.endsWith('</ins>'))) {
      const inner = chunk.startsWith('<u>') ? chunk.slice(3, -4) : chunk.slice(5, -6)
      return (
        <span key={key} className="underline decoration-2 underline-offset-4 decoration-current font-bold">
          {renderInline(inner, `${key}-u`)}
        </span>
      )
    }

    // Underline from markdown _phrase_ (e.g. _call it a day_)
    if (chunk.startsWith('_') && chunk.endsWith('_') && chunk.length > 2) {
      const inner = chunk.slice(1, -1)
      return (
        <span key={key} className="underline decoration-2 underline-offset-4 decoration-current font-bold">
          {inner}
        </span>
      )
    }

    // Bold: **...** or <b>...</b>
    if ((chunk.startsWith('**') && chunk.endsWith('**')) || (chunk.startsWith('<b>') && chunk.endsWith('</b>'))) {
      const inner = chunk.startsWith('**') ? chunk.slice(2, -2) : chunk.slice(3, -4)
      return (
        <strong key={key} className="font-bold text-slate-900 dark:text-slate-100">
          {renderInline(inner, `${key}-b`)}
        </strong>
      )
    }

    // Italic: <i>...</i> or <em>...</em>
    if ((chunk.startsWith('<i>') && chunk.endsWith('</i>')) || (chunk.startsWith('em') && chunk.endsWith('</em>'))) {
      const inner = chunk.startsWith('<i>') ? chunk.slice(3, -4) : chunk.slice(4, -5)
      return (
        <em key={key} className="italic">
          {renderInline(inner, `${key}-i`)}
        </em>
      )
    }

    // Sup / Sub
    if (chunk.startsWith('<sup>') && chunk.endsWith('</sup>')) {
      return (
        <sup key={key} className="text-[0.75em] align-super font-semibold">
          {chunk.slice(5, -6)}
        </sup>
      )
    }
    if (chunk.startsWith('<sub>') && chunk.endsWith('</sub>')) {
      return (
        <sub key={key} className="text-[0.75em] align-sub font-semibold">
          {chunk.slice(5, -6)}
        </sub>
      )
    }

    // Inline code
    if (chunk.startsWith('`') && chunk.endsWith('`')) {
      return (
        <code key={key} className="px-1.5 py-0.5 rounded bg-slate-150 dark:bg-slate-800 font-mono text-xs text-pink-600 dark:text-pink-400 border border-slate-300 dark:border-slate-700">
          {chunk.slice(1, -1)}
        </code>
      )
    }

    // If chunk contains unescaped LaTeX math commands or subscripts
    let processed = chunk.replace(/\\%/g, '%')
    if (
      processed.includes('\\') ||
      processed.includes('_{') ||
      processed.includes('^{') ||
      /_[0-9a-zA-Z]/.test(processed) ||
      /\^[0-9a-zA-Z]/.test(processed)
    ) {
      return <React.Fragment key={key}>{formatMathString(processed)}</React.Fragment>
    }

    return <React.Fragment key={key}>{processed}</React.Fragment>
  })
}

// Render markdown tables
function renderTable(lines, tableIdx) {
  if (lines.length < 2) return null
  const parseRow = line => line.split('|').slice(1, -1).map(c => c.trim())
  const header = parseRow(lines[0])
  const rows = lines.slice(2).map(parseRow)

  return (
    <div key={`table-${tableIdx}`} className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-750 shadow-xs">
      <table className="w-full text-xs sm:text-sm text-left border-collapse">
        <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
          <tr>
            {header.map((col, idx) => (
              <th key={idx} className="p-2.5 border-r last:border-r-0 border-slate-200 dark:border-slate-700">
                {renderInline(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="p-2.5 border-r last:border-r-0 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function QuestionText({ text, className = '', inline = false }) {
  if (!text) return null

  if (inline) {
    return (
      <span className={`question-text-inline leading-relaxed ${className}`}>
        {renderInline(text, 'inline')}
      </span>
    )
  }

  // Split into lines to parse block structures (code blocks, display math, tables, paragraphs)
  const lines = text.split('\n')
  const blocks = []
  let lineIdx = 0

  while (lineIdx < lines.length) {
    const line = lines[lineIdx]

    // Code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim()
      const codeLines = []
      lineIdx++
      while (lineIdx < lines.length && !lines[lineIdx].trim().startsWith('```')) {
        codeLines.push(lines[lineIdx])
        lineIdx++
      }
      if (lineIdx < lines.length) lineIdx++
      blocks.push({
        type: 'code',
        language: lang,
        code: codeLines.join('\n')
      })
      continue
    }

    // Display math: $$...$$
    if (line.trim().startsWith('$$')) {
      const mathLines = []
      if (line.trim().endsWith('$$') && line.trim().length > 4) {
        mathLines.push(line.trim().slice(2, -2).trim())
        lineIdx++
      } else {
        mathLines.push(line.trim().slice(2).trim())
        lineIdx++
        while (lineIdx < lines.length && !lines[lineIdx].trim().endsWith('$$')) {
          mathLines.push(lines[lineIdx])
          lineIdx++
        }
        if (lineIdx < lines.length) {
          const closingLine = lines[lineIdx].trim()
          if (closingLine !== '$$') {
            mathLines.push(closingLine.slice(0, -2).trim())
          }
          lineIdx++
        }
      }
      blocks.push({
        type: 'display-math',
        math: mathLines.join('\n')
      })
      continue
    }

    // Markdown table
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines = []
      while (lineIdx < lines.length && lines[lineIdx].trim().startsWith('|') && lines[lineIdx].trim().endsWith('|')) {
        tableLines.push(lines[lineIdx].trim())
        lineIdx++
      }
      blocks.push({
        type: 'table',
        lines: tableLines
      })
      continue
    }

    // Image block: ![alt](url)
    const imgBlockMatch = line.trim().match(/^!\[(.*?)\]\((.*?)\)$/)
    if (imgBlockMatch) {
      blocks.push({
        type: 'image',
        alt: imgBlockMatch[1],
        src: imgBlockMatch[2]
      })
      lineIdx++
      continue
    }

    // Regular paragraph / text line
    blocks.push({
      type: 'text',
      line
    })
    lineIdx++
  }

  return (
    <div className={`question-text-content space-y-2 ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return (
            <div key={idx} className="my-3 rounded-xl border border-slate-750 bg-slate-900 text-slate-100 text-xs font-mono shadow-sm overflow-hidden">
              {block.language && (
                <div className="px-3 py-1 bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  {block.language}
                </div>
              )}
              <pre className="p-3.5 overflow-x-auto custom-scrollbar leading-relaxed">
                <code>{block.code}</code>
              </pre>
            </div>
          )
        }

        if (block.type === 'display-math') {
          const katexHtml = renderKaTeXHtml(block.math, true)
          if (katexHtml) {
            return (
              <div
                key={idx}
                className="my-3 py-3 px-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-750 text-center text-indigo-700 dark:text-indigo-300 overflow-x-auto custom-scrollbar flex items-center justify-center text-base sm:text-lg"
                dangerouslySetInnerHTML={{ __html: katexHtml }}
              />
            )
          }
          return (
            <div key={idx} className="my-2 py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-750 text-center font-mono text-sm sm:text-base font-semibold text-indigo-700 dark:text-indigo-300 overflow-x-auto custom-scrollbar flex items-center justify-center">
              {renderMathContent(block.math, `dmath-${idx}`)}
            </div>
          )
        }

        if (block.type === 'table') {
          return renderTable(block.lines, idx)
        }

        if (block.type === 'image') {
          return (
            <div key={idx} className="my-3 flex justify-center">
              <img
                src={block.src}
                alt={block.alt || 'Question Diagram'}
                className="max-h-96 max-w-full rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm object-contain bg-white p-1"
              />
            </div>
          )
        }

        if (!block.line.trim()) {
          return <div key={idx} className="h-1.5" />
        }

        return (
          <div key={idx} className="leading-relaxed">
            {renderInline(block.line, `line-${idx}`)}
          </div>
        )
      })}
    </div>
  )
}
