import { expect, test } from 'vitest'
import type { WorkoutRecord } from './db'
import { jumpBuckets, periodSummary, rangeStart, startOfMonth, startOfWeek, totals, trainingStreaks } from './queries'

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

test('daily buckets sum active time and keep empty days across a month boundary', () => {
  const now = new Date(2026, 11, 2, 8)
  const ws = [
    { startedAt: new Date(2026, 10, 30, 23, 30).getTime(), totalJumps: 10, activeMs: 60_000 },
    { startedAt: new Date(2026, 11, 2, 7).getTime(), totalJumps: 5, activeMs: 30_000 },
  ]
  const days = jumpBuckets(ws, new Date(2026, 10, 29).getTime(), 'day', now)
  expect(days.map((d) => d.activeMs)).toEqual([0, 60_000, 0, 30_000])
})

test('training streaks: consecutive local days, today optional, longest kept', () => {
  const at = (m: number, d: number, h = 10) => ({ startedAt: new Date(2026, m, d, h).getTime() })
  const now = new Date(2026, 10, 25, 9) // no workout yet today
  const ws = [at(10, 1), at(10, 2), at(10, 3), at(10, 4), at(10, 10), at(10, 23, 23), at(10, 24, 7), at(10, 24, 20)]
  expect(trainingStreaks(ws, now)).toEqual({ current: 2, longest: 4 })
  expect(trainingStreaks([...ws, at(10, 25, 8)], now).current).toBe(3)
  expect(trainingStreaks([at(10, 22)], now).current).toBe(0) // two days ago: broken
  expect(trainingStreaks([], now)).toEqual({ current: 0, longest: 0 })
  // across a month boundary
  expect(trainingStreaks([at(9, 31), at(10, 1)], new Date(2026, 10, 1, 12))).toEqual({ current: 2, longest: 2 })
})

test('period summary counts distinct active days in [from, to)', () => {
  const w = (d: number, h: number, totalJumps: number) => ({ startedAt: new Date(2026, 10, d, h).getTime(), totalJumps, activeMs: 60_000 })
  const ws = [w(1, 9, 10), w(1, 18, 20), w(3, 9, 5), w(30, 9, 1)]
  const from = startOfMonth(new Date(2026, 10, 15))
  expect(periodSummary(ws, from, new Date(2026, 10, 30).getTime())).toEqual({ workouts: 3, jumps: 35, activeMs: 180_000, activeDays: 2 })
})
