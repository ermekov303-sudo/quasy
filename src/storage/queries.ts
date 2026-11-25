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
