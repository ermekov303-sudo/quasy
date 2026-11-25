import { DrawingUtils, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { JumpDetector, type Activity, type DetectorEvent } from '../detection/jumpDetector'
import type { WindowLabel } from '../recognition/classifier'
import type { TrickEvent } from '../recognition/events'
import { loadTrickTemplates, TrickRecognizer } from '../recognition/recognizer'
import { createMediaPipePoseDetector, type PoseDetector } from './poseDetector'
import { poseToSample, type PoseStatus } from './poseSignal'

export type ModelStatus = 'loading' | 'ready' | 'error'

export type TrackingSnapshot = {
  pose: PoseStatus
  jumps: number
  streak: number
  trips: number
  lost: number
  activity: Activity
  trick: WindowLabel // recognizer's current window verdict
  trickScore: number // rounded to 0.05 so the UI re-renders only on visible changes
}

/** Read on the UI's own timer, never via state: pose loop speed and costs. */
export type TrackingPerf = { fps: number; poseMs: number; trickMs: number }

const EMPTY: TrackingSnapshot = { pose: 'none', jumps: 0, streak: 0, trips: 0, lost: 0, activity: 'idle', trick: 'idle', trickScore: 0 }
const SIGNAL_WINDOW_MS = 4000

type Opts = {
  videoRef: RefObject<HTMLVideoElement | null>
  overlayRef: RefObject<HTMLCanvasElement | null>
  signalRef: RefObject<HTMLCanvasElement | null>
  running: boolean
  useMediaTime: boolean // video files: time = position in the clip, so counts don't depend on processing speed
  showOverlay: boolean
  onEvent?: (e: DetectorEvent) => void
  onTrick?: (e: TrickEvent) => void
}

export function usePoseTracking({ videoRef, overlayRef, signalRef, running, useMediaTime, showOverlay, onEvent, onTrick }: Opts) {
  const [model, setModel] = useState<ModelStatus>('loading')
  const [snap, setSnap] = useState<TrackingSnapshot>(EMPTY)
  const detectorRef = useRef<PoseDetector | null>(null)
  const jdRef = useRef(new JumpDetector())
  const recRef = useRef(new TrickRecognizer())
  const perfRef = useRef<TrackingPerf>({ fps: 0, poseMs: 0, trickMs: 0 })
  const countsRef = useRef({ ...EMPTY })
  const signalBuf = useRef<{ t: number; v: number | null }[]>([])
  const jumpTs = useRef<number[]>([])
  const optsRef = useRef({ showOverlay, onEvent, onTrick, useMediaTime })
  useLayoutEffect(() => {
    optsRef.current = { showOverlay, onEvent, onTrick, useMediaTime }
  })

  const loadModel = useCallback(() => {
    createMediaPipePoseDetector().then(
      (d) => {
        detectorRef.current?.close()
        detectorRef.current = d
        setModel('ready')
      },
      () => setModel('error'),
    )
  }, [])

  useEffect(() => {
    loadModel()
    void loadTrickTemplates().then((t) => (recRef.current.templates = t)) // lazy, optional
    return () => {
      detectorRef.current?.close()
      detectorRef.current = null
    }
  }, [loadModel])

  const reset = useCallback(() => {
    jdRef.current.reset()
    recRef.current.reset()
    countsRef.current = { ...EMPTY }
    signalBuf.current = []
    jumpTs.current = []
    setSnap(EMPTY)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!running || model !== 'ready' || !video) return
    let stopped = false
    let handle = 0
    const overlayEl = overlayRef.current
    let lastMediaT = -1
    let lastFrameAt = 0
    const hasRVFC = 'requestVideoFrameCallback' in video
    const schedule = () => {
      if (stopped) return
      handle = hasRVFC ? video.requestVideoFrameCallback(frame) : requestAnimationFrame(() => frame(performance.now()))
    }

    function frame(now: number, meta?: VideoFrameCallbackMetadata) {
      const det = detectorRef.current
      if (stopped || !det || !video) return
      if (video.readyState < 2 || video.paused) return schedule()
      const fileMode = optsRef.current.useMediaTime
      const media = meta?.mediaTime ?? video.currentTime
      // Dedupe by clip time only for files: iOS Safari doesn't advance mediaTime/currentTime on a live
      // camera stream, which froze tracking after the first frame. rVFC already fires once per new frame.
      if (fileMode) {
        if (media === lastMediaT) return schedule()
        if (media < lastMediaT) {
          jdRef.current.reset() // clip looped or seeked back
          recRef.current.reset()
        }
        lastMediaT = media
      }
      const t = fileMode ? media * 1000 : now

      let lm: ReturnType<PoseDetector['detect']>
      const p0 = performance.now()
      try {
        lm = det.detect(video, now)
      } catch {
        return schedule() // one bad frame (e.g. GPU hiccup) must not kill the loop
      }
      const perf = perfRef.current
      perf.poseMs = perf.poseMs * 0.9 + (performance.now() - p0) * 0.1
      if (lastFrameAt) perf.fps = perf.fps * 0.9 + (1000 / Math.max(1, p0 - lastFrameAt)) * 0.1
      lastFrameAt = p0
      // landmarks, not poseToSample: tricks include horizontal/seated poses the upright readiness check rejects
      const tev = recRef.current.push(t, lm)
      if (tev) optsRef.current.onTrick?.(tev)
      perf.trickMs = recRef.current.costMs
      const s = poseToSample(lm)
      const events = jdRef.current.push({ t, y: s.y, scale: s.scale })

      const c = countsRef.current
      for (const e of events) {
        if (e.type === 'jump') {
          c.jumps++
          jumpTs.current.push(e.t)
        } else if (e.reason === 'trip') c.trips++
        else if (e.reason === 'lost') c.lost++
        optsRef.current.onEvent?.(e)
      }
      const cur = recRef.current.shown
      const next = { ...c, pose: s.status, streak: jdRef.current.currentStreak, activity: jdRef.current.activity, trick: cur.label, trickScore: Math.round(cur.score * 20) / 20 }
      countsRef.current = next
      setSnap((prev) =>
        prev.pose === next.pose && prev.jumps === next.jumps && prev.streak === next.streak && prev.trips === next.trips &&
        prev.lost === next.lost && prev.activity === next.activity &&
        prev.trick === next.trick && prev.trickScore === next.trickScore
          ? prev
          : next,
      )

      const buf = signalBuf.current
      buf.push({ t, v: s.y === null ? null : s.y / s.scale })
      while (buf.length && buf[0].t < t - SIGNAL_WINDOW_MS) buf.shift()
      while (jumpTs.current.length && jumpTs.current[0] < t - SIGNAL_WINDOW_MS) jumpTs.current.shift()

      draw(lm)
      schedule()
    }

    function draw(lm: ReturnType<PoseDetector['detect']>) {
      const cv = overlayRef.current
      if (cv) {
        if (cv.width !== video!.videoWidth) cv.width = video!.videoWidth
        if (cv.height !== video!.videoHeight) cv.height = video!.videoHeight
        const ctx = cv.getContext('2d')!
        ctx.clearRect(0, 0, cv.width, cv.height)
        if (optsRef.current.showOverlay && lm) {
          const du = new DrawingUtils(ctx)
          const w = Math.max(2, cv.width / 240)
          const pts = lm as NormalizedLandmark[] // drawing is MediaPipe-specific; detector returns its own landmarks
          du.drawConnectors(pts, PoseLandmarker.POSE_CONNECTIONS, { color: 'rgba(167,139,250,0.9)', lineWidth: w })
          du.drawLandmarks(pts, { color: '#ffffff', radius: w })
        }
      }
      const sg = signalRef.current
      if (sg) drawSignal(sg, signalBuf.current, jumpTs.current)
    }

    schedule()
    return () => {
      stopped = true
      if (hasRVFC) video.cancelVideoFrameCallback(handle)
      else cancelAnimationFrame(handle)
      // source stopped/switched: don't leave a frozen skeleton and a stale "person" status on screen
      overlayEl?.getContext('2d')?.clearRect(0, 0, overlayEl.width, overlayEl.height)
      countsRef.current = { ...countsRef.current, pose: 'none' }
      setSnap((p) => ({ ...p, pose: 'none' }))
    }
  }, [running, model, videoRef, overlayRef, signalRef])

  const retryModel = useCallback(() => {
    setModel('loading')
    loadModel()
  }, [loadModel])

  return { model, snap, reset, retryModel, perfRef }
}

