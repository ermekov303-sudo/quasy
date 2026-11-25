/**
 * In-browser evaluation on the reference clips, for machines without Python/mediapipe. Uses the app's own
 * pose detector (same model, wasm, delegate) and steps through each clip by seeking at a fixed frame rate,
 * so results don't depend on playback speed. Prints and returns short summaries only.
 *
 * Run from the dev server page's console (npm run dev):
 *   const m = await import('/ml/browserEval.ts'); await m.run(['skier', 'side-straddle'])
 */
import { createMediaPipePoseDetector } from '../src/vision/poseDetector.ts'
import { evaluate, verdict, type LandmarkFrame } from './evalCore.ts'

export async function run(ids: string[], fps = 30) {
  const det = await createMediaPipePoseDetector()
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  const out: Record<string, unknown>[] = []
  try {
    for (const id of ids) {
      video.src = `/tricks/videos/${id}.mp4`
      await new Promise((ok, fail) => ((video.onloadeddata = ok), (video.onerror = fail)))
      const frames: LandmarkFrame[] = []
      let ts = (out.length + 1) * 1e6 // detector needs increasing timestamps across clips
      let poseMs = 0
      for (let t = 0; t < video.duration; t += 1 / fps) {
        video.currentTime = t
        await new Promise((ok) => (video.onseeked = ok))
        const p0 = performance.now()
        const lm = det.detect(video, (ts += 1000 / fps))
        poseMs += performance.now() - p0
        frames.push({ t: t * 1000, lm: lm ?? null })
      }
      const r = evaluate(frames)
      const row = { id, verdict: verdict(r), ...r, poseMs: +(poseMs / frames.length).toFixed(1) }
      console.log(JSON.stringify(row))
      out.push(row)
    }
  } finally {
    det.close()
  }
  return out
}
