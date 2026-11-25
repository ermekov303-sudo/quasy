import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, LineChart, Loader2, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { formatDuration } from '../lib/format'
import { computeMetrics } from '../metrics/workoutMetrics'
import { levelCounts } from '../recognition/summary'
import { db, type WorkoutRecord } from '../storage/db'
import { jumpBuckets, rangeStart, startOfWeek, totals, type Range } from '../storage/queries'
import { buttonClass } from '../ui/Button'
import { Card, SectionTitle, StatCard } from '../ui/Card'
import { ActivityHeatmap, JpmLineChart, JumpsBarChart } from '../ui/charts'
import { Choice } from '../ui/Choice'
import { EmptyState } from '../ui/EmptyState'
import { Page } from '../ui/Page'
import { LevelDistribution, LevelMastery } from './tricks/parts'

const RANGES: { id: Range; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'all', label: 'All time' },
]

const when = (t: number) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** Average jumps per streak over a set of workouts (0 when none). */
function streakStats(ws: WorkoutRecord[]) {
  const streaks = ws.flatMap((w) => computeMetrics(w, w).streaks)
  return {
    best: Math.max(0, ...streaks.map((s) => s.jumps)),
    avgLen: streaks.length ? streaks.reduce((a, s) => a + s.jumps, 0) / streaks.length : 0,
    maxJpm: Math.max(0, ...streaks.filter((s) => s.jumps > 1).map((s) => s.jpm)),
  }
}

