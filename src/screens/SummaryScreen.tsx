import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { AlertTriangle, Check, CircleCheck, CircleX, Loader2, SearchX, Trophy } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { formatDuration } from '../lib/format'
import { buildTimeline, prStatus } from '../metrics/analytics'
import { computeMetrics } from '../metrics/workoutMetrics'
import { levelCounts, summarizeTricks, trickName } from '../recognition/summary'
import { db, type WorkoutRecord } from '../storage/db'
import { Button, buttonClass } from '../ui/Button'
import { Card, SectionTitle, StatCard } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { Page } from '../ui/Page'
import { ScreenHeader } from '../ui/ScreenHeader'
import { StreakList } from './summary/StreakList'
import { Timeline } from './summary/Timeline'
import { LevelDistribution } from './tricks/parts'

export function SummaryScreen() {
  const { id = '' } = useParams()
  const w = useLiveQuery(() => db.workouts.get(id).then((x) => x ?? null), [id])
  const all = useLiveQuery(() => db.workouts.toArray())

  if (w === undefined || all === undefined)
    return (
      <Page>
        <ScreenHeader title="Workout summary" backTo="/" />
        <div className="grid place-items-center py-20 text-muted" role="status">
          <Loader2 className="animate-spin" aria-hidden />
          <span className="sr-only">Loading workout</span>
        </div>
      </Page>
    )
  if (w === null)
    return (
      <Page>
        <ScreenHeader title="Workout summary" backTo="/" />
        <EmptyState
          icon={SearchX}
          title="Workout not found"
          text="This workout doesn't exist or was deleted."
          action={<Link to="/" className={buttonClass('primary')}>Back to home</Link>}
        />
      </Page>
    )

  const m = computeMetrics(w, w)
  const segments = buildTimeline(w, m.streaks)
  const pr = prStatus(w, all)
  const lowQuality = w.trackingLossMs > w.elapsedMs * 0.1 || w.lostBreaks > 0
  const hit = w.target !== null && m.totalJumps >= w.target

  return (
    <Page>
      <ScreenHeader title="Workout summary" backTo="/" />
      <header className="flex items-center gap-4">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-white"
        >
          <Check size={28} strokeWidth={3} aria-hidden />
        </motion.div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{w.benchmarkMs ? 'Test Completed' : 'Workout Completed'}</h1>
          {w.benchmarkMs ? <p className="text-sm font-semibold text-accent-fg">{w.benchmarkMs / 60_000}-minute benchmark test</p> : null}
          <p className="text-sm text-muted">
            {new Date(w.startedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · {formatDuration(w.elapsedMs)}
          </p>
        </div>
      </header>

      {lowQuality && (
        <div role="note" className="mt-4 flex gap-2 rounded-2xl bg-amber-400/10 p-3 text-sm text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Tracking was unreliable for {formatDuration(w.trackingLossMs)} of this workout
            {w.lostBreaks ? ` and ${w.lostBreaks} break(s) happened out of frame` : ''}. Some jumps may be missing.
          </span>
        </div>
      )}

      <section className="mt-6 grid grid-cols-3 gap-2" aria-label="Main results">
        <StatCard label="Total jumps" value={String(m.totalJumps)} accent />
        <StatCard label="Duration" value={formatDuration(m.elapsedMs)} />
        <StatCard label="Calories" value={`~${Math.round(m.calories)}`} unit="kcal" />
      </section>
      <p className="mt-2 text-xs text-muted">
        Active jumping {formatDuration(m.activeMs)} · resting {formatDuration(m.restMs)} · calories are an estimate.
      </p>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
      <section className="mt-8">
        <SectionTitle>Jumping performance</SectionTitle>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-2">
          <StatCard label="Average JPM" value={String(Math.round(m.avgJpm))} />
          <StatCard label="Max JPM" value={String(Math.round(m.maxJpm))} accent />
          <StatCard label="Final JPM" value={String(Math.round(m.finalJpm))} />
          <StatCard label="Trips" value={String(m.trips)} />
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle>Streak analytics</SectionTitle>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-2">
          <StatCard label="Max streak" value={String(m.maxStreak)} unit="jumps" accent />
          <StatCard label="Streak at end" value={String(m.streaks.at(-1)?.jumps ?? 0)} unit="jumps" />
          <StatCard label="Avg streak JPM" value={String(Math.round(m.avgStreakJpm))} />
          <StatCard label="Max streak JPM" value={String(Math.round(m.maxStreakJpm))} />
        </div>
        <div className="mt-3">
          <StreakList streaks={m.streaks} segments={segments} />
        </div>
      </section>
      </div>

      <section className="mt-8">
        <SectionTitle>Jump / rest timeline</SectionTitle>
        <Card>
          <Timeline segments={segments} trips={w.trips} elapsedMs={w.elapsedMs} />
        </Card>
      </section>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      {w.tricks && (
        <section className="mt-8">
          <SectionTitle>Tricks · beta</SectionTitle>
          <TrickSummary tricks={w.tricks} jumps={w.jumps} />
        </section>
      )}

      {w.target !== null && (
        <section className="mt-8">
          <SectionTitle>Target performance</SectionTitle>
          <Card>
            <div className={`flex items-center gap-2 font-semibold ${hit ? 'text-success' : 'text-muted'}`}>
              {hit ? <CircleCheck size={20} aria-hidden /> : <CircleX size={20} aria-hidden />}
              {hit ? 'Target hit!' : 'Target missed'}
            </div>
            <div className="mt-4 space-y-3" aria-label="Target versus actual">
              <Bar label="Target" value={w.target} max={Math.max(w.target, m.totalJumps)} className="bg-line" />
              <Bar label="Actual" value={m.totalJumps} max={Math.max(w.target, m.totalJumps)} className={hit ? 'bg-success' : 'bg-accent'} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted">Difference</dt>
                <dd className={`tabular text-lg font-bold ${hit ? 'text-success' : ''}`}>
                  {m.totalJumps - w.target > 0 ? '+' : ''}
                  {m.totalJumps - w.target}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Projected jumps</dt>
                <dd className="tabular text-lg font-bold">{m.projectedJumps ?? '—'}</dd>
                {m.projectedJumps === null && <dd className="text-xs text-muted">No duration was set</dd>}
              </div>
            </dl>
          </Card>
        </section>
      )}

      <section className="mt-8">
        <SectionTitle>Personal record</SectionTitle>
        <Card className={pr.isPR ? 'ring-2 ring-accent' : ''}>
          {pr.isPR && (
            <div className="mb-3 flex items-center gap-2 font-bold text-accent-fg">
              <Trophy size={18} aria-hidden /> {pr.first ? 'First workout: your record starts here' : 'New personal record!'}
            </div>
          )}
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted">Previous best</dt>
              <dd className="tabular text-xl font-bold">{pr.previousBest ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted">This workout</dt>
              <dd className="tabular text-xl font-bold">{pr.current}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-muted">Status</dt>
              <dd className={`text-sm font-bold ${pr.isPR ? 'text-accent-fg' : 'text-muted'}`}>{pr.isPR ? 'New PR' : 'No PR'}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted">Record = total jumps in one workout.</p>
        </Card>
      </section>
      </div>

      <div className="mt-8 grid gap-2 sm:grid-cols-3">
        {/* Saved when the workout was ended; shown as a state so a second tap can never duplicate it. */}
        <Button size="lg" full variant="secondary" disabled aria-label="Workout saved">
          <CircleCheck size={18} className="text-success" aria-hidden /> Workout saved
        </Button>
        <Link to="/progress" className={buttonClass('secondary', 'lg', true)}>
          View progress
        </Link>
        <Link to="/" className={buttonClass('primary', 'lg', true)}>
          Back to home
        </Link>
      </div>
    </Page>
  )
}

function Bar({ label, value, max, className }: { label: string; value: number; max: number; className: string }) {
  return (
    <div className="grid grid-cols-[4rem_1fr_3.5rem] items-center gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="h-3 overflow-hidden rounded-full bg-surface-2">
        <span className={`block h-full rounded-full ${className}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </span>
      <span className="tabular text-right font-semibold">{value}</span>
    </div>
  )
}

function TrickSummary({ tricks, jumps }: { tricks: NonNullable<WorkoutRecord['tricks']>; jumps: number[] }) {
  const rows = summarizeTricks(tricks, jumps)
  if (!rows.length)
    return <Card className="text-sm text-muted">No tricks recognized. Detection covers 8 tricks and is in beta.</Card>
  return (
    <Card>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Tricks" value={String(tricks.length)} accent />
        <StatCard label="Unique" value={String(rows.length)} />
      </div>
      <div className="mt-4">
        <LevelDistribution counts={levelCounts(tricks)} />
      </div>
      <ul className="mt-4 divide-y divide-line text-sm" aria-label="Recognized tricks">
        {rows.map((r) => (
          <li key={r.trickId} className="flex items-baseline justify-between gap-2 py-2">
            <span className="font-semibold">{trickName(r.trickId)}</span>
            <span className="tabular text-muted">
              ×{r.runs}
              {r.jumps ? ` · ${r.jumps} jumps` : ''} · best {Math.round(r.bestScore * 100)}% · first {formatDuration(r.firstMs)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">One continuous run counts once. Recognized from body movement only; the rope isn't seen.</p>
    </Card>
  )
}
