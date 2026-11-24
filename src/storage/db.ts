import { Dexie, type EntityTable } from 'dexie'
import type { WorkoutLog } from '../metrics/workoutMetrics'

/** Raw log (so metrics can be recomputed if formulas improve) + headline numbers for fast lists. */
export type WorkoutRecord = WorkoutLog & {
  id: string
  startedAt: number // epoch ms
  endedAt: number
  target: number | null
  plannedMs: number | null
  weightKg: number | null
  lostBreaks: number // breaks while the person was out of frame (not counted as trips)
  trackingLossMs: number // running time with no full-body pose: data there is unreliable
  // headline numbers (derived, stored for lists/aggregates)
  totalJumps: number
  activeMs: number
  avgJpm: number
  maxJpm: number
  calories: number
  maxStreak: number
  benchmarkMs?: number | null // set only for a COMPLETED 1/3-minute benchmark test
}

export const db = new Dexie('quasy') as Dexie & { workouts: EntityTable<WorkoutRecord, 'id'> }

db.version(1).stores({ workouts: 'id, startedAt' })
db.version(2).stores({ workouts: 'id, startedAt, benchmarkMs' }) // index for benchmark tests; existing rows unchanged
