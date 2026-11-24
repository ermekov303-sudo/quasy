/** Timeline segments and personal records. Pure: tested without React or storage. */
import { defaultDetectorConfig } from '../detection/jumpDetector'
import { computeMetrics, type Streak, type WorkoutLog } from './workoutMetrics'

export type StreakEnd = 'trip' | 'pause' | 'rest' | 'end'
export type Segment = { kind: 'jump' | 'rest'; startMs: number; endMs: number; jumps: number; jpm: number; endedBy?: StreakEnd }

const TRIP_MATCH_MS = 700 // a trip is stamped at the streak's last jump

export function streakEnd(s: Streak, next: Streak | undefined, log: WorkoutLog): StreakEnd {
  if (log.trips.some((t) => Math.abs(t - s.endMs) <= TRIP_MATCH_MS)) return 'trip'
  const until = next ? next.startMs : log.elapsedMs
  if (log.pauses.some((p) => p >= s.endMs && p <= until)) return 'pause'
  if (!next && log.elapsedMs - s.endMs <= defaultDetectorConfig.breakGapMs) return 'end'
  return 'rest'
}

/** Jump segments = streaks; everything between them is rest. Covers 0 → elapsed with no gaps. */
export function buildTimeline(log: WorkoutLog, streaks: Streak[]): Segment[] {
  const out: Segment[] = []
  let cursor = 0
  streaks.forEach((s, i) => {
    const start = Math.max(cursor, s.startMs)
    const end = Math.min(log.elapsedMs, Math.max(start, s.startMs + s.durationMs))
    if (start > cursor) out.push({ kind: 'rest', startMs: cursor, endMs: start, jumps: 0, jpm: 0 })
    out.push({ kind: 'jump', startMs: start, endMs: end, jumps: s.jumps, jpm: s.jpm, endedBy: streakEnd(s, streaks[i + 1], log) })
    cursor = end
  })
  if (cursor < log.elapsedMs) out.push({ kind: 'rest', startMs: cursor, endMs: log.elapsedMs, jumps: 0, jpm: 0 })
  return out
}

/** Minimal shape records need (a stored WorkoutRecord satisfies it). */
export type RecordSource = WorkoutLog & { id: string; startedAt: number; weightKg: number | null; plannedMs: number | null }

export const RECORD_KEYS = ['totalJumps', 'maxJpm', 'maxStreak', 'maxStreakJpm', 'elapsedMs'] as const
export type RecordKey = (typeof RECORD_KEYS)[number]
export type RecordEntry = { value: number; at: number; workoutId: string; previous: { value: number; at: number } | null }

/** Best value per record, with the record it beat. Walks workouts in time order. */
export function personalRecords(ws: RecordSource[]): Partial<Record<RecordKey, RecordEntry>> {
  const out: Partial<Record<RecordKey, RecordEntry>> = {}
  for (const w of [...ws].sort((a, b) => a.startedAt - b.startedAt)) {
    const m = computeMetrics(w, w)
    for (const k of RECORD_KEYS) {
      const v = m[k]
      if (!(v > 0)) continue
      const cur = out[k]
      if (!cur || v > cur.value)
        out[k] = { value: v, at: w.startedAt, workoutId: w.id, previous: cur ? { value: cur.value, at: cur.at } : null }
    }
  }
  return out
}

type BenchmarkLike = { id: string; startedAt: number; benchmarkMs?: number | null; totalJumps: number; avgJpm: number; maxJpm: number }

/**
 * Benchmark tests of ONE duration, oldest → newest, plus latest-vs-previous comparison.
 * Tests of different durations are never compared with each other.
 */
export function benchmarkCompare<T extends BenchmarkLike>(ws: T[], durationMs: number) {
  const tests = ws.filter((w) => w.benchmarkMs === durationMs).sort((a, b) => a.startedAt - b.startedAt)
  const latest = tests.at(-1) ?? null
  const previous = tests.length > 1 ? tests[tests.length - 2] : null
  const diff =
    latest && previous
      ? {
          jumps: latest.totalJumps - previous.totalJumps,
          avgJpm: latest.avgJpm - previous.avgJpm,
          pct: previous.totalJumps > 0 ? ((latest.totalJumps - previous.totalJumps) / previous.totalJumps) * 100 : null,
        }
      : null
  return { tests, latest, previous, diff }
}

/** Total-jumps PR check for one workout against everything saved before it. */
export function prStatus(w: RecordSource & { totalJumps: number }, all: (RecordSource & { totalJumps: number })[]) {
  const before = all.filter((x) => x.id !== w.id && x.startedAt < w.startedAt)
  const previousBest = before.length ? Math.max(...before.map((x) => x.totalJumps)) : null
  return { previousBest, current: w.totalJumps, isPR: w.totalJumps > 0 && (previousBest === null || w.totalJumps > previousBest), first: previousBest === null }
}
