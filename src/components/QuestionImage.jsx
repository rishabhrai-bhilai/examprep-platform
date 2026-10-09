import React, { useState } from 'react'

export default function QuestionImage({ src, alt = 'Question Diagram', caption }) {
  const [hasError, setHasError] = useState(false)
  const [prevSrc, setPrevSrc] = useState(src)

  if (src !== prevSrc) {
    setPrevSrc(src)
    setHasError(false)
  }

  if (!src || hasError) return null

  return (
    <div className="my-3 sm:my-4 flex flex-col items-center">
      <div className="rounded-xl bg-white p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-soft max-w-full overflow-hidden">
        <img
          src={src}
          alt={alt}
          onError={() => setHasError(true)}
          className="max-h-60 sm:max-h-80 md:max-h-96 w-auto max-w-full object-contain mx-auto rounded-lg block"
        />
      </div>
      {caption && (
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1.5 text-center">
          {caption}
        </span>
      )}
    </div>
  )
}
