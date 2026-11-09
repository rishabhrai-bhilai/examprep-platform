import React from 'react'
import { BookOpen, Tags } from 'lucide-react'
import { useTopicScheme } from '../store/useTopicScheme'

const OPTIONS = [
  { id: 'chapters', label: 'Book chapters', icon: BookOpen, hint: "Grouped by the book's chapters" },
  { id: 'topics', label: 'Classic topics', icon: Tags, hint: 'Grouped by the classic GATE Overflow topics' }
]

// Chooses how topics (and sectional mocks) are grouped. The choice is shared by
// every page and remembered in this browser. onChange runs after a switch, e.g.
// to clear selections made under the other grouping.
export default function TopicSchemeSwitch({ onChange, className = '' }) {
  const { scheme, setScheme } = useTopicScheme()
  return (
    <div role="radiogroup" aria-label="Group topics by" className={`inline-flex items-center p-0.5 rounded-btn border border-border-light dark:border-border-dark bg-slate-100/70 dark:bg-slate-900/60 ${className}`}>
      {OPTIONS.map(({ id, label, icon: Icon, hint }) => {
        const active = scheme === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            title={hint}
            onClick={() => { if (!active) { setScheme(id); onChange?.(id) } }}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-[calc(var(--radius-btn,8px)-2px)] text-xs font-bold transition-all whitespace-nowrap ${
              active
                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
