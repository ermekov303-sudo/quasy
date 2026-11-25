import { AlertTriangle, PartyPopper, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { formatDuration } from '../../lib/format'
import { computeMetrics } from '../../metrics/workoutMetrics'
import { Button } from '../../ui/Button'
import { Card, StatCard } from '../../ui/Card'
import { Dialog } from '../../ui/Dialog'
import type { WindowLabel } from '../../recognition/classifier'
import type { PoseStatus } from '../../vision/poseSignal'
import type { TrackingPerf } from '../../vision/usePoseTracking'
import { beep } from '../../workout/sound'
import { useWorkout } from '../../workout/workoutStore'
import { TrickPanel } from './TrickPanel'

const TICK_MS = 250

type Props = {
  pose: PoseStatus
  trackingOk: boolean
  trick: WindowLabel
  trickScore: number
  perfRef: RefObject<TrackingPerf>
  onPause: () => void; onResume: () => void; onEnd: () => Promise<void>
}

export function LivePanel({ pose, trackingOk, trick, trickScore, perfRef, onPause, onResume, onEnd }: Props) {
  const w = useWorkout()
  const [, setTick] = useState(0)
  const [confirm, setConfirm] = useState(false)
  const [ending, setEnding] = useState(false)
  const [endError, setEndError] = useState<string | null>(null)
  const lastBeepAt = useRef(0)
  const targetBeeped = useRef(false)

  const elapsedMs = w.clock()
  const m = computeMetrics({ jumps: w.jumps, trips: w.trips, pauses: w.pauses, elapsedMs }, w.config)
  const target = w.config.target
  const planned = w.config.plannedMs
  const unreliable = w.status === 'running' && (!trackingOk || pose !== 'ready')

  const finish = async () => {
    if (ending) return
    setEnding(true)
    setEndError(null)
    try {
      await onEnd()
    } catch {
      setEnding(false)
      setEndError('Could not save the workout. Check storage space and try again.')
    }
  }

  // timer re-render + count time with no usable pose as unreliable
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1)
      if (unreliable) useWorkout.getState().addTrackingLoss(TICK_MS)
    }, TICK_MS)
    return () => clearInterval(id)
  }, [unreliable])

  // sound feedback
  useEffect(() => {
    if (!w.config.sound) return
    const n = m.totalJumps
    if (target && n >= target && !targetBeeped.current) {
      targetBeeped.current = true
      beep(1320, 180)
      setTimeout(() => beep(1760, 220), 220)
    } else if (n > 0 && n % 100 === 0 && lastBeepAt.current !== n) {
      lastBeepAt.current = n
      beep(880, 120)
    }
  }, [m.totalJumps, target, w.config.sound])

  // configured duration reached → finish automatically
  useEffect(() => {
    if (planned && w.status === 'running' && elapsedMs >= planned && !ending) {
      if (w.config.sound) beep(660, 400)
      void finish()
    }
  })

  const pct = target ? Math.min(100, (m.totalJumps / target) * 100) : 0

  return (
    <>
      {unreliable && (
        <div role="status" className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-400/10 px-4 py-2 text-sm text-amber-300">
          <AlertTriangle size={16} aria-hidden />
          {!trackingOk ? 'Tracking stopped. Jumps are not being counted.' : 'Full body not visible. Jumps may be missed.'}
        </div>
      )}

      <section aria-label="Main statistics" className="mt-4 text-center">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted">Total jumps</div>
        <div className="tabular text-7xl font-extrabold leading-none text-fg" aria-live="off">
          {m.totalJumps}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Big label="Current JPM" value={Math.round(m.currentJpm)} accent />
          <Big label="Streak" value={m.currentStreak} />
          <Big label="Duration" value={formatDuration(elapsedMs)} />
        </div>
      </section>

      <section aria-label="Secondary statistics" className="mt-3 grid grid-cols-4 gap-2">
        <StatCard label="kcal est." value={String(Math.round(m.calories))} />
        <StatCard label="Avg JPM" value={String(Math.round(m.avgJpm))} />
        <StatCard label="Max JPM" value={String(Math.round(m.maxJpm))} />
        <StatCard label="Trips" value={String(m.trips)} />
      </section>

      <TrickPanel trick={trick} score={trickScore} perfRef={perfRef} />

      {(target || planned) && (
        <Card className="mt-3">
          {target ? (
            <>
              {m.totalJumps >= target && (
                <div role="status" className="mb-3 flex items-center gap-2 rounded-xl bg-success/15 px-3 py-2 text-sm font-semibold text-success">
                  <PartyPopper size={16} aria-hidden /> Target reached! Keep going or end the workout.
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Target</span>
                <span className="tabular font-semibold">
                  {m.totalJumps} / {target} <span className="text-accent-fg">· {Math.floor(pct)}%</span>
                </span>
              </div>
              <div
                className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={target}
                aria-valuenow={m.totalJumps}
                aria-label="Target progress"
              >
                <div className={`h-full rounded-full transition-[width] duration-300 ${m.totalJumps >= target ? 'bg-success' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
              </div>
            </>
          ) : null}
          {planned ? (
            <div className={`flex items-baseline justify-between text-sm ${target ? 'mt-3' : ''}`}>
              <span className="text-muted">
                Projected in {formatDuration(planned)} · {formatDuration(Math.max(0, planned - elapsedMs))} left
              </span>
              <span className="tabular font-semibold">{m.projectedJumps ?? '—'}</span>
            </div>
          ) : null}
        </Card>
      )}

      <div className="sticky bottom-0 -mx-4 mt-4 grid grid-cols-2 gap-2 bg-bg/90 px-4 pb-safe pt-3 backdrop-blur">
        {w.status === 'paused' ? (
          <Button size="lg" onClick={onResume} className="whitespace-nowrap">
            <Play size={18} aria-hidden /> Resume
          </Button>
        ) : (
          <Button size="lg" variant="secondary" onClick={onPause} disabled={w.status === 'countdown'} className="whitespace-nowrap">
            <Pause size={18} aria-hidden /> Pause
          </Button>
        )}
        <Button size="lg" variant="danger" onClick={() => setConfirm(true)} disabled={ending} className="whitespace-nowrap px-3">
          End workout
        </Button>
      </div>
      {endError && (
        <p role="alert" className="mt-2 text-center text-sm text-danger">
          {endError}
        </p>
      )}

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Are you sure you want to end this workout?"
        actions={
          <>
            <Button full onClick={() => setConfirm(false)}>
              Continue workout
            </Button>
            <Button
              full
              variant="danger"
              disabled={ending}
              onClick={() => {
                setConfirm(false)
                void finish()
              }}
            >
              End workout
            </Button>
          </>
        }
      >
        Your workout will be saved and the summary opened.
      </Dialog>
    </>
  )
}

function Big({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface px-2 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`tabular mt-1 text-3xl font-bold ${accent ? 'text-accent-fg' : ''}`}>{value}</div>
    </div>
  )
}
