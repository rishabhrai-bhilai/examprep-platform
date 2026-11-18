import { useEffect, useRef } from 'react'

// Open dialogs, newest last: only the top one reacts to keys
const stack = []

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

// Makes a popup behave like a dialog for keyboard users: Escape closes it,
// focus moves into it and stays inside while Tabbing, and goes back to
// whatever was focused before when it closes.
// Returns a ref to put on the popup's container.
export default function useDialog(open, onClose, { initialFocus } = {}) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const before = document.activeElement
    const box = ref.current
    const focusables = () => (box ? [...box.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement) : [])

    // Move focus in, unless something inside already has it
    const t = setTimeout(() => {
      if (!box || box.contains(document.activeElement)) return
      const target = (initialFocus && box.querySelector(initialFocus)) || focusables()[0] || box
      if (target === box && !box.hasAttribute('tabindex')) box.setAttribute('tabindex', '-1')
      target.focus?.()
    }, 0)

    const token = {}
    stack.push(token)
    const onKey = (e) => {
      if (stack[stack.length - 1] !== token) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current?.()
        return
      }
      if (e.key !== 'Tab' || !box) return
      const list = focusables()
      if (!list.length) { e.preventDefault(); return }
      const first = list[0], last = list[list.length - 1]
      if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); return }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      clearTimeout(t)
      stack.splice(stack.indexOf(token), 1)
      document.removeEventListener('keydown', onKey, true)
      if (before && typeof before.focus === 'function' && document.contains(before)) before.focus()
    }
  }, [open, initialFocus])

  return ref
}
