import { expect, test } from 'vitest'
import type { WorkoutRecord } from './db'
import { jumpBuckets, rangeStart, startOfWeek, totals } from './queries'

test('range + daily/weekly buckets include empty days and sum workouts', () => {
  const now = new Date(2026, 10, 25, 12) // Wed
  const ws = [
    { startedAt: new Date(2026, 10, 25, 9).getTime(), totalJumps: 100 },
    { startedAt: new Date(2026, 10, 25, 10).getTime(), totalJumps: 50 },
    { startedAt: new Date(2026, 10, 20, 10).getTime(), totalJumps: 70 }, // previous Friday
    { startedAt: new Date(2026, 9, 1).getTime(), totalJumps: 999 }, // outside 7d
  ]
  const from = rangeStart('7d', ws, now)
  expect(new Date(from)).toEqual(new Date(2026, 10, 19))
  const days = jumpBuckets(ws, from, 'day', now)
  expect(days).toHaveLength(7)
  expect(days.at(-1)).toMatchObject({ jumps: 150, workouts: 2 })
  expect(days[1]).toMatchObject({ jumps: 70 })
  const weeks = jumpBuckets(ws, from, 'week', now)
  expect(weeks.map((w) => w.jumps)).toEqual([70, 150])
  expect(new Date(rangeStart('all', ws, now))).toEqual(new Date(2026, 9, 1))
})

test('week starts on Monday 00:00', () => {
  const wed = new Date(2026, 10, 25, 15, 30) // Wed 25 Nov 2026
  expect(new Date(startOfWeek(wed))).toEqual(new Date(2026, 10, 23))
  const sun = new Date(2026, 10, 29, 23, 0)
  expect(new Date(startOfWeek(sun))).toEqual(new Date(2026, 10, 23))
})

test('totals: avg JPM is per active minute across workouts', () => {
  const w = (totalJumps: number, activeMs: number) => ({ totalJumps, activeMs, elapsedMs: activeMs * 2, calories: 10 }) as WorkoutRecord
  const t = totals([w(120, 60_000), w(300, 120_000)])
  expect(t).toMatchObject({ count: 2, jumps: 420, elapsedMs: 360_000, calories: 20 })
  expect(t.avgJpm).toBeCloseTo(140)
  expect(totals([]).avgJpm).toBe(0)
})
