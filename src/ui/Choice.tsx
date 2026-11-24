import type { ReactNode } from 'react'

/** Pill-style single choice (segmented buttons). */
export function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-10 rounded-full px-4 text-sm font-semibold tabular transition-colors ${
        selected ? 'bg-accent text-white' : 'bg-surface-2 text-fg hover:bg-line'
      }`}
    >
      {children}
    </button>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-line'}`}
    >
      <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  )
}
