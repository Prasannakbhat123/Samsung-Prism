import { Eye, EyeOff, Loader2, Trash2, Waypoints } from 'lucide-react'
import { CLASS_OPTIONS, classColor } from '../colors'

function ClassPicker({ value, onChange, className = '' }) {
  const options = CLASS_OPTIONS.includes(value) ? CLASS_OPTIONS : [...CLASS_OPTIONS, value]
  return (
    <select
      value={value}
      onChange={(e) => {
        let v = e.target.value
        if (v === '__custom') v = window.prompt('Class name')?.trim()
        if (v) onChange(v)
      }}
      className={`input h-7 px-1.5 text-xs ${className}`}
    >
      {options.map((c) => <option key={c} value={c}>{c}</option>)}
      <option value="__custom">custom…</option>
    </select>
  )
}

export default function ObjectPanel({
  objects, selectedId, hidden, activeClass, onActiveClass,
  onSelect, onUpdate, onDelete, onToggleHidden,
  canTrack, tracking, trackCount, onTrackCount, onTrack, remaining,
  frames, index, refs, onClearRefs,
}) {
  const before = frames.slice(0, index)
  const chosen = before.filter((f) => refs.has(f.name))
  const ignoredRefs = refs.size - chosen.length
  const autoRefs = before.filter((f) => f.keyframe).slice(-10)
  const keptAhead = frames.slice(index + 1, index + 1 + trackCount).filter((f) => f.keyframe).length
  const frameList = (fs) => fs.map((f) => frames.indexOf(f) + 1).join(', ')

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-neutral-800 bg-black">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <span className="panel-title">Objects · {objects.length}</span>
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          new class
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: classColor(activeClass) }} />
          <ClassPicker value={activeClass} onChange={onActiveClass} className="w-16" />
        </label>
      </div>

      <div className="scroll-thin flex-1 space-y-1 overflow-y-auto px-2">
        {objects.length === 0 && (
          <div className="mx-1 mt-2 rounded-lg border border-dashed border-neutral-800 p-4 text-center text-xs leading-relaxed text-neutral-500">
            No objects on this frame.<br />
            Press <span className="kbd">R</span> and click an object to segment it,
            or <span className="kbd">P</span> to draw a polygon.
          </div>
        )}
        {objects.map((obj, i) => {
          const isSel = obj.id === selectedId
          const isHidden = hidden.has(obj.id)
          return (
            <div
              key={obj.id}
              onClick={() => onSelect(obj.id)}
              className={`group flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors ${
                isSel ? 'border-blue-500/50 bg-blue-500/10' : 'border-transparent hover:bg-neutral-900'
              }`}
            >
              <span className="w-4 text-right font-mono text-[11px] text-neutral-500">{i + 1}</span>
              <span className="h-3 w-3 shrink-0 rounded-sm ring-1 ring-white/20" style={{ background: classColor(obj.className) }} />
              <div className="min-w-0 flex-1">
                <input
                  value={obj.name}
                  onChange={(e) => onUpdate(obj.id, { name: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full truncate rounded bg-transparent px-1 text-sm text-neutral-100 outline-none focus:bg-neutral-900"
                />
                <div className="truncate px-1 text-[11px] text-neutral-500" title={obj.id}>
                  class {obj.className}{obj.polygons.length > 1 && ` · ${obj.polygons.length} parts`}
                </div>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <ClassPicker value={obj.className} onChange={(c) => onUpdate(obj.id, { className: c })} className="w-16" />
              </div>
              <button className="text-neutral-500 hover:text-neutral-200" title="Hide (H)"
                onClick={(e) => { e.stopPropagation(); onToggleHidden(obj.id) }}>
                {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button className="text-neutral-600 hover:text-red-400" title="Delete (Del)"
                onClick={(e) => { e.stopPropagation(); onDelete(obj.id) }}>
                <Trash2 size={15} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="space-y-2.5 border-t border-neutral-800 p-3">
        <div className="panel-title flex items-center gap-1.5"><Waypoints size={13} /> Track with XMem</div>
        <p className="text-xs leading-relaxed text-neutral-500">
          Carries this frame's objects forward. Frames you've edited are never overwritten.
        </p>

        <div className="rounded-md border border-neutral-800 px-2.5 py-2 text-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-neutral-400">Learns from</span>
            {refs.size > 0
              ? <button className="text-neutral-500 hover:text-neutral-200" onClick={onClearRefs}>Clear · use auto</button>
              : <span className="text-neutral-600">auto</span>}
          </div>
          <div className="leading-relaxed text-neutral-300">
            this frame
            {refs.size > 0
              ? chosen.length > 0 && <> + frame{chosen.length > 1 && 's'} <span className="text-blue-400">{frameList(chosen)}</span></>
              : autoRefs.length > 0 && <> + {autoRefs.length} labelled frame{autoRefs.length > 1 && 's'} before it</>}
          </div>
          {ignoredRefs > 0 && (
            <div className="mt-1 text-neutral-600">{ignoredRefs} chosen frame{ignoredRefs > 1 && 's'} after this one won't be used</div>
          )}
          <div className="mt-1 text-neutral-600"><span className="kbd">K</span> or ⇧-click a thumbnail to choose frames</div>
        </div>

        <div className="flex gap-1">
          {[1, 5, 10, 25].map((n) => (
            <button key={n} disabled={n > remaining} onClick={() => onTrackCount(n)}
              className={`h-6 flex-1 rounded border text-xs transition-colors disabled:opacity-30 ${
                trackCount === n ? 'border-white text-white' : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>
              {n}
            </button>
          ))}
          <button disabled={!remaining} onClick={() => onTrackCount(remaining)}
            className={`h-6 flex-1 rounded border text-xs transition-colors disabled:opacity-30 ${
              trackCount === remaining && ![1, 5, 10, 25].includes(remaining) ? 'border-white text-white' : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>
            All
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex items-center rounded-md border border-neutral-800 bg-black">
            <input
              type="number" min={1} max={remaining || 1} value={trackCount}
              onChange={(e) => onTrackCount(Math.max(1, Math.min(remaining || 1, Number(e.target.value) || 1)))}
              className="h-8 w-14 bg-transparent px-2 text-sm outline-none"
            />
            <span className="pr-2 text-xs text-neutral-500">/ {remaining}</span>
          </div>
          <button className="btn btn-primary flex-1" disabled={!canTrack || tracking} onClick={onTrack}>
            {tracking ? <Loader2 size={15} className="animate-spin" /> : null}
            {tracking ? 'Tracking…' : `Track ${trackCount} frame${trackCount === 1 ? '' : 's'}`}
            {!tracking && <span className="kbd ml-1 border-neutral-300 bg-neutral-200 text-neutral-600">T</span>}
          </button>
        </div>
        {keptAhead > 0 && (
          <div className="text-xs text-neutral-500">{keptAhead} edited frame{keptAhead > 1 && 's'} in range will be kept</div>
        )}
      </div>
    </aside>
  )
}
