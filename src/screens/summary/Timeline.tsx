import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { formatDuration } from '../../lib/format'
import type { Segment } from '../../metrics/analytics'

const endedText = { trip: 'Trip', pause: 'Paused', rest: 'Rest', end: 'Workout end' } as const

/**
 * Jump / Rest timeline: purple = jumping, dark grey = rest, white ticks = trips.
 * Tap a segment (or use the arrows: tiny segments are hard to hit) to inspect it.
 */
export function Timeline({ segments, trips, elapsedMs }: { segments: Segment[]; trips: number[]; elapsedMs: number }) {
  const firstJump = Math.max(0, segments.findIndex((s) => s.kind === 'jump'))
  const [sel, setSel] = useState(firstJump)
  if (!segments.length || elapsedMs <= 0) return <p className="text-sm text-muted">No timeline for this workout.</p>
  const s = segments[Math.min(sel, segments.length - 1)]
  const pct = (ms: number) => `${(ms / elapsedMs) * 100}%`

  return (
    <div>
      <div className="relative">
        <div className="flex h-11 gap-0.5 overflow-hidden rounded-xl" role="listbox" aria-label="Workout segments">
          {segments.map((seg, i) => (
            <button
              key={i}
              type="button"
              role="option"
              aria-selected={i === sel}
              aria-label={`${seg.kind === 'jump' ? 'Jumping' : 'Rest'} ${formatDuration(seg.startMs)} to ${formatDuration(seg.endMs)}`}
              onClick={() => setSel(i)}
              style={{ width: pct(seg.endMs - seg.startMs) }}
              className={`min-w-[3px] shrink-0 transition-opacity ${seg.kind === 'jump' ? 'bg-series-1' : 'bg-rest'} ${
                i === sel ? 'opacity-100 ring-2 ring-inset ring-white' : 'opacity-80 hover:opacity-100'
              }`}
            />
          ))}
        </div>
        {trips.map((t, i) => (
          <span
            key={i}
            className="pointer-events-none absolute -bottom-1.5 -translate-x-1/2 text-[10px] leading-none text-white"
            style={{ left: pct(t) }}
            aria-hidden
          >
            ▲
          </span>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted tabular">
        <span>0:00</span>
        <span>{formatDuration(elapsedMs)}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <Key className="bg-series-1" label="Jumping" />
        <Key className="bg-rest" label="Rest" />
        <span className="flex items-center gap-1.5"><span className="text-white">▲</span> Trip</span>
      </div>

      <div className="mt-4 rounded-2xl bg-surface-2 p-4" aria-live="polite">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Previous segment" disabled={sel === 0} onClick={() => setSel(sel - 1)} className="grid size-9 place-items-center rounded-full hover:bg-line disabled:opacity-30">
            <ChevronLeft size={18} aria-hidden />
          </button>
          <div className="text-center">
            <div className="font-semibold">{s.kind === 'jump' ? 'Jumping' : 'Rest'}</div>
            <div className="text-xs text-muted">Segment {sel + 1} of {segments.length}</div>
          </div>
          <button type="button" aria-label="Next segment" disabled={sel === segments.length - 1} onClick={() => setSel(sel + 1)} className="grid size-9 place-items-center rounded-full hover:bg-line disabled:opacity-30">
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-y-3 text-center text-sm">
          <Kv k="Start" v={formatDuration(s.startMs)} />
          <Kv k="End" v={formatDuration(s.endMs)} />
          <Kv k="Duration" v={formatDuration(s.endMs - s.startMs)} />
          <Kv k="Jumps" v={String(s.jumps)} />
          <Kv k="Avg JPM" v={s.kind === 'jump' ? String(Math.round(s.jpm)) : '—'} />
          <Kv k="Ended by" v={s.endedBy ? endedText[s.endedBy] : '—'} />
        </dl>
      </div>
    </div>
  )
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-sm ${className}`} aria-hidden /> {label}
    </span>
  )
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-muted">{k}</dt>
      <dd className="tabular font-semibold">{v}</dd>
    </div>
  )
}
