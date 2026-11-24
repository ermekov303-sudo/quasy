/**
 * Workout metrics from the raw log. Pure functions, no React/storage.
 * All times are on the WORKOUT CLOCK: ms since start with paused time removed,
 * so paused time can never count as active or resting time.
 */
import { defaultDetectorConfig } from '../detection/jumpDetector'

export type WorkoutLog = {
  jumps: number[] // time of each counted jump
  trips: number[] // time of each detected trip (rhythm break that resumed quickly)
  pauses: number[] // times the user pressed PAUSE (streak boundary, not a trip)
  elapsedMs: number // workout clock now / at the end
}

export type Streak = { index: number; startMs: number; endMs: number; jumps: number; durationMs: number; jpm: number }

const BREAK_GAP = defaultDetectorConfig.breakGapMs
const CURRENT_WINDOW_MS = 10_000 // rolling window for Current JPM
const MAX_WINDOW_MS = 15_000 // Max JPM: best 15 s window, scaled to a minute…
const MAX_MIN_SPAN_MS = 5_000 // …but at least 5 s of jumping, so one quick pair can't spike it
const CALORIE_MET = 11.8 // jump rope, moderate pace (Compendium of Physical Activities)
export const DEFAULT_WEIGHT_KG = 70

/** A jump streak's active time: n jumps at interval d occupy n·d (first→last spans only n−1 intervals). */
function streakOf(index: number, ts: number[]): Streak {
  const n = ts.length
  const span = ts[n - 1] - ts[0]
  return {
    index,
    startMs: ts[0],
    endMs: ts[n - 1],
    jumps: n,
    durationMs: n > 1 ? (span * n) / (n - 1) : 0,
    jpm: n > 1 && span > 0 ? ((n - 1) / span) * 60_000 : 0,
  }
}

/** Split jumps into streaks: a gap longer than the break gap, or a pause between two jumps, ends a streak. */
export function splitStreaks(log: Pick<WorkoutLog, 'jumps' | 'pauses'>): Streak[] {
  const out: Streak[] = []
  let cur: number[] = []
  let p = 0
  for (const t of log.jumps) {
    let pausedBetween = false
    while (p < log.pauses.length && log.pauses[p] <= t) {
      if (cur.length && log.pauses[p] >= cur[cur.length - 1]) pausedBetween = true
      p++
    }
    if (cur.length && (t - cur[cur.length - 1] > BREAK_GAP || pausedBetween)) {
      out.push(streakOf(out.length + 1, cur))
      cur = []
    }
    cur.push(t)
  }
  if (cur.length) out.push(streakOf(out.length + 1, cur))
  return out
}

export function currentJpm(log: WorkoutLog, now = log.elapsedMs): number {
  const last = log.jumps[log.jumps.length - 1]
  if (last === undefined || now - last > BREAK_GAP || log.pauses.some((p) => p > last)) return 0
  const streak = splitStreaks(log).at(-1)!
  const inWindow = log.jumps.filter((t) => t >= Math.max(streak.startMs, now - CURRENT_WINDOW_MS) && t <= now)
  if (inWindow.length < 2) return 0
  return ((inWindow.length - 1) / (inWindow[inWindow.length - 1] - inWindow[0])) * 60_000
}

/** Highest one-minute-equivalent speed: best rate over a sliding window inside one streak. */
export function maxJpm(streaks: Streak[], jumps: number[]): number {
  let best = 0
  for (const s of streaks) {
    const ts = jumps.filter((t) => t >= s.startMs && t <= s.endMs)
    let j = 0
    for (let i = 1; i < ts.length; i++) {
      while (ts[i] - ts[j] > MAX_WINDOW_MS) j++
      const span = ts[i] - ts[j]
      if (span >= MAX_MIN_SPAN_MS) best = Math.max(best, ((i - j) / span) * 60_000)
    }
  }
  // shortcut: workouts with no streak ≥ 5 s fall back to the best streak rate
  return best || Math.max(0, ...streaks.map((s) => s.jpm))
}

export function computeMetrics(log: WorkoutLog, opts: { weightKg?: number | null; plannedMs?: number | null } = {}) {
  const streaks = splitStreaks(log)
  const total = log.jumps.length
  const activeMs = Math.min(log.elapsedMs, streaks.reduce((s, x) => s + x.durationMs, 0))
  const rated = streaks.filter((s) => s.jumps > 1)
  const last = streaks.at(-1)
  const cur = currentJpm(log)
  const projected =
    opts.plannedMs && log.elapsedMs >= 5_000 ? Math.round((total / log.elapsedMs) * opts.plannedMs) : null

  return {
    totalJumps: total,
    elapsedMs: log.elapsedMs,
    activeMs,
    restMs: Math.max(0, log.elapsedMs - activeMs),
    avgJpm: activeMs > 0 ? (total / activeMs) * 60_000 : 0, // per ACTIVE minute, not per workout minute
    currentJpm: cur,
    // speed at the last jump (people stop before tapping END, so "current" at the end is usually 0)
    // (a pause pressed after the last jump, before END, must not zero it)
    finalJpm: total ? currentJpm({ ...log, pauses: log.pauses.filter((p) => p <= log.jumps[total - 1]) }, log.jumps[total - 1]) : 0,
    maxJpm: maxJpm(streaks, log.jumps),
    calories: CALORIE_MET * (opts.weightKg || DEFAULT_WEIGHT_KG) * (activeMs / 3_600_000),
    currentStreak: cur > 0 && last ? last.jumps : 0,
    maxStreak: Math.max(0, ...streaks.map((s) => s.jumps)),
    avgStreakJpm: rated.length ? rated.reduce((s, x) => s + x.jpm, 0) / rated.length : 0,
    maxStreakJpm: Math.max(0, ...rated.map((s) => s.jpm)),
    trips: log.trips.length,
    streaks,
    projectedJumps: projected,
  }
}

export type WorkoutMetrics = ReturnType<typeof computeMetrics>
