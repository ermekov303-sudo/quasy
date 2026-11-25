/**
 * Run the shipping recognizer over every extracted clip and print one line per clip + a total.
 * A clip counts as correct when the trick recognized longest is the clip's trick (annotation trickId, else
 * the file name). Clips of tricks the recognizer doesn't cover are correct when NO trick is reported.
 * Usage: node ml/eval_recognizer.ts [--templates]
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { RECOGNIZED_TRICKS, type Template } from '../src/recognition/classifier.ts'
import { evaluate, verdict } from './evalCore.ts'
import { clips, loadAnnotation, loadLandmarks } from './data_io.ts'

const tplPath = join(import.meta.dirname, '..', 'public', 'recognition', 'templates.json')
const templates: Template[] =
  process.argv.includes('--templates') && existsSync(tplPath) ? JSON.parse(readFileSync(tplPath, 'utf8')).templates : []

let ok = 0
const names = clips('landmarks')
for (const clip of names) {
  const want = loadAnnotation(clip)?.trickId ?? clip
  const r = evaluate(loadLandmarks(clip), templates)
  const got = verdict(r)
  const covered = (RECOGNIZED_TRICKS as readonly string[]).includes(want)
  const pass = covered ? got === want : got.startsWith('(')
  if (pass) ok++
  console.log(`${pass ? 'OK ' : 'BAD'} ${clip.padEnd(24)} → ${got.padEnd(16)} events ${r.events} tracked ${r.trackedPct}%`)
}
console.log(`\n${ok}/${names.length} clips correct (templates: ${templates.length}). Same clips as templates = optimistic, not a real accuracy.`)
