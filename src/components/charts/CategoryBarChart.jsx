import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts'
import ChartTooltip from './ChartTooltip'
import { formatCurrency } from '../../lib/format'

export default function CategoryBarChart({ data, color = 'var(--series-1)' }) {
  const top = data.slice(0, 8)
  const height = Math.max(180, top.length * 34)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--gridline)" horizontal={false} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--gridline)', opacity: 0.4 }} />
        <Bar dataKey="valor" name="Valor" fill={color} radius={[0, 3, 3, 0]} maxBarSize={18}>
          <LabelList
            dataKey="valor"
            position="right"
            formatter={formatCurrency}
            style={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
