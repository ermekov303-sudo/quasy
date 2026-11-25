import { useLiveQuery } from 'dexie-react-hooks'
import { Activity, ChevronRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { formatDuration } from '../lib/format'
import { summarizeTricks, trickName } from '../recognition/summary'
import { db, type WorkoutRecord } from '../storage/db'
import { jumpBuckets, rangeStart, startOfDay, startOfWeek, totals } from '../storage/queries'
import { useTrickStatus } from '../tricks/trickStatus'
import { TRICKS } from '../tricks/tricks'
import { buttonClass } from '../ui/Button'
import { Card, SectionTitle, StatCard } from '../ui/Card'
import { JumpsBarChart } from '../ui/charts'
import { EmptyState } from '../ui/EmptyState'
import { Logo } from '../ui/Logo'
import { Page } from '../ui/Page'
import { useSetupPrefs } from '../workout/setupPrefs'
import { Avatar } from './ProfileScreen'
import { DifficultyBadge } from './tricks/parts'

const when = (t: number) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function HomeScreen() {
  const name = useSetupPrefs((s) => s.name)
  const photo = useSetupPrefs((s) => s.photo)
  const all = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().toArray())
  const ws = all ?? []
  const today = totals(ws.filter((w) => w.startedAt >= startOfDay()))
  const week = totals(ws.filter((w) => w.startedAt >= startOfWeek()))
  const prevStart = startOfWeek(new Date(startOfWeek() - 1))
  const lastWeek = totals(ws.filter((w) => w.startedAt >= prevStart && w.startedAt < startOfWeek()))
  // change vs last week only when last week has data to compare with
  const pct = (cur: number, prev: number) => (lastWeek.count && prev > 0 ? ((cur - prev) / prev) * 100 : null)
  const pr = ws.length ? Math.max(...ws.map((w) => w.totalJumps)) : null
  const dash = all === undefined // still loading: don't flash zeros
  const last7 = rangeStart('7d', ws)

  return (
    <Page withNav>
      <header className="flex items-center justify-between py-4">
        <div>
          <span className="md:hidden">
            <Logo />
          </span>
          <p className="text-sm text-muted md:text-base md:text-fg">Welcome back{name ? `, ${name}` : ''}</p>
        </div>
        <Link to="/profile" aria-label="Open profile" className="rounded-full hover:opacity-80">
          <Avatar photo={photo} size="size-11" />
        </Link>
      </header>

      <Card className="mt-2 p-6 lg:flex lg:items-center lg:justify-between lg:gap-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Ready to jump?</h1>
          <p className="mt-2 text-muted">Track your performance and improve every session.</p>
        </div>
        <Link to="/workout/setup" className={`${buttonClass('primary', 'lg', true)} mt-6 lg:mt-0 lg:w-auto lg:shrink-0 lg:px-12`}>
          Start workout
        </Link>
      </Card>

      <div className="mt-8 grid gap-8 lg:grid-cols-[3fr_4fr] lg:gap-6">
        <section>
          <SectionTitle>Today's activity</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Jumps" value={dash ? '…' : String(today.jumps)} />
            <StatCard label="Time" value={dash ? '…' : formatDuration(today.elapsedMs)} />
            <StatCard label="Calories" value={dash ? '…' : String(Math.round(today.calories))} unit="kcal" />
          </div>
        </section>

        <section>
          <SectionTitle>This week</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total jumps" value={dash ? '…' : String(week.jumps)} delta={pct(week.jumps, lastWeek.jumps)} />
            <StatCard label="Workouts" value={dash ? '…' : String(week.count)} delta={pct(week.count, lastWeek.count)} />
            <StatCard label="Average JPM" value={week.avgJpm ? String(Math.round(week.avgJpm)) : '—'} delta={week.avgJpm ? pct(week.avgJpm, lastWeek.avgJpm) : null} />
            <StatCard label="Personal record" value={pr === null ? '—' : String(pr)} unit={pr === null ? undefined : 'jumps'} accent />
          </div>
        </section>
      </div>

      {!dash && ws.length > 0 && (
        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-6">
          <section>
            <SectionTitle>Last 7 days</SectionTitle>
            <Card className="p-3">
              <JumpsBarChart data={jumpBuckets(ws, last7, 'day')} by="day" height="h-40" />
            </Card>
          </section>
          <TrickPerformance ws={ws} />
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <SectionTitle>Recent workouts</SectionTitle>
          {ws.length > 3 && (
            <Link to="/progress" className="mb-3 text-sm font-medium text-accent-fg hover:underline">
              All history
            </Link>
          )}
        </div>
        {ws.length ? (
          <ul className="divide-y divide-line/60 overflow-hidden rounded-[var(--radius-card)] border border-line/60 bg-surface">
            {ws.slice(0, 3).map((w) => (
              <li key={w.id}>
                <Link to={`/workout/${w.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 md:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-muted">{when(w.startedAt)}</div>
                    <div className="mt-1 grid grid-cols-4 gap-2 sm:max-w-lg">
                      <Kv label="jumps" value={String(w.totalJumps)} />
                      <Kv label="time" value={formatDuration(w.elapsedMs)} />
                      <Kv label="avg JPM" value={String(Math.round(w.avgJpm))} />
                      <Kv label="kcal" value={`~${Math.round(w.calories)}`} />
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          !dash && <EmptyState icon={Activity} title="No workouts yet" text="Finish your first session and it will show up here." />
        )}
      </section>
    </Page>
  )
}

/** Detected tricks (beta) across all workouts + the manual mastery count, kept apart. Real data only. */
function TrickPerformance({ ws }: { ws: WorkoutRecord[] }) {
  const mastered = useTrickStatus((s) => Object.values(s.statuses).filter((v) => v === 'mastered').length)
  const withData = ws.filter((w) => w.tricks)
  const events = withData.flatMap((w) => w.tricks ?? [])
  const top = summarizeTricks(events, []).sort((a, b) => b.runs - a.runs).slice(0, 3)
  return (
    <section className="flex flex-col">
      <SectionTitle>Trick performance · beta</SectionTitle>
      <Card className="flex flex-1 flex-col p-4">
        {!events.length ? (
          <div className="flex flex-1 items-center gap-3 text-sm text-muted">
            <Sparkles size={20} className="shrink-0 text-accent-fg" aria-hidden />
            {withData.length
              ? 'No tricks recognized yet. Detection covers 8 tricks during a workout.'
              : 'No trick data yet. Tricks are detected (beta) during new workouts.'}
          </div>
        ) : (
          <>
            <div className="text-sm text-muted">
              <span className="tabular text-xl font-bold text-fg">{events.length}</span> detected ·{' '}
              <span className="tabular font-semibold text-fg">{new Set(events.map((e) => e.trickId)).size}</span> unique
            </div>
            <ol className="mt-2 divide-y divide-line/60 text-sm" aria-label="Most performed tricks">
              {top.map((r) => {
                const level = TRICKS.find((t) => t.id === r.trickId)?.level
                return (
                  <li key={r.trickId} className="flex items-center justify-between gap-2 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-semibold">{trickName(r.trickId)}</span>
                      {level && <DifficultyBadge level={level} />}
                    </span>
                    <span className="tabular text-muted">×{r.runs}</span>
                  </li>
                )
              })}
            </ol>
          </>
        )}
        <Link to="/tricks" className="mt-auto flex items-center justify-between border-t border-line/60 pt-3 text-sm">
          <span className="text-muted">
            Mastered (set by you) <span className="tabular font-semibold text-fg">{mastered}/{TRICKS.length}</span>
          </span>
          <ChevronRight size={16} className="text-muted" aria-hidden />
        </Link>
      </Card>
    </section>
  )
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="tabular font-semibold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  )
}
