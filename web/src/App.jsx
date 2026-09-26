import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check, CircleAlert, Download, FolderOpen, Keyboard, Loader2, Maximize, MousePointer2,
  Pentagon, Redo2, Undo2, Wand2,
} from 'lucide-react'
import { api } from './api'
import { useAnnotations } from './useAnnotations'
import Viewer from './components/Viewer'
import ObjectPanel from './components/ObjectPanel'
import FrameStrip from './components/FrameStrip'
import ProjectPicker from './components/ProjectPicker'
import ShortcutHelp from './components/ShortcutHelp'

const TOOLS = [
  { id: 'magic', key: 'R', icon: Wand2, label: 'Magic (RITM)' },
  { id: 'polygon', key: 'P', icon: Pentagon, label: 'Polygon' },
  { id: 'select', key: 'V', icon: MousePointer2, label: 'Select & edit' },
]
const EMPTY_RITM = { polygons: [], clicks: [] }

function readHash() {
  const [, project, frame] = window.location.hash.match(/^#\/([^/]+)(?:\/(\d+))?/) || []
  return { project: project ? decodeURIComponent(project) : null, frame: frame ? Number(frame) - 1 : 0 }
}

function nextObjectId(objects) {
  const max = Math.max(0, ...objects.map((o) => Number(/(\d+)$/.exec(o.id)?.[1] || 0)))
  return `Object-${max + 1}`
}

function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const show = useCallback((text, kind = 'info') => {
    setToast({ text, kind })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), kind === 'error' ? 6000 : 2500)
  }, [])
  return [toast, show]
}

