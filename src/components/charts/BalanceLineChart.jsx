import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import ChartTooltip from './ChartTooltip'
import { monthLabel } from '../../lib/format'

export default function BalanceLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="saldoFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis
          dataKey="mes"
          tickFormatter={monthLabel}
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--axis)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
        />
        <Tooltip content={<ChartTooltip labelFormatter={monthLabel} />} cursor={{ stroke: 'var(--axis)' }} />
        <Area
          type="monotone"
          dataKey="saldo"
          name="Saldo acumulado"
          stroke="var(--series-1)"
          strokeWidth={2}
          fill="url(#saldoFill)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
