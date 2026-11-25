/**
 * Per-frame body features for trick recognition + a time-windowed motion buffer. Pure (no React, no CV
 * library), and imported with explicit `.ts` paths so the Node tools in `ml/` reuse the exact same
 * preprocessing as the browser.
 *
 * Everything is scaled by torso length (shoulder-mid → hip-mid), which stays meaningful when the body is
 * horizontal (pushup) or seated, unlike the upright shoulder→ankle scale the jump counter uses.
 * Hip position is kept in raw image coords so a window can measure global displacement (skier, bell).
 * Features are mirror-invariant (left/right only matter relative to the body), so a mirrored front camera
 * or a performer facing either side of the frame gives the same values.
 */
import type { Landmark } from '../vision/poseSignal.ts'

const L_SH = 11, R_SH = 12, L_WR = 15, R_WR = 16, L_HIP = 23, R_HIP = 24, L_KN = 25, R_KN = 26, L_AN = 27, R_AN = 28
const MIN_VIS = 0.5

export type FrameFeatures = {
  hx: number // mid-hip x, image coords (global movement is kept)
  hy: number // mid-hip y, image coords
  s: number // torso length, image units
  torsoAngle: number // degrees from upright: 0 standing, 90 horizontal
  legs: boolean // knees + ankles visible
  arms: boolean // wrists visible
  ankleSep: number // |ankle x gap| / s
  ankleDy: number // (left − right ankle y) / s: alternates sign in a jogging step
  kneeLift: number // highest knee relative to hips / s: about −0.9 standing, ≈0 knee at hip height
  kneeAngle: number // smallest hip-knee-ankle angle, degrees (180 = straight leg)
  hipHeight: number // (ankle y − hip y) / s: about 1.6 standing, <0.6 seated on the floor
  wristCross: number // wrist x gap / s, signed by body side: >0 open, <0 arms crossed
  wristSide: number // (wrists' mid x − hip x) / s, signed by body side: hands swung to one side of the body
  wristGap: number // wrist-to-wrist distance / s: small when hands are together
  handY: number // (wrists' mid y − hip y) / s: oscillates when the hands turn a rope
}

const vis = (p: Landmark) => (p.visibility ?? 1) >= MIN_VIS
const mid = (a: Landmark, b: Landmark) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

function angle(a: Landmark, b: Landmark, c: Landmark) {
  const v1 = { x: a.x - b.x, y: a.y - b.y }
  const v2 = { x: c.x - b.x, y: c.y - b.y }
  const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1)
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
}

/** null = torso not tracked (counts as tracking loss). Legs/arms may be missing; their flags say so. */
export function frameFeatures(lm: Landmark[] | undefined): FrameFeatures | null {
  if (!lm || lm.length < 33) return null
  if (![L_SH, R_SH, L_HIP, R_HIP].every((i) => vis(lm[i]))) return null
  const sh = mid(lm[L_SH], lm[R_SH])
  const hip = mid(lm[L_HIP], lm[R_HIP])
  const s = dist(sh, hip)
  if (s < 0.03) return null // body too small to measure anything
  const legs = [L_KN, R_KN, L_AN, R_AN].every((i) => vis(lm[i]))
  const arms = vis(lm[L_WR]) && vis(lm[R_WR])
  const side = Math.sign(lm[L_SH].x - lm[R_SH].x) || 1 // which image side the body's left is on
  const an = mid(lm[L_AN], lm[R_AN])
  const wr = mid(lm[L_WR], lm[R_WR])
  return {
    hx: hip.x,
    hy: hip.y,
    s,
    torsoAngle: (Math.atan2(Math.abs(sh.x - hip.x), hip.y - sh.y) * 180) / Math.PI,
    legs,
    arms,
    ankleSep: Math.abs(lm[L_AN].x - lm[R_AN].x) / s,
    ankleDy: (lm[L_AN].y - lm[R_AN].y) / s,
    kneeLift: (hip.y - Math.min(lm[L_KN].y, lm[R_KN].y)) / s,
    kneeAngle: Math.min(angle(lm[L_HIP], lm[L_KN], lm[L_AN]), angle(lm[R_HIP], lm[R_KN], lm[R_AN])),
    hipHeight: (an.y - hip.y) / s,
    wristCross: ((lm[L_WR].x - lm[R_WR].x) * side) / s,
    wristSide: ((wr.x - hip.x) * side) / s,
    wristGap: dist(lm[L_WR], lm[R_WR]) / s,
    handY: (wr.y - hip.y) / s,
  }
}

export type BufferedFrame = { t: number; f: FrameFeatures | null; vx: number; vy: number } // hip velocity, torso lengths/s

/** Last `spanMs` of frames. A time gap or a jump back in time (seek, camera switch) starts a fresh buffer. */
export class MotionBuffer {
  frames: BufferedFrame[] = []
  private spanMs: number
  private maxGapMs: number
  constructor(spanMs = 2000, maxGapMs = 500) {
    this.spanMs = spanMs
    this.maxGapMs = maxGapMs
  }

  push(t: number, f: FrameFeatures | null) {
    const prev = this.frames.at(-1)
    if (prev && (t <= prev.t - 1 || t - prev.t > this.maxGapMs)) this.frames = []
    const p = this.frames.at(-1)
    const dt = p ? (t - p.t) / 1000 : 0
    const ok = f && p?.f && dt > 0
    this.frames.push({ t, f, vx: ok ? (f.hx - p.f!.hx) / f.s / dt : 0, vy: ok ? (f.hy - p.f!.hy) / f.s / dt : 0 })
    while (this.frames.length && this.frames[0].t < t - this.spanMs) this.frames.shift()
  }

  /** Frames from the last `ms`. */
  window(ms: number) {
    const end = this.frames.at(-1)?.t ?? 0
    return this.frames.filter((x) => x.t >= end - ms)
  }

  clear() {
    this.frames = []
  }
}
