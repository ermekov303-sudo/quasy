import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[var(--radius-card)] border border-line/60 bg-surface p-5 ${className}`}>{children}</div>
}

/** Large readable number with a muted label. `unit` is shown small after the value; `delta` = % change vs a previous period. */
export function StatCard({ label, value, unit, accent = false, delta }: { label: string; value: string; unit?: string; accent?: boolean; delta?: number | null }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-2 tabular text-2xl font-bold ${accent ? 'text-accent-fg' : 'text-fg'}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-muted">{unit}</span>}
      </div>
      {delta != null && Number.isFinite(delta) && Math.round(delta) === 0 && (
        <div className="mt-1 text-xs text-muted">= same as last week</div>
      )}
      {delta != null && Number.isFinite(delta) && Math.round(delta) !== 0 && (
        <div className={`mt-1 text-xs font-semibold tabular ${delta >= 0 ? 'text-success' : 'text-danger'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))}% <span className="font-normal text-muted">vs last week</span>
        </div>
      )}
    </Card>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">{children}</h2>
}
