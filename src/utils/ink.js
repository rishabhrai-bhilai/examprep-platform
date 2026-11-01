// Ink drawn over a post in the rich text editor (OneNote-style).
//
// The ink is one transparent PNG the size of the writing area, anchored at its top
// left, appended to the markdown as:
//   ![ink|w:640|fs:14|lh:22.75|p:16](data:image/png;base64,...)
// w is the writing area's width and fs/lh/p its font size, line height and padding
// (px), so the post can be shown with the text laid out exactly as it was typed and
// the ink on top, in the same spot.

const INK_RE = /\n*!\[ink\|([^\]]*)\]\((data:image\/png;base64,[A-Za-z0-9+/=]+)\)\s*$/

export const buildInkToken = ({ src, width, fontSize, lineHeight, padding }) =>
  `![ink|w:${Math.round(width)}|fs:${fontSize}|lh:${lineHeight}|p:${padding}](${src})`

// { text, src, width, fontSize, lineHeight, padding } or null when there's no ink
export function parseInk(content) {
  if (typeof content !== 'string') return null
  const m = content.match(INK_RE)
  if (!m) return null
  const opts = Object.fromEntries(m[1].split('|').map(part => part.split(':')).filter(p => p.length === 2).map(([k, v]) => [k, Number(v)]))
  if (!(opts.w > 0)) return null
  return {
    text: content.slice(0, m.index),
    src: m[2],
    width: opts.w,
    fontSize: opts.fs > 0 ? opts.fs : 14,
    lineHeight: opts.lh > 0 ? opts.lh : 22,
    padding: opts.p >= 0 ? opts.p : 16
  }
}

const loadImage = (src) => new Promise((resolve) => {
  const el = new window.Image()
  el.crossOrigin = 'anonymous'
  el.onload = () => resolve(el)
  el.onerror = () => resolve(null)
  el.src = src
})

// Draws strokes and placed images onto a transparent canvas `width` wide, anchored at
// (0, 0) like the writing area, and only as tall as the lowest mark
export async function renderInkOverlay(width, strokes = [], images = []) {
  const loaded = []
  let bottom = 0
  for (const item of images) {
    if (!item.src) continue
    const el = await loadImage(item.src)
    if (!el) continue
    const w = item.width || Math.min(el.naturalWidth || 320, width)
    const h = item.height || Math.round((w * (el.naturalHeight || 1)) / (el.naturalWidth || 1))
    loaded.push({ el, x: item.x || 0, y: item.y || 0, w, h })
    bottom = Math.max(bottom, (item.y || 0) + h)
  }
  const drawn = strokes.filter(s => s.points?.length)
  for (const s of drawn) {
    const pad = (s.size || 3) * (s.isEraser ? 4 : 1)
    for (const p of s.points) bottom = Math.max(bottom, p.y + pad)
  }
  if (!loaded.length && !drawn.length) return null

  const scale = 1.5
  const height = Math.ceil(bottom + 8)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  for (const img of loaded) ctx.drawImage(img.el, img.x, img.y, img.w, img.h)
  for (const s of drawn) {
    ctx.save()
    ctx.strokeStyle = s.color || '#6366f1'
    ctx.lineWidth = (s.size || 3) * (s.isEraser ? 4 : 1)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = s.isEraser ? 'destination-out' : 'source-over'
    ctx.beginPath()
    ctx.moveTo(s.points[0].x, s.points[0].y)
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y)
    ctx.stroke()
    ctx.restore()
  }
  return { src: canvas.toDataURL('image/png'), width, height }
}
