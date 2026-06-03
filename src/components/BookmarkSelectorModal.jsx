import React, { useState } from 'react'
import { X, Folder, Plus, Check } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

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

  if (bookmarkSelectorQuestionId === null) return null

  // Find target question
  const targetQuestion = questions.find(q => q.id === bookmarkSelectorQuestionId)
  if (!targetQuestion) return null

  const handleCreateFolder = (e) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    createBookmarkFolder(newFolderName.trim())
    setNewFolderName('')
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] flex items-center justify-center p-4 font-sans animate-fade-in">
      <div className="w-full max-w-sm rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark p-6 shadow-xl space-y-5 animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Folder className="text-primary" size={18} />
            <span>Bookmark Question</span>
          </h3>
          <button
            onClick={() => setBookmarkSelectorQuestionId(null)}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Question Details Snippet */}
        <div className="p-3 rounded-btn bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 space-y-1">
          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {targetQuestion.subject} • {targetQuestion.topic}
          </span>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {targetQuestion.question.replace(/\n/g, ' ')}
          </p>
        </div>

        {/* Folders List */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Select Folders
          </span>
          {Object.keys(bookmarkFolders).length === 0 ? (
            <p className="text-xs text-slate-400 italic">No bookmark folders available.</p>
          ) : (
            Object.keys(bookmarkFolders).map(folderName => {
              const isSaved = bookmarkFolders[folderName].includes(targetQuestion.id)
              return (
                <div
                  key={folderName}
                  onClick={() => toggleQuestionInFolder(folderName, targetQuestion.id)}
                  className={`p-3 rounded-btn border text-xs font-bold cursor-pointer transition-all flex items-center justify-between ${
                    isSaved
                      ? 'border-primary bg-indigo-500/5 text-primary'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/20 dark:bg-slate-900/10 text-slate-655 dark:text-slate-350'
                  }`}
                >
                  <span className="truncate">{folderName}</span>
                  <div className={`h-5.5 w-5.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    isSaved
                      ? 'bg-primary border-primary text-white shadow-sm'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}>
                    {isSaved && <Check size={11} strokeWidth={3.5} />}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Create Folder Form */}
        <form onSubmit={handleCreateFolder} className="space-y-2">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Create Folder
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Weak Topics, Revision..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 h-9 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary text-xs text-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={!newFolderName.trim()}
              className="h-9 px-3.5 bg-primary hover:bg-primary-hover text-white rounded-btn disabled:opacity-40 transition-all shadow-sm shrink-0 flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
          </div>
        </form>

        {/* Footer */}
        <button
          onClick={() => setBookmarkSelectorQuestionId(null)}
          className="w-full h-9.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs rounded-btn shadow-sm transition-all flex items-center justify-center"
        >
          Done
        </button>

      </div>
    </div>
  )
}
