import { RotateCcw } from 'lucide-react'
import { useState, type RefObject } from 'react'
import { Button } from '../../ui/Button'
import { Card, SectionTitle, StatCard } from '../../ui/Card'
import { Choice, Toggle } from '../../ui/Choice'
import { WeightField } from '../../ui/WeightField'
import type { TrackingSnapshot } from '../../vision/usePoseTracking'
import { useSetupPrefs } from '../../workout/setupPrefs'

const TARGETS = [100, 250, 500, 1000]
const DURATIONS = [1, 3, 5, 10] // minutes
const tips = [
  'Place your phone at a suitable distance.',
  'Make sure your entire body is visible.',
  'Make sure the jump rope is visible.',
  'Ensure sufficient lighting.',
]

type Props = {
  showTest: boolean
  snap: TrackingSnapshot
  signalRef: RefObject<HTMLCanvasElement | null>
  overlay: boolean
  onToggleOverlay: () => void
  onResetTest: () => void
  onStart: () => void
  startError: string | null
  benchmarkMs: number | null // benchmark test: fixed duration, no target
}

export function SetupPanel({ showTest, snap, signalRef, overlay, onToggleOverlay, onResetTest, onStart, startError, benchmarkMs }: Props) {
  const prefs = useSetupPrefs()
  const isCustom = prefs.target !== null && !TARGETS.includes(prefs.target)
  const [customOpen, setCustomOpen] = useState(isCustom)
  const [customText, setCustomText] = useState(isCustom ? String(prefs.target) : '')

  const applyCustom = (text: string) => {
    setCustomText(text)
    const n = Math.round(Number(text))
    if (Number.isFinite(n) && n >= 1 && n <= 100_000) prefs.set({ target: n })
  }

  return (
    <>
      {showTest && (
        <section className="mt-6" aria-label="Detection test">
          <SectionTitle>Detection test</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            <Mini label="Jumps" value={snap.jumps} accent />
            <Mini label="Streak" value={snap.streak} />
            <Mini label="Trips" value={snap.trips} />
            <Mini label="State" value={snap.activity === 'jumping' ? 'Jump' : snap.activity === 'resting' ? 'Rest' : '—'} />
          </div>
          <Card className="mt-2 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>Body height signal · last 4 s</span>
              <span className="text-accent-fg">| counted jump</span>
            </div>
            <canvas ref={signalRef} className="h-16 w-full" aria-hidden />
          </Card>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onResetTest}>
              <RotateCcw size={16} aria-hidden /> Reset count
            </Button>
            <Button variant="ghost" aria-pressed={overlay} onClick={onToggleOverlay}>
              {overlay ? 'Hide skeleton' : 'Show skeleton'}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">
            The rope itself is not detected. Jumps are counted from body movement; a trip is a sudden break in rhythm
            that resumes within 5 seconds.
          </p>
        </section>
      )}

      {benchmarkMs ? (
        <Card className="mt-6 ring-2 ring-accent">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent-fg">Benchmark test</div>
          <div className="mt-1 text-xl font-bold">{benchmarkMs / 60_000}-minute jumping test</div>
          <p className="mt-1 text-sm text-muted">
            Jump as many times as you can. The test ends automatically and counts only if you finish the full time.
          </p>
        </Card>
      ) : (
      <>
      <section className="mt-6">
        <SectionTitle>Target jumps</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Choice selected={prefs.target === null} onClick={() => (setCustomOpen(false), prefs.set({ target: null }))}>
            No target
          </Choice>
          {TARGETS.map((t) => (
            <Choice key={t} selected={prefs.target === t && !customOpen} onClick={() => (setCustomOpen(false), prefs.set({ target: t }))}>
              {t}
            </Choice>
          ))}
          <Choice selected={customOpen} onClick={() => (setCustomOpen(true), customText && applyCustom(customText))}>
            Custom
          </Choice>
        </div>
        {customOpen && (
          <label className="mt-3 block">
            <span className="text-sm text-muted">Custom target (1–100000)</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={100000}
              autoFocus
              value={customText}
              onChange={(e) => applyCustom(e.target.value)}
              className="mt-1 h-12 w-full rounded-2xl bg-surface-2 px-4 text-lg font-semibold tabular outline-none focus:ring-2 focus:ring-accent-fg"
              placeholder="e.g. 750"
            />
          </label>
        )}
      </section>

      <section className="mt-6">
        <SectionTitle>Workout duration</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <Choice selected={prefs.plannedMs === null} onClick={() => prefs.set({ plannedMs: null })}>
            No limit
          </Choice>
          {DURATIONS.map((m) => (
            <Choice key={m} selected={prefs.plannedMs === m * 60_000} onClick={() => prefs.set({ plannedMs: m * 60_000 })}>
              {m} min
            </Choice>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">With a duration, the workout ends automatically and Projected Jumps is shown.</p>
      </section>
      </>
      )}

      <section className="mt-6">
        <SectionTitle>Settings</SectionTitle>
        <Card className="divide-y divide-line p-0">
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="font-medium">Sound feedback</div>
              <div className="text-xs text-muted">Beep every 100 jumps and at your target</div>
            </div>
            <Toggle label="Sound feedback" checked={prefs.sound} onChange={(v) => prefs.set({ sound: v })} />
          </div>
          <WeightField />
        </Card>
      </section>

      <section className="mt-6">
        <SectionTitle>Positioning</SectionTitle>
        <Card>
          <ul className="space-y-2 text-sm">
            {tips.map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-fg" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <Button size="lg" full className="mt-8" onClick={onStart}>
        {benchmarkMs ? 'Start test' : 'Start workout'}
      </Button>
      {startError && (
        <p role="alert" className="mt-2 text-center text-sm text-danger">
          {startError}
        </p>
      )}
    </>
  )
}

function Mini({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return <StatCard label={label} value={String(value)} accent={accent} />
}
