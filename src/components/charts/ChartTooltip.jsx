import { formatCurrency } from '../../lib/format'

export default function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-sm"
      style={{ borderColor: 'var(--border)', background: 'var(--surface-1)', color: 'var(--text-primary)' }}
    >
      <p className="mb-1 font-medium">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="tabular-nums font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  )
}
