import type { TrickRecord } from '../storage/db'
import { LEVELS, TRICKS, type Level } from '../tricks/tricks'

export const trickName = (id: string) => TRICKS.find((t) => t.id === id)?.name ?? id

export type TrickSummaryRow = { trickId: string; runs: number; jumps: number; bestScore: number; firstMs: number }

/**
 * Per-trick totals for a workout. `runs` = separate times the trick was recognized (one continuous run = 1);
 * `jumps` = jumps the counter registered inside those runs (0 for floor moves, which aren't upright jumps).
 */
export function summarizeTricks(tricks: TrickRecord[], jumps: number[]): TrickSummaryRow[] {
  const rows = new Map<string, TrickSummaryRow>()
  for (const t of tricks) {
    const r = rows.get(t.trickId) ?? { trickId: t.trickId, runs: 0, jumps: 0, bestScore: 0, firstMs: t.startMs }
    r.runs++
    r.jumps += jumps.filter((j) => j >= t.startMs && j <= t.endMs).length
    r.bestScore = Math.max(r.bestScore, t.score)
    r.firstMs = Math.min(r.firstMs, t.startMs)
    rows.set(t.trickId, r)
  }
  return [...rows.values()].sort((a, b) => a.firstMs - b.firstMs)
}

/** Recognized trick runs per difficulty level (all levels present, zeros included). Unknown ids are skipped. */
export function levelCounts(tricks: TrickRecord[]): Record<Level, number> {
  const out = Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<Level, number>
  for (const t of tricks) {
    const level = TRICKS.find((x) => x.id === t.trickId)?.level
    if (level) out[level]++
  }
  return out
}
