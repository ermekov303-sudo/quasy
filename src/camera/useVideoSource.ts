import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useSetupPrefs } from '../workout/setupPrefs'
import { toCameraError, type CameraErrorCode } from './cameraErrors'

/**
 * One <video> element, two interchangeable sources: the live camera, or a recorded file
 * (for checking counting accuracy without jumping). Everything downstream only sees the <video>.
 */
export type SourceStatus = 'idle' | 'requesting' | 'live' | 'error'
export type SourceKind = 'camera' | 'file'

export function useVideoSource(videoRef: RefObject<HTMLVideoElement | null>) {
  const [status, setStatus] = useState<SourceStatus>('idle')
  const [kind, setKind] = useState<SourceKind>('camera')
  const [error, setError] = useState<CameraErrorCode | null>(null)
  const [errorDetail, setErrorDetail] = useState('') // raw browser error, shown small for diagnosing phones
  const [facing, setFacing] = useState<'user' | 'environment'>(() => useSetupPrefs.getState().facing) // Profile → Camera settings
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileUrlRef = useRef<string | null>(null)

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => {
      t.onended = null
      t.stop()
    })
    streamRef.current = null
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current)
    fileUrlRef.current = null
    const v = videoRef.current
    if (v) {
      v.pause()
      v.srcObject = null
      v.removeAttribute('src')
      v.load()
    }
  }, [videoRef])

  const startCamera = useCallback(
    async (opts: { deviceId?: string | null; facing?: 'user' | 'environment' } = {}) => {
      release()
      setKind('camera')
      setError(null)
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setErrorDetail(`secure=${window.isSecureContext} · mediaDevices=${!!navigator.mediaDevices}`)
        setError('insecure')
        setStatus('error')
        return
      }
      setStatus('requesting')
      const f = opts.facing ?? facing
      const id = opts.deviceId === undefined ? deviceId : opts.deviceId
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { ...(id ? { deviceId: { exact: id } } : { facingMode: f }), width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        streamRef.current = stream
        const track = stream.getVideoTracks()[0]
        track.onended = () => {
          setError('interrupted')
          setStatus('error')
        }
        const settings = track.getSettings()
        if (settings.facingMode === 'user' || settings.facingMode === 'environment') setFacing(settings.facingMode)
        else setFacing(f)
        setDeviceId(settings.deviceId ?? id ?? null)
        // labels/ids are only exposed after permission is granted
        setCameras((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'))
        const v = videoRef.current!
        v.srcObject = stream
        v.muted = true
        await v.play()
        setStatus('live')
      } catch (e) {
        release()
        setErrorDetail(`${e instanceof Error ? `${e.name}: ${e.message}` : String(e)} · secure=${window.isSecureContext}`)
        setError(toCameraError(e))
        setStatus('error')
      }
    },
    [deviceId, facing, release, videoRef],
  )

  /** Next camera by device list; falls back to flipping front/back when the list is unknown. */
  const switchCamera = useCallback(() => {
    if (cameras.length > 1 && cameras.every((c) => c.deviceId)) {
      const i = cameras.findIndex((c) => c.deviceId === deviceId)
      return startCamera({ deviceId: cameras[(i + 1) % cameras.length].deviceId })
    }
    return startCamera({ deviceId: null, facing: facing === 'user' ? 'environment' : 'user' })
  }, [cameras, deviceId, facing, startCamera])

  const loadFile = useCallback(
    async (file: File) => {
      release()
      setKind('file')
      setError(null)
      setStatus('requesting')
      const url = URL.createObjectURL(file)
      fileUrlRef.current = url
      const v = videoRef.current!
      v.src = url
      v.muted = true
      try {
        await v.play()
        setStatus('live')
      } catch {
        setError('unknown')
        setStatus('error')
      }
    },
    [release, videoRef],
  )

  const stop = useCallback(() => {
    release()
    setStatus('idle')
  }, [release])

  useEffect(() => release, [release]) // stop camera when leaving the screen

  return {
    status,
    kind,
    error,
    errorDetail,
    facing,
    canSwitch: kind === 'camera' && status === 'live' && cameras.length > 1,
    cameraLabel: cameras.find((c) => c.deviceId === deviceId)?.label || null,
    startCamera,
    switchCamera,
    loadFile,
    stop,
  }
}
