/** Turn 33 pose landmarks into the 1-D sample the jump detector needs, plus a framing verdict for the UI. */

export type Landmark = { x: number; y: number; visibility?: number }

/** none: nobody; partial: someone, but shoulders/hips/ankles not all clearly in frame; ready: full body tracked. */
export type PoseStatus = 'none' | 'partial' | 'ready'

const SHOULDERS = [11, 12]
const HIPS = [23, 24]
const ANKLES = [27, 28]
const MIN_VIS = 0.5
const EDGE = 0.02

const avgY = (lm: Landmark[], ids: number[]) => ids.reduce((s, i) => s + lm[i].y, 0) / ids.length

export function poseToSample(lm: Landmark[] | undefined): { status: PoseStatus; y: number | null; scale: number } {
  if (!lm || lm.length < 33) return { status: 'none', y: null, scale: 0 }
  const key = [...SHOULDERS, ...HIPS, ...ANKLES]
  const visible = key.every((i) => (lm[i].visibility ?? 1) >= MIN_VIS && lm[i].y > EDGE && lm[i].y < 1 - EDGE)
  const scale = avgY(lm, ANKLES) - avgY(lm, SHOULDERS)
  if (!visible || scale < 0.15) return { status: 'partial', y: null, scale: 0 }
  // hips + ankles: hips give a clean body lift, ankles the larger foot clearance
  return { status: 'ready', y: (avgY(lm, HIPS) + avgY(lm, ANKLES)) / 2, scale }
}
