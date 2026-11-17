import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, FileText, Layers, Compass } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { getTags } from '../utils/topics'
import { questionPreview } from '../utils/questionPreview'

// Pages people look for by name ("mock", "study plan", "bookmarks")
const PAGES = [
  { label: 'Mock Tests', to: '/mock-tests', words: 'mock test full length sectional exam series' },
  { label: 'PYQ Mock Tests (year papers)', to: '/pyq-mock', words: 'pyq mock year paper previous gate 2026 2025 timed' },
  { label: 'Practice PYQs', to: '/pyq', words: 'practice pyq questions topic subject problem of the day' },
  { label: 'PYQ Booklet', to: '/booklet', words: 'booklet chapter book read solutions' },
  { label: 'Analytics', to: '/analytics', words: 'analytics score rank performance progress report study plan' },
  { label: 'Dashboard', to: '/dashboard', words: 'dashboard home countdown study plan streak' },
  { label: 'Bookmarks', to: '/bookmarks', words: 'bookmark saved folder revision' },
  { label: 'Scratchpad Notes', to: '/notes', words: 'notes scratchpad formula' },
  { label: 'Free Resources', to: '/resources', words: 'resources playbook pdf free download' },
  { label: 'Discussion Forum', to: '/discussion', words: 'discussion forum doubt community peers' },
  { label: 'Profile & Settings', to: '/profile', words: 'profile settings account goal target year coaching centre' },
  { label: 'Report an Issue', to: '/report', words: 'report issue bug feedback' }
]

const MAX = { pages: 3, topics: 5, questions: 5 }
const norm = (s) => String(s || '').toLowerCase()
const matchesAll = (text, terms) => terms.every(t => text.includes(t))

export default function HeaderSearch() {
  const navigate = useNavigate()
  const location = useLocation()
  const questions = useAppStore(s => s.questions)
  const fetchQuestions = useAppStore(s => s.fetchQuestions)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef(null)

  // Start fresh on each page
  useEffect(() => { setQuery(''); setOpen(false) }, [location.pathname])

  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const topicIndex = useMemo(() => {
    const map = new Map()
    for (const q of questions) {
      for (const t of getTags(q)) {
        if (!t?.topic) continue
        const key = `${t.subject}::${t.topic}`
        const entry = map.get(key) || { subject: t.subject, topic: t.topic, count: 0 }
        entry.count++
        map.set(key, entry)
      }
    }
    return [...map.values()]
  }, [questions])

  const results = useMemo(() => {
    const terms = norm(query).split(/\s+/).filter(Boolean)
    if (!terms.length) return []
    const pages = PAGES.filter(p => matchesAll(norm(`${p.label} ${p.words}`), terms)).slice(0, MAX.pages)
      .map(p => ({ kind: 'page', key: `p:${p.to}`, label: p.label, run: () => navigate(p.to) }))
    const topics = topicIndex
      .filter(t => matchesAll(norm(`${t.topic} ${t.subject}`), terms))
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX.topics)
      .map(t => ({
        kind: 'topic', key: `t:${t.subject}::${t.topic}`, label: t.topic, sub: `${t.subject} · ${t.count} question${t.count === 1 ? '' : 's'}`,
        run: () => navigate('/pyq', { state: { startTopic: { subject: t.subject, topic: t.topic } } })
      }))
    const qs = []
    for (const q of questions) {
      if (qs.length >= MAX.questions) break
      const text = questionPreview(q.question)
      if (matchesAll(norm(`${text} ${q.subject} ${q.topic} ${q.year}`), terms)) {
        qs.push({
          kind: 'question', key: `q:${q.id}`, label: text.length > 90 ? `${text.slice(0, 90)}…` : text, sub: `GATE ${q.year || ''} · ${q.subject || ''}`,
          run: () => navigate('/pyq', { state: { startReels: true, questionId: q.id } })
        })
      }
    }
    return [...pages, ...topics, ...qs]
  }, [query, topicIndex, questions, navigate])

  useEffect(() => { setActive(0) }, [query])

  const choose = (r) => { r.run(); setOpen(false); setQuery('') }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); return }
    if (!results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => (i + 1) % results.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i - 1 + results.length) % results.length) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[active] || results[0]) }
  }

  const icons = { page: Compass, topic: Layers, question: FileText }
  const groupTitle = { page: 'Pages', topic: 'Topics', question: 'Questions' }
  const showList = open && query.trim()

  return (
    <div className="relative w-full" ref={boxRef}>
      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search size={18} className="text-slate-400 dark:text-slate-500" />
      </span>
      <input
        type="search"
        role="combobox"
        aria-label="Search questions, subjects, topics"
        aria-expanded={!!showList}
        aria-controls="header-search-results"
        aria-activedescendant={showList && results[active] ? `hs-${active}` : undefined}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { fetchQuestions(); setOpen(true) }}
        onKeyDown={onKeyDown}
        placeholder="Search questions, subjects, topics..."
        className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary dark:focus:border-primary text-text-primary-light dark:text-text-primary-dark transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
      />
      {showList && (
        <div
          id="header-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 max-h-[70vh] overflow-y-auto rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-xl z-50 py-1.5"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-500">
              {questions.length ? `No matches for "${query.trim()}". Try a topic like "deadlock" or "BCNF".` : 'Loading questions…'}
            </p>
          ) : results.map((r, i) => {
            const Icon = icons[r.kind]
            const firstOfGroup = i === 0 || results[i - 1].kind !== r.kind
            return (
              <React.Fragment key={r.key}>
                {firstOfGroup && (
                  <div className="px-4 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{groupTitle[r.kind]}</div>
                )}
                <div
                  id={`hs-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(r)}
                  className={`mx-1.5 px-2.5 py-2 rounded-btn flex items-start gap-2.5 cursor-pointer text-sm ${i === active ? 'bg-primary/10' : ''}`}
                >
                  <Icon size={15} className="mt-0.5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-text-primary-light dark:text-text-primary-dark line-clamp-2">{r.label}</span>
                    {r.sub && <span className="block text-[11px] text-slate-500">{r.sub}</span>}
                  </span>
                </div>
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
