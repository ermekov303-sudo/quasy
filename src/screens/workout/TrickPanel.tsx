import { useEffect, useState, type RefObject } from 'react'
import { formatDuration } from '../../lib/format'
import type { WindowLabel } from '../../recognition/classifier'
import { trickName } from '../../recognition/summary'
import { Card } from '../../ui/Card'
import type { TrackingPerf } from '../../vision/usePoseTracking'
import { useWorkout } from '../../workout/workoutStore'

const STATE_TEXT: Partial<Record<WindowLabel, string>> = {
  basic: 'Basic jump',
  idle: 'No movement',
  unknown: 'Not sure',
  lost: 'Tracking…',
}

type Props = { trick: WindowLabel; score: number; perfRef: RefObject<TrackingPerf> }

/** Live trick recognition (beta): current verdict, counts, last tricks, and measured pose-loop speed. */
export function TrickPanel({ trick, score, perfRef }: Props) {
  const tricks = useWorkout((s) => s.tricks)
  const [perf, setPerf] = useState<TrackingPerf>({ fps: 0, poseMs: 0, trickMs: 0 })
  useEffect(() => {
    const id = setInterval(() => setPerf({ ...perfRef.current }), 1000)
    return () => clearInterval(id)
  }, [perfRef])
  const state = STATE_TEXT[trick]
  const unique = new Set(tricks.map((t) => t.trickId)).size

  return (
    <Card className="mt-3 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Trick detection · beta</h2>
        <span className="tabular text-[11px] text-muted" title="Pose frames per second · pose model time · trick recognizer time">
          {Math.round(perf.fps)} fps · {Math.round(perf.poseMs)} ms · {perf.trickMs.toFixed(1)} ms
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2" aria-live="polite">
        <span className={`text-2xl font-bold ${state ? 'text-muted' : 'text-accent-fg'}`}>{state ?? trickName(trick)}</span>
        {!state && <span className="tabular text-sm font-semibold">{Math.round(score * 100)}%</span>}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-muted">Tricks</dt>
          <dd className="tabular text-lg font-bold">{tricks.length}</dd>
        </div>
        <div>
          <dt className="text-muted">Unique</dt>
          <dd className="tabular text-lg font-bold">{unique}</dd>
        </div>
      </dl>
      {tricks.length > 0 && (
        <ol className="mt-3 space-y-1 text-sm" aria-label="Recent tricks">
          {tricks.slice(-4).reverse().map((t) => (
            <li key={t.seq} className="flex justify-between gap-2">
              <span>{trickName(t.trickId)}</span>
              <span className="tabular text-muted">
                {formatDuration(t.startMs)} · {Math.round(t.score * 100)}%
              </span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs text-muted">
        Body movement only, 8 tricks. The rope isn't seen: standing tricks count only while your hands move as if turning a rope.
      </p>
    </Card>
  )
}
