import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import ChartTooltip from './ChartTooltip'
import { monthLabel } from '../../lib/format'

export default function MonthlyBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} barGap={2}>
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
        <Tooltip content={<ChartTooltip labelFormatter={monthLabel} />} cursor={{ fill: 'var(--gridline)', opacity: 0.4 }} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
        <Bar dataKey="receitas" name="Receitas" fill="var(--series-1)" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar dataKey="despesas" name="Despesas" fill="var(--series-2)" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar
          dataKey="investimentoRendimento"
          name="Investimento (Rendimento)"
          fill="var(--series-3)"
          radius={[3, 3, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
