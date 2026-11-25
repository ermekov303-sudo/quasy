/**
 * Window classifier: rules on interpretable window statistics, optionally blended with DTW similarity to
 * annotated reference repetitions (`templates.json`, built by `ml/build_templates.ts`). Pure.
 *
 * shortcut: rule thresholds are hand-set, tuned only on the 8 Tricktionary demo clips (one athlete per
 * trick); retune on athlete-separated recordings (ml/README.md) before trusting them.
 */
import type { BufferedFrame, FrameFeatures } from './features.ts'

export const RECOGNIZED_TRICKS = [
  'jogging-step', 'side-straddle', 'skier', 'can-can', 'criss-cross', 'side-swing', 'pushup-fake', 'butt-bounce',
] as const
export type RecognizedTrick = (typeof RECOGNIZED_TRICKS)[number]
/** basic: plain jumping; idle: standing still; unknown: moving but no confident/unique match; lost: tracking gaps. */
export type WindowLabel = RecognizedTrick | 'basic' | 'idle' | 'unknown' | 'lost'

export type Template = { trickId: RecognizedTrick; seq: number[][] }
export type Decision = { label: WindowLabel; score: number; scores: Partial<Record<RecognizedTrick, number>> }

export const classifierConfig = {
  minCoverage: 0.7, // share of frames with a tracked torso
  minScore: 0.55,
  minMargin: 0.2, // best − second best; closer = ambiguous → unknown
  dtwWeight: 0.4,
  dtwTau: 0.35,
}

const ramp = (x: number, lo: number, hi: number) => Math.max(0, Math.min(1, (x - lo) / (hi - lo)))
const q = (xs: number[], p: number, empty = 0) => {
  if (!xs.length) return empty
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]
}
const frac = (xs: FrameFeatures[], pred: (f: FrameFeatures) => boolean) => (xs.length ? xs.filter(pred).length / xs.length : 0)

/** Direction reversals of a signal, ignoring wiggles smaller than `h` (zig-zag with hysteresis). */
export function turns(xs: number[], h: number) {
  let n = 0, dir = 0, ext = xs[0]
  for (const x of xs) {
    if (dir >= 0 && x < ext - h) [n, dir, ext] = [n + (dir > 0 ? 1 : 0), -1, x]
    else if (dir <= 0 && x > ext + h) [n, dir, ext] = [n + (dir < 0 ? 1 : 0), 1, x]
    else if ((dir > 0 && x > ext) || (dir < 0 && x < ext)) ext = x
  }
  return n
}

/** Window statistics the rules use (also printed by the evaluation harness). */
export function windowStats(frames: BufferedFrame[]) {
  const fs = frames.map((x) => x.f).filter((f): f is FrameFeatures => f !== null)
  const s = q(fs.map((f) => f.s), 0.5) || 1
  // limbs seen in under half the window give no evidence (neutral values), never "knee raised"
  const legs = fs.filter((f) => f.legs).length * 2 >= fs.length ? fs.filter((f) => f.legs) : []
  const arms = fs.filter((f) => f.arms).length * 2 >= fs.length ? fs.filter((f) => f.arms) : []
  const upright = fs.filter((f) => f.torsoAngle < 40)
  const dys = legs.map((f) => f.ankleDy)
  const seps = legs.map((f) => f.ankleSep)
  return {
    coverage: frames.length ? fs.length / frames.length : 0,
    bob: (q(fs.map((f) => f.hy), 0.9) - q(fs.map((f) => f.hy), 0.1)) / s, // vertical hip travel
    lateral: (q(fs.map((f) => f.hx), 0.9) - q(fs.map((f) => f.hx), 0.1)) / s, // global sideways travel
    lateralTurns: turns(fs.map((f) => f.hx / s), 0.05), // side-to-side hops, not a one-way drift (getting up, walking)
    sepRange: q(seps, 0.9) - q(seps, 0.1),
    sepHi: q(seps, 0.9),
    dyAlt: Math.min(q(dys, 0.9), -q(dys, 0.1)), // both feet take turns being higher
    kneeHi: q(legs.map((f) => f.kneeLift), 0.9, -1),
    crossFrac: frac(arms, (f) => f.wristCross < -0.05),
    horizFrac: frac(fs, (f) => f.torsoAngle > 55),
    seatedFrac: frac(legs, (f) => f.torsoAngle < 50 && f.hipHeight < 0.6),
    uprightFrac: fs.length ? upright.length / fs.length : 0,
    wristSwing: q(arms.map((f) => f.wristSide), 0.9) - q(arms.map((f) => f.wristSide), 0.1), // hands travel side to side
    wristGapMid: q(arms.map((f) => f.wristGap), 0.5, 1), // hands held together most of the time
    // rope check (hands, not the rope): turning a rope moves the hands up/down relative to the body every jump
    handTurns: arms.length ? turns(arms.map((f) => f.handY), 0.04) : 0,
    handRange: q(arms.map((f) => f.handY), 0.9) - q(arms.map((f) => f.handY), 0.1),
    bobTurns: turns(fs.map((f) => f.hy / s), 0.04),
  }
}
export type WindowStats = ReturnType<typeof windowStats>

