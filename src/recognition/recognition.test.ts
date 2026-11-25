import { describe, expect, test } from 'vitest'
import type { Landmark } from '../vision/poseSignal'
import { classify, dtw, type Decision } from './classifier'
import { TrickEventTracker } from './events'
import { frameFeatures, MotionBuffer } from './features'
import { TrickRecognizer } from './recognizer'
import { levelCounts, mostPerformed, summarizeTricks } from './summary'

const S = 0.2 // torso length in image units

type P = { hx?: number; hy?: number; sep?: number; dy?: number; knee?: number; cross?: boolean; side?: number; horizontal?: boolean; seated?: boolean; vis?: number; hand?: number }

/** Synthetic frontal pose. Body's left (11, 23, …) on image right. All offsets in torso lengths. */
function pose({ hx = 0.5, hy = 0.55, sep = 0.3, dy = 0, knee = -0.9, cross = false, side = 0, horizontal = false, seated = false, vis = 0.9, hand = 0 }: P = {}): Landmark[] {
  const lm = Array.from({ length: 33 }, (): Landmark => ({ x: hx, y: hy - S * 1.3, visibility: vis }))
  const set = (i: number, x: number, y: number) => (lm[i] = { x, y, visibility: vis })
  if (horizontal) {
    set(11, hx - S, hy - 0.01); set(12, hx - S, hy + 0.01) // shoulders to the side of the hips
  } else {
    set(11, hx + 0.4 * S, hy - S); set(12, hx - 0.4 * S, hy - S)
  }
  set(23, hx + 0.25 * S, hy); set(24, hx - 0.25 * S, hy)
  const legY = seated ? 0.2 * S : 1.6 * S
  set(25, hx + 0.25 * S, hy - knee * S); set(26, hx - 0.25 * S, hy - knee * S)
  set(27, hx + (sep / 2) * S, hy + legY + (dy / 2) * S); set(28, hx - (sep / 2) * S, hy + legY - (dy / 2) * S)
  const wx = hx + side * S
  const wGap = side ? 0.1 : cross ? -0.3 : 0.9 // crossed: body's left wrist ends up on the right
  set(15, wx + (wGap / 2) * S, hy + hand * S); set(16, wx - (wGap / 2) * S, hy + hand * S)
  return lm
}

/** Feed `ms` of frames at 30 fps; `at(i)` gives the pose for frame i. Returns the events. */
function run(rec: TrickRecognizer, ms: number, at: (i: number) => Landmark[] | undefined, t0 = 0) {
  const evs = []
  for (let i = 0; i * 33 < ms; i++) {
    const e = rec.push(t0 + i * 33, at(i))
    if (e) evs.push(e)
  }
  return evs
}
/** Jumping while turning a rope: hands circle relative to the body once per jump. */
const turning = (i: number) => 0.12 * Math.sin(i / 2)
const bounce = (i: number, p: P = {}) => pose({ hand: turning(i), ...p, hy: 0.55 - 0.02 * Math.abs(Math.sin(i / 4)) })

describe('features', () => {
  test('standing pose: upright, open arms, legs straight', () => {
    const f = frameFeatures(pose())!
    expect(f.torsoAngle).toBeLessThan(5)
    expect(f.wristCross).toBeGreaterThan(0)
    expect(f.hipHeight).toBeCloseTo(1.6, 1)
  })
  test('crossed arms flip wristCross; mirrored image gives the same values', () => {
    const p = pose({ cross: true })
    expect(frameFeatures(p)!.wristCross).toBeLessThan(0)
    const mirrored = p.map((l) => ({ ...l, x: 1 - l.x }))
    expect(frameFeatures(mirrored)!.wristCross).toBeCloseTo(frameFeatures(p)!.wristCross)
  })
  test('horizontal body → ~90°; torso hidden → null', () => {
    expect(frameFeatures(pose({ horizontal: true }))!.torsoAngle).toBeGreaterThan(80)
    expect(frameFeatures(pose({ vis: 0.2 }))).toBeNull()
    expect(frameFeatures(undefined)).toBeNull()
  })
})

describe('motion buffer', () => {
  test('keeps the span, computes hip velocity, restarts on gaps and seeks', () => {
    const b = new MotionBuffer(1000, 500)
    for (let t = 0; t <= 2000; t += 100) b.push(t, frameFeatures(pose({ hx: 0.5 + t / 100000 })))
    expect(b.frames[0].t).toBe(1000)
    expect(b.frames.at(-1)!.vx).toBeCloseTo(0.01 / S / 1, 3) // 0.001 per 100 ms = 0.01/s, in torso lengths
    b.push(3000, null) // 1 s gap
    expect(b.frames).toHaveLength(1)
    b.push(3100, null)
    b.push(100, null) // seek back
    expect(b.frames).toHaveLength(1)
  })
})

