import type { WorkoutRecord } from './db'

/** Monday 00:00 local time of the week containing `d`. */
export function startOfWeek(d = new Date()): number {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x.getTime()
}

export function startOfDay(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export type Range = '7d' | '30d' | 'all'

/** First day included in a range (local midnight). 'all' starts at the first workout. */
export function rangeStart(range: Range, ws: { startedAt: number }[], now = new Date()): number {
  if (range === 'all') return ws.length ? startOfDay(new Date(Math.min(...ws.map((w) => w.startedAt)))) : startOfDay(now)
  const d = new Date(startOfDay(now))
  d.setDate(d.getDate() - (range === '7d' ? 6 : 29))
  return d.getTime()
}

/** Jumps, workouts and active time per local day or week (Mon) from `from` to today, empty buckets included. */
export function jumpBuckets(ws: { startedAt: number; totalJumps: number; activeMs?: number }[], from: number, by: 'day' | 'week', now = new Date()) {
  const out: { start: number; jumps: number; workouts: number; activeMs: number }[] = []
  const first = by === 'week' ? startOfWeek(new Date(from)) : from
  for (let d = new Date(first); d.getTime() <= now.getTime(); d.setDate(d.getDate() + (by === 'week' ? 7 : 1)))
    out.push({ start: d.getTime(), jumps: 0, workouts: 0, activeMs: 0 })
  for (const w of ws) {
    const key = by === 'week' ? startOfWeek(new Date(w.startedAt)) : startOfDay(new Date(w.startedAt))
    const b = out.find((x) => x.start === key)
    if (b) {
      b.jumps += w.totalJumps
      b.workouts++
      b.activeMs += w.activeMs ?? 0
    }
  }
  return out
}

/** Sums over a set of workouts. Average JPM is total jumps per ACTIVE minute across them. */
export function totals(ws: WorkoutRecord[]) {
  const jumps = ws.reduce((s, w) => s + w.totalJumps, 0)
  const activeMs = ws.reduce((s, w) => s + w.activeMs, 0)
  return {
    count: ws.length,
    jumps,
    elapsedMs: ws.reduce((s, w) => s + w.elapsedMs, 0),
    calories: ws.reduce((s, w) => s + w.calories, 0),
    avgJpm: activeMs > 0 ? (jumps / activeMs) * 60_000 : 0,
  }
}

const addDays = (t: number, n: number) => {
  const d = new Date(t)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime() // local calendar day, DST-safe
}

export function startOfMonth(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

/**
 * Training streaks in local calendar days with at least one workout.
 * `current` still counts when today has no workout yet but yesterday had one (the streak isn't broken until the day ends).
 */
export function trainingStreaks(ws: { startedAt: number }[], now = new Date()) {
  const days = [...new Set(ws.map((w) => startOfDay(new Date(w.startedAt))))].sort((a, b) => a - b)
  let longest = 0
  let run = 0
  days.forEach((d, i) => {
    run = i > 0 && addDays(days[i - 1], 1) === d ? run + 1 : 1
    longest = Math.max(longest, run)
  })
  const has = new Set(days)
  let cursor = has.has(startOfDay(now)) ? startOfDay(now) : addDays(startOfDay(now), -1)
  let current = 0
  while (has.has(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }
  return { current, longest }
}

/** Workouts, jumps, active time and distinct active days for workouts started in [from, to). */
export function periodSummary(ws: { startedAt: number; totalJumps: number; activeMs: number }[], from: number, to: number) {
  const in_ = ws.filter((w) => w.startedAt >= from && w.startedAt < to)
  return {
    workouts: in_.length,
    jumps: in_.reduce((s, w) => s + w.totalJumps, 0),
    activeMs: in_.reduce((s, w) => s + w.activeMs, 0),
    activeDays: new Set(in_.map((w) => startOfDay(new Date(w.startedAt)))).size,
  }
}
