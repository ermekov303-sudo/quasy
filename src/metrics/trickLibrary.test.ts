import { describe, expect, it } from 'vitest'
import { CATEGORIES, LEVEL_META, LEVELS, TRICKS } from '../tricks/tricks'
import { filterTricks, needsSafetyNote, relatedTricks, trickProgress } from './trickLibrary'

const all = { query: '', category: null, level: null }
const byId = (id: string) => TRICKS.find((t) => t.id === id)!

describe('trick data', () => {
  it('has 25 unique tricks, one per category × level', () => {
    expect(TRICKS).toHaveLength(25)
    expect(new Set(TRICKS.map((t) => t.id)).size).toBe(25)
    expect(new Set(TRICKS.map((t) => t.name)).size).toBe(25)
    expect(new Set(TRICKS.map((t) => `${t.category}/${t.level}`)).size).toBe(25)
    for (const t of TRICKS) {
      expect(CATEGORIES).toContain(t.category)
      expect(LEVELS).toContain(t.level)
    }
  })

  it('black badge text has ≥4.5:1 contrast on every level colour', () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    for (const { color } of Object.values(LEVEL_META)) expect((lum(color) + 0.05) / 0.05).toBeGreaterThanOrEqual(4.5)
  })
})

describe('filterTricks', () => {
  it('returns everything with no filters', () => expect(filterTricks(TRICKS, all)).toHaveLength(25))
  it('searches names case-insensitively', () =>
    expect(filterTricks(TRICKS, { ...all, query: '  UNDER ' }).map((t) => t.id)).toEqual([
      'double-under', 'consecutive-double-unders', 'triple-under', 'double-under-cross', 'quadruple-under',
    ]))
  it('combines category and level', () => {
    expect(filterTricks(TRICKS, { ...all, category: 'power' })).toHaveLength(5)
    expect(filterTricks(TRICKS, { ...all, level: 'epic' })).toHaveLength(5)
    expect(filterTricks(TRICKS, { ...all, category: 'power', level: 'epic' }).map((t) => t.id)).toEqual(['frog-cross'])
    expect(filterTricks(TRICKS, { query: 'frog', category: 'footwork', level: null })).toEqual([])
  })
})

describe('trickProgress', () => {
  it('counts from stored statuses', () => {
    const p = trickProgress(TRICKS, { 'jogging-step': 'mastered', skier: 'mastered', 'double-under': 'learning', bell: 'not-started' })
    expect(p).toMatchObject({ total: 25, mastered: 2, learning: 1, notStarted: 22 })
    expect(p.byCategory.footwork).toEqual({ mastered: 2, total: 5 })
    expect(p.byCategory.multiples).toEqual({ mastered: 0, total: 5 })
    expect(p.byLevel.easy).toEqual({ mastered: 1, total: 5 })
    expect(p.byLevel.rare).toEqual({ mastered: 1, total: 5 })
  })
  it('ignores unknown ids', () => expect(trickProgress(TRICKS, { gone: 'mastered' }).mastered).toBe(0))
})

describe('relatedTricks', () => {
  it('same category + next level elsewhere', () => {
    const r = relatedTricks(TRICKS, byId('skier'))
    expect(r.sameCategory.map((t) => t.id)).toEqual(['jogging-step', 'side-straddle', 'bell', 'can-can'])
    expect(r.nextLevel.map((t) => t.level)).toEqual(['hard', 'hard', 'hard', 'hard'])
    expect(r.nextLevel.some((t) => t.category === 'footwork')).toBe(false)
  })
  it('epic has no next level', () => expect(relatedTricks(TRICKS, byId('can-can')).nextLevel).toEqual([]))
})

it('safety note only on advanced power elements', () => {
  expect(TRICKS.filter(needsSafetyNote).map((t) => t.id)).toEqual(['frog', 'push-up-cross', 'frog-cross'])
})
