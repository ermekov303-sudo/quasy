import { create } from 'zustand'
import type { DetectorEvent } from '../detection/jumpDetector'
import { computeMetrics } from '../metrics/workoutMetrics'
import { db, type WorkoutRecord } from '../storage/db'

/**
 * One workout session. Time is kept on a workout clock that stops while paused:
 * clock = accumulated running time + (now − last resume). Detector events carry performance.now()
 * times and are converted on arrival, so paused time never becomes active or rest time.
 */
export type WorkoutStatus = 'idle' | 'countdown' | 'running' | 'paused'
export type WorkoutConfig = { target: number | null; plannedMs: number | null; weightKg: number | null; sound: boolean; benchmarkMs?: number | null }

type State = {
  status: WorkoutStatus
  id: string
  config: WorkoutConfig
  startedAt: number
  accMs: number
  resumedAt: number
  countdownUntil: number // performance.now() when the get-ready countdown ends
  jumps: number[]
  trips: number[]
  pauses: number[]
  lostBreaks: number
  trackingLossMs: number
  clock: (perfNow?: number) => number
  start: (config: WorkoutConfig, countdownMs: number) => void
  begin: () => void
  onDetector: (e: DetectorEvent) => void
  addTrackingLoss: (ms: number) => void
  pause: () => void
  resume: () => void
  finish: () => Promise<string>
}

const blank = { jumps: [], trips: [], pauses: [], lostBreaks: 0, trackingLossMs: 0, accMs: 0, resumedAt: 0, startedAt: 0, countdownUntil: 0 }

export const useWorkout = create<State>()((set, get) => ({
  status: 'idle',
  id: '',
  config: { target: null, plannedMs: null, weightKg: null, sound: true },
  ...blank,

  clock: (perfNow = performance.now()) => {
    const s = get()
    return s.status === 'running' ? s.accMs + (perfNow - s.resumedAt) : s.accMs
  },

  /** Get-ready countdown first (time to walk back into frame); the timer starts at begin(). */
  start: (config, countdownMs) => {
    set({ ...blank, status: 'countdown', id: crypto.randomUUID(), config, countdownUntil: performance.now() + countdownMs })
    if (countdownMs <= 0) get().begin()
  },

  begin: () =>
    get().status === 'countdown' && set({ status: 'running', startedAt: Date.now(), resumedAt: performance.now() }),

  onDetector: (e) => {
    const s = get()
    if (s.status !== 'running') return // pause stops metric accumulation
    if (e.type === 'jump') set({ jumps: [...s.jumps, Math.max(0, s.clock(e.t))] })
    else if (e.reason === 'trip') set({ trips: [...s.trips, Math.max(0, s.clock(e.lastJumpT))] })
    else if (e.reason === 'lost') set({ lostBreaks: s.lostBreaks + 1 })
  },

  addTrackingLoss: (ms) => get().status === 'running' && set({ trackingLossMs: get().trackingLossMs + ms }),

  pause: () => {
    const s = get()
    if (s.status !== 'running') return
    const at = s.clock()
    set({ status: 'paused', accMs: at, pauses: [...s.pauses, at] })
  },

  resume: () => get().status === 'paused' && set({ status: 'running', resumedAt: performance.now() }),

  /** Finalize and save. Idempotent by id: a second call overwrites the same record, never duplicates. */
  finish: async () => {
    const s = get()
    if (s.status === 'countdown') {
      set({ ...blank, status: 'idle' }) // ended before it began: nothing to save
      return ''
    }
    const elapsedMs = s.clock()
    const log = { jumps: s.jumps, trips: s.trips, pauses: s.pauses, elapsedMs }
    const m = computeMetrics(log, s.config)
    const rec: WorkoutRecord = {
      ...log,
      id: s.id,
      startedAt: s.startedAt,
      endedAt: Date.now(),
      target: s.config.target,
      plannedMs: s.config.plannedMs,
      weightKg: s.config.weightKg,
      lostBreaks: s.lostBreaks,
      trackingLossMs: s.trackingLossMs,
      totalJumps: m.totalJumps,
      activeMs: m.activeMs,
      avgJpm: m.avgJpm,
      maxJpm: m.maxJpm,
      calories: m.calories,
      maxStreak: m.maxStreak,
      // a test ended early is a normal workout, never a benchmark result
      benchmarkMs: s.config.benchmarkMs && elapsedMs >= s.config.benchmarkMs - 250 ? s.config.benchmarkMs : null,
    }
    await db.workouts.put(rec)
    set({ ...blank, status: 'idle' })
    return rec.id
  },
}))