export function ProgressScreen() {
  const all = useLiveQuery(() => db.workouts.orderBy('startedAt').toArray())
  const [range, setRange] = useState<Range>('7d')
  const [by, setBy] = useState<'day' | 'week'>('day')
  const navigate = useNavigate()

  const header = (
    <header className="py-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Your Progress</h1>
      <p className="text-sm text-muted">Every workout counts.</p>
    </header>
  )

  if (all === undefined)
    return (
      <Page withNav>
        {header}
        <div className="grid place-items-center py-20 text-muted" role="status">
          <Loader2 className="animate-spin" aria-hidden />
          <span className="sr-only">Loading progress</span>
        </div>
      </Page>
    )
  if (!all.length)
    return (
      <Page withNav>
        {header}
        <EmptyState
          icon={LineChart}
          title="No workouts to analyse"
          text="Charts, JPM trends and your workout history appear after your first completed workout."
          action={<Link to="/workout/setup" className={buttonClass('primary')}>Start workout</Link>}
        />
      </Page>
    )

  const from = rangeStart(range, all)
  const ws = all.filter((w) => w.startedAt >= from)
  const span = Date.now() - from
  const prev = range === 'all' ? [] : all.filter((w) => w.startedAt >= from - span && w.startedAt < from)
  const step = range === '7d' ? 'day' : by
  const t = totals(ws)
  const ss = streakStats(ws)
  const prevAvgLen = prev.length ? streakStats(prev).avgLen : null
  const change = prevAvgLen ? ((ss.avgLen - prevAvgLen) / prevAvgLen) * 100 : null
  // heatmap: always the last 12 calendar weeks (Mon start), independent of the range filter
  const heatStart = new Date(startOfWeek())
  heatStart.setDate(heatStart.getDate() - 77)
  const heatDays = jumpBuckets(all, heatStart.getTime(), 'day')
  const detected = ws.filter((w) => w.tricks) // workouts saved after recognition existed
  const events = detected.flatMap((w) => w.tricks ?? [])
  const history = [...ws].reverse()

  return (
    <Page withNav>
      {header}
      <div className="flex gap-2" role="group" aria-label="Time range">
        {RANGES.map((r) => (
          <Choice key={r.id} selected={range === r.id} onClick={() => setRange(r.id)}>
            {r.label}
          </Choice>
        ))}
      </div>

      {!ws.length ? (
        <div className="mt-6">
          <EmptyState icon={LineChart} title="No workouts in this period" text="Pick a longer range or start a new workout." />
        </div>
      ) : (
        <>
          <section className="mt-6">
            <SectionTitle>Workout consistency</SectionTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Workouts" value={String(t.count)} />
              <StatCard label="Total jumps" value={String(t.jumps)} />
              <StatCard label="Total time" value={formatDuration(t.elapsedMs)} />
              <StatCard label="Avg duration" value={formatDuration(t.elapsedMs / t.count)} />
            </div>
          </section>

          <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-6">
            <section>
              <div className="mb-3 flex min-h-10 items-center justify-between gap-2">
                <SectionTitle>Total jumps</SectionTitle>
                {range !== '7d' && (
                  <div className="flex gap-1" role="group" aria-label="Chart grouping">
                    <Choice selected={step === 'day'} onClick={() => setBy('day')}>Daily</Choice>
                    <Choice selected={step === 'week'} onClick={() => setBy('week')}>Weekly</Choice>
                  </div>
                )}
              </div>
              <Card className="p-3">
                <JumpsBarChart data={jumpBuckets(ws, from, step)} by={step} height="h-56" />
              </Card>
            </section>

            <section>
              <div className="mb-3 flex min-h-10 items-center justify-between gap-2">
                <SectionTitle>JPM progress</SectionTitle>
                <span className="mb-3 text-sm text-muted">
                  Highest speed <span className="tabular font-bold text-accent-fg">{Math.round(Math.max(...ws.map((w) => w.maxJpm)))}</span> JPM
                </span>
              </div>
              <Card className="p-3">
                <JpmLineChart data={ws.map((w) => ({ at: w.startedAt, avg: w.avgJpm, max: w.maxJpm }))} />
              </Card>
            </section>
          </div>

          <section className="mt-8">
            <SectionTitle>Streak progress</SectionTitle>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Best streak" value={String(ss.best)} unit="jumps" accent />
              <StatCard label="Avg streak" value={ss.avgLen.toFixed(1)} unit="jumps" />
              <StatCard label="Max streak JPM" value={String(Math.round(ss.maxJpm))} />
              <Card className="p-4">
                <div className="text-xs font-medium uppercase tracking-wider text-muted">Avg streak change</div>
                {change === null ? (
                  <div className="mt-2 text-sm text-muted">{range === 'all' ? 'Pick 7 or 30 days' : 'No earlier data'}</div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5 tabular text-2xl font-bold">
                    {change >= 0 ? <TrendingUp size={20} className="text-success" aria-hidden /> : <TrendingDown size={20} className="text-danger" aria-hidden />}
                    {change >= 0 ? '+' : ''}
                    {Math.round(change)}%
                  </div>
                )}
                {change !== null && <div className="text-[11px] text-muted">vs previous {range === '7d' ? '7' : '30'} days</div>}
              </Card>
            </div>
          </section>

          <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
            <section>
              <SectionTitle>Activity · last 12 weeks</SectionTitle>
              <Card className="p-4">
                <ActivityHeatmap days={heatDays} />
              </Card>
            </section>

            <section>
              <SectionTitle>Detected tricks · beta</SectionTitle>
              <Card className="p-4">
                {events.length ? (
                  <>
                    <div className="mb-4 text-sm text-muted">
                      <span className="tabular text-xl font-bold text-fg">{events.length}</span> tricks ·{' '}
                      <span className="tabular font-semibold text-fg">{new Set(events.map((e) => e.trickId)).size}</span> unique
                    </div>
                    <LevelDistribution counts={levelCounts(events)} />
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    {detected.length ? 'No tricks recognized in this period.' : 'No trick data in this period. Tricks are detected (beta) during new workouts.'}
                  </p>
                )}
                <p className="mt-4 text-xs text-muted">From body movement only; 8 of the 25 tricks can be detected.</p>
              </Card>
            </section>

            <section>
              <SectionTitle>Mastery · set by you</SectionTitle>
              <Card className="p-4">
                <LevelMastery />
              </Card>
            </section>
          </div>

          <section className="mt-8">
            <SectionTitle>Workout history</SectionTitle>
            <ul className="space-y-2 md:hidden">
              {history.map((w) => (
                <li key={w.id}>
                  <Link
                    to={`/workout/${w.id}`}
                    className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line/60 bg-surface p-4 hover:bg-surface-2"
                  >
                    <div className="flex-1">
                      <div className="text-sm text-muted">{when(w.startedAt)}</div>
                      <div className="mt-1 grid grid-cols-4 gap-2 text-sm">
                        <Kv v={String(w.totalJumps)} k="jumps" />
                        <Kv v={formatDuration(w.elapsedMs)} k="time" />
                        <Kv v={String(Math.round(w.avgJpm))} k="avg JPM" />
                        <Kv v={`~${Math.round(w.calories)}`} k="kcal" />
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="relative hidden overflow-x-auto rounded-[var(--radius-card)] border border-line/60 bg-surface md:block">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted">
                  <tr className="border-b border-line/60">
                    <th scope="col" className="px-5 py-3 font-medium">Date</th>
                    {['Jumps', 'Time', 'Avg JPM', 'Max JPM', 'Best streak', 'Tricks', 'kcal'].map((h) => (
                      <th key={h} scope="col" className="px-3 py-3 text-right font-medium">{h}</th>
                    ))}
                    <th scope="col" className="w-10"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {history.map((w) => (
                    // whole row is clickable for the mouse; the date link is the keyboard/screen-reader target
                    <tr key={w.id} onClick={() => navigate(`/workout/${w.id}`)} className="cursor-pointer border-b border-line/40 last:border-0 hover:bg-surface-2">
                      <td className="px-5 py-3">
                        <Link to={`/workout/${w.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                          {when(w.startedAt)}
                        </Link>
                        {w.benchmarkMs ? <span className="ml-2 text-xs font-semibold text-accent-fg">Test</span> : null}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">{w.totalJumps}</td>
                      <td className="px-3 py-3 text-right">{formatDuration(w.elapsedMs)}</td>
                      <td className="px-3 py-3 text-right">{Math.round(w.avgJpm)}</td>
                      <td className="px-3 py-3 text-right">{Math.round(w.maxJpm)}</td>
                      <td className="px-3 py-3 text-right">{w.maxStreak}</td>
                      <td className="px-3 py-3 text-right">{w.tricks ? w.tricks.length : '—'}</td>
                      <td className="px-3 py-3 text-right text-muted">~{Math.round(w.calories)}</td>
                      <td className="pr-4 text-muted">
                        <ChevronRight size={16} aria-hidden />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </Page>
  )
}

function Kv({ v, k }: { v: string; k: string }) {
  return (
    <span>
      <span className="tabular block font-semibold">{v}</span>
      <span className="text-[11px] text-muted">{k}</span>
    </span>
  )
}
