import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { ChartDataPoint } from '../lib/api'

interface UptimeChartProps {
  data: ChartDataPoint[]
  period: '24h' | '30d'
}

export default function UptimeChart({ data, period }: UptimeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No data available yet
      </div>
    )
  }

  const formatXAxis = (time: string) => {
    try {
      const date = parseISO(time)
      return period === '24h' ? format(date, 'HH:mm') : format(date, 'MMM d')
    } catch {
      return time
    }
  }

  const formatTooltipLabel = (time: string) => {
    try {
      const date = parseISO(time)
      return period === '24h'
        ? format(date, 'MMM d, HH:mm')
        : format(date, 'EEEE, MMM d')
    } catch {
      return time
    }
  }

  const getBarColor = (uptime: string) => {
    const value = parseFloat(uptime)
    if (value >= 99.9) return '#10b981' // green-500
    if (value >= 99) return '#22c55e' // green-400
    if (value >= 95) return '#f59e0b' // amber-500
    if (value >= 90) return '#f97316' // orange-500
    return '#ef4444' // red-500
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis
          dataKey="time"
          tickFormatter={formatXAxis}
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={{ stroke: '#374151' }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={{ stroke: '#374151' }}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          labelFormatter={formatTooltipLabel}
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#f3f4f6' }}
          itemStyle={{ color: '#f3f4f6' }}
          formatter={(value: string, name: string) => {
            if (name === 'uptime') {
              return [`${value}%`, 'Uptime']
            }
            return [value, name]
          }}
        />
        <Bar dataKey="uptime" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.uptime)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