export default function App() {
  const initial = useMemo(readHash, [])
  const [status, setStatus] = useState(null)
  const [projects, setProjects] = useState(null)
  const [projectName, setProjectName] = useState(initial.project || localStorage.getItem('prism.project'))
  const [project, setProject] = useState(null) // summary
  const [index, setIndex] = useState(initial.frame)
  const [showPicker, setShowPicker] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const [tool, setTool] = useState('magic')
  const [selectedId, setSelectedId] = useState(null)
  const [hidden, setHidden] = useState(() => new Set())
  const [activeClass, setActiveClass] = useState(() => localStorage.getItem('prism.class') || '1')
  const [ritm, setRitm] = useState(EMPTY_RITM)
  const [ritmBusy, setRitmBusy] = useState(false)
  const [trackCount, setTrackCount] = useState(10)
  const [tracking, setTracking] = useState(false)
  const [fitSignal, setFitSignal] = useState(0)
  const [toast, showToast] = useToast()

  const frames = project?.frames ?? []
  const frame = frames[index]?.name
  const remaining = Math.max(0, frames.length - index - 1)

  // ---- data -------------------------------------------------------------
  const refreshProjects = useCallback(async () => setProjects(await api.projects()), [])
  useEffect(() => { refreshProjects() }, [refreshProjects])

  useEffect(() => {
    let timer
    const poll = async () => {
      try {
        const s = await api.status()
        setStatus(s)
        if (s.ritm === 'loading' || s.xmem === 'loading') timer = setTimeout(poll, 1500)
      } catch {
        setStatus({ offline: true })
        timer = setTimeout(poll, 3000)
      }
    }
    poll()
    return () => clearTimeout(timer)
  }, [])

  const loadProject = useCallback(async (name) => {
    try {
      setProject(await api.project(name))
    } catch (e) {
      setProject(null)
      setProjectName(null)
      showToast(e.message, 'error')
    }
  }, [showToast])

  useEffect(() => {
    if (projectName) loadProject(projectName)
    else setProject(null)
  }, [projectName, loadProject])

  // No project chosen (or none exist): open the picker instead of an empty workspace.
  useEffect(() => {
    if (projects && !projectName) setShowPicker(true)
  }, [projects, projectName])

  useEffect(() => {
    if (!projectName) return
    localStorage.setItem('prism.project', projectName)
    const hash = `#/${encodeURIComponent(projectName)}/${index + 1}`
    if (window.location.hash !== hash) window.history.replaceState(null, '', hash)
  }, [projectName, index])

  useEffect(() => { localStorage.setItem('prism.class', activeClass) }, [activeClass])

  const markAnnotated = useCallback((name, annotated) => {
    setProject((p) => p && ({ ...p, frames: p.frames.map((f) => f.name === name ? { ...f, annotated } : f) }))
  }, [])

  const { objects, saveState, commit, undo, redo, reload, flush } = useAnnotations(projectName, frame, markAnnotated)

  // ---- navigation -------------------------------------------------------
  const goTo = useCallback((i) => {
    if (!frames.length) return
    setIndex(Math.max(0, Math.min(frames.length - 1, i)))
  }, [frames.length])

  useEffect(() => { if (frames.length && index >= frames.length) setIndex(frames.length - 1) }, [frames.length, index])

  // New frame: drop per-frame UI state and the server-side RITM session.
  useEffect(() => {
    setSelectedId(null)
    setHidden(new Set())
    setRitm(EMPTY_RITM)
    api.ritmReset().catch(() => {})
  }, [projectName, frame])

  const openProject = (name) => {
    setShowPicker(false)
    if (name !== projectName) {
      setIndex(0)
      setProjectName(name)
    }
  }

  // ---- editing ----------------------------------------------------------
  const updateObject = useCallback((id, patch) => {
    commit((objs) => objs.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }, [commit])

  const deleteObject = useCallback((id) => {
    commit((objs) => objs.filter((o) => o.id !== id))
    setSelectedId((s) => (s === id ? null : s))
  }, [commit])

  const addObject = useCallback((polygons) => {
    const id = nextObjectId(objects)
    commit((objs) => [...objs, { id, name: `Object ${id.split('-')[1]}`, className: activeClass, polygons }])
    setSelectedId(id)
    return id
  }, [commit, objects, activeClass])

  const addPolygon = useCallback((points) => {
    // With an object selected, a new polygon becomes another part of it.
    if (selectedId && objects.some((o) => o.id === selectedId)) {
      commit((objs) => objs.map((o) => (o.id === selectedId ? { ...o, polygons: [...o.polygons, points] } : o)))
    } else {
      addObject([points])
    }
  }, [selectedId, objects, commit, addObject])

  // ---- RITM -------------------------------------------------------------
  const ritmRequest = useRef(Promise.resolve())
  const ritmCall = useCallback((fn) => {
    // Serialise clicks so rapid clicking can't reorder the server's click history.
    ritmRequest.current = ritmRequest.current.then(async () => {
      setRitmBusy(true)
      try {
        setRitm(await fn())
      } catch (e) {
        showToast(e.message, 'error')
      } finally {
        setRitmBusy(false)
      }
    })
  }, [showToast])

  const onRitmClick = useCallback((x, y, positive) => {
    if (status?.ritm !== 'ready') { showToast('RITM model is still loading…'); return }
    ritmCall(() => api.ritmClick(projectName, frame, x, y, positive))
  }, [status, projectName, frame, ritmCall, showToast])

  const clearRitm = useCallback(() => {
    setRitm(EMPTY_RITM)
    api.ritmReset().catch(() => {})
  }, [])

  const acceptRitm = useCallback((intoSelected) => {
    if (!ritm.polygons.length) return
    if (intoSelected && selectedId && objects.some((o) => o.id === selectedId)) {
      commit((objs) => objs.map((o) => (o.id === selectedId ? { ...o, polygons: [...o.polygons, ...ritm.polygons] } : o)))
    } else {
      addObject(ritm.polygons)
    }
    clearRitm()
  }, [ritm, selectedId, objects, commit, addObject, clearRitm])

  // ---- XMem -------------------------------------------------------------
  const track = useCallback(async () => {
    if (!objects.length || !remaining || tracking) return
    const count = Math.min(trackCount, remaining)
    setTracking(true)
    try {
      await flush()
      const { frames: written } = await api.propagate(projectName, frame, count)
      await loadProject(projectName)
      showToast(`Tracked ${objects.length} object${objects.length === 1 ? '' : 's'} through ${written.length} frame${written.length === 1 ? '' : 's'}`, 'success')
      goTo(index + 1)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setTracking(false)
    }
  }, [objects, remaining, tracking, trackCount, flush, projectName, frame, loadProject, showToast, goTo, index])

  // ---- keyboard ---------------------------------------------------------
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || showPicker) return
      if (e.target.closest?.('input, textarea, select')) return
      const mod = e.metaKey || e.ctrlKey
      const k = e.key.toLowerCase()
      const hasRitm = tool === 'magic' && ritm.clicks.length > 0

      if (mod && k === 'z') {
        if (hasRitm && !e.shiftKey) ritmCall(() => api.ritmUndo(projectName, frame))
        else if (e.shiftKey) redo()
        else undo()
      } else if (mod && k === 'y') redo()
      else if (mod) return
      else if (k === 'arrowleft' || k === 'a') goTo(index - 1)
      else if (k === 'arrowright' || k === 'd') goTo(index + 1)
      else if (k === 'home') goTo(0)
      else if (k === 'end') goTo(frames.length - 1)
      else if (k === 'v' || k === 'p' || k === 'r') setTool({ v: 'select', p: 'polygon', r: 'magic' }[k])
      else if (k === 'enter' && hasRitm) acceptRitm(e.shiftKey)
      else if (k === 'escape') { if (hasRitm) clearRitm(); else setSelectedId(null) }
      else if ((k === 'delete' || k === 'backspace') && selectedId) deleteObject(selectedId)
      else if (k === 'h' && selectedId) setHidden((h) => { const n = new Set(h); n.has(selectedId) ? n.delete(selectedId) : n.add(selectedId); return n })
      else if (k === 't') track()
      else if (k === 'f') setFitSignal((n) => n + 1)
      else if (/^[1-8]$/.test(k)) { if (selectedId) updateObject(selectedId, { className: k }); else setActiveClass(k) }
      else if (k === '?' || (k === '/' && e.shiftKey)) setShowHelp((s) => !s)
      else if (k === 'tab') { e.preventDefault(); if (objects.length) { const i = objects.findIndex((o) => o.id === selectedId); setSelectedId(objects[(i + (e.shiftKey ? -1 : 1) + objects.length) % objects.length].id) } }
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showPicker, tool, ritm, projectName, frame, index, frames.length, selectedId, objects,
    ritmCall, undo, redo, goTo, acceptRitm, clearRitm, deleteObject, updateObject, track])

  // ---- render -----------------------------------------------------------
  const modelsReady = status?.ritm === 'ready' && status?.xmem === 'ready'

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-3">
        <div className="flex items-center gap-2 pr-2">
          <div className="h-5 w-5 rounded bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-amber-300" />
          <span className="text-sm font-semibold tracking-tight">Prism</span>
        </div>
        <button className="btn btn-ghost max-w-[16rem]" onClick={() => setShowPicker(true)} title="Projects">
          <FolderOpen size={15} /> <span className="truncate">{projectName || 'Open project'}</span>
        </button>
        {frame && (
          <span className="truncate font-mono text-xs text-zinc-500">
            {frame}{frames[index]?.source && frames[index].source !== frame ? ` · ${frames[index].source}` : ''}
          </span>
        )}
        <div className="flex-1" />
        {projectName && <SaveIndicator state={saveState} />}
        <ModelStatus status={status} />
        {projectName && (
          <a className="btn" href={api.exportUrl(projectName)} onClick={() => flush()} title="Download annotations + masks">
            <Download size={15} /> Export
          </a>
        )}
        <button className="btn btn-ghost" onClick={() => setShowHelp(true)} title="Shortcuts (?)"><Keyboard size={16} /></button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Tool rail */}
        <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-zinc-800 bg-zinc-900 py-2">
          {TOOLS.map(({ id, key, icon: Icon, label }) => (
            <button key={id} onClick={() => setTool(id)} title={`${label} (${key})`}
              className={`relative flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                tool === id ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}>
              <Icon size={18} />
              <span className="absolute bottom-0.5 right-1 font-mono text-[9px] opacity-60">{key}</span>
            </button>
          ))}
          <div className="my-1 h-px w-6 bg-zinc-800" />
          <RailButton icon={Undo2} label="Undo (⌘Z)" onClick={undo} />
          <RailButton icon={Redo2} label="Redo (⇧⌘Z)" onClick={redo} />
          <RailButton icon={Maximize} label="Fit to screen (F)" onClick={() => setFitSignal((n) => n + 1)} />
        </nav>

        {/* Canvas */}
        <main className="relative min-w-0 flex-1">
          {frame ? (
            <Viewer
              imageUrl={api.imageUrl(projectName, frame)}
              objects={objects}
              hidden={hidden}
              selectedId={selectedId}
              tool={tool}
              ritm={ritm}
              fitSignal={fitSignal}
              onSelect={setSelectedId}
              onChangeObject={(id, polygons) => updateObject(id, { polygons })}
              onAddPolygon={addPolygon}
              onRitmClick={onRitmClick}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              {projectName ? 'Loading…' : 'Open or create a project to start'}
            </div>
          )}
          {frame && <ToolHint tool={tool} ritm={ritm} busy={ritmBusy} selected={!!selectedId} />}
        </main>

        {projectName && (
          <ObjectPanel
            objects={objects}
            selectedId={selectedId}
            hidden={hidden}
            activeClass={activeClass}
            onActiveClass={setActiveClass}
            onSelect={setSelectedId}
            onUpdate={updateObject}
            onDelete={deleteObject}
            onToggleHidden={(id) => setHidden((h) => { const n = new Set(h); n.has(id) ? n.delete(id) : n.add(id); return n })}
            canTrack={objects.length > 0 && remaining > 0 && modelsReady}
            tracking={tracking}
            trackCount={Math.min(trackCount, Math.max(1, remaining))}
            onTrackCount={setTrackCount}
            onTrack={track}
            remaining={remaining}
          />
        )}
      </div>

      {frames.length > 0 && <FrameStrip project={projectName} frames={frames} index={index} onSelect={goTo} />}

      {showPicker && projects && (
        <ProjectPicker
          projects={projects}
          current={projectName}
          onOpen={openProject}
          onClose={projectName ? () => setShowPicker(false) : null}
          onChanged={async () => {
            await refreshProjects()
            if (projectName) await loadProject(projectName)
          }}
        />
      )}
      {showHelp && <ShortcutHelp onClose={() => setShowHelp(false)} />}
      {toast && (
        <div className={`pointer-events-none absolute bottom-32 left-1/2 z-40 -translate-x-1/2 rounded-md px-3 py-2 text-sm shadow-lg ${
          toast.kind === 'error' ? 'bg-red-600 text-white' : toast.kind === 'success' ? 'bg-emerald-600 text-white' : 'bg-zinc-700 text-zinc-100'}`}>
          {toast.text}
        </div>
      )}
    </div>
  )
}

function RailButton({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} title={label}
      className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
      <Icon size={17} />
    </button>
  )
}

function SaveIndicator({ state }) {
  if (state === 'error') return <span className="flex items-center gap-1 text-xs text-red-400"><CircleAlert size={14} /> Save failed</span>
  if (state === 'saved') return <span className="flex items-center gap-1 text-xs text-zinc-500"><Check size={14} /> Saved</span>
  return <span className="flex items-center gap-1 text-xs text-zinc-400"><Loader2 size={13} className="animate-spin" /> Saving</span>
}

function ModelStatus({ status }) {
  if (!status) return null
  if (status.offline) return <span className="rounded bg-red-500/15 px-2 py-1 text-xs text-red-300">Server offline</span>
  const dot = (s) => s === 'ready' ? 'bg-emerald-400' : s === 'loading' ? 'bg-amber-400 animate-pulse' : 'bg-red-500'
  return (
    <span className="flex items-center gap-2 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400"
      title={`RITM: ${status.ritm}\nXMem: ${status.xmem}`}>
      <span className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${dot(status.ritm)}`} />RITM</span>
      <span className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${dot(status.xmem)}`} />XMem</span>
      <span className="font-mono uppercase text-zinc-500">{status.device}</span>
    </span>
  )
}

function ToolHint({ tool, ritm, busy, selected }) {
  const hints = {
    magic: ritm.clicks.length
      ? <>Keep clicking to refine · <b>Enter</b> accept{selected && <> · <b>⇧Enter</b> add to selected</>} · <b>Esc</b> discard · <b>⌘Z</b> undo click</>
      : <>Click an object to segment it · <b>right-click</b> or <b>⌥-click</b> marks background</>,
    polygon: <>Click to add points · click the first point or <b>Enter</b> to close · <b>⌫</b> remove point{selected && ' · adds a part to the selected object'}</>,
    select: <>Drag objects or vertices · <b>⌥-click</b> vertex to delete · double-click edge to add a vertex · <b>Space</b>-drag to pan</>,
  }
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-zinc-700/60 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-400 shadow-lg backdrop-blur [&_b]:font-medium [&_b]:text-zinc-200">
      {busy && <Loader2 size={13} className="animate-spin text-amber-300" />}
      {hints[tool]}
    </div>
  )
}