describe('classifier', () => {
  const win = (ms: number, at: (i: number) => Landmark[] | undefined) => {
    const b = new MotionBuffer(ms + 100)
    for (let i = 0; i * 33 < ms; i++) b.push(i * 33, frameFeatures(at(i)))
    return classify(b.window(ms))
  }
  const cases: [string, (i: number) => Landmark[]][] = [
    ['side-straddle', (i) => bounce(i, { sep: i % 16 < 8 ? 0.2 : 1.2 })],
    ['skier', (i) => bounce(i, { hx: 0.5 + (i % 16 < 8 ? -0.06 : 0.06) })],
    ['criss-cross', (i) => bounce(i, { cross: i % 16 < 8 })],
    ['side-swing', (i) => pose({ side: i % 16 < 8 ? -1 : 1, hand: turning(i) })],
    ['can-can', (i) => bounce(i, { knee: i % 16 < 6 ? 0 : -0.9 })],
    ['jogging-step', (i) => bounce(i, { dy: i % 16 < 8 ? 0.3 : -0.3 })],
    ['pushup-fake', (i) => (i % 30 < 15 ? pose({ horizontal: true }) : bounce(i))],
    ['butt-bounce', (i) => (i % 30 < 15 ? pose({ seated: true }) : bounce(i))],
  ]
  test.each(cases)('%s', (label, at) => expect(win(1600, at).label).toBe(label))

  test('seated with knees up is butt-bounce, not can-can; hidden legs are no evidence of a kick', () => {
    expect(win(1600, (i) => (i % 30 < 15 ? pose({ seated: true, knee: 0.3 }) : bounce(i))).label).toBe('butt-bounce')
    const noLegs = (i: number) => bounce(i).map((l, k) => (k >= 25 && k <= 28 ? { ...l, visibility: 0.1 } : l))
    expect(win(1600, noLegs).label).not.toBe('can-can')
  })
  test('no rope: the same trick movements with still or hidden hands are not tricks', () => {
    expect(win(1600, (i) => bounce(i, { sep: i % 16 < 8 ? 0.2 : 1.2, hand: 0 })).label).toBe('basic')
    expect(win(1600, (i) => bounce(i, { cross: i % 16 < 8, hand: 0 })).label).toBe('basic')
    const hidden = (i: number) => bounce(i, { sep: i % 16 < 8 ? 0.2 : 1.2 }).map((l, k) => (k === 15 || k === 16 ? { ...l, visibility: 0.1 } : l))
    expect(win(1600, hidden).label).toBe('basic')
  })
  test('one-way sideways drift (walking, getting up) is not skier', () => {
    expect(win(1600, (i) => bounce(i, { hx: 0.4 + i * 0.004 })).label).not.toBe('skier')
  })
  test('plain bouncing → basic, standing still → idle', () => {
    expect(win(1600, (i) => pose({ hy: 0.55 - 0.03 * Math.abs(Math.sin(i / 4)) })).label).toBe('basic')
    expect(win(1600, () => pose()).label).toBe('idle')
  })
  test('tracking loss → lost', () => expect(win(1600, (i) => (i % 2 ? undefined : pose())).label).toBe('lost'))
  test('random flailing → not a confident trick', () => {
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5)
    const d = win(1600, () => pose({ hx: 0.5 + rnd() * 0.02, sep: 0.5 + rnd() * 0.4, dy: rnd() * 0.3, cross: rnd() > 0.3, side: rnd() > 0.2 ? rnd() * 1.5 : 0, knee: -0.9 + rnd() }))
    expect(['unknown', 'basic', 'idle']).toContain(d.label)
  })
  test('dtw: identical → 0, time-warped copy closer than a different signal', () => {
    const a = Array.from({ length: 20 }, (_, i) => [Math.sin(i / 3)])
    const warped = Array.from({ length: 30 }, (_, i) => [Math.sin(i / 4.5)])
    const flat = Array.from({ length: 20 }, () => [0])
    expect(dtw(a, a)).toBe(0)
    expect(dtw(a, warped, 8)).toBeLessThan(dtw(a, flat, 8))
  })
})

