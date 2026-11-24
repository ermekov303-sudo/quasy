/**
 * Jump / rest / trip detection from a 1-D body-height signal. Pure: no camera, no React, no CV library,
 * so it is unit-tested on synthetic signals and the pose model can be swapped without touching it.
 *
 * Input: per-frame sample `y` = vertical body position in image coords (down = larger), `scale` = body
 * height in the same units (shoulder→ankle), or `y: null` when the pose is missing/unreliable.
 *
 * Jumps: zig-zag peak detection with hysteresis. Every up-and-down cycle whose height exceeds
 * `h` (a fraction of body height, adapted to the recent jump amplitude) is one jump, timed at its top.
 * Rope is NOT observed: a "trip" is a break in rhythm inside a series that resumes quickly.
 */

export type PoseSample = { t: number; y: number | null; scale: number }

export type StreakEndReason = 'trip' | 'rest' | 'lost'

export type DetectorEvent =
  | { type: 'jump'; t: number }
  | { type: 'streak-end'; t: number; lastJumpT: number; jumps: number; reason: StreakEndReason }

export type Activity = 'idle' | 'jumping' | 'resting'

export const defaultDetectorConfig = {
  smoothTauMs: 35, // light EMA against landmark jitter
  minProminence: 0.012, // min jump height, fraction of body height
  adaptiveFactor: 0.35, // hysteresis also >= this × recent jump height (kills wobble double counts)
  maxCycleHeight: 0.08, // one crouch/step can't push the threshold above normal hops (fraction of body height)
  ampDecayMs: 1500, // with no counted cycles the threshold relaxes back to minProminence
  minIntervalMs: 180, // > 333 JPM is not humanly possible: treat as duplicate
  breakGapMs: 1200, // no jump for this long ends the streak
  tripMaxGapMs: 5000, // jumping resumed within this → the break was a trip, otherwise rest
}
export type DetectorConfig = typeof defaultDetectorConfig

type Ended = { lastJumpT: number; jumps: number; hadLoss: boolean }

export class JumpDetector {
  private cfg: DetectorConfig
  private smooth: number | null = null
  private lastT = 0
  private dir: 'up' | 'down' = 'up' // 'up': moving to a top (y decreasing), tracking min
  private ext = 0 // current extreme (min y when going up, max y when going down)
  private extT = 0
  private amp = 0 // EMA of recent jump heights (relative to scale)
  private lastJumpT = -Infinity
  private pendingT: number | null = null // single unconfirmed jump (noise filter)
  private streakJumps = 0
  private ended: Ended | null = null // streak that stopped, reason not decided yet
  private lossInGap = false

  constructor(cfg: Partial<DetectorConfig> = {}) {
    this.cfg = { ...defaultDetectorConfig, ...cfg }
  }

  get activity(): Activity {
    if (this.streakJumps > 0) return 'jumping'
    return this.lastJumpT > -Infinity ? 'resting' : 'idle'
  }

  get currentStreak() {
    return this.streakJumps
  }

  /** Clear rhythm state (e.g. after pause) without forgetting configuration. */
  reset() {
    Object.assign(this, new JumpDetector(this.cfg))
  }

  push(s: PoseSample): DetectorEvent[] {
    const out: DetectorEvent[] = []
    this.tick(s.t, out)

    if (s.y === null || !(s.scale > 0)) {
      if (this.streakJumps > 0 || this.ended || this.pendingT !== null) this.lossInGap = true
      this.smooth = null // re-seed after the gap instead of smearing old values
      return out
    }

    const dt = this.smooth === null ? 0 : s.t - this.lastT
    this.lastT = s.t
    if (this.smooth === null) {
      this.smooth = s.y
      this.dir = 'up'
      this.ext = s.y
      this.extT = s.t
      return out
    }
    this.smooth += (1 - Math.exp(-dt / this.cfg.smoothTauMs)) * (s.y - this.smooth)
    this.amp *= Math.exp(-dt / this.cfg.ampDecayMs)
    const y = this.smooth
    const h = Math.max(this.cfg.minProminence, this.cfg.adaptiveFactor * this.amp) * s.scale

    if (this.dir === 'up') {
      if (y < this.ext) {
        this.ext = y
        this.extT = s.t
      } else if (y > this.ext + h) {
        // came back down by h from the top → that top was a jump
        this.onTop(this.extT, out)
        this.dir = 'down'
        this.ext = y
        this.extT = s.t
      }
    } else {
      if (y > this.ext) {
        this.ext = y
        this.extT = s.t
      } else if (y < this.ext - h) {
        // rising again from the bottom: remember amplitude of the last cycle
        if (this.lastTopY !== null) {
          const height = Math.min(this.cfg.maxCycleHeight, (this.ext - this.lastTopY) / s.scale)
          this.amp = this.amp === 0 ? height : this.amp * 0.7 + height * 0.3
        }
        this.dir = 'up'
        this.ext = y
        this.extT = s.t
      }
    }
    return out
  }

  private lastTopY: number | null = null

  private onTop(t: number, out: DetectorEvent[]) {
    this.lastTopY = this.ext
    if (t - this.lastJumpT < this.cfg.minIntervalMs) return // duplicate of the same jump

    if (this.streakJumps > 0) {
      this.streakJumps++
      this.lastJumpT = t
      out.push({ type: 'jump', t })
      return
    }
    if (this.pendingT !== null && t - this.pendingT <= this.cfg.breakGapMs) {
      // two jumps in rhythm → a real streak starts; settle how the previous one ended
      if (this.ended) {
        const gap = this.pendingT - this.ended.lastJumpT
        const lost = this.ended.hadLoss || this.lossInGap
        const reason: StreakEndReason = gap > this.cfg.tripMaxGapMs ? 'rest' : lost ? 'lost' : 'trip'
        out.push({ type: 'streak-end', t: this.pendingT, lastJumpT: this.ended.lastJumpT, jumps: this.ended.jumps, reason })
        this.ended = null
      }
      out.push({ type: 'jump', t: this.pendingT }, { type: 'jump', t })
      this.streakJumps = 2
      this.lastJumpT = t
      this.pendingT = null
      this.lossInGap = false
      return
    }
    this.pendingT = t
  }

  /** Time-based transitions; also call when no frame arrives (pose lost). */
  private tick(t: number, out: DetectorEvent[]) {
    if (this.streakJumps > 0 && t - this.lastJumpT > this.cfg.breakGapMs) {
      this.ended = { lastJumpT: this.lastJumpT, jumps: this.streakJumps, hadLoss: this.lossInGap }
      this.streakJumps = 0
      this.amp = 0 // new series → re-learn jump height from scratch
      this.lossInGap = false
    }
    if (this.ended && t - this.ended.lastJumpT > this.cfg.tripMaxGapMs) {
      const e = this.ended
      out.push({ type: 'streak-end', t, lastJumpT: e.lastJumpT, jumps: e.jumps, reason: 'rest' })
      this.ended = null
      this.lossInGap = false
    }
    if (this.pendingT !== null && t - this.pendingT > this.cfg.breakGapMs) this.pendingT = null // lone bounce = noise
  }
}
