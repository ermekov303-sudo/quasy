import type { TrickRecord } from '../storage/db'
import { TRICKS } from '../tricks/tricks'

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