describe('event tracker (dedup)', () => {
  const d = (label: Decision['label'], score = 0.8): Decision => ({ label, score, scores: {} })
  test('one continuous run → one event updated in place, confirmed after 4 windows', () => {
    const tr = new TrickEventTracker()
    const evs = [0, 200, 400, 600, 800].map((t) => tr.push(t, d('skier')))
    expect(evs.slice(0, 3)).toEqual([null, null, null])
    const seqs = new Set(evs.filter(Boolean).map((e) => e!.seq))
    expect(seqs.size).toBe(1)
    expect(evs.at(-1)).toMatchObject({ trickId: 'skier', startT: 0, endT: 800 })
  })
  test('short dropout re-joins; long break makes a new event', () => {
    const tr = new TrickEventTracker()
    for (const t of [0, 200, 400, 500]) tr.push(t, d('skier'))
    tr.push(600, d('unknown'))
    expect(tr.push(1000, d('skier'))!.seq).toBe(1)
    for (const t of [1200, 1400, 3000]) tr.push(t, d('idle'))
    const again = [3200, 3400, 3600, 3800].map((t) => tr.push(t, d('skier')))
    expect(again.at(-1)!.seq).toBe(2)
  })
  test('one stray window of another trick never creates an event', () => {
    const tr = new TrickEventTracker()
    for (const t of [0, 200, 400, 500]) tr.push(t, d('skier'))
    expect(tr.push(600, d('can-can'))).toBeNull()
    expect(tr.push(800, d('skier'))!.seq).toBe(1)
  })
  test('seq keeps growing across reset (pause)', () => {
    const tr = new TrickEventTracker()
    for (const t of [0, 200, 400, 500]) tr.push(t, d('skier'))
    tr.reset()
    const e = [0, 200, 400, 500].map((t) => tr.push(t, d('skier'))).at(-1)
    expect(e!.seq).toBe(2)
  })
})

describe('recognizer end to end (synthetic)', () => {
  test('straddles → exactly one event; tracking loss closes it; basic jumping adds nothing', () => {
    const rec = new TrickRecognizer()
    const a = run(rec, 4000, (i) => bounce(i, { sep: i % 16 < 8 ? 0.2 : 1.2 }))
    expect(new Set(a.map((e) => e.seq)).size).toBe(1)
    expect(a.at(-1)!.trickId).toBe('side-straddle')
    expect(run(rec, 2000, () => undefined, 4000)).toEqual([])
    expect(run(rec, 4000, (i) => pose({ hy: 0.55 - 0.03 * Math.abs(Math.sin(i / 4)) }), 6000)).toEqual([])
  })
})

test('UI shows a trick only once its run is confirmed, never a one-window guess', () => {
  const rec = new TrickRecognizer()
  const straddle = (i: number) => bounce(i, { sep: i % 16 < 8 ? 0.2 : 1.2 })
  const seen: string[] = []
  for (let i = 0; i * 33 < 4000; i++) {
    const e = rec.push(i * 33, straddle(i))
    if (!e && rec.shown.label === 'side-straddle' && !seen.length) seen.push('shown-before-event')
    if (e && !seen.length) seen.push('event-first')
  }
  expect(seen).toEqual(['event-first'])
  expect(rec.shown.label).toBe('side-straddle')
})

describe('workout trick summary', () => {
  test('groups runs per trick, counts jumps inside runs, keeps first-seen order', () => {
    const rows = summarizeTricks(
      [
        { trickId: 'skier', startMs: 5000, endMs: 7000, score: 0.7 },
        { trickId: 'side-straddle', startMs: 1000, endMs: 2000, score: 0.9 },
        { trickId: 'skier', startMs: 9000, endMs: 9500, score: 0.8 },
      ],
      [1500, 1900, 3000, 6000, 9200],
    )
    expect(rows).toEqual([
      { trickId: 'side-straddle', runs: 1, jumps: 2, bestScore: 0.9, firstMs: 1000 },
      { trickId: 'skier', runs: 2, jumps: 2, bestScore: 0.8, firstMs: 5000 },
    ])
  })
})

test('levelCounts groups trick runs by library level, zeros kept, unknown ids skipped', () => {
  const r = (trickId: string) => ({ trickId, startMs: 0, endMs: 1, score: 1 })
  expect(levelCounts([r('skier'), r('skier'), r('side-straddle'), r('nope')])).toEqual({ easy: 0, medium: 1, rare: 2, hard: 0, epic: 0 })
})

test('mostPerformed ranks by runs, then best score, and caps the list', () => {
  const r = (trickId: string, score: number) => ({ trickId, startMs: 0, endMs: 1, score })
  const rows = mostPerformed([r('skier', 0.7), r('skier', 0.6), r('can-can', 0.9), r('side-swing', 0.8), r('jogging-step', 0.5)], 3)
  expect(rows.map((x) => [x.trickId, x.runs])).toEqual([['skier', 2], ['can-can', 1], ['side-swing', 1]])
})
