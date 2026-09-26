import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../api'

export default function FrameStrip({ project, frames, index, onSelect }) {
  const activeRef = useRef(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [index])

  const annotated = frames.filter((f) => f.annotated).length

  return (
    <div className="flex h-[104px] shrink-0 items-stretch border-t border-zinc-800 bg-zinc-900/80">
      <button className="btn-ghost flex w-9 items-center justify-center text-zinc-400 disabled:opacity-30"
        disabled={index <= 0} onClick={() => onSelect(index - 1)} title="Previous frame (← / A)">
        <ChevronLeft size={18} />
      </button>

      <div className="scroll-thin flex flex-1 items-center gap-1.5 overflow-x-auto px-1 py-2">
        {frames.map((f, i) => (
          <button
            key={f.name}
            ref={i === index ? activeRef : null}
            onClick={() => onSelect(i)}
            title={f.source || f.name}
            className={`relative h-full shrink-0 overflow-hidden rounded-md border-2 transition ${
              i === index ? 'border-indigo-500' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <img src={api.imageUrl(project, f.name)} loading="lazy" alt="" draggable={false}
              className="h-full w-auto max-w-none object-cover" />
            <span className="absolute bottom-0 left-0 rounded-tr bg-black/70 px-1 font-mono text-[10px] text-zinc-300">
              {i + 1}
            </span>
            {f.annotated && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-black/60" />}
          </button>
        ))}
      </div>

      <div className="flex w-24 flex-col items-center justify-center gap-0.5 border-l border-zinc-800 text-center">
        <span className="font-mono text-sm text-zinc-200">{index + 1}<span className="text-zinc-500">/{frames.length}</span></span>
        <span className="text-[11px] text-emerald-400/80">{annotated} labelled</span>
      </div>

      <button className="btn-ghost flex w-9 items-center justify-center text-zinc-400 disabled:opacity-30"
        disabled={index >= frames.length - 1} onClick={() => onSelect(index + 1)} title="Next frame (→ / D)">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
