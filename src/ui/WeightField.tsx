import { useState } from 'react'
import { useSetupPrefs } from '../workout/setupPrefs'

/** Body weight row, shared by Workout Setup and Profile. Free text while typing; only 20–300 kg is saved. */
export function WeightField() {
  const weightKg = useSetupPrefs((s) => s.weightKg)
  const set = useSetupPrefs((s) => s.set)
  const [text, setText] = useState(weightKg ? String(weightKg) : '')
  const bad = text !== '' && weightKg === null

  return (
    <label className="flex items-center justify-between gap-4 p-4">
      <div>
        <div className="font-medium">Body weight</div>
        <div className={`text-xs ${bad ? 'text-danger' : 'text-muted'}`}>
          {bad ? 'Enter 20–300 kg' : weightKg ? `Using ${weightKg} kg for calories` : 'Optional, for calorie estimate (default 70 kg)'}
        </div>
      </div>
      <span className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            const t = e.target.value.replace(',', '.')
            setText(t)
            const v = Number(t)
            set({ weightKg: t && v >= 20 && v <= 300 ? v : null })
          }}
          aria-invalid={bad}
          aria-label="Body weight in kilograms"
          className="h-10 w-20 rounded-xl bg-surface-2 px-3 text-right font-semibold tabular outline-none focus:ring-2 focus:ring-accent-fg"
          placeholder="—"
        />
        <span className="text-sm text-muted">kg</span>
      </span>
    </label>
  )
}
