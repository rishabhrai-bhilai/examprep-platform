import React, { useState } from 'react'
import { Check, Copy } from 'lucide-react'

// "ID 2026123" chip shown next to a question's year/set. Clicking copies the
// id, which is what the Report an Issue form asks for.
export default function QuestionIdBadge({ id, className = '' }) {
  const [copied, setCopied] = useState(false)
  if (id === null || id === undefined) return null

  const handleCopy = async (e) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await navigator.clipboard.writeText(String(id))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard can be blocked; the id is still visible to type in
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Question ID (click to copy, e.g. for Report an Issue)"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-500 hover:text-primary hover:border-primary/50 transition-colors ${className}`}
    >
      <span>ID {id}</span>
      {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
    </button>
  )
}
