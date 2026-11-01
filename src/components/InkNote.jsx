import React, { useLayoutEffect, useRef, useState } from 'react'

// A post with ink: the text laid out exactly as it was typed (same width, font size,
// line height and padding as the editor) with the ink on top in the same spot. The
// whole page shrinks to fit narrow screens so the ink stays lined up with the words.
export default function InkNote({ text, src, width, fontSize, lineHeight, padding, className = '' }) {
  const outerRef = useRef(null)
  const pageRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [pageHeight, setPageHeight] = useState(0)
  // The ink can reach below the last line of text
  const [inkHeight, setInkHeight] = useState(0)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const page = pageRef.current
    if (!outer || !page) return
    const measure = () => {
      setScale(Math.min(1, (outer.clientWidth || width) / width))
      setPageHeight(page.offsetHeight)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(outer)
    observer.observe(page)
    return () => observer.disconnect()
  }, [width])

  return (
    <div ref={outerRef} className={`w-full overflow-hidden ${className}`} style={{ height: pageHeight ? pageHeight * scale : undefined }}>
      <div ref={pageRef} className="relative" style={{ width, minHeight: inkHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <div
          className="font-sans text-slate-800 dark:text-slate-100"
          style={{ padding, fontSize, lineHeight: `${lineHeight}px`, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', minHeight: 1 }}
        >
          {text}
        </div>
        <img src={src} alt="Handwritten notes" className="absolute top-0 left-0 pointer-events-none select-none" style={{ width }} draggable={false}
          onLoad={(e) => setInkHeight((e.currentTarget.naturalHeight * width) / (e.currentTarget.naturalWidth || width))} />
      </div>
    </div>
  )
}
