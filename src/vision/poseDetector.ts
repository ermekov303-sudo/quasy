import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { Landmark } from './poseSignal'

/** Replaceable CV backend: anything that turns a video frame into 33 landmarks. */
export interface PoseDetector {
  detect(video: HTMLVideoElement, timestampMs: number): Landmark[] | undefined
  close(): void
}

// Wasm pinned to the installed package version; model is Google's hosted lite bundle (fastest on phones).
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'

export async function createMediaPipePoseDetector(): Promise<PoseDetector> {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL)
  const make = (delegate: 'GPU' | 'CPU') =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
    })
  // Some phones fail GPU init: fall back to CPU instead of failing tracking.
  const lm = await make('GPU').catch(() => make('CPU'))
  let lastTs = 0
  return {
    detect(video, ts) {
      const t = Math.max(ts, lastTs + 1) // MediaPipe requires strictly increasing timestamps
      lastTs = t
      return lm.detectForVideo(video, t).landmarks[0]
    },
    close: () => lm.close(),
  }
}
