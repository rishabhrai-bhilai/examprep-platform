import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Bookmark, Folder, Trash2, Plus, Play, CheckSquare, Square, ArrowLeft, ArrowRight, FolderOpen, Layers, Check
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export default function BookmarksPage() {
  const navigate = useNavigate()
  const { 
    bookmarks,
    bookmarkFolders, 
    createBookmarkFolder, 
    deleteBookmarkFolder, 
    removeQuestionFromFolder,
    removeQuestionsFromFolder,
    setActiveQuestionIndex, 
    questions 
  } = useAppStore()

  // State
  const [selectedFolder, setSelectedFolder] = useState(null) // folderName or null for folder list
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]) // for bulk operations

  // Helper: Get questions for a folder
  const getFolderQuestions = (folderName) => {
    const ids = bookmarkFolders[folderName] || []
    return questions.filter(q => ids.includes(q.id))
  }

  // Create folder handler
  const handleCreateFolder = (e) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    createBookmarkFolder(newFolderName.trim())
    setNewFolderName('')
  }

  // Delete folder handler
  const handleDeleteFolder = (folderName) => {
    if (window.confirm(`Are you sure you want to delete the folder "${folderName}" and all its bookmarks?`)) {
      deleteBookmarkFolder(folderName)
      if (selectedFolder === folderName) {
        setSelectedFolder(null)
      }
    }
  }

  // Practice folder handler
  const handlePracticeFolder = (folderName, startQuestionId = null) => {
    const ids = bookmarkFolders[folderName] || []
    if (ids.length === 0) {
      alert("This folder is empty! Save some questions to it first.")
      return
    }

    const startId = startQuestionId || ids[0]
    const idx = questions.findIndex(q => q.id === startId)
    if (idx !== -1) {
      setActiveQuestionIndex(idx)
      navigate('/pyq', { 
        state: { 
          startReels: true, 
          questionId: startId,
          bookmarkFolderQuestions: ids 
        } 
      })
    }
  }

  // Bulk toggle selection
  const handleToggleSelectAll = (folderName) => {
    const ids = bookmarkFolders[folderName] || []
    if (selectedQuestionIds.length === ids.length) {
      setSelectedQuestionIds([])
    } else {
      setSelectedQuestionIds(ids)
    }
  }

  const handleToggleSelectQuestion = (qId) => {
    setSelectedQuestionIds(prev => 
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    )
  }

  // Bulk delete handler
  const handleBulkDelete = (folderName) => {
    if (selectedQuestionIds.length === 0) return
    if (window.confirm(`Are you sure you want to remove the ${selectedQuestionIds.length} selected questions from this folder?`)) {
      removeQuestionsFromFolder(folderName, selectedQuestionIds)
      setSelectedQuestionIds([])
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 bg-bg-light dark:bg-bg-dark min-h-screen font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800/40 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-855 dark:text-slate-100 flex items-center gap-2">
            <Bookmark className="text-primary fill-primary" size={24} />
            <span>Saved Bookmarks</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {selectedFolder 
              ? `Managing bookmarks in folder "${selectedFolder}"`
              : "Organize and practice saved questions in customized bookmark folders."}
          </p>
        </div>

        {/* Back Button / Create Folder Form */}
        {selectedFolder ? (
          <button
            onClick={() => {
              setSelectedFolder(null)
              setSelectedQuestionIds([])
            }}
            className="h-10 px-4 border border-border-light dark:border-border-dark text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 font-extrabold text-xs rounded-btn flex items-center gap-2 shadow-sm transition-all"
          >
            <ArrowLeft size={14} />
            <span>Back to Folders</span>
          </button>
        ) : (
          <form onSubmit={handleCreateFolder} className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="New folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 sm:w-52 h-10 px-3.5 bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-input focus:outline-none focus:border-primary text-xs text-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={!newFolderName.trim()}
              className="h-10 px-4 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-btn disabled:opacity-40 transition-all shadow-sm shrink-0 flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Create Folder</span>
            </button>
          </form>
        )}
      </div>

      {/* 2. SUB-VIEW: FOLDERS LIST */}
      {!selectedFolder ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.keys(bookmarkFolders).map(folderName => {
            const count = bookmarkFolders[folderName]?.length || 0
            return (
              <div
                key={folderName}
                className="p-5 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft hover:shadow-md hover:border-slate-300 dark:hover:border-slate-850 flex flex-col justify-between h-[155px] group transition-all"
              >
                {/* Folder details */}
                <div 
                  onClick={() => setSelectedFolder(folderName)}
                  className="space-y-1.5 cursor-pointer flex-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded bg-primary/10 text-primary flex items-center justify-center">
                      <FolderOpen size={18} />
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-primary border border-primary/5">
                      {count} Questions
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-150 leading-tight truncate group-hover:text-primary transition-colors">
                    {folderName}
                  </h3>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-900/60 flex items-center justify-between">
                  <button
                    onClick={() => handleDeleteFolder(folderName)}
                    className="p-2 text-slate-400 hover:text-error hover:bg-red-500/5 rounded transition-all"
                    title="Delete Folder"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    onClick={() => handlePracticeFolder(folderName)}
                    disabled={count === 0}
                    className="h-8 px-3.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-btn disabled:opacity-40 shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Play size={12} className="fill-white text-white" />
                    <span>Practice</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (

        // 3. SUB-VIEW: FOLDER DETAILS & QUESTIONS LIST
        <div className="space-y-4">
          
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-card border border-border-light dark:border-border-dark bg-card-light dark:bg-card-dark shadow-soft">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                Folder: <span className="text-primary">{selectedFolder}</span>
              </h2>
              <span className="text-xs font-bold text-slate-400">
                ({getFolderQuestions(selectedFolder).length} Questions)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePracticeFolder(selectedFolder)}
                disabled={getFolderQuestions(selectedFolder).length === 0}
                className="h-9 px-4.5 bg-primary hover:bg-primary-hover text-white font-extrabold text-xs rounded-btn disabled:opacity-40 transition-all active:scale-95 shadow-sm flex items-center gap-1.5"
              >
                <Play size={12} className="fill-white text-white" />
                <span>Practice Folder</span>
              </button>
              <button
                onClick={() => handleDeleteFolder(selectedFolder)}
                className="h-9 px-3.5 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-error font-bold text-xs rounded-btn transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Delete Folder</span>
              </button>
            </div>
          </div>

          {/* Bulk Selection Header */}
          {getFolderQuestions(selectedFolder).length > 0 && (
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-btn">
              <button
                onClick={() => handleToggleSelectAll(selectedFolder)}
                className="flex items-center gap-2 text-xs font-bold text-slate-655 dark:text-slate-350 hover:text-slate-800 transition-colors"
              >
                {selectedQuestionIds.length === getFolderQuestions(selectedFolder).length ? (
                  <CheckSquare size={16} className="text-primary" />
                ) : (
                  <Square size={16} className="text-slate-400" />
                )}
                <span>Select All Questions</span>
              </button>

              {selectedQuestionIds.length > 0 && (
                <button
                  onClick={() => handleBulkDelete(selectedFolder)}
                  className="h-8 px-3.5 bg-red-500 hover:bg-red-650 text-white font-extrabold text-xs rounded-btn shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Remove Selected ({selectedQuestionIds.length})</span>
                </button>
              )}
            </div>
          )}

          {/* Questions Grid List */}
          <div className="space-y-3">
            {getFolderQuestions(selectedFolder).length === 0 ? (
              <div className="p-16 text-center rounded-card border border-dashed border-slate-200 dark:border-slate-800 bg-card-light dark:bg-card-dark text-slate-400">
                <p className="font-bold text-sm">No bookmarks in this folder yet.</p>
                <p className="text-xs mt-1">Bookmark questions on the Practice page to add them here.</p>
              </div>
            ) : (
              getFolderQuestions(selectedFolder).map(q => {
                const isSelected = selectedQuestionIds.includes(q.id)
                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-card border bg-card-light dark:bg-card-dark flex items-start gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-800 hover:shadow-soft ${
                      isSelected ? 'border-primary/40 ring-1 ring-primary/10' : 'border-border-light dark:border-border-dark'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleSelectQuestion(q.id)}
                      className="mt-1 flex-shrink-0 text-slate-400 hover:text-primary transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare size={18} className="text-primary" />
                      ) : (
                        <Square size={18} className="text-slate-400" />
                      )}
                    </button>

                    {/* Question Content */}
                    <div 
                      onClick={() => handlePracticeFolder(selectedFolder, q.id)}
                      className="flex-1 min-w-0 cursor-pointer space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[9px] font-extrabold uppercase text-slate-400">
                        <span className="text-primary">{q.subject}</span>
                        <span>•</span>
                        <span className="truncate max-w-[120px]">{q.topic}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-850">{q.difficulty}</span>
                      </div>
                      
                      <h3 className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-150 leading-relaxed truncate">
                        {q.question.replace(/\n/g, ' ')}
                      </h3>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => removeQuestionFromFolder(selectedFolder, q.id)}
                      className="h-8.5 px-3 border border-border-light dark:border-border-dark hover:border-red-500/20 hover:bg-red-500/5 hover:text-error font-extrabold text-[10px] uppercase rounded-btn transition-all shrink-0 ml-2"
                    >
                      Remove
                    </button>

                  </div>
                )
              })
            )}
          </div>

        </div>
      )}
    </div>
  )
}
