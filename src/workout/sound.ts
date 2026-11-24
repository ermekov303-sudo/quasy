/** Tiny WebAudio beeps. iOS only allows audio after a tap, so call unlockSound() from the START click. */
let ctx: AudioContext | null = null

export function unlockSound() {
  try {
    ctx ??= new AudioContext()
    void ctx.resume()
  } catch {
    ctx = null // no audio support: sound feedback silently unavailable
  }
}

export function beep(freq = 880, ms = 120) {
  if (!ctx || ctx.state !== 'running') return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.frequency.value = freq
  g.gain.setValueAtTime(0.25, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000)
  o.connect(g).connect(ctx.destination)
  o.start()
  o.stop(ctx.currentTime + ms / 1000)
}
