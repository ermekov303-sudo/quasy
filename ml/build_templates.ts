/**
 * Build DTW templates from annotated repetitions → public/recognition/templates.json (lazy-loaded by the
 * app). Uses the app's own feature code, so preprocessing is identical in the browser.
 * Usage: node ml/build_templates.ts [--exclude-athlete NAME]   (hold an athlete out to evaluate fairly)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { dtwSequence, RECOGNIZED_TRICKS, type RecognizedTrick, type Template } from '../src/recognition/classifier.ts'
import { frameFeatures, MotionBuffer } from '../src/recognition/features.ts'
import { clips, loadAnnotation, loadLandmarks } from './data_io.ts'

const MAX_PER_TRICK = 6 // DTW cost grows with templates; a few varied reps are enough
const exclude = process.argv.includes('--exclude-athlete') ? process.argv[process.argv.indexOf('--exclude-athlete') + 1] : null

const templates: Template[] = []
for (const clip of clips('annotations')) {
  const a = loadAnnotation(clip)!
  if (!(RECOGNIZED_TRICKS as readonly string[]).includes(a.trickId) || a.athlete === exclude) continue
  const frames = loadLandmarks(clip)
  const own = templates.filter((t) => t.trickId === a.trickId).length
  for (const [s, e] of a.reps.slice(0, Math.max(0, MAX_PER_TRICK - own))) {
    const buf = new MotionBuffer(e - s + 100, Infinity)
    for (const f of frames) if (f.t >= s && f.t <= e) buf.push(f.t, frameFeatures(f.lm ?? undefined))
    const seq = dtwSequence(buf.frames).map((v) => v.map((x) => +x.toFixed(3)))
    if (seq.length >= 5) templates.push({ trickId: a.trickId as RecognizedTrick, seq })
  }
}

const out = join(import.meta.dirname, '..', 'public', 'recognition')
mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'templates.json'), JSON.stringify({ version: 1, excludedAthlete: exclude, templates }))
const per = Object.fromEntries(RECOGNIZED_TRICKS.map((id) => [id, templates.filter((t) => t.trickId === id).length]))
console.log(`templates: ${templates.length}`, per)
