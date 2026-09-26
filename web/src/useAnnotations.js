import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'

const SAVE_DELAY = 400

/** Objects for one frame, with autosave and undo/redo. */
export function useAnnotations(project, frame, onSaved) {
  const [objects, setObjects] = useState([])
  const current = useRef([])
  const activeKey = useRef(null)
  const [loading, setLoading] = useState(false)
  const [saveState, setSaveState] = useState('saved') // saved | pending | saving | error
  const history = useRef({ past: [], future: [] })
  const pending = useRef(null) // { project, frame, objects }
  const timer = useRef(null)
  const onSavedRef = useRef(onSaved)
  onSavedRef.current = onSaved

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const job = pending.current
    if (!job) return
    pending.current = null
    setSaveState('saving')
    try {
      await api.saveAnnotation(job.project, job.frame, job.objects)
      if (!pending.current) setSaveState('saved')
      onSavedRef.current?.(job.frame, job.objects.length > 0)
    } catch (e) {
      console.error(e)
      setSaveState('error')
    }
  }, [])

  const load = useCallback(async () => {
    if (!project || !frame) return
    const key = `${project}/${frame}`
    activeKey.current = key
    setLoading(true)
    try {
      const { objects } = await api.annotation(project, frame)
      if (activeKey.current !== key) return // user already moved to another frame
      current.current = objects
      setObjects(objects)
    } finally {
      setLoading(false)
    }
  }, [project, frame])

  // Switching frames: save what's pending for the old frame, then load the new one.
  useEffect(() => {
    let cancelled = false
    activeKey.current = `${project}/${frame}`
    history.current = { past: [], future: [] }
    current.current = []
    setObjects([])
    ;(async () => {
      await flush()
      if (!cancelled) await load()
    })()
    return () => { cancelled = true }
  }, [project, frame, flush, load])

  useEffect(() => {
    const beforeUnload = (e) => {
      if (pending.current) { flush(); e.preventDefault() }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [flush])

  const schedule = useCallback((next) => {
    pending.current = { project, frame, objects: next }
    setSaveState('pending')
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY)
  }, [project, frame, flush])

  const set = useCallback((next) => {
    current.current = next
    setObjects(next)
  }, [])

  /** Replace the frame's objects (pass a function or a value), recording undo history. */
  const commit = useCallback((update) => {
    const prev = current.current
    const next = typeof update === 'function' ? update(prev) : update
    if (next === prev) return
    const { past } = history.current
    past.push(prev)
    if (past.length > 100) past.shift()
    history.current.future = []
    set(next)
    schedule(next)
  }, [schedule, set])

  const step = useCallback((from, to) => {
    if (!from.length) return
    to.push(current.current)
    const next = from.pop()
    set(next)
    schedule(next)
  }, [schedule, set])

  const undo = useCallback(() => step(history.current.past, history.current.future), [step])
  const redo = useCallback(() => step(history.current.future, history.current.past), [step])

  return { objects, loading, saveState, commit, undo, redo, reload: load, flush }
}
