import { useEffect, useRef, useState } from 'react'
import { FolderOpen, Film, Images, Loader2, Trash2, Upload, X } from 'lucide-react'
import { api } from '../api'

const MEDIA_RE = /\.(jpe?g|png|bmp|webp|tiff?|mp4|mov|avi|mkv|webm)$/i

// Recursively collect files from a dropped folder.
async function filesFromDrop(dataTransfer) {
  const entries = [...dataTransfer.items].map((i) => i.webkitGetAsEntry?.()).filter(Boolean)
  if (!entries.length) return { files: [...dataTransfer.files], folder: null }
  const files = []
  const walk = async (entry) => {
    if (entry.isFile) {
      files.push(await new Promise((res, rej) => entry.file(res, rej)))
    } else if (entry.isDirectory) {
      const reader = entry.createReader()
      let batch
      do {
        batch = await new Promise((res, rej) => reader.readEntries(res, rej))
        for (const e of batch) await walk(e)
      } while (batch.length)
    }
  }
  for (const e of entries) await walk(e)
  const folder = entries.length === 1 && entries[0].isDirectory ? entries[0].name : null
  return { files, folder }
}

const slug = (s) => s.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9 _.-]+/g, '-').replace(/^[^A-Za-z0-9]+/, '').slice(0, 60)

function uniqueName(base, taken) {
  let name = base || 'project'
  for (let i = 2; taken.has(name); i++) name = `${base}-${i}`
  return name
}

export default function ProjectPicker({ projects, current, onOpen, onClose, onChanged }) {
  const [pending, setPending] = useState(null) // { files, name }
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const folderInput = useRef(null)
  const filesInput = useRef(null)
  const taken = new Set(projects.map((p) => p.name))

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const stage = (files, folder) => {
    const media = files.filter((f) => MEDIA_RE.test(f.name))
    if (!media.length) { setError('No images or video found in that selection.'); return }
    setError(null)
    const base = slug(folder || media[0].webkitRelativePath?.split('/')[0] || media[0].name)
    setPending({ files: media, name: uniqueName(base, taken) })
  }

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      const project = await api.createProject(pending.name.trim(), pending.files)
      setPending(null)
      await onChanged()
      onOpen(project.name)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (name) => {
    if (!window.confirm(`Delete project "${name}" and all its annotations?`)) return
    await api.deleteProject(name)
    await onChanged()
  }

  const videos = pending?.files.filter((f) => /\.(mp4|mov|avi|mkv|webm)$/i.test(f.name)) ?? []

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/80 p-6 backdrop-blur-sm">
      <div className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {onClose && (
          <button className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-200" onClick={onClose}><X size={18} /></button>
        )}
        <div className="border-b border-zinc-800 px-6 py-4">
          <h2 className="text-base font-semibold text-zinc-100">Projects</h2>
          <p className="text-sm text-zinc-500">A project is one image sequence or video. Everything saves automatically.</p>
        </div>

        <div className="scroll-thin grid gap-6 overflow-y-auto p-6 md:grid-cols-[1fr_1fr]">
          {/* New project */}
          <div>
            <div className="panel-title mb-2">New project</div>
            {!pending ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={async (e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const { files, folder } = await filesFromDrop(e.dataTransfer)
                  stage(files, folder)
                }}
                className={`flex h-56 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed text-center transition-colors ${
                  dragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700'
                }`}
              >
                <Upload className="text-zinc-500" size={26} />
                <div className="text-sm text-zinc-300">Drop a folder of frames, images, or a video</div>
                <div className="flex gap-2">
                  <button className="btn" onClick={() => folderInput.current.click()}><FolderOpen size={15} /> Folder</button>
                  <button className="btn" onClick={() => filesInput.current.click()}><Images size={15} /> Files / video</button>
                </div>
                <input ref={folderInput} type="file" className="hidden" webkitdirectory="" directory=""
                  onChange={(e) => { stage([...e.target.files], null); e.target.value = '' }} />
                <input ref={filesInput} type="file" className="hidden" multiple accept="image/*,video/*"
                  onChange={(e) => { stage([...e.target.files], null); e.target.value = '' }} />
              </div>
            ) : (
              <div className="flex h-56 flex-col justify-between rounded-lg border border-zinc-700 p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    {videos.length ? <Film size={16} /> : <Images size={16} />}
                    {videos.length
                      ? `Video: ${videos[0].name} (frames are extracted on upload)`
                      : `${pending.files.length} images, ordered by filename`}
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs text-zinc-500">Name</span>
                    <input className="input w-full" value={pending.name} autoFocus
                      onChange={(e) => setPending({ ...pending, name: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && !busy && create()} />
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button className="btn btn-ghost" disabled={busy} onClick={() => setPending(null)}>Cancel</button>
                  <button className="btn btn-primary" disabled={busy || !pending.name.trim()} onClick={create}>
                    {busy && <Loader2 size={15} className="animate-spin" />} {busy ? 'Uploading…' : 'Create project'}
                  </button>
                </div>
              </div>
            )}
            {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
          </div>

          {/* Existing */}
          <div className="min-h-0">
            <div className="panel-title mb-2">Open</div>
            {projects.length === 0 ? (
              <div className="flex h-56 items-center justify-center rounded-lg border border-zinc-800 text-sm text-zinc-500">No projects yet</div>
            ) : (
              <ul className="space-y-1">
                {projects.map((p) => (
                  <li key={p.name}>
                    <div className={`group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-zinc-800 ${
                      p.name === current ? 'bg-zinc-800/70' : ''}`} onClick={() => onOpen(p.name)}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-zinc-100">{p.name}</div>
                        <div className="text-xs text-zinc-500">
                          {p.frameCount} frames · {p.annotatedCount} labelled
                          {p.created && ` · ${new Date(p.created).toLocaleDateString()}`}
                        </div>
                      </div>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full bg-emerald-500" style={{ width: `${(100 * p.annotatedCount) / Math.max(1, p.frameCount)}%` }} />
                      </div>
                      <button className="text-zinc-600 opacity-0 hover:text-red-400 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); remove(p.name) }} title="Delete project">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
