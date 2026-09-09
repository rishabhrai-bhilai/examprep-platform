import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'

/**
 * FilterDropdown - A modern, sleek popover dropdown filter
 * Replaces native browser <select> with a polished, theme-compatible custom UI.
 *
 * @param {string} label - Default label when 'ALL' or nothing is selected
 * @param {string} value - Currently selected value
 * @param {Array<{value: string, label: string, count?: number}|string>} options - List of options
 * @param {Function} onChange - Callback (value) => void
 * @param {string} title - Tooltip
 * @param {boolean} searchable - Show search input inside popover (default: true if options > 7)
 * @param {string} searchPlaceholder - Placeholder for inner search
 * @param {string} align - 'right' | 'left' alignment for popover
 * @param {string} className - Additional trigger container styling
 */
export default function FilterDropdown({
  label,
  value,
  options = [],
  onChange,
  title,
  searchable = undefined,
  searchPlaceholder = 'Search...',
  align = 'right',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)

  // Normalize options to [{ value, label, count }]
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value,
        label: opt.label !== undefined ? opt.label : opt.value,
        count: opt.count
      }
    }
    return { value: opt, label: opt, count: undefined }
  })

  // Determine current active label
  const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value))
  const displayLabel = (value && value !== 'ALL' && selectedOption)
    ? selectedOption.label
    : label

  const isFiltered = value && value !== 'ALL'

  // Decide if search bar should be displayed
  const showSearch = searchable !== undefined
    ? searchable
    : normalizedOptions.length > 7

  // Filter options by search term
  const filteredOptions = normalizedOptions.filter(opt => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase().trim()
    return (
      (opt.label || '').toLowerCase().includes(term) ||
      (opt.value || '').toLowerCase().includes(term)
    )
  })

  // Handle outside click & Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (val) => {
    onChange?.(val)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={title || displayLabel}
        className={`h-9 px-3 text-xs font-semibold rounded-btn border shadow-xs transition-all flex items-center justify-between gap-2 select-none cursor-pointer ${
          isFiltered
            ? 'bg-primary/5 text-primary border-primary/40 dark:bg-primary/10 dark:border-primary/50 font-bold'
            : 'bg-card-light dark:bg-card-dark text-slate-700 dark:text-slate-200 border-border-light dark:border-border-dark hover:border-slate-300 dark:hover:border-slate-700'
        } ${isOpen ? 'ring-2 ring-primary/20 border-primary' : ''}`}
      >
        <span className="truncate max-w-[130px] sm:max-w-[160px]">
          {displayLabel}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 min-w-[210px] max-w-[280px] w-max bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {/* Inner Search Box (for long lists) */}
          {showSearch && (
            <div className="p-2 border-b border-border-light dark:border-border-dark bg-slate-50/70 dark:bg-slate-900/50">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-7.5 pl-8 pr-7 text-[11px] bg-white dark:bg-slate-850 border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No matches found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value)
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold dark:bg-primary/20'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isSelected ? (
                        <Check size={13} className="text-primary shrink-0" />
                      ) : (
                        <div className="w-3.5 shrink-0" />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </div>

                    {opt.count !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full shrink-0 font-medium ${
                          isSelected
                            ? 'bg-primary/20 text-primary dark:bg-primary/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {opt.count}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
