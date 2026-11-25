/**
 * Turns the stream of per-window decisions into trick events. Overlapping windows see the same movement
 * many times, so one continuous run of a trick is ONE event (updated in place by `seq`), confirmed only
 * after several consistent windows, held through short dropouts and re-joined if the same trick resumes
 * quickly. Pure.
 */
import { RECOGNIZED_TRICKS, type Decision, type RecognizedTrick } from './classifier.ts'

export type TrickEvent = { seq: number; trickId: RecognizedTrick; startT: number; endT: number; score: number }

export const eventConfig = {
  confirmWindows: 4, // consecutive windows with the same trick before an event exists
  holdMs: 800, // a run survives this long without its trick (one missed window, a stumble)
  mergeGapMs: 1500, // same trick again within this → same event, not a new one
}

const isTrick = (l: string): l is RecognizedTrick => (RECOGNIZED_TRICKS as readonly string[]).includes(l)

export class TrickEventTracker {
  private seq = 0 // never reset: store upserts by seq across pauses
  private cand: { label: RecognizedTrick; since: number; n: number; peak: number } | null = null
  private run: TrickEvent | null = null
  private lastSeen = -Infinity
  private cfg: typeof eventConfig
  constructor(cfg = eventConfig) {
    this.cfg = cfg
  }

  reset() {
    this.cand = null
    this.run = null
    this.lastSeen = -Infinity
  }

  /** The confirmed run still going at `t` (seen within the hold time), if any. */
  active(t: number): TrickEvent | null {
    return this.run && t - this.lastSeen <= this.cfg.holdMs ? this.run : null
  }

  /** Returns the event created or changed by this decision, if any. */
  push(t: number, d: Decision): TrickEvent | null {
    const label = d.label
    if (!isTrick(label)) {
      this.cand = null
      if (this.run && t - this.lastSeen > this.cfg.mergeGapMs) this.run = null
      return null
    }
    const r = this.run
    if (r && r.trickId === label && t - this.lastSeen <= this.cfg.mergeGapMs) {
      this.cand = null
      this.lastSeen = t
      return (this.run = { ...r, endT: t, score: Math.max(r.score, d.score) })
    }
    // another trick inside the hold window doesn't break the run yet; it has to be confirmed first
    if (this.cand?.label === label) {
      this.cand.n++
      this.cand.peak = Math.max(this.cand.peak, d.score)
    } else this.cand = { label, since: t, n: 1, peak: d.score }
    if (r && t - this.lastSeen <= this.cfg.holdMs) return null
    if (this.cand.n < this.cfg.confirmWindows) return null
    const c = this.cand
    this.cand = null
    this.lastSeen = t
    return (this.run = { seq: ++this.seq, trickId: c.label, startT: c.since, endT: t, score: c.peak })
  }
}
