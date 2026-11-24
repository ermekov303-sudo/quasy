import { useLiveQuery } from 'dexie-react-hooks'
import { Activity } from 'lucide-react'
import { Link } from 'react-router'
import { formatDuration } from '../lib/format'
import { db } from '../storage/db'
import { startOfDay, startOfWeek, totals } from '../storage/queries'
import { buttonClass } from '../ui/Button'
import { Card, SectionTitle, StatCard } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { Logo } from '../ui/Logo'
import { Page } from '../ui/Page'
import { useSetupPrefs } from '../workout/setupPrefs'
import { Avatar } from './ProfileScreen'

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
  const recent = ws[0]
  const dash = all === undefined // still loading: don't flash zeros

  return (
    <Page withNav>
      <header className="flex items-center justify-between py-4">
        <div>
          <Logo />
          <p className="text-sm text-muted">Welcome back{name ? `, ${name}` : ''}</p>
        </div>
        <Link
          to="/profile"
          aria-label="Open profile"
          className="rounded-full hover:opacity-80"
        >
          <Avatar photo={photo} size="size-11" />
        </Link>
      </header>

      <Card className="mt-2 p-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Ready to jump?</h1>
        <p className="mt-2 text-muted">Track your performance and improve every session.</p>
        <Link to="/workout/setup" className={`${buttonClass('primary', 'lg', true)} mt-6`}>
          Start workout
        </Link>
      </Card>

      <section className="mt-8">
        <SectionTitle>Today's activity</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Jumps" value={dash ? '…' : String(today.jumps)} />
          <StatCard label="Time" value={dash ? '…' : formatDuration(today.elapsedMs)} />
          <StatCard label="Calories" value={dash ? '…' : String(Math.round(today.calories))} unit="kcal" />
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle>This week</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total jumps" value={dash ? '…' : String(week.jumps)} delta={pct(week.jumps, lastWeek.jumps)} />
          <StatCard label="Workouts" value={dash ? '…' : String(week.count)} delta={pct(week.count, lastWeek.count)} />
          <StatCard label="Average JPM" value={week.avgJpm ? String(Math.round(week.avgJpm)) : '—'} delta={week.avgJpm ? pct(week.avgJpm, lastWeek.avgJpm) : null} />
          <StatCard label="Personal record" value={pr === null ? '—' : String(pr)} unit={pr === null ? undefined : 'jumps'} accent />
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle>Recent workout</SectionTitle>
        {recent ? (
          <Card>
            <div className="text-sm text-muted">
              {new Date(recent.startedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              <Kv label="Jumps" value={String(recent.totalJumps)} />
              <Kv label="Time" value={formatDuration(recent.elapsedMs)} />
              <Kv label="Avg JPM" value={String(Math.round(recent.avgJpm))} />
              <Kv label="kcal" value={`~${Math.round(recent.calories)}`} />
            </div>
            <Link to={`/workout/${recent.id}`} className={`${buttonClass('secondary', 'md', true)} mt-4`}>
              View details
            </Link>
          </Card>
        ) : (
          !dash && <EmptyState icon={Activity} title="No workouts yet" text="Finish your first session and it will show up here." />
        )}
      </section>
    </Page>
  )
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="tabular text-lg font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  )
}
