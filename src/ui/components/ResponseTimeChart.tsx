import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { ChartDataPoint } from '../lib/api'

interface ResponseTimeChartProps {
  data: ChartDataPoint[]
  period: '24h' | '30d'
}

export default function ResponseTimeChart({ data, period }: ResponseTimeChartProps) {
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

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
        <XAxis
          dataKey="time"
          tickFormatter={formatXAxis}
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={{ stroke: '#374151' }}
        />
        <YAxis
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={{ stroke: '#374151' }}
          tickFormatter={(value) => `${value}ms`}
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
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = {
              avgResponse: 'Avg Response',
              minResponse: 'Min Response',
              maxResponse: 'Max Response',
            }
            return [`${value}ms`, labels[name] || name]
          }}
        />
        <Area
          type="monotone"
          dataKey="avgResponse"
          stroke="#6366f1"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorResponse)"
        />
        <Line
          type="monotone"
          dataKey="minResponse"
          stroke="#10b981"
          strokeWidth={1}
          dot={false}
          strokeDasharray="3 3"
        />
        <Line
          type="monotone"
          dataKey="maxResponse"
          stroke="#f59e0b"
          strokeWidth={1}
          dot={false}
          strokeDasharray="3 3"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