/** Debug plot of the body-height signal (up = body higher) with purple ticks at counted jumps. */
function drawSignal(cv: HTMLCanvasElement, buf: { t: number; v: number | null }[], jumps: number[]) {
  const dpr = window.devicePixelRatio || 1
  const W = cv.clientWidth * dpr
  const H = cv.clientHeight * dpr
  if (cv.width !== W) cv.width = W
  if (cv.height !== H) cv.height = H
  const ctx = cv.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  const pts = buf.filter((p) => p.v !== null) as { t: number; v: number }[]
  if (pts.length < 2) return
  const t1 = buf[buf.length - 1].t
  const t0 = t1 - SIGNAL_WINDOW_MS
  let lo = Infinity
  let hi = -Infinity
  for (const p of pts) {
    lo = Math.min(lo, p.v)
    hi = Math.max(hi, p.v)
  }
  const span = Math.max(hi - lo, 0.02)
  const x = (t: number) => ((t - t0) / SIGNAL_WINDOW_MS) * W
  const y = (v: number) => ((v - lo) / span) * (H - 8 * dpr) + 4 * dpr // image y down → higher body = smaller v = top
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 1.5 * dpr
  ctx.beginPath()
  pts.forEach((p, i) => (i ? ctx.lineTo(x(p.t), y(p.v)) : ctx.moveTo(x(p.t), y(p.v))))
  ctx.stroke()
  ctx.fillStyle = '#a78bfa'
  for (const jt of jumps) ctx.fillRect(x(jt) - dpr, 0, 2 * dpr, H)
}
