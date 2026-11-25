/**
 * Runs the browser's TrickRecognizer over a landmark sequence and returns a SHORT summary (never the
 * landmarks). Shared by `eval_recognizer.ts` (Node, Python-extracted landmarks) and `browserEval.ts`
 * (dev server, in-page MediaPipe), so both measure the exact code that ships.
 */
import { windowStats, type Template, type WindowStats } from '../src/recognition/classifier.ts'
import type { TrickEvent } from '../src/recognition/events.ts'
import { frameFeatures, MotionBuffer } from '../src/recognition/features.ts'
import { recognizerConfig, TrickRecognizer } from '../src/recognition/recognizer.ts'
import type { Landmark } from '../src/vision/poseSignal.ts'

export type LandmarkFrame = { t: number; lm: Landmark[] | null } // t in ms; same shape extract_landmarks.py writes

export function evaluate(frames: LandmarkFrame[], templates: Template[] = []) {
  const rec = new TrickRecognizer()
  rec.templates = templates
  const events = new Map<number, TrickEvent>()
  const labels: Record<string, number> = {} // frames per current window verdict
  const buf = new MotionBuffer(recognizerConfig.windowMs)
  const stats: WindowStats[] = []
  let nextStat = 0
  for (const f of frames) {
    const e = rec.push(f.t, f.lm ?? undefined)
    if (e) events.set(e.seq, e)
    labels[rec.current.label] = (labels[rec.current.label] ?? 0) + 1
    buf.push(f.t, frameFeatures(f.lm ?? undefined))
    if (f.t >= nextStat && f.t - buf.frames[0].t >= recognizerConfig.windowMs * 0.8) {
      stats.push(windowStats(buf.frames))
      nextStat = f.t + recognizerConfig.hopMs
    }
  }
  // median and 90th percentile of each window statistic: the numbers rule thresholds are tuned against
  const stat: Record<string, string> = {}
  for (const k of Object.keys(stats[0] ?? {}) as (keyof WindowStats)[]) {
    const v = stats.map((x) => x[k]).sort((a, b) => a - b)
    stat[k] = `${v[Math.floor(v.length / 2)].toFixed(2)}/${v[Math.floor(v.length * 0.9)].toFixed(2)}`
  }
  const evs = [...events.values()]
  const byTrick: Record<string, { runs: number; ms: number; best: number }> = {}
  for (const e of evs) {
    const r = (byTrick[e.trickId] ??= { runs: 0, ms: 0, best: 0 })
    r.runs++
    r.ms += e.endT - e.startT
    r.best = Math.max(r.best, Math.round(e.score * 100) / 100)
  }
  const tracked = frames.filter((f) => f.lm).length
  return { frames: frames.length, trackedPct: Math.round((tracked / Math.max(1, frames.length)) * 100), events: evs.length, byTrick, labels, stat, costMs: +rec.costMs.toFixed(2) }
}

/** Top trick by recognized time, or the dominant non-trick label. */
export const verdict = (r: ReturnType<typeof evaluate>) =>
  Object.entries(r.byTrick).sort((a, b) => b[1].ms - a[1].ms)[0]?.[0] ?? `(${Object.entries(r.labels).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none'})`
