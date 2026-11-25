import { Film, RefreshCw, RotateCcw, SwitchCamera } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useVideoSource } from '../../camera/useVideoSource'
import type { TrickEvent } from '../../recognition/events'
import { Button } from '../../ui/Button'
import { Page } from '../../ui/Page'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { usePoseTracking } from '../../vision/usePoseTracking'
import { useSetupPrefs } from '../../workout/setupPrefs'
import { unlockSound } from '../../workout/sound'
import { useWorkout } from '../../workout/workoutStore'
import { CameraPreview } from './CameraPreview'
import { LivePanel } from './LivePanel'
import { SetupPanel } from './SetupPanel'

/**
 * Workout Setup and Live Workout share one component (routes /workout/setup and /workout/live both render it),
 * so the camera stream, the <video> and the loaded pose model survive pressing START.
 * Children keep fixed positions (null placeholders) so React never remounts the preview.
 */
const COUNTDOWN_MS = 5000

export function WorkoutScreen() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const benchParam = Number(params.get('benchmark'))
  const benchmarkMs = benchParam === 60_000 || benchParam === 180_000 ? benchParam : null
  const status = useWorkout((s) => s.status)
  const phase = status === 'idle' ? 'setup' : 'live'

  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const signalRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [overlay, setOverlay] = useState(true)
  const [startError, setStartError] = useState<string | null>(null)
  const src = useVideoSource(videoRef)
  const live = src.status === 'live'
  const onEvent = useCallback((e: Parameters<ReturnType<typeof useWorkout.getState>['onDetector']>[0]) => {
    useWorkout.getState().onDetector(e)
  }, [])
  const onTrick = useCallback((e: TrickEvent) => useWorkout.getState().onTrick(e), [])
  const tracking = usePoseTracking({
    videoRef,
    overlayRef,
    signalRef,
    running: live && status !== 'paused',
    useMediaTime: src.kind === 'file' && phase === 'setup', // in a workout, time is the workout clock
    showOverlay: overlay,
    onEvent: phase === 'live' ? onEvent : undefined,
    onTrick: phase === 'live' ? onTrick : undefined,
  })

  // keep the URL in step with the phase (browser back, direct links)
  useEffect(() => {
    const want = phase === 'live' ? '/workout/live' : '/workout/setup'
    if (pathname !== want) navigate(want + (phase === 'setup' ? location.search : ''), { replace: true })
  }, [phase, pathname, navigate])

  const start = () => {
    if (!live) return setStartError('Enable the camera before starting the workout.')
    if (tracking.model === 'loading') return setStartError('Body tracking is still loading. Try again in a moment.')
    if (tracking.model === 'error') return setStartError('Body tracking failed to load. Retry tracking, then start.')
    setStartError(null)
    const p = useSetupPrefs.getState()
    if (p.sound) unlockSound() // iOS: audio must be unlocked by this tap
    tracking.reset()
    if (src.kind === 'file' && videoRef.current) {
      videoRef.current.currentTime = 0
      void videoRef.current.play()
    }
    // camera: 5 s to walk back into frame; test video starts right away
    const config = benchmarkMs
      ? { target: null, plannedMs: benchmarkMs, weightKg: p.weightKg, sound: p.sound, benchmarkMs }
      : { target: p.target, plannedMs: p.plannedMs, weightKg: p.weightKg, sound: p.sound }
    useWorkout.getState().start(config, src.kind === 'file' ? 0 : COUNTDOWN_MS)
  }

  // get-ready countdown → start the timer; reset the detector so movement while walking back isn't counted
  const countdownUntil = useWorkout((s) => s.countdownUntil)
  const [countLeft, setCountLeft] = useState(0)
  const resetTracking = tracking.reset
  useEffect(() => {
    if (status !== 'countdown') return
    const id = setInterval(() => {
      const left = Math.ceil((countdownUntil - performance.now()) / 1000)
      setCountLeft(left)
      if (left <= 0) {
        resetTracking()
        useWorkout.getState().begin()
      }
    }, 100)
    return () => clearInterval(id)
  }, [status, countdownUntil, resetTracking])

  const pause = () => {
    useWorkout.getState().pause()
    tracking.reset() // the break across a pause is not a trip and not a streak continuation
    if (src.kind === 'file') videoRef.current?.pause()
  }
  const resume = () => {
    useWorkout.getState().resume()
    if (src.kind === 'file') void videoRef.current?.play()
  }
  const end = async () => {
    const id = await useWorkout.getState().finish()
    if (!id) return // ended during countdown: back to setup, camera stays on
    src.stop() // stop camera processing
    navigate(`/workout/${id}`, { replace: true })
  }

  return (
    <Page>
      {phase === 'setup' ? <ScreenHeader title={benchmarkMs ? 'Benchmark test' : 'Workout setup'} backTo={benchmarkMs ? '/records' : '/'} /> : <div className="h-3" />}
      <div className="lg:grid lg:grid-cols-[auto_minmax(22rem,1fr)] lg:items-start lg:gap-6">
      <CameraPreview
        videoRef={videoRef}
        overlayRef={overlayRef}
        src={src}
        model={tracking.model}
        pose={tracking.snap.pose}
        onPickFile={() => fileRef.current?.click()}
        // desktop: 3:4 portrait frame sized to the viewport height (never wider than the space left of the stats)
        className={`${phase === 'setup' ? 'aspect-[3/4]' : 'h-[42svh]'} lg:sticky lg:top-4 lg:aspect-[3/4] lg:h-[min(calc(100svh-7rem),calc((100vw-28rem)*4/3))] lg:w-auto`}
      >
        {status === 'countdown' && (
          <div className="absolute inset-0 grid place-items-center bg-black/55 text-center" role="timer" aria-live="assertive">
            <div>
              <div className="tabular text-8xl font-extrabold text-white">{Math.max(1, countLeft || Math.ceil(COUNTDOWN_MS / 1000))}</div>
              <div className="mt-2 text-sm font-semibold uppercase tracking-widest text-white/80">Get in position</div>
            </div>
          </div>
        )}
        {status === 'paused' && (
          <div className="absolute inset-0 grid place-items-center bg-black/60">
            <span className="rounded-full bg-accent px-5 py-2 text-sm font-bold uppercase tracking-widest">Paused</span>
          </div>
        )}
      </CameraPreview>

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        aria-label="Choose a test video"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) {
            tracking.reset()
            src.loadFile(f)
          }
        }}
      />

      <div>
      {phase === 'setup' ? (
        <>
          <div className="mt-3 text-sm text-muted">
            {src.kind === 'file' ? 'Source: test video' : `Camera: ${({ idle: 'Not requested', requesting: 'Waiting for permission…', live: 'Allowed', error: 'Not available' } as const)[src.status]}`}
            {src.kind === 'camera' && live && src.cameraLabel ? ` · ${src.cameraLabel}` : ''}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {src.canSwitch && (
              <Button variant="secondary" onClick={src.switchCamera}>
                <SwitchCamera size={16} aria-hidden /> Switch camera
              </Button>
            )}
            {src.kind === 'file' && (
              <Button variant="secondary" onClick={() => src.startCamera()}>
                <RefreshCw size={16} aria-hidden /> Use camera
              </Button>
            )}
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Film size={16} aria-hidden /> Test with video
            </Button>
            {tracking.model === 'error' && (
              <Button variant="secondary" onClick={tracking.retryModel}>
                <RotateCcw size={16} aria-hidden /> Retry tracking
              </Button>
            )}
          </div>
          <SetupPanel
            showTest={live && tracking.model === 'ready'}
            snap={tracking.snap}
            signalRef={signalRef}
            overlay={overlay}
            onToggleOverlay={() => setOverlay((v) => !v)}
            onResetTest={tracking.reset}
            onStart={start}
            startError={startError}
            benchmarkMs={benchmarkMs}
          />
        </>
      ) : (
        <LivePanel
          pose={tracking.snap.pose}
          trackingOk={live && tracking.model === 'ready'}
          trick={tracking.snap.trick}
          trickScore={tracking.snap.trickScore}
          perfRef={tracking.perfRef}
          onPause={pause}
          onResume={resume}
          onEnd={end}
        />
      )}
      </div>
      </div>
    </Page>
  )
}
