export type CameraErrorCode = 'insecure' | 'denied' | 'not-found' | 'busy' | 'interrupted' | 'unknown'

export const cameraErrorText: Record<CameraErrorCode, string> = {
  insecure: 'Camera needs a secure connection. Open the https:// address of Quasy.',
  denied: 'Camera access was denied. Allow camera access for this site in your browser settings, then retry.',
  'not-found': 'No camera was found on this device.',
  busy: 'The camera is being used by another app. Close it and retry.',
  interrupted: 'The camera stopped unexpectedly. Retry to reconnect.',
  unknown: 'The camera could not be started. Retry.',
}

export function toCameraError(e: unknown): CameraErrorCode {
  const name = e instanceof DOMException || e instanceof Error ? e.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'not-found'
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  return 'unknown'
}
