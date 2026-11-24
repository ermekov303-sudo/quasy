import { describe, expect, test } from 'vitest'
import { JumpDetector, type DetectorEvent, type PoseSample } from './jumpDetector'

const FPS = 30
const SCALE = 0.6 // body height in frame
const AMP = 0.02 // ~3.3% of body height ≈ 4–5 cm hop

// Deterministic noise so tests are stable.
function rng(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
}

type Part = { kind: 'jump'; sec: number; jpm: number } | { kind: 'still'; sec: number } | { kind: 'lost'; sec: number }

function signal(parts: Part[], noise = 0.0015): PoseSample[] {
  const r = rng()
  const out: PoseSample[] = []
  let t = 0
  for (const p of parts) {
    const n = Math.round(p.sec * FPS)
    for (let i = 0; i < n; i++, t += 1000 / FPS) {
      if (p.kind === 'lost') {
        out.push({ t, y: null, scale: SCALE })
        continue
      }
      const hop = p.kind === 'jump' ? AMP * Math.abs(Math.sin((Math.PI * p.jpm * (i / FPS)) / 60)) : 0
      out.push({ t, y: 0.6 - hop + noise * r(), scale: SCALE })
    }
  }
  return out
}

function run(samples: PoseSample[], tailMs = 0) {
  const d = new JumpDetector()
  const ev: DetectorEvent[] = []
  for (const s of samples) ev.push(...d.push(s))
  if (tailMs) {
    const end = samples.at(-1)!.t
    for (let t = end; t <= end + tailMs; t += 1000 / FPS) ev.push(...d.push({ t, y: 0.6, scale: SCALE }))
  }
  return {
    d,
    jumps: ev.filter((e) => e.type === 'jump'),
    ends: ev.filter((e) => e.type === 'streak-end'),
  }
}

describe('JumpDetector', () => {
  test.each([90, 120, 160, 200])('counts a steady %i JPM series within ±1', (jpm) => {
    const { jumps } = run(signal([{ kind: 'jump', sec: 20, jpm }]))
    expect(Math.abs(jumps.length - (jpm * 20) / 60)).toBeLessThanOrEqual(1)
  })

  test('standing still with landmark jitter counts nothing', () => {
    const { jumps } = run(signal([{ kind: 'still', sec: 20 }], 0.004))
    expect(jumps).toHaveLength(0)
  })

  test('each jump counted once: strictly increasing, ≥ min interval apart', () => {
    const { jumps } = run(signal([{ kind: 'jump', sec: 20, jpm: 150 }], 0.003))
    for (let i = 1; i < jumps.length; i++) expect(jumps[i].t - jumps[i - 1].t).toBeGreaterThanOrEqual(180)
  })

  test('short break then resume = one trip', () => {
    const { ends, jumps } = run(
      signal([{ kind: 'jump', sec: 10, jpm: 120 }, { kind: 'still', sec: 2 }, { kind: 'jump', sec: 10, jpm: 120 }]),
    )
    expect(ends.map((e) => e.type === 'streak-end' && e.reason)).toEqual(['trip'])
    expect(Math.abs(jumps.length - 40)).toBeLessThanOrEqual(2)
  })

  test('long break = rest, not a trip; activity goes to resting', () => {
    const { ends, d } = run(signal([{ kind: 'jump', sec: 10, jpm: 120 }, { kind: 'still', sec: 8 }]))
    expect(ends.map((e) => e.type === 'streak-end' && e.reason)).toEqual(['rest'])
    expect(d.activity).toBe('resting')
  })

  test('activity is jumping mid-series and idle before any jump', () => {
    expect(new JumpDetector().activity).toBe('idle')
    const { d } = run(signal([{ kind: 'jump', sec: 5, jpm: 120 }]))
    expect(d.activity).toBe('jumping')
    expect(d.currentStreak).toBeGreaterThan(5)
  })

  test('short pose dropout inside a series does not create a trip', () => {
    const { ends } = run(
      signal([{ kind: 'jump', sec: 8, jpm: 120 }, { kind: 'lost', sec: 0.4 }, { kind: 'jump', sec: 8, jpm: 120 }]),
    )
    expect(ends).toHaveLength(0)
  })

  test('break with pose lost is reported as lost, not as a trip', () => {
    const { ends } = run(
      signal([{ kind: 'jump', sec: 8, jpm: 120 }, { kind: 'lost', sec: 2.5 }, { kind: 'jump', sec: 8, jpm: 120 }]),
    )
    expect(ends.map((e) => e.type === 'streak-end' && e.reason)).toEqual(['lost'])
  })

  test('one big movement does not freeze counting (adaptive threshold recovers)', () => {
    const before = signal([{ kind: 'jump', sec: 10, jpm: 120 }])
    const t0 = before.at(-1)!.t
    // a single deep dip-and-rise (crouch / step toward camera): 30% of body height
    const big = Array.from({ length: 15 }, (_, i) => ({ t: t0 + (i + 1) * (1000 / FPS), y: 0.6 + 0.18 * Math.sin((Math.PI * i) / 14), scale: SCALE }))
    const after = signal([{ kind: 'jump', sec: 10, jpm: 120 }]).map((s) => ({ ...s, t: s.t + big.at(-1)!.t + 1000 / FPS }))
    const { jumps } = run([...before, ...big, ...after])
    expect(jumps.length).toBeGreaterThanOrEqual(36) // ~40 real jumps; must not stall after the dip
  })

  test('reset clears counters', () => {
    const { d } = run(signal([{ kind: 'jump', sec: 5, jpm: 120 }]))
    d.reset()
    expect(d.activity).toBe('idle')
    expect(d.currentStreak).toBe(0)
  })
})
