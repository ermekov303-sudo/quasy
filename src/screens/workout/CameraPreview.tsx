import { Camera, Loader2, RefreshCw, Video } from 'lucide-react'
import type { ReactNode, RefObject } from 'react'
import { cameraErrorText } from '../../camera/cameraErrors'
import type { useVideoSource } from '../../camera/useVideoSource'
import type { PoseStatus } from '../../vision/poseSignal'
import type { ModelStatus } from '../../vision/usePoseTracking'
import { Button } from '../../ui/Button'

const poseText: Record<PoseStatus, string> = {
  none: 'No person detected',
  partial: 'Step back: head to feet must be visible',
  ready: 'Ready to track',
}

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>
  overlayRef: RefObject<HTMLCanvasElement | null>
  src: ReturnType<typeof useVideoSource>
  model: ModelStatus
  pose: PoseStatus
  onPickFile: () => void
  className: string
  children?: ReactNode // extra overlays (e.g. PAUSED badge)
}

/** The one <video> + skeleton overlay, with camera states. Stays mounted across setup → live. */
export function CameraPreview({ videoRef, overlayRef, src, model, pose, onPickFile, className, children }: Props) {
  const live = src.status === 'live'
  const mirror = src.kind === 'camera' && src.facing === 'user' ? '-scale-x-100' : ''
  return (
    <section aria-label="Camera preview" className={`relative overflow-hidden rounded-[var(--radius-card)] bg-surface ${className}`}>
      <video
        ref={videoRef}
        playsInline
        muted
        controls={src.kind === 'file' && live}
        className={`absolute inset-0 size-full object-cover ${mirror} ${live ? '' : 'invisible'}`}
      />
      <canvas ref={overlayRef} className={`pointer-events-none absolute inset-0 size-full object-cover ${mirror}`} />

      {!live && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          {src.status === 'requesting' ? (
            <div>
              <Loader2 size={32} className="mx-auto animate-spin text-accent-fg" aria-hidden />
              <p className="mt-3 font-semibold">Starting camera…</p>
              <p className="mt-1 text-sm text-muted">Allow camera access when your browser asks.</p>
            </div>
          ) : src.status === 'error' ? (
            <div role="alert">
              <Camera size={32} className="mx-auto text-danger" aria-hidden />
              <p className="mt-3 font-semibold">Camera unavailable</p>
              <p className="mt-1 text-sm text-muted">{src.error && cameraErrorText[src.error]}</p>
              {src.errorDetail && <p className="mt-2 break-all font-mono text-[10px] text-muted/70">{src.errorDetail}</p>}
              <Button className="mt-5" onClick={() => (src.kind === 'file' ? onPickFile() : src.startCamera())}>
                <RefreshCw size={16} aria-hidden /> Retry camera
              </Button>
            </div>
          ) : (
            <div>
              <Camera size={32} className="mx-auto text-muted" aria-hidden />
              <p className="mt-3 font-semibold">Camera is off</p>
              <p className="mt-1 text-sm text-muted">Enable the camera to check your position.</p>
              <Button className="mt-5" onClick={() => src.startCamera()}>
                <Video size={16} aria-hidden /> Enable camera
              </Button>
            </div>
          )}
        </div>
      )}

      {live && (
        <div className="absolute left-3 top-3 flex flex-col items-start gap-2" aria-live="polite">
          {model === 'ready' ? (
            <StatusPill tone={pose === 'ready' ? 'ok' : pose === 'partial' ? 'warn' : 'off'} text={poseText[pose]} />
          ) : model === 'loading' ? (
            <StatusPill tone="off" text="Loading body tracking…" />
          ) : (
            <StatusPill tone="warn" text="Body tracking failed to load" />
          )}
        </div>
      )}
      {children}
    </section>
  )
}

function StatusPill({ tone, text }: { tone: 'ok' | 'warn' | 'off'; text: string }) {
  const dot = tone === 'ok' ? 'bg-success' : tone === 'warn' ? 'bg-amber-400' : 'bg-muted'
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium backdrop-blur">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden />
      {text}
    </span>
  )
}
