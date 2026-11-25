import { Check, Circle, Clock, Dumbbell, Footprints, Hand, Repeat, ShieldAlert, Spline, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { statusOf, trickProgress, type TrickStatus } from '../../metrics/trickLibrary'
import { useTrickStatus } from '../../tricks/trickStatus'
import { CATEGORY_META, LEVEL_META, LEVELS, TRICKS, type CategoryId, type Level, type Trick } from '../../tricks/tricks'
import { Choice } from '../../ui/Choice'

export const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  footwork: Footprints,
  rope: Spline,
  power: Dumbbell,
  releases: Hand,
  multiples: Repeat,
}

/** Level colour + level word (never colour alone). Black text keeps ≥4.5:1 on all five colours (tested). */
export function DifficultyBadge({ level }: { level: Level }) {
  const m = LEVEL_META[level]
  return (
    <span className="inline-flex h-6 items-center rounded-full px-2.5 text-xs font-bold text-black" style={{ background: m.color }}>
      {m.label}
    </span>
  )
}

const STATUS: Record<TrickStatus, { label: string; icon: LucideIcon; cls: string }> = {
  'not-started': { label: 'Not Started', icon: Circle, cls: 'border border-line text-muted' },
  learning: { label: 'Learning', icon: Clock, cls: 'bg-accent-soft text-accent-fg' },
  mastered: { label: 'Mastered', icon: Check, cls: 'bg-success/15 text-success' },
}
const STATUS_ORDER: TrickStatus[] = ['not-started', 'learning', 'mastered']

