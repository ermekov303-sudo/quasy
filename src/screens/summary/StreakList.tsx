import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { formatDuration } from '../../lib/format'
import type { Segment } from '../../metrics/analytics'
import type { Streak } from '../../metrics/workoutMetrics'

const endedText = { trip: 'a trip', pause: 'a pause', rest: 'a rest', end: 'the end of the workout' } as const

export function StreakList({ streaks, segments }: { streaks: Streak[]; segments: Segment[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const jumpSegs = segments.filter((s) => s.kind === 'jump')
  if (!streaks.length) return <p className="text-sm text-muted">No streaks recorded.</p>
  const best = Math.max(...streaks.map((s) => s.jumps))

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
      {streaks.map((s, i) => {
        const isOpen = open === i
        const seg = jumpSegs[i]
        return (
          <li key={s.index}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className="grid w-full grid-cols-[2.5rem_1fr_1fr_1fr_1.25rem] items-center gap-2 px-4 py-3 text-left hover:bg-surface-2"
            >
              <span className="text-sm font-semibold text-muted">#{s.index}</span>
              <span className="tabular font-semibold">
                {s.jumps}
                {s.jumps === best && <span className="ml-1.5 rounded bg-accent-soft px-1 py-0.5 text-[10px] font-bold uppercase text-accent-fg">Best</span>}
                <span className="block text-[11px] font-normal text-muted">jumps</span>
              </span>
              <span className="tabular">
                {formatDuration(s.durationMs)}
                <span className="block text-[11px] text-muted">duration</span>
              </span>
              <span className="tabular">
                {s.jumps > 1 ? Math.round(s.jpm) : '—'}
                <span className="block text-[11px] text-muted">JPM</span>
              </span>
              <ChevronDown size={18} className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {isOpen && (
              <div className="bg-surface-2/50 px-4 pb-4 pt-1 text-sm text-muted">
                Started at <b className="tabular text-fg">{formatDuration(s.startMs)}</b>, last jump at{' '}
                <b className="tabular text-fg">{formatDuration(s.endMs)}</b>.{' '}
                {s.jumps > 1 && (
                  <>
                    One jump every <b className="tabular text-fg">{((60 / s.jpm) || 0).toFixed(2)} s</b>.{' '}
                  </>
                )}
                {seg?.endedBy && <>Ended by {endedText[seg.endedBy]}.</>}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
