import { X } from 'lucide-react'

const GROUPS = [
  ['Tools', [
    ['R', 'Magic segment (RITM)'],
    ['P', 'Draw polygon'],
    ['V', 'Select, move & edit'],
  ]],
  ['Magic segment', [
    ['Click', 'Include region'],
    ['Right-click / ⌥-click', 'Exclude region'],
    ['Enter', 'Accept as new object'],
    ['⇧ Enter', 'Add to selected object'],
    ['Esc', 'Discard clicks'],
    ['⌘ Z', 'Undo last click'],
  ]],
  ['Frames', [
    ['← / A', 'Previous frame'],
    ['→ / D', 'Next frame'],
    ['Home / End', 'First / last frame'],
    ['T', 'Track objects forward (XMem)'],
  ]],
  ['Objects', [
    ['Tab / ⇧Tab', 'Cycle selection'],
    ['1 – 8', 'Class for new objects (recolours selection in Select)'],
    ['H', 'Hide / show selected'],
    ['Del', 'Delete selected'],
    ['⌘ Z / ⇧⌘ Z', 'Undo / redo'],
  ]],
  ['View', [
    ['Scroll / pinch', 'Zoom (mouse) · pan (trackpad)'],
    ['Space + drag', 'Pan'],
    ['F', 'Fit to screen'],
  ]],
]

export default function ShortcutHelp({ onClose }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-6" onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-200" onClick={onClose}><X size={18} /></button>
        <h2 className="mb-4 text-base font-semibold">Keyboard shortcuts</h2>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {GROUPS.map(([title, rows]) => (
            <div key={title}>
              <div className="panel-title mb-2">{title}</div>
              <dl className="space-y-1.5">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-neutral-400">{v}</dt>
                    <dd className="shrink-0 font-mono text-xs text-neutral-300">{k}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