export function StatusTag({ status }: { status: TrickStatus }) {
  const { label, icon: Icon, cls } = STATUS[status]
  return (
    <span className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${cls}`}>
      <Icon size={14} aria-hidden />
      {label}
    </span>
  )
}

/** Segmented Not Started / Learning / Mastered picker. */
export function StatusPicker({ trick }: { trick: Trick }) {
  const status = useTrickStatus((s) => statusOf(s.statuses, trick.id))
  const setStatus = useTrickStatus((s) => s.setStatus)
  return (
    <div role="group" aria-label="Learning status" className="flex flex-wrap gap-2">
      {STATUS_ORDER.map((s) => (
        <Choice key={s} selected={status === s} onClick={() => setStatus(trick.id, s)}>
          {STATUS[s].label}
        </Choice>
      ))}
    </div>
  )
}

/** Video poster when the trick has a demo clip, otherwise a placeholder tile with the category icon. */
function Thumb({ trick }: { trick: Trick }) {
  const Icon = CATEGORY_ICON[trick.category]
  if (trick.video?.poster)
    return <img src={trick.video.poster} alt="" loading="lazy" className="size-14 shrink-0 rounded-xl bg-surface-2 object-cover" />
  return (
    <div aria-hidden className="grid size-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent-soft to-surface-2 text-accent-fg">
      <Icon size={24} />
    </div>
  )
}

/** Trick card: opens the trick page; the status button cycles Not Started → Learning → Mastered. */
export function TrickCard({ trick, showCategory = true }: { trick: Trick; showCategory?: boolean }) {
  const status = useTrickStatus((s) => statusOf(s.statuses, trick.id))
  const setStatus = useTrickStatus((s) => s.setStatus)
  const next = STATUS_ORDER[(STATUS_ORDER.indexOf(status) + 1) % STATUS_ORDER.length]
  return (
    <li className="flex flex-col rounded-[var(--radius-card)] border border-line/60 bg-surface">
      <Link to={`/tricks/t/${trick.id}`} className="flex flex-1 gap-3 rounded-t-[var(--radius-card)] p-4 pb-2 transition-colors hover:bg-surface-2/50">
        <Thumb trick={trick} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{trick.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <DifficultyBadge level={trick.level} />
            {showCategory && <span className="text-xs text-muted">{CATEGORY_META[trick.category].label}</span>}
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-muted">{trick.description}</p>
        </div>
      </Link>
      <div className="flex justify-end px-4 pb-4">
        <button
          type="button"
          onClick={() => setStatus(trick.id, next)}
          aria-label={`${trick.name}: ${STATUS[status].label}. Tap to set ${STATUS[next].label}`}
          className="rounded-full active:scale-[0.97]"
        >
          <StatusTag status={status} />
        </button>
      </div>
    </li>
  )
}

export function ProgressBar({ value, total, label }: { value: number; total: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={value} className="h-2 overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
    </div>
  )
}

/** Difficulty distribution of a category, each segment labelled with its level word. */
function LevelStrip({ tricks }: { tricks: Trick[] }) {
  return (
    <div className="flex gap-1" aria-label="Difficulty distribution">
      {LEVELS.map((l) => {
        const n = tricks.filter((t) => t.level === l).length
        return n ? (
          <span key={l} className="h-5 rounded-md text-center text-[10px] font-bold leading-5 text-black" style={{ background: LEVEL_META[l].color, flexGrow: n }}>
            {n > 1 ? `${n} ` : ''}{LEVEL_META[l].label}
          </span>
        ) : null
      })}
    </div>
  )
}

export function CategoryCard({ id, mastered }: { id: CategoryId; mastered: number }) {
  const m = CATEGORY_META[id]
  const Icon = CATEGORY_ICON[id]
  const tricks = TRICKS.filter((t) => t.category === id)
  return (
    <li>
      <Link to={`/tricks/c/${id}`} className="block h-full rounded-[var(--radius-card)] border border-line/60 bg-surface p-5 transition-colors hover:bg-surface-2/60">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent-fg">
            <Icon size={22} aria-hidden />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">{m.label}</h3>
            <div className="text-xs text-muted tabular">{tricks.length} tricks · {mastered}/{tricks.length} mastered</div>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">{m.description}</p>
        <p className="mt-2 text-sm text-fg">{tricks.map((t) => t.name).join(' · ')}</p>
        <div className="mt-3">
          <LevelStrip tricks={tricks} />
        </div>
      </Link>
    </li>
  )
}

/** Manually set mastery per difficulty level (from the Trick Library statuses, not from detection). */
export function LevelMastery() {
  const statuses = useTrickStatus((s) => s.statuses)
  const p = trickProgress(TRICKS, statuses)
  return (
    <div className="flex flex-col gap-4">
      {LEVELS.map((l) => (
        <div key={l}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <DifficultyBadge level={l} />
            <span className="tabular text-muted">{p.byLevel[l].mastered}/{p.byLevel[l].total}</span>
          </div>
          <ProgressBar value={p.byLevel[l].mastered} total={p.byLevel[l].total} label={`${LEVEL_META[l].label} mastered`} />
        </div>
      ))}
    </div>
  )
}

/** Detected trick runs per level: level word + count + share (colour never stands alone). */
export function LevelDistribution({ counts }: { counts: Record<Level, number> }) {
  const total = LEVELS.reduce((s, l) => s + counts[l], 0)
  return (
    <ul className="flex flex-col gap-3" aria-label="Detected tricks by level">
      {LEVELS.map((l) => (
        <li key={l} className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-3 text-sm">
          <DifficultyBadge level={l} />
          <span className="h-2 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full" style={{ width: `${total ? (counts[l] / total) * 100 : 0}%`, background: LEVEL_META[l].color }} />
          </span>
          <span className="tabular text-right">
            <span className="font-semibold">{counts[l]}</span>
            <span className="text-muted"> · {total ? Math.round((counts[l] / total) * 100) : 0}%</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function SafetyNote() {
  return (
    <div className="flex gap-3 rounded-[var(--radius-card)] border border-[#EAB308]/40 bg-[#EAB308]/10 p-4 text-sm">
      <ShieldAlert size={20} className="shrink-0 text-[#EAB308]" aria-hidden />
      <p>
        <span className="font-semibold">Safety: </span>
        learn advanced power elements with qualified coaching and appropriate supervision.
      </p>
    </div>
  )
}
