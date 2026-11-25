import { useLiveQuery } from 'dexie-react-hooks'
import { Trophy } from 'lucide-react'
import { Link } from 'react-router'
import { formatDuration } from '../lib/format'
import { personalRecords, RECORD_KEYS, type RecordKey } from '../metrics/analytics'
import { db } from '../storage/db'
import { SectionTitle } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { Page } from '../ui/Page'
import { BenchmarkSection } from './BenchmarkSection'

const META: Record<RecordKey, { label: string; fmt: (v: number) => string; unit?: string }> = {
  totalJumps: { label: 'Highest total jumps', fmt: (v) => String(v), unit: 'jumps' },
  maxJpm: { label: 'Highest max JPM', fmt: (v) => String(Math.round(v)), unit: 'JPM' },
  maxStreak: { label: 'Longest streak', fmt: (v) => String(v), unit: 'jumps' },
  maxStreakJpm: { label: 'Highest streak JPM', fmt: (v) => String(Math.round(v)), unit: 'JPM' },
  elapsedMs: { label: 'Longest workout', fmt: formatDuration },
}
const date = (t: number) => new Date(t).toLocaleDateString(undefined, { dateStyle: 'medium' })

export function RecordsScreen() {
  const all = useLiveQuery(() => db.workouts.toArray())
  const recs = all ? personalRecords(all) : {}

  return (
    <Page withNav narrow>
      <header className="py-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Records</h1>
        <p className="text-sm text-muted">Personal bests and benchmark tests.</p>
      </header>

      <section>
        <SectionTitle>Personal records</SectionTitle>
        {all !== undefined && !all.length ? (
          <EmptyState icon={Trophy} title="No records yet" text="Your best jumps, speed and streaks are saved after each workout." />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
            {RECORD_KEYS.map((k) => {
              const r = recs[k]
              const m = META[k]
              return (
                <li key={k}>
                  <Link
                    to={r ? `/workout/${r.workoutId}` : '#'}
                    aria-disabled={!r}
                    onClick={(e) => !r && e.preventDefault()}
                    className="flex items-center gap-3 p-4 hover:bg-surface-2"
                  >
                    <Trophy size={18} className="shrink-0 text-accent-fg" aria-hidden />
                    <div className="flex-1">
                      <div className="font-medium">{m.label}</div>
                      <div className="text-xs text-muted">
                        {r ? date(r.at) : 'No data yet'}
                        {r?.previous && ` · previous ${m.fmt(r.previous.value)}${m.unit ? ' ' + m.unit : ''} (${date(r.previous.at)})`}
                      </div>
                    </div>
                    <div className="tabular text-right text-xl font-bold">
                      {r ? m.fmt(r.value) : '—'}
                      {r && m.unit && <span className="ml-1 text-xs font-medium text-muted">{m.unit}</span>}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <BenchmarkSection all={all ?? []} />
    </Page>
  )
}
