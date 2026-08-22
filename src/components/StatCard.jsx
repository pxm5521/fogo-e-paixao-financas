import { formatCurrency } from '../lib/format'

export default function StatCard({ label, value, tone = 'neutral' }) {
  const color =
    tone === 'good'
      ? 'var(--status-good-text)'
      : tone === 'critical'
        ? 'var(--status-critical)'
        : 'var(--text-primary)'
  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
    >
      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color }}>
        {formatCurrency(value)}
      </p>
    </div>
  )
}
