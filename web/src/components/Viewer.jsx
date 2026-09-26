import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { classColor } from '../colors'

const CLOSE_RADIUS = 9 // screen px to snap a polygon closed on its first point
const MIN_SCALE = 0.05
const MAX_SCALE = 40

const toPoints = (poly) => poly.map(([x, y]) => `${x},${y}`).join(' ')

function nearestSegment(poly, [px, py]) {
  let best = { dist: Infinity, index: -1, point: null }
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i]
    const [bx, by] = poly[(i + 1) % poly.length]
    const dx = bx - ax, dy = by - ay
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)))
    const x = ax + t * dx, y = ay + t * dy
    const dist = Math.hypot(px - x, py - y)
    if (dist < best.dist) best = { dist, index: i + 1, point: [Math.round(x), Math.round(y)] }
  }
  return best
}

/**
 * Image + annotation canvas.
 * Tools: 'select' (select / move / edit vertices), 'polygon' (draw), 'magic' (RITM clicks).
 */
export default function Viewer({
  imageUrl, objects, hidden, selectedId, tool, ritm, fitSignal,
  onSelect, onChangeObject, onAddPolygon, onRitmClick,
}) {
  const containerRef = useRef(null)
  const [size, setSize] = useState(null) // natural image size
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  viewRef.current = view
  const [cursor, setCursor] = useState(null) // image coords
  const [draft, setDraft] = useState([]) // polygon being drawn
  const [live, setLive] = useState(null) // { id, polygons } while dragging
  const [spaceDown, setSpaceDown] = useState(false)
  const drag = useRef(null)

  // ---- view -------------------------------------------------------------
  const fit = useCallback(() => {
    const el = containerRef.current
    if (!el || !size) return
    const { width, height } = el.getBoundingClientRect()
    const scale = Math.min(width / size.w, height / size.h) * 0.96
    setView({ scale, x: (width - size.w * scale) / 2, y: (height - size.h * scale) / 2 })
  }, [size])

  useLayoutEffect(() => { fit() }, [fit, fitSignal])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => fit())
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit])

  const toImage = useCallback((e) => {
    const rect = containerRef.current.getBoundingClientRect()
    const { scale, x, y } = viewRef.current
    return [(e.clientX - rect.left - x) / scale, (e.clientY - rect.top - y) / scale]
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top
      // Mouse wheels send large integer steps; trackpads send small deltas (pan) or ctrl+wheel (pinch).
      const isMouseWheel = e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40
      setView((v) => {
        if (e.ctrlKey || e.metaKey || isMouseWheel) {
          const k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))
          const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * k))
          const r = scale / v.scale
          return { scale, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r }
        }
        return { ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ---- keyboard (captured before the app-level shortcuts) ---------------
  useEffect(() => {
    const down = (e) => {
      if (e.target.closest?.('input, textarea, select')) return
      if (e.code === 'Space') { setSpaceDown(true); e.preventDefault(); return }
      if (tool !== 'polygon' || !draft.length) return
      if (e.key === 'Enter' && draft.length >= 3) { onAddPolygon(draft); setDraft([]) }
      else if (e.key === 'Escape') setDraft([])
      else if (e.key === 'Backspace' || (e.key === 'z' && (e.metaKey || e.ctrlKey))) setDraft((d) => d.slice(0, -1))
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    const up = (e) => { if (e.code === 'Space') setSpaceDown(false) }
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down, true); window.removeEventListener('keyup', up) }
  }, [tool, draft, onAddPolygon])

  useEffect(() => { setDraft([]) }, [tool, imageUrl])

  // ---- dragging ---------------------------------------------------------
  const startDrag = (state, e) => {
    drag.current = state
    const move = (ev) => {
      const d = drag.current
      if (!d) return
      if (d.type === 'pan') {
        setView((v) => ({ ...v, x: d.vx + ev.clientX - d.sx, y: d.vy + ev.clientY - d.sy }))
        return
      }
      const [x, y] = toImage(ev)
      if (d.type === 'vertex') {
        const polygons = d.polygons.map((p, pi) => pi !== d.pi ? p
          : p.map((pt, vi) => vi === d.vi ? [Math.round(x), Math.round(y)] : pt))
        d.result = polygons
        setLive({ id: d.id, polygons })
      } else if (d.type === 'move') {
        const dx = Math.round(x - d.start[0]), dy = Math.round(y - d.start[1])
        const polygons = d.polygons.map((p) => p.map(([px, py]) => [px + dx, py + dy]))
        d.result = (dx || dy) ? polygons : null
        setLive({ id: d.id, polygons })
      }
    }
    const up = () => {
      const d = drag.current
      drag.current = null
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      if (d?.result) onChangeObject(d.id, d.result)
      setLive(null)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    e.preventDefault()
  }

  const startPan = (e) => {
    const { x, y } = viewRef.current
    startDrag({ type: 'pan', sx: e.clientX, sy: e.clientY, vx: x, vy: y }, e)
  }

  const onBackgroundDown = (e) => {
    if (!size) return
    if (e.button === 1 || spaceDown) return startPan(e)
    const pt = toImage(e)
    if (tool === 'magic') {
      if (e.button !== 0 && e.button !== 2) return
      const inside = pt[0] >= 0 && pt[1] >= 0 && pt[0] < size.w && pt[1] < size.h
      if (inside) onRitmClick(pt[0], pt[1], e.button === 0 && !e.altKey && !e.shiftKey)
      e.preventDefault()
      return
    }
    if (e.button !== 0) return
    if (tool === 'polygon') {
      const [x, y] = pt.map(Math.round)
      if (draft.length >= 3) {
        const [fx, fy] = draft[0]
        if (Math.hypot(fx - pt[0], fy - pt[1]) * viewRef.current.scale <= CLOSE_RADIUS) {
          onAddPolygon(draft)
          setDraft([])
          return
        }
      }
      setDraft((d) => [...d, [x, y]])
      return
    }
    onSelect(null)
    startPan(e)
  }

  const onShapeDown = (obj, e) => {
    if (tool !== 'select' || e.button !== 0 || spaceDown) return
    e.stopPropagation()
    onSelect(obj.id)
    startDrag({ type: 'move', id: obj.id, polygons: obj.polygons, start: toImage(e) }, e)
  }

  const onVertexDown = (obj, pi, vi, e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    if (e.altKey) { // alt-click removes a vertex
      if (obj.polygons[pi].length > 3) {
        onChangeObject(obj.id, obj.polygons.map((p, i) => i !== pi ? p : p.filter((_, j) => j !== vi)))
      }
      e.preventDefault()
      return
    }
    startDrag({ type: 'vertex', id: obj.id, polygons: obj.polygons, pi, vi }, e)
  }

  const onShapeDoubleClick = (obj, e) => { // double-click an edge to insert a vertex
    if (tool !== 'select' || obj.id !== selectedId) return
    const pt = toImage(e)
    let best = { dist: Infinity }
    obj.polygons.forEach((p, pi) => {
      const s = nearestSegment(p, pt)
      if (s.dist < best.dist) best = { ...s, pi }
    })
    if (best.dist * viewRef.current.scale > 12) return
    onChangeObject(obj.id, obj.polygons.map((p, i) => i !== best.pi ? p
      : [...p.slice(0, best.index), best.point, ...p.slice(best.index)]))
  }

  // ---- render -----------------------------------------------------------
  const s = view.scale
  const cursorStyle = drag.current?.type === 'pan' ? 'grabbing'
    : spaceDown ? 'grab' : tool === 'select' ? 'default' : 'crosshair'
  const shapesInteractive = tool === 'select' && !spaceDown
  const selected = objects.find((o) => o.id === selectedId)

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden select-none bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]"
      style={{ cursor: cursorStyle }}
      onMouseDown={onBackgroundDown}
      onMouseMove={(e) => size && setCursor(toImage(e))}
      onMouseLeave={() => setCursor(null)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {imageUrl && (
        <div className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${s})` }}>
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="block max-w-none shadow-2xl shadow-black/60"
            style={{ imageRendering: s > 3 ? 'pixelated' : 'auto' }}
            onLoad={(e) => {
              const { naturalWidth: w, naturalHeight: h } = e.currentTarget
              setSize((old) => (old && old.w === w && old.h === h ? old : { w, h }))
            }}
          />
          {size && (
            <svg className="absolute left-0 top-0 overflow-visible" width={size.w} height={size.h}
              style={{ pointerEvents: 'none' }}>
              {objects.filter((o) => !hidden.has(o.id)).map((obj) => {
                const polygons = live?.id === obj.id ? live.polygons : obj.polygons
                const color = classColor(obj.className)
                const isSel = obj.id === selectedId
                return (
                  <g key={obj.id}
                    style={{ pointerEvents: shapesInteractive ? 'visiblePainted' : 'none', cursor: shapesInteractive ? 'move' : undefined }}
                    onMouseDown={(e) => onShapeDown(obj, e)}
                    onDoubleClick={(e) => onShapeDoubleClick(obj, e)}>
                    {polygons.map((p, i) => (
                      <polygon key={i} points={toPoints(p)} fill={color}
                        fillOpacity={isSel ? 0.4 : 0.25} stroke={isSel ? '#fff' : color}
                        strokeWidth={isSel ? 2 : 1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                    ))}
                  </g>
                )
              })}

              {selected && tool === 'select' && !hidden.has(selected.id) &&
                (live?.id === selected.id ? live.polygons : selected.polygons).map((p, pi) => p.map(([x, y], vi) => (
                  <circle key={`${pi}-${vi}`} cx={x} cy={y} r={4 / s} fill="#fff"
                    stroke={classColor(selected.className)} strokeWidth={1.5 / s}
                    style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    onMouseDown={(e) => onVertexDown(selected, pi, vi, e)} />
                )))}

              {tool === 'magic' && ritm.polygons.map((p, i) => (
                <polygon key={i} points={toPoints(p)} fill="#facc15" fillOpacity={0.3}
                  stroke="#facc15" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
              ))}
              {tool === 'magic' && ritm.clicks.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r={5 / s} fill={c.positive ? '#22c55e' : '#ef4444'}
                  stroke="#fff" strokeWidth={1.5 / s} />
              ))}

              {draft.length > 0 && (
                <g>
                  <polyline points={toPoints(cursor ? [...draft, cursor] : draft)} fill="#818cf8" fillOpacity={0.15}
                    stroke="#a5b4fc" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                  {draft.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={(i === 0 ? 6 : 3.5) / s}
                      fill={i === 0 ? '#4f46e5' : '#fff'} stroke="#4f46e5" strokeWidth={1.5 / s} />
                  ))}
                </g>
              )}
            </svg>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 font-mono text-[11px] text-zinc-400">
        {Math.round(s * 100)}%
        {cursor && size && ` · ${Math.round(cursor[0])}, ${Math.round(cursor[1])}`}
        {size && ` · ${size.w}×${size.h}`}
      </div>
    </div>
  )
}
