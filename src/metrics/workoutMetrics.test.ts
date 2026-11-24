import { describe, expect, test } from 'vitest'
import { computeMetrics, currentJpm, splitStreaks, type WorkoutLog } from './workoutMetrics'

/** n jumps every `every` ms starting at `from`. */
const series = (from: number, n: number, every: number) => Array.from({ length: n }, (_, i) => from + i * every)

describe('workout metrics', () => {
  // 60 jumps @120 JPM (0–29.5 s), 30 s rest, 60 jumps @120 JPM (60–89.5 s); 90 s workout
  const log: WorkoutLog = { jumps: [...series(0, 60, 500), ...series(60_000, 60, 500)], trips: [], pauses: [], elapsedMs: 90_000 }
  const m = computeMetrics(log, { weightKg: 70, plannedMs: 180_000 })

  test('splits into streaks on long gaps', () => {
    expect(m.streaks.map((s) => s.jumps)).toEqual([60, 60])
    expect(m.streaks[0].durationMs).toBeCloseTo(30_000)
    expect(m.streaks[0].jpm).toBeCloseTo(120)
  })

  test('average JPM uses ACTIVE time, not whole workout', () => {
    expect(m.activeMs).toBeCloseTo(60_000)
    expect(m.restMs).toBeCloseTo(30_000)
    expect(m.avgJpm).toBeCloseTo(120) // 120 jumps / 1 active min — not 80 per workout minute
  })

  test('max JPM, streaks, trips', () => {
    expect(m.maxJpm).toBeCloseTo(120)
    expect(m.maxStreak).toBe(60)
    expect(m.avgStreakJpm).toBeCloseTo(120)
    expect(m.trips).toBe(0)
  })

  test('projected = whole-workout pace × planned duration', () => {
    expect(m.projectedJumps).toBe(240) // 120 jumps in 90 s → 240 in 180 s
    expect(computeMetrics(log).projectedJumps).toBeNull()
  })

  test('calories are an MET estimate over active time', () => {
    expect(m.calories).toBeCloseTo(11.8 * 70 * (60 / 3600))
  })

  test('current JPM uses the rolling window and drops to 0 after the streak ends', () => {
    expect(currentJpm({ ...log, elapsedMs: 89_600 })).toBeCloseTo(120)
    expect(currentJpm({ ...log, elapsedMs: 95_000 })).toBe(0)
  })

  test('final JPM is the pace at the last jump, even after stopping', () => {
    expect(computeMetrics({ ...log, elapsedMs: 120_000 }).finalJpm).toBeCloseTo(120)
    expect(computeMetrics({ ...log, pauses: [95_000], elapsedMs: 120_000 }).finalJpm).toBeCloseTo(120) // paused, then END
  })

  test('a pause ends the streak without a trip and current streak resets', () => {
    const paused: WorkoutLog = { jumps: [...series(0, 20, 500), ...series(10_000, 20, 500)], trips: [], pauses: [9_700], elapsedMs: 20_000 }
    expect(splitStreaks(paused).map((s) => s.jumps)).toEqual([20, 20])
    expect(computeMetrics(paused).trips).toBe(0)
  })

  test('max JPM finds the fastest stretch', () => {
    const mixed: WorkoutLog = { jumps: [...series(0, 40, 600), ...series(24_000, 41, 375)], trips: [], pauses: [], elapsedMs: 40_000 }
    expect(computeMetrics(mixed).maxJpm).toBeCloseTo(160, 0)
  })

  test('empty workout is all zeros', () => {
    const e = computeMetrics({ jumps: [], trips: [], pauses: [], elapsedMs: 10_000 })
    expect([e.totalJumps, e.avgJpm, e.maxJpm, e.currentStreak, e.maxStreak, e.activeMs]).toEqual([0, 0, 0, 0, 0, 0])
    expect(e.restMs).toBe(10_000)
  })
})
