import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Upload, Check, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const STYLES = ['adventurer', 'avataaars', 'bottts', 'fun-emoji', 'lorelei', 'micah', 'notionists', 'pixel-art']
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_DATA_URL_CHARS = 300 * 1024
const OUTPUT_SIZE = 256

const dicebearUrl = (style, seed) => `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`

const buildPresets = (name) => {
  const base = (name || 'Aspirant').trim() || 'Aspirant'
  return Array.from({ length: 12 }, (_, i) => {
    const style = STYLES[i % STYLES.length]
    const seed = i < STYLES.length ? base : `${base}-${i - STYLES.length + 2}`
    return { url: dicebearUrl(style, seed), label: `${style} avatar ${i + 1}` }
  })
}

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => resolve(img)
  img.onerror = () => reject(new Error('Could not read that image.'))
  img.src = src
})

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('Could not read that file.'))
  reader.readAsDataURL(file)
})

const fileToSquareJpeg = async (file) => {
  const src = await readFileAsDataUrl(file)
  const img = await loadImage(src)
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const sx = (img.naturalWidth - side) / 2
  const sy = (img.naturalHeight - side) / 2
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  for (const quality of [0.85, 0.7, 0.5]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrl.length <= MAX_DATA_URL_CHARS) return dataUrl
  }
  throw new Error('That image is too large even after compression. Try a different photo.')
}

export default function AvatarPicker({ user, onSave }) {
  const name = user?.name || 'Aspirant'
  const fallback = dicebearUrl('adventurer', name)
  const current = user?.avatar || ''
  const presets = useMemo(() => buildPresets(name), [name])

  const [selection, setSelection] = useState(current || fallback)
  const [uploaded, setUploaded] = useState(null)
  const [status, setStatus] = useState(null) // { type: 'success' | 'error', text }
  const [isSaving, setIsSaving] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setSelection(current || fallback)
  }, [current, fallback])

  const pick = (url) => {
    setSelection(url)
    setStatus(null)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setStatus(null)
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setStatus({ type: 'error', text: 'Please choose a PNG, JPEG or WebP image.' })
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setStatus({ type: 'error', text: 'That file is over 5 MB. Please choose a smaller image.' })
      return
    }
    setIsProcessing(true)
    try {
      const dataUrl = await fileToSquareJpeg(file)
      setUploaded(dataUrl)
      setSelection(dataUrl)
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Could not process that image.' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setStatus(null)
    try {
      const result = await onSave(selection)
      if (result?.success) {
        setStatus({ type: 'success', text: 'Saved' })
      } else {
        setStatus({ type: 'error', text: result?.error || 'Could not save your picture.' })
      }
    } catch (err) {
      setStatus({ type: 'error', text: err?.message || 'Could not save your picture.' })
    } finally {
      setIsSaving(false)
    }
  }

  const isUnchanged = selection === (current || fallback) && Boolean(current)
  const tileClass = (url) => `relative aspect-square rounded-full overflow-hidden border bg-slate-50 dark:bg-slate-900 transition-all ${
    selection === url
      ? 'ring-2 ring-primary ring-offset-2 ring-offset-card-light dark:ring-offset-card-dark border-primary'
      : 'border-border-light dark:border-border-dark hover:border-primary/60'
  }`

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <img
          src={selection || fallback}
          alt="Selected profile picture"
          className="h-24 w-24 rounded-full object-cover border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-900 shadow-soft shrink-0"
          referrerPolicy="no-referrer"
        />
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-btn transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 disabled:opacity-60"
          >
            {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            <span>Upload photo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          {user?.googleAvatar && (
            <button
              type="button"
              onClick={() => pick(user.googleAvatar)}
              className={`px-3 py-2 text-xs font-bold rounded-btn border transition-colors flex items-center gap-2 ${
                selection === user.googleAvatar
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <img src={user.googleAvatar} alt="Google profile photo" className="h-5 w-5 rounded-full object-cover" referrerPolicy="no-referrer" />
              <span>Use Google photo</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-500 uppercase block">Choose an avatar</span>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {uploaded && (
            <button type="button" onClick={() => pick(uploaded)} className={tileClass(uploaded)} title="Uploaded photo">
              <img src={uploaded} alt="Uploaded photo" className="h-full w-full object-cover" />
            </button>
          )}
          {presets.map((preset) => (
            <button
              key={preset.url}
              type="button"
              onClick={() => pick(preset.url)}
              className={tileClass(preset.url)}
              title={preset.label}
            >
              <img src={preset.url} alt={preset.label} loading="lazy" className="h-full w-full object-cover" />
              {selection === preset.url && (
                <span className="absolute bottom-0 right-0 m-0.5 p-0.5 rounded-full bg-primary text-white">
                  <Check size={10} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isUnchanged || isSaving || isProcessing}
          className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-btn transition-colors shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center gap-1.5"
        >
          {isSaving && <Loader2 size={13} className="animate-spin" />}
          <span>Save picture</span>
        </button>
        {status?.type === 'success' && (
          <span className="text-xs font-semibold text-success flex items-center gap-1">
            <CheckCircle size={14} />
            <span>{status.text}</span>
          </span>
        )}
        {status?.type === 'error' && (
          <span className="text-xs font-semibold text-error flex items-center gap-1" role="alert">
            <AlertCircle size={14} />
            <span>{status.text}</span>
          </span>
        )}
      </div>
    </div>
  )
}
