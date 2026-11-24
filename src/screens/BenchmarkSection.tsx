import { Timer, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { benchmarkCompare } from '../metrics/analytics'
import type { WorkoutRecord } from '../storage/db'
import { buttonClass } from '../ui/Button'
import { Card, SectionTitle, StatCard } from '../ui/Card'
import { BenchmarkChart } from '../ui/charts'
import { Choice } from '../ui/Choice'
import { EmptyState } from '../ui/EmptyState'

const DURATIONS = [60_000, 180_000]
const label = (ms: number) => `${ms / 60_000} min`
const date = (t: number) => new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Benchmark Result + Progress Test. One duration at a time: 1 min and 3 min are never compared. */
export function BenchmarkSection({ all }: { all: WorkoutRecord[] }) {
  const [dur, setDur] = useState(60_000)
  const { tests, latest, previous, diff } = benchmarkCompare(all, dur)

  return (
    <>
      <section className="mt-8">
        <SectionTitle>Benchmark test</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {DURATIONS.map((d) => (
            <Link key={d} to={`/workout/setup?benchmark=${d}`} className={buttonClass(d === dur ? 'primary' : 'secondary', 'lg', true)}>
              <Timer size={18} aria-hidden /> {label(d)} test
            </Link>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">A fixed-time test: jump as many times as you can. Counts only when completed.</p>

        <div className="mt-4 flex gap-2" role="group" aria-label="Test duration">
          {DURATIONS.map((d) => (
            <Choice key={d} selected={dur === d} onClick={() => setDur(d)}>
              {label(d)} results
            </Choice>
          ))}
        </div>

        {!latest ? (
          <div className="mt-3">
            <EmptyState icon={Timer} title={`No ${label(dur)} tests yet`} text="Complete a test to see your benchmark result here." />
          </div>
        ) : (
          <>
            <div className="mt-3 text-sm text-muted">Latest result · {date(latest.startedAt)}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <StatCard label="Test duration" value={label(dur)} />
              <StatCard label="Total jumps" value={String(latest.totalJumps)} accent />
              <StatCard label="Average JPM" value={String(Math.round(latest.avgJpm))} />
              <StatCard label="Max JPM" value={String(Math.round(latest.maxJpm))} />
            </div>
            <Link to={`/workout/${latest.id}`} className={`${buttonClass('ghost', 'md', true)} mt-1`}>
              Open test details
            </Link>
          </>
        )}
      </section>

      {latest && (
        <section className="mt-6">
          <SectionTitle>Progress test · {label(dur)}</SectionTitle>
          {!previous || !diff ? (
            <Card className="text-sm text-muted">Do the {label(dur)} test again to compare with your previous result.</Card>
          ) : (
            <Card>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">Previous · {date(previous.startedAt)}</dt>
                  <dd className="tabular text-xl font-bold">{previous.totalJumps} jumps</dd>
                </div>
                <div>
                  <dt className="text-muted">Latest · {date(latest.startedAt)}</dt>
                  <dd className="tabular text-xl font-bold">{latest.totalJumps} jumps</dd>
                </div>
                <Delta label="Jumps" value={diff.jumps} />
                <Delta label="Avg JPM" value={Math.round(diff.avgJpm)} />
              </dl>
              {diff.pct !== null && (
                <div className={`mt-4 flex items-center gap-2 text-lg font-bold ${diff.pct >= 0 ? 'text-success' : 'text-danger'}`}>
                  {diff.pct >= 0 ? <TrendingUp size={20} aria-hidden /> : <TrendingDown size={20} aria-hidden />}
                  {diff.pct >= 0 ? '+' : ''}
                  {Math.round(diff.pct)}% {diff.pct >= 0 ? 'improvement' : 'decline'}
                </div>
              )}
              <div className="mt-4">
                <BenchmarkChart data={tests.map((t) => ({ at: t.startedAt, jumps: t.totalJumps }))} />
              </div>
            </Card>
          )}
        </section>
      )}
    </>
  )
}

function Delta({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted">Difference in {label.toLowerCase()}</dt>
      <dd className={`tabular text-xl font-bold ${value > 0 ? 'text-success' : value < 0 ? 'text-danger' : ''}`}>
        {value > 0 ? '+' : ''}
        {value}
      </dd>
    </div>
  )
}
