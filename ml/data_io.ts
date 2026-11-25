/** Read Python-extracted landmark files (compact [x, y, visibility] arrays) into the browser's shape. */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { LandmarkFrame } from './evalCore.ts'

export const DATA = join(import.meta.dirname, 'data')

export function loadLandmarks(clip: string): LandmarkFrame[] {
  const j = JSON.parse(readFileSync(join(DATA, 'landmarks', `${clip}.json`), 'utf8')) as { frames: { t: number; lm: number[][] | null }[] }
  return j.frames.map((f) => ({ t: f.t, lm: f.lm && f.lm.map(([x, y, visibility]) => ({ x, y, visibility })) }))
}

export const clips = (dir: 'landmarks' | 'annotations') =>
  existsSync(join(DATA, dir)) ? readdirSync(join(DATA, dir)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)) : []

export type Annotation = { trickId: string; athlete: string; reps: [number, number][] }
export const loadAnnotation = (clip: string): Annotation | null => {
  const p = join(DATA, 'annotations', `${clip}.json`)
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null
}
