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
import type { SiteComparison } from '../lib/api'

interface SitesComparisonChartProps {
  data: SiteComparison[]
}

export default function SitesComparisonChart({ data }: SitesComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No data available yet
      </div>
    )
  }

  // Sort by response time (slowest first for better visualization)
  const sortedData = [...data].sort((a, b) => b.avgResponse - a.avgResponse)

  const getBarColor = (status: string) => {
    return status === 'up' ? '#10b981' : '#ef4444'
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart
        data={sortedData}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={{ stroke: '#374151' }}
          tickFormatter={(value) => `${value}ms`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: '#9ca3af', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={{ stroke: '#374151' }}
          width={120}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#f3f4f6' }}
          itemStyle={{ color: '#f3f4f6' }}
          formatter={(value: number, name: string, props: { payload: SiteComparison }) => {
            const site = props.payload
            return [
              <div key="tooltip" className="space-y-1">
                <div>{value}ms avg response</div>
                <div className="text-gray-400">{site.uptime}% uptime (24h)</div>
                <div className={site.currentStatus === 'up' ? 'text-green-400' : 'text-red-400'}>
                  Currently {site.currentStatus}
                </div>
              </div>,
              '',
            ]
          }}
          labelFormatter={(name) => name}
        />
        <Bar dataKey="avgResponse" radius={[0, 4, 4, 0]}>
          {sortedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.currentStatus)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
