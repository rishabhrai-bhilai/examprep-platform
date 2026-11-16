// 10. Notice board
import { useState } from 'react'
import { Plus, Pencil, Trash2, Pin, PinOff, Check, Loader2, Megaphone } from 'lucide-react'
import { capi, useCoaching, useWorkspace, toLocalInput } from '../api'
import { Load, PageTitle, Panel } from '../kit'
import { inputCls, btnPrimary, btnGhost, Pill, ErrorBox, fmtDate, fmtDateTime } from '../../components/ui'

function NoticeForm({ n, onDone, onCancel }) {
  const { cid, info } = useWorkspace()
  const [f, setF] = useState({ title: n?.title || '', body: n?.body || '', batchIds: n?.batchIds || [], pinned: n?.pinned || false, priority: n?.priority || 'normal', author: n?.author || '', expiresAt: toLocalInput(n?.expiresAt || '') })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await capi(cid, n ? `/notices/${n.id}` : '/notices', { method: n ? 'PATCH' : 'POST', body: { ...f, author: f.author || undefined, expiresAt: f.expiresAt ? new Date(f.expiresAt).getTime() : null } })
      onDone()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={save} className="space-y-3 p-4 rounded-2xl border border-primary/30 bg-primary/5">
      <input className={inputCls} placeholder="Title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} aria-label="Title" />
      <textarea className={`${inputCls} min-h-24`} placeholder="Message" value={f.body} onChange={e => setF({ ...f, body: e.target.value })} aria-label="Message" />
      <div className="grid md:grid-cols-3 gap-2">
        <input className={inputCls} placeholder="From (e.g. Centre office)" value={f.author} onChange={e => setF({ ...f, author: e.target.value })} aria-label="From" />
        <label className="flex items-center gap-2 text-xs"><span className="text-slate-500 font-bold whitespace-nowrap">Hide after</span><input type="datetime-local" className={inputCls} value={f.expiresAt} onChange={e => setF({ ...f, expiresAt: e.target.value })} aria-label="Hide after" /></label>
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.pinned} onChange={e => setF({ ...f, pinned: e.target.checked })} /> Pin to top</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.priority === 'important'} onChange={e => setF({ ...f, priority: e.target.checked ? 'important' : 'normal' })} /> Important</label>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="text-[11px] font-bold text-slate-500 self-center">For (none = everyone):</span>
        {info.batches.map(b => (
          <label key={b.id} className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold cursor-pointer ${f.batchIds.includes(b.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border-light dark:border-border-dark text-slate-500'}`}>
            <input type="checkbox" className="sr-only" checked={f.batchIds.includes(b.id)} onChange={e => setF({ ...f, batchIds: e.target.checked ? [...f.batchIds, b.id] : f.batchIds.filter(x => x !== b.id) })} />{b.name}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={busy}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {n ? 'Save notice' : 'Post notice'}</button>
        <button type="button" className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
      <ErrorBox>{error}</ErrorBox>
    </form>
  )
}

export default function Notices() {
  const { cid, batchId, info } = useWorkspace()
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState(null)
  const state = useCoaching('/notices', {}, refresh)
  const changed = () => { setEditing(null); setRefresh(x => x + 1) }
  const pin = async (n) => { await capi(cid, `/notices/${n.id}`, { method: 'PATCH', body: { pinned: !n.pinned } }); changed() }
  const remove = async (n) => {
    if (!window.confirm(`Delete "${n.title}"?`)) return
    await capi(cid, `/notices/${n.id}`, { method: 'DELETE' })
    changed()
  }
  return (
    <div className="space-y-6">
      <PageTitle title="Notice board" subtitle={info.centre.demo ? 'Announcements for the whole centre or chosen batches' : 'Announcements for the whole centre or chosen batches (showing them on the student site is the next step)'}
        right={editing !== 'new' && <button className={btnPrimary} onClick={() => setEditing('new')}><Plus size={13} /> New notice</button>} />
      {editing === 'new' && <NoticeForm onDone={changed} onCancel={() => setEditing(null)} />}
      <Load state={state}>{(d) => {
        const rows = d.notices.filter(n => !batchId || !n.batchIds.length || n.batchIds.includes(batchId))
        return (
          <div className="grid md:grid-cols-2 gap-4">
            {rows.map(n => editing === n.id ? <div key={n.id} className="md:col-span-2"><NoticeForm n={n} onDone={changed} onCancel={() => setEditing(null)} /></div> : (
              <Panel key={n.id} className={`${n.expired ? 'opacity-60' : ''} ${n.priority === 'important' && !n.expired ? 'ring-1 ring-amber-500/40' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Megaphone size={14} className="text-primary" />
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{n.title}</h3>
                      {n.pinned && <Pill tone="info"><Pin size={10} /> Pinned</Pill>}
                      {n.priority === 'important' && <Pill tone="warning">Important</Pill>}
                      {n.expired && <Pill tone="muted">Expired</Pill>}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{n.author} · {fmtDateTime(n.createdAt)} · {n.batches.join(', ') || 'Everyone'}{n.expiresAt ? ` · until ${fmtDate(n.expiresAt)}` : ''}</p>
                  </div>
                  <span className="flex gap-2 text-slate-400 shrink-0">
                    <button onClick={() => pin(n)} className="hover:text-primary" aria-label={n.pinned ? 'Unpin' : 'Pin'}>{n.pinned ? <PinOff size={13} /> : <Pin size={13} />}</button>
                    <button onClick={() => setEditing(n.id)} className="hover:text-primary" aria-label={`Edit ${n.title}`}><Pencil size={13} /></button>
                    <button onClick={() => remove(n)} className="hover:text-rose-600" aria-label={`Delete ${n.title}`}><Trash2 size={13} /></button>
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 whitespace-pre-line">{n.body}</p>
              </Panel>
            ))}
            {!rows.length && <p className="text-xs text-slate-400">No notices.</p>}
          </div>
        )
      }}</Load>
    </div>
  )
}
