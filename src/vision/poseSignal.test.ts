import { expect, test } from 'vitest'
import { poseToSample, type Landmark } from './poseSignal'

const body = (over: Partial<Record<number, Landmark>> = {}) =>
  Array.from({ length: 33 }, (_, i): Landmark => over[i] ?? { x: 0.5, y: i <= 12 ? 0.2 : i <= 24 ? 0.5 : 0.85, visibility: 0.9 })

test('full body in frame → ready with hip/ankle signal and body scale', () => {
  const s = poseToSample(body())
  expect(s.status).toBe('ready')
  expect(s.y).toBeCloseTo((0.5 + 0.85) / 2)
  expect(s.scale).toBeCloseTo(0.65)
})

test('no landmarks → none', () => expect(poseToSample(undefined).status).toBe('none'))

test('ankles cut off or low visibility → partial, no signal', () => {
  expect(poseToSample(body({ 27: { x: 0.5, y: 0.995, visibility: 0.9 } })).status).toBe('partial')
  expect(poseToSample(body({ 28: { x: 0.5, y: 0.85, visibility: 0.2 } })).y).toBeNull()
})

test('person too far (tiny) → partial', () => {
  const tiny = body(Object.fromEntries([27, 28].map((i) => [i, { x: 0.5, y: 0.3, visibility: 0.9 }])))
  expect(poseToSample(tiny).status).toBe('partial')
})
