import React, { useState } from 'react'
import { ZoomIn, X } from 'lucide-react'

export default function QuestionImage({ src, alt = 'Question Diagram', caption }) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasError, setHasError] = useState(false)

  if (!src || hasError) return null

  return (
    <>
      <div className="my-3 sm:my-4 flex flex-col items-center">
        <div 
          onClick={() => setIsOpen(true)}
          className="group relative cursor-zoom-in rounded-xl bg-white p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-soft hover:shadow-md transition-all max-w-full overflow-hidden"
          title="Click to view full size"
        >
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            className="max-h-60 sm:max-h-80 md:max-h-96 w-auto max-w-full object-contain mx-auto rounded-lg"
            loading="lazy"
          />
          {/* Zoom hint overlay on hover */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl pointer-events-none">
            <span className="bg-slate-900/80 text-white text-xs font-semibold px-2.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
              <ZoomIn size={14} />
              <span>Click to enlarge</span>
            </span>
          </div>
        </div>
        {caption && (
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1.5 text-center">
            {caption}
          </span>
        )}
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-4 sm:p-6 shadow-2xl border border-slate-200 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
            <div className="max-h-[75vh] overflow-auto custom-scrollbar flex items-center justify-center mt-2">
              <img
                src={src}
                alt={alt}
                className="max-w-full max-h-[72vh] object-contain rounded-lg"
              />
            </div>
            {caption && (
              <p className="text-xs font-semibold text-slate-600 mt-3 text-center">
                {caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
