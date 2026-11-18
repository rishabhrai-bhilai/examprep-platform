import { useState } from 'react'
import { X, Folder, Plus, Check } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { questionPreview } from '../utils/questionPreview'
import useDialog from '../hooks/useDialog'

// Offered when the student has no folders yet, so one click saves the question
const DEFAULT_FOLDER = 'General'

export default function BookmarkSelectorModal() {
  const {
    bookmarkSelectorQuestionId,
    setBookmarkSelectorQuestionId,
    bookmarkFolders,
    createBookmarkFolder,
    toggleQuestionInFolder,
    questions
  } = useAppStore()

  const [newFolderName, setNewFolderName] = useState('')
  const open = bookmarkSelectorQuestionId !== null
  const close = () => { setNewFolderName(''); setBookmarkSelectorQuestionId(null) }
  const dialogRef = useDialog(open, close)

  if (!open) return null
  const targetQuestion = questions.find(q => q.id === bookmarkSelectorQuestionId)
  if (!targetQuestion) return null

  const folderNames = Object.keys(bookmarkFolders)
  const shownFolders = folderNames.length ? folderNames : [DEFAULT_FOLDER]
  const savedIn = folderNames.filter(name => bookmarkFolders[name].includes(targetQuestion.id))

  const toggleFolder = (name) => {
    if (!bookmarkFolders[name]) createBookmarkFolder(name)
    toggleQuestionInFolder(name, targetQuestion.id)
  }

  // A new folder is created with the question already saved in it
  const handleCreateFolder = (e) => {
    e.preventDefault()
    const folder = newFolderName.trim()
    if (!folder) return
    if (!bookmarkFolders[folder]) createBookmarkFolder(folder)
    if (!(bookmarkFolders[folder] || []).includes(targetQuestion.id)) toggleQuestionInFolder(folder, targetQuestion.id)
    setNewFolderName('')
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex justify-center p-4 overflow-y-auto font-sans animate-fade-in" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bookmark-dialog-title"
        className="my-auto w-full max-w-sm rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 shadow-xl space-y-5 animate-scale-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <h3 id="bookmark-dialog-title" className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Folder className="text-primary" size={18} />
            <span>Bookmark Question</span>
          </h3>
          <button
            onClick={close}
            aria-label="Close"
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Question Details Snippet */}
        <div className="p-3 rounded-btn bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {targetQuestion.subject} • {targetQuestion.topic}
          </span>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {questionPreview(targetQuestion.question)}
          </p>
        </div>

        {/* Folders List */}
        <fieldset className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          <legend className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
            Save to folders
          </legend>
          {shownFolders.map(folderName => {
            const isSaved = savedIn.includes(folderName)
            return (
              <label
                key={folderName}
                className={`p-3 rounded-btn border text-xs font-bold cursor-pointer transition-all flex items-center justify-between focus-within:ring-2 focus-within:ring-primary ${
                  isSaved
                    ? 'border-primary bg-indigo-500/5 text-primary'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span className="truncate">{folderName}</span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isSaved}
                  onChange={() => toggleFolder(folderName)}
                />
                <span aria-hidden="true" className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                  isSaved ? 'bg-primary border-primary text-white shadow-sm' : 'border-slate-300 dark:border-slate-700'
                }`}>
                  {isSaved && <Check size={11} strokeWidth={3.5} />}
                </span>
              </label>
            )
          })}
        </fieldset>

        {/* Create Folder Form */}
        <form onSubmit={handleCreateFolder} className="space-y-2">
          <label htmlFor="bookmark-new-folder" className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            New folder
          </label>
          <div className="flex gap-2">
            <input
              id="bookmark-new-folder"
              type="text"
              placeholder="e.g. Weak Topics, Revision..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 h-9 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary text-xs text-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              aria-label="Create folder and save the question in it"
              title="Create folder and save the question in it"
              disabled={!newFolderName.trim()}
              className="h-9 px-3.5 bg-primary hover:bg-primary-hover text-white rounded-btn disabled:opacity-40 transition-all shadow-sm shrink-0 flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
          </div>
        </form>

        {/* What will happen, in words */}
        <p className={`text-xs font-semibold ${savedIn.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`} role="status" aria-live="polite">
          {savedIn.length
            ? `Saved in ${savedIn.join(', ')}.`
            : 'Not saved yet. Tick a folder or create one.'}
        </p>

        <button
          onClick={close}
          className="w-full h-9 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs rounded-btn shadow-sm transition-all flex items-center justify-center"
        >
          {savedIn.length ? 'Done' : 'Close without saving'}
        </button>
      </div>
    </div>
  )
}
