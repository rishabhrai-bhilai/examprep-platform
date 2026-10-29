import { useRef } from 'react'

// Scrolling past the end of a question's card moves to the next one (and past
// the top to the previous one), with the wheel, a swipe, or the arrow keys.
// Used by PYQ practice and both mock-test screens.

const EDGE = 2
export const isAtTop = (el) => el.scrollTop <= EDGE
export const isAtBottom = (el) => el.scrollHeight - el.scrollTop <= el.clientHeight + EDGE

const WHEEL_DISTANCE = 350
const SWIPE_DISTANCE = 60
// Wheel events further apart than this start a new gesture
const GESTURE_GAP_MS = 200

export default function useReelGestures(containerRef, { onNext, onPrev, disabled }) {
  const wheelRef = useRef({ total: 0, last: 0, startedAtTop: false, startedAtBottom: false })
  const touchRef = useRef(null)

  // Only a gesture that starts at the edge counts. Otherwise the momentum of a
  // fast scroll that just reached the end would skip straight to the next question.
  const onWheel = (e) => {
    const el = containerRef.current
    const wheel = wheelRef.current
    const now = Date.now()
    if (!el || disabled) {
      wheel.total = 0
      wheel.last = now
      return
    }
    if (now - wheel.last > GESTURE_GAP_MS) {
      wheel.total = 0
      wheel.startedAtTop = isAtTop(el)
      wheel.startedAtBottom = isAtBottom(el)
    }
    wheel.last = now

    const down = e.deltaY > 0
    if ((down && wheel.startedAtBottom && isAtBottom(el)) || (!down && wheel.startedAtTop && isAtTop(el))) {
      wheel.total += Math.abs(e.deltaY)
      if (wheel.total >= WHEEL_DISTANCE) {
        wheel.total = 0
        wheel.startedAtTop = false
        wheel.startedAtBottom = false
        if (down) onNext()
        else onPrev()
      }
    } else {
      wheel.total = 0
    }
  }

  // Same for swipes: one that scrolls a long question to its end doesn't also turn the page
  const onTouchStart = (e) => {
    const el = containerRef.current
    touchRef.current = el
      ? { y: e.touches[0].clientY, atTop: isAtTop(el), atBottom: isAtBottom(el) }
      : null
  }

  const onTouchEnd = (e) => {
    const el = containerRef.current
    const start = touchRef.current
    touchRef.current = null
    if (!el || !start || disabled) return

    const deltaY = start.y - e.changedTouches[0].clientY
    if (deltaY > SWIPE_DISTANCE && start.atBottom && isAtBottom(el)) onNext()
    else if (deltaY < -SWIPE_DISTANCE && start.atTop && isAtTop(el)) onPrev()
  }

  return { onWheel, onTouchStart, onTouchEnd }
}
