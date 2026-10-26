import React from 'react'
import { Info } from 'lucide-react'

// Says where a question's answer and explanation come from when they are not
// both official/curated: answers solved without an official key, explanations
// written by AI, and keys that gave marks to everyone.
export default function AnswerProvenance({ question }) {
  if (!question) return null
  const lines = []
  if (question.marksToAll) lines.push('The official GATE key awarded marks to all candidates for this question.')
  if (question.answerSource === 'unofficial') lines.push('No official answer key exists for this paper; this answer was worked out by AI and may be wrong.')
  if (question.answerNote && !question.marksToAll) lines.push(`Official key note: ${question.answerNote}`)
  if (question.explanationSource === 'ai') lines.push('Explanation written by AI.')
  if (lines.length === 0) return null

  return (
    <div className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
      <Info size={12} className="shrink-0 mt-[1px]" />
      <span>{lines.join(' ')}</span>
    </div>
  )
}
