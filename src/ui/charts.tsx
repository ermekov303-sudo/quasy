import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// Validated on the dark surface (dataviz validator): series-1 purple, series-2 teal. Hex here: SVG attrs need literals.
export const SERIES_1 = '#8b5cf6'
export const SERIES_2 = '#0d9488'
const AXIS = '#9a9aa5'
const GRID = '#2a2a30'

const dayFmt = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

type TipProps = { active?: boolean; label?: number; payload?: { name?: string; value?: number; color?: string }[]; title?: (t: number) => string }

/** Shared dark tooltip: text in ink tokens, colored swatch carries identity. */
function Tip({ active, label, payload, title = dayFmt }: TipProps) {
  if (!active || !payload?.length || label === undefined) return null
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-fg">{title(label)}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-muted">
          <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
          {p.name}: <span className="tabular font-semibold text-fg">{Math.round(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  )
}

const axisProps = { stroke: AXIS, tick: { fill: AXIS, fontSize: 11 }, tickLine: false, axisLine: false } as const

export function JumpsBarChart({ data, by }: { data: { start: number; jumps: number }[]; by: 'day' | 'week' }) {
  const title = (t: number) => (by === 'week' ? `Week of ${dayFmt(t)}` : dayFmt(t))
  return (
    <div className="h-52" role="img" aria-label={`Total jumps per ${by}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="start" tickFormatter={dayFmt} minTickGap={16} {...axisProps} />
          <YAxis allowDecimals={false} width={44} {...axisProps} />
          <Tooltip content={<Tip title={title} />} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
          <Bar dataKey="jumps" name="Jumps" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Jumps per benchmark test of one duration, oldest → newest; the latest bar is highlighted. */
export function BenchmarkChart({ data }: { data: { at: number; jumps: number }[] }) {
  const title = (t: number) => new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return (
    <div className="h-44" role="img" aria-label="Jumps per benchmark test">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="at" tickFormatter={dayFmt} minTickGap={16} {...axisProps} />
          <YAxis allowDecimals={false} width={44} {...axisProps} />
          <Tooltip content={<Tip title={title} />} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
          <Bar dataKey="jumps" name="Jumps" radius={[4, 4, 0, 0]} maxBarSize={36} fill={SERIES_1}>
            {data.map((_, i) => (
              <Cell key={i} fill={SERIES_1} fillOpacity={i === data.length - 1 ? 1 : 0.45} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function JpmLineChart({ data }: { data: { at: number; avg: number; max: number }[] }) {
  // all workouts within one day → label by time, otherwise every tick reads the same date
  const sameDay = data.length > 0 && data.at(-1)!.at - data[0].at < 86_400_000
  const tick = sameDay ? (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : dayFmt
  const title = (t: number) => new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return (
    <div className="h-52" role="img" aria-label="Average and max JPM per workout">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="at" tickFormatter={tick} minTickGap={16} {...axisProps} />
          <YAxis width={44} {...axisProps} />
          <Tooltip content={<Tip title={title} />} cursor={{ stroke: AXIS, strokeDasharray: '3 3' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: AXIS }} />
          <Line type="monotone" dataKey="max" name="Max JPM" stroke={SERIES_1} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#121214' }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="avg" name="Avg JPM" stroke={SERIES_2} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#121214' }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
