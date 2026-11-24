import { describe, expect, test } from 'vitest'
import { benchmarkCompare, buildTimeline, personalRecords, prStatus, type RecordSource } from './analytics'

describe('benchmarks', () => {
  const t = (id: string, startedAt: number, benchmarkMs: number | null, totalJumps: number) => ({ id, startedAt, benchmarkMs, totalJumps, avgJpm: totalJumps, maxJpm: totalJumps })
  const ws = [t('a', 1, 60_000, 120), t('b', 2, 180_000, 300), t('c', 3, 60_000, 150), t('d', 4, null, 999)]

  test('compares only tests of the same duration, latest vs previous', () => {
    const one = benchmarkCompare(ws, 60_000)
    expect(one.tests.map((x) => x.id)).toEqual(['a', 'c'])
    expect(one.diff).toMatchObject({ jumps: 30, avgJpm: 30 })
    expect(one.diff!.pct).toBeCloseTo(25)
  })

  test('single test of a duration has nothing to compare', () => {
    const three = benchmarkCompare(ws, 180_000)
    expect(three.latest!.id).toBe('b')
    expect(three.previous).toBeNull()
    expect(three.diff).toBeNull()
  })
})
import { splitStreaks, type WorkoutLog } from './workoutMetrics'

const series = (from: number, n: number, every: number) => Array.from({ length: n }, (_, i) => from + i * every)

describe('timeline', () => {
  // rest 0–5 s, jump 5–15 s (20 @ 500ms, ends by trip), 2 s gap, jump 17–27 s, rest to 40 s
  const log: WorkoutLog = { jumps: [...series(5000, 20, 500), ...series(17000, 20, 500)], trips: [14500], pauses: [], elapsedMs: 40000 }
  const tl = buildTimeline(log, splitStreaks(log))

  test('alternates rest/jump and covers the whole workout', () => {
    expect(tl.map((s) => s.kind)).toEqual(['rest', 'jump', 'rest', 'jump', 'rest'])
    expect(tl[0].startMs).toBe(0)
    expect(tl.at(-1)!.endMs).toBe(40000)
    for (let i = 1; i < tl.length; i++) expect(tl[i].startMs).toBeCloseTo(tl[i - 1].endMs)
  })

  test('segment details and how each streak ended', () => {
    expect(tl[1]).toMatchObject({ jumps: 20, endedBy: 'trip' })
    expect(tl[1].jpm).toBeCloseTo(120)
    expect(tl[3].endedBy).toBe('rest')
    expect(tl.filter((s) => s.kind === 'jump').reduce((a, s) => a + s.jumps, 0)).toBe(40)
  })

  test('pause and workout end are reported', () => {
    const p: WorkoutLog = { jumps: [...series(0, 10, 500), ...series(6000, 10, 500)], trips: [], pauses: [5000], elapsedMs: 10600 }
    const t = buildTimeline(p, splitStreaks(p))
    expect(t.filter((s) => s.kind === 'jump').map((s) => s.endedBy)).toEqual(['pause', 'end'])
  })
})

describe('records', () => {
  const w = (id: string, startedAt: number, n: number, every: number): RecordSource & { totalJumps: number } => ({
    id,
    startedAt,
    jumps: series(0, n, every),
    trips: [],
    pauses: [],
    elapsedMs: n * every + 1000,
    weightKg: null,
    plannedMs: null,
    totalJumps: n,
  })
  const a = w('a', 1, 100, 500) // 120 JPM
  const b = w('b', 2, 80, 400) // 150 JPM, fewer jumps
  const c = w('c', 3, 150, 500)

  test('best value per record with the record it beat', () => {
    const r = personalRecords([c, a, b])
    expect(r.totalJumps).toMatchObject({ value: 150, workoutId: 'c', previous: { value: 100 } })
    expect(r.maxJpm!.workoutId).toBe('b')
    expect(r.maxJpm!.previous!.value).toBeCloseTo(120)
    expect(r.maxStreak!.value).toBe(150)
  })

  test('PR status compares only with earlier workouts', () => {
    expect(prStatus(a, [a, b, c])).toMatchObject({ previousBest: null, isPR: true, first: true })
    expect(prStatus(b, [a, b, c])).toMatchObject({ previousBest: 100, isPR: false })
    expect(prStatus(c, [a, b, c])).toMatchObject({ previousBest: 100, isPR: true })
  })
})
