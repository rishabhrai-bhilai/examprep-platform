// The coaching workspace the admin is looking at: the demo centre ("demo") or a
// real centre. Every page reads /api/coaching/:cid/..., so the same pages show
// demo or real data.
import { useCallback, useEffect, useState } from 'react'
import { create } from 'zustand'
import { api } from '../lib/api'

export const useWorkspace = create((set, get) => ({
  cid: null,
  info: null,
  error: '',
  batchId: '',
  load: async (cid, force = false) => {
    if (!force && get().cid === cid && get().info) return
    if (get().cid !== cid) set({ cid, info: null, error: '', batchId: '' })
    try {
      set({ info: await api(`/api/coaching/${cid}/workspace`), error: '' })
    } catch (err) {
      set({ error: err.message })
    }
  },
  setBatch: (batchId) => set({ batchId })
}))

export const cpath = (cid, path) => `/api/coaching/${cid}${path}`
export const capi = (cid, path, opts) => api(cpath(cid, path), opts)

const qs = (params) => {
  const p = Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== null && v !== '')
  return p.length ? `?${new URLSearchParams(p).toString()}` : ''
}

// GET a workspace path; reloads when the path, params or `refresh` change
export function useCoaching(path, params = {}, refresh = 0) {
  const cid = useWorkspace(s => s.cid)
  const key = `${cid}${path}${qs(params)}`
  const [state, setState] = useState({ data: null, error: '', loading: true })
  const reload = useCallback(() => {
    if (!cid) return
    setState(s => ({ ...s, loading: true }))
    api(cpath(cid, path) + qs(params))
      .then(data => setState({ data, error: '', loading: false }))
      .catch(err => setState({ data: null, error: err.message, loading: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => { reload() }, [reload, refresh])
  return { ...state, reload }
}

export const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`)
export const fmtSec = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`)
export const toLocalInput = (t) => {
  if (!t) return ''
  const d = new Date(t)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const letter = (i) => String.fromCharCode(65 + Number(i))
export const answerText = (q, answer = q.answer) => {
  if (answer === null || answer === undefined) return '–'
  if (q.type === 'NAT') return String(answer)
  return [].concat(answer).map(letter).join(', ')
}
