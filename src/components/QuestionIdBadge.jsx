import React, { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { describeQuestionCode } from '../../shared/questionCodes.js'

// The question's code chip ("01-CS-261-OS-2N-047"), shown next to its year/set.
// Hovering spells the code out; clicking copies it for Report an Issue, which
// accepts the code or the old numeric id. Falls back to the id for questions
// without a code.
export default function QuestionIdBadge({ question, id, code, className = '' }) {
  const [copied, setCopied] = useState(false)
  const qCode = code ?? question?.code
  const qId = id ?? question?.id
  const label = qCode || qId
  if (label === null || label === undefined) return null

  const handleCopy = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(String(label))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked; the code is still visible to type in
    }
  }

  const title = qCode
    ? `${describeQuestionCode(qCode)}\nClick to copy (e.g. for Report an Issue)`
    : 'Question ID (click to copy, e.g. for Report an Issue)'

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-500 hover:text-primary hover:border-primary/50 transition-colors ${className}`}
    >
      <span>{qCode ? qCode : `ID ${qId}`}</span>
      {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
    </button>
  )
}
