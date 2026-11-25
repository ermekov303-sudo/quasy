import { CATEGORIES, LEVELS, type CategoryId, type Level, type Trick } from '../tricks/tricks'

/** Learning status, set manually by the user (no trick recognition). Missing = not started. */
export type TrickStatus = 'not-started' | 'learning' | 'mastered'
export type StatusMap = Partial<Record<string, TrickStatus>>

export const statusOf = (s: StatusMap, id: string): TrickStatus => s[id] ?? 'not-started'

export type TrickFilter = { query: string; category: CategoryId | null; level: Level | null }

/** Name search (case-insensitive) combined with category and difficulty filters. */
export function filterTricks(tricks: Trick[], f: TrickFilter): Trick[] {
  const q = f.query.trim().toLowerCase()
  return tricks.filter(
    (t) => (!q || t.name.toLowerCase().includes(q)) && (!f.category || t.category === f.category) && (!f.level || t.level === f.level),
  )
}

type Count = { mastered: number; total: number }

export function trickProgress(tricks: Trick[], s: StatusMap) {
  const count = (list: Trick[]): Count => ({ mastered: list.filter((t) => statusOf(s, t.id) === 'mastered').length, total: list.length })
  const learning = tricks.filter((t) => statusOf(s, t.id) === 'learning').length
  const { mastered, total } = count(tricks)
  return {
    total,
    mastered,
    learning,
    notStarted: total - mastered - learning,
    byCategory: Object.fromEntries(CATEGORIES.map((c) => [c, count(tricks.filter((t) => t.category === c))])) as Record<CategoryId, Count>,
    byLevel: Object.fromEntries(LEVELS.map((l) => [l, count(tricks.filter((t) => t.level === l))])) as Record<Level, Count>,
  }
}

/** Other tricks of the same category, plus tricks of the next difficulty level in other categories. */
export function relatedTricks(tricks: Trick[], trick: Trick) {
  const next = LEVELS[LEVELS.indexOf(trick.level) + 1]
  return {
    sameCategory: tricks.filter((t) => t.category === trick.category && t.id !== trick.id),
    nextLevel: next ? tricks.filter((t) => t.level === next && t.category !== trick.category) : [],
  }
}

/** Advanced power elements (Rare and above) carry a coaching/supervision safety note. */
export const needsSafetyNote = (t: Trick) => t.category === 'power' && LEVELS.indexOf(t.level) >= LEVELS.indexOf('rare')
