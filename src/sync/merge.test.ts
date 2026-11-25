import { expect, test } from 'vitest'
import { mergeMastery, mergeProfile } from './merge'

test('first sync keeps the more advanced trick status and pushes what the cloud lacks', () => {
  const { merged, toPush } = mergeMastery(
    { skier: 'mastered', 'can-can': 'learning' },
    [{ trick_id: 'skier', status: 'learning' }, { trick_id: 'can-can', status: 'mastered' }, { trick_id: 'bell', status: 'learning' }],
    'first',
  )
  expect(merged).toEqual({ skier: 'mastered', 'can-can': 'mastered', bell: 'learning' })
  expect(toPush).toEqual([['skier', 'mastered']])
})

test('later syncs: cloud wins unless the trick was changed here', () => {
  const { merged, toPush } = mergeMastery(
    { skier: 'not-started', 'can-can': 'learning', bell: 'mastered' },
    [{ trick_id: 'skier', status: 'mastered' }, { trick_id: 'can-can', status: 'mastered' }],
    new Set(['skier']),
  )
  expect(merged).toEqual({ skier: 'not-started', 'can-can': 'mastered', bell: 'mastered' })
  expect(toPush).toEqual([['skier', 'not-started'], ['bell', 'mastered']])
})

test('profile merge modes', () => {
  const local = { name: 'Ana', weightKg: 60, photo: null }
  expect(mergeProfile(local, null, 'clean')).toEqual({ merged: local, push: true })
  const remote = { name: '', weight_kg: 72, photo: 'data:image/jpeg;base64,x' }
  expect(mergeProfile(local, remote, 'first')).toEqual({ merged: { name: 'Ana', weightKg: 72, photo: 'data:image/jpeg;base64,x' }, push: true })
  expect(mergeProfile(local, remote, 'clean')).toEqual({ merged: { name: '', weightKg: 72, photo: 'data:image/jpeg;base64,x' }, push: false })
  expect(mergeProfile(local, remote, 'dirty')).toEqual({ merged: local, push: true })
  expect(mergeProfile(local, { name: 'Ana', weight_kg: 60, photo: null }, 'first').push).toBe(false)
})
