/**
 * Real-time trick recognizer fed by the existing pose loop (no second detector): landmarks in, trick
 * events out. Classifies a sliding window every `hopMs`. Pure apart from `performance.now()` timing.
 * Templates load lazily (`loadTrickTemplates`); without them the rules alone decide.
 */
import type { Landmark } from '../vision/poseSignal.ts'
import { classify, RECOGNIZED_TRICKS, type Decision, type Template, type WindowLabel } from './classifier.ts'
import { TrickEventTracker, type TrickEvent } from './events.ts'
import { frameFeatures, MotionBuffer } from './features.ts'

export const recognizerConfig = { windowMs: 1600, hopMs: 200 }

export class TrickRecognizer {
  private buf = new MotionBuffer(recognizerConfig.windowMs + 200)
  private tracker = new TrickEventTracker()
  private nextAt = -Infinity
  current: Decision = { label: 'idle', score: 0, scores: {} } // raw verdict of the latest window
  /** What the UI shows: only a CONFIRMED trick run; a single-window trick guess shows as "unknown", so it can't flicker. */
  shown: { label: WindowLabel; score: number } = { label: 'idle', score: 0 }
  templates: Template[] = []
  costMs = 0 // EMA of processing time per frame

  private cfg: typeof recognizerConfig
  constructor(cfg = recognizerConfig) {
    this.cfg = cfg
  }

  reset() {
    this.buf.clear()
    this.tracker.reset()
    this.nextAt = -Infinity
    this.current = { label: 'idle', score: 0, scores: {} }
    this.shown = { label: 'idle', score: 0 }
  }

  push(t: number, lm: Landmark[] | undefined): TrickEvent | null {
    const t0 = performance.now()
    this.buf.push(t, frameFeatures(lm)) // a gap or seek restarts the buffer; the event tracker's hold/merge rules span it
    let ev: TrickEvent | null = null
    const frames = this.buf.frames
    const due = t >= this.nextAt || t < this.nextAt - this.cfg.hopMs // second test: time went back (seek)
    if (due && frames.length > 1 && t - frames[0].t >= this.cfg.windowMs * 0.8) {
      this.nextAt = t + this.cfg.hopMs
      // newest frame untracked → lost now, not after old good frames age out of the window
      this.current = frames.at(-1)!.f ? classify(this.buf.window(this.cfg.windowMs), this.templates) : { label: 'lost', score: 0, scores: {} }
      ev = this.tracker.push(t, this.current)
    } else if (t - frames[0].t < this.cfg.windowMs * 0.8) this.current = { label: 'lost', score: 0, scores: {} } // refilling
    const run = this.tracker.active(t)
    const guess = (RECOGNIZED_TRICKS as readonly string[]).includes(this.current.label)
    this.shown = run ? { label: run.trickId, score: run.score } : { label: guess ? 'unknown' : this.current.label, score: this.current.score }
    this.costMs = this.costMs * 0.95 + (performance.now() - t0) * 0.05
    return ev
  }
}

/** Optional DTW templates from `ml/build_templates.ts`. Missing file → rules only. */
export async function loadTrickTemplates(): Promise<Template[]> {
  try {
    const r = await fetch('/recognition/templates.json')
    if (!r.ok) return []
    const j = (await r.json()) as { templates?: Template[] }
    return Array.isArray(j.templates) ? j.templates : []
  } catch {
    return []
  }
}