export function ruleScores(w: WindowStats): Record<RecognizedTrick, number> {
  const cross = ramp(w.crossFrac, 0.12, 0.3)
  const kneeUp = ramp(w.kneeHi, -0.45, -0.2)
  const straddle = Math.min(ramp(w.sepRange, 0.25, 0.4), ramp(w.sepHi, 0.4, 0.5)) * (1 - kneeUp) // can-can kicks also spread feet
  const horiz = ramp(w.horizFrac, 0.1, 0.3)
  const seated = ramp(w.seatedFrac, 0.1, 0.3)
  // Rope check from the HANDS (the rope itself isn't seen): standing tricks need the hands visible and moving
  // relative to the body, as when turning a rope. Hidden or still hands → plain jump at most.
  // shortcut: thresholds sit just under the weakest rope clip (can-can, hand range ≈0.06) and were never measured
  // on rope-less jumping; tune on recorded no-rope clips. Arm-waving without a rope still passes.
  const rope = Math.max(ramp(w.handRange, 0.03, 0.05), ramp(w.handTurns, 1, 2))
  const up = ramp(w.uprightFrac, 0.6, 0.9) * (1 - horiz) * (1 - seated) * rope // standing tricks only
  const handsTogether = 1 - ramp(w.wristGapMid, 0.35, 0.6)
  return {
    'pushup-fake': horiz,
    'butt-bounce': seated * (1 - horiz),
    'criss-cross': up * cross,
    'side-swing': up * handsTogether * ramp(w.wristSwing, 0.15, 0.25) * (1 - cross),
    'side-straddle': up * straddle,
    skier: up * ramp(w.lateral, 0.1, 0.18) * ramp(w.lateralTurns, 1, 2) * (1 - straddle),
    'can-can': up * kneeUp,
    'jogging-step': up * ramp(w.dyAlt, 0.12, 0.25) * (1 - kneeUp) * (1 - straddle),
  }
}

/** Compact per-frame vector for DTW. Hip position is relative to the window's first frame (keeps displacement). */
export function dtwSequence(frames: BufferedFrame[]): number[][] {
  const fs = frames.map((x) => x.f).filter((f): f is FrameFeatures => f !== null)
  if (!fs.length) return []
  const s = q(fs.map((f) => f.s), 0.5)
  const x0 = fs[0].hx
  const y0 = fs[0].hy
  return fs.map((f) => [
    f.legs ? f.ankleSep : 0, f.legs ? f.ankleDy : 0, f.legs ? f.kneeLift : -0.9, f.arms ? f.wristCross : 1,
    f.arms ? f.wristSide : 0, (f.hx - x0) / s, (f.hy - y0) / s, f.torsoAngle / 90, f.legs ? f.hipHeight / 2 : 0.8,
  ])
}

/** Dynamic time warping, Euclidean frame cost, Sakoe-Chiba band; returns cost per aligned step. */
export function dtw(a: number[][], b: number[][], band = Math.max(a.length, b.length)): number {
  if (!a.length || !b.length) return Infinity
  const n = a.length, m = b.length
  const w = Math.max(band, Math.abs(n - m))
  let prev = new Float64Array(m + 1).fill(Infinity)
  prev[0] = 0
  for (let i = 1; i <= n; i++) {
    const cur = new Float64Array(m + 1).fill(Infinity)
    for (let j = Math.max(1, i - w); j <= Math.min(m, i + w); j++) {
      let c = 0
      for (let k = 0; k < a[i - 1].length; k++) c += (a[i - 1][k] - b[j - 1][k]) ** 2
      cur[j] = Math.sqrt(c) + Math.min(prev[j], cur[j - 1], prev[j - 1])
    }
    prev = cur
  }
  return prev[m] / (n + m)
}

export function classify(frames: BufferedFrame[], templates: Template[] = [], cfg = classifierConfig): Decision {
  const w = windowStats(frames)
  if (w.coverage < cfg.minCoverage) return { label: 'lost', score: 0, scores: {} }
  const scores: Partial<Record<RecognizedTrick, number>> = ruleScores(w)
  if (templates.length) {
    const seq = dtwSequence(frames)
    for (const id of RECOGNIZED_TRICKS) {
      const own = templates.filter((t) => t.trickId === id)
      if (!own.length) continue
      const d = Math.min(...own.map((t) => dtw(seq, t.seq, Math.ceil(Math.max(seq.length, t.seq.length) / 4))))
      scores[id] = (1 - cfg.dtwWeight) * scores[id]! + cfg.dtwWeight * Math.exp(-d / cfg.dtwTau)
    }
  }
  const ranked = (Object.entries(scores) as [RecognizedTrick, number][]).sort((a, b) => b[1] - a[1])
  const [best, second] = ranked
  if (best[1] >= cfg.minScore) {
    if (best[1] - (second?.[1] ?? 0) < cfg.minMargin) return { label: 'unknown', score: best[1], scores }
    return { label: best[0], score: best[1], scores }
  }
  if (w.bob > 0.06) return { label: 'basic', score: ramp(w.bob, 0.06, 0.12), scores }
  if (w.bob < 0.04 && w.lateral < 0.15) return { label: 'idle', score: 1, scores }
  return { label: 'unknown', score: best[1], scores }
}
