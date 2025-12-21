import { format, parseISO } from 'date-fns'
import type { TimelinePoint } from '../lib/api'

interface UptimeTimelineProps {
  data: TimelinePoint[]
}

export default function UptimeTimeline({ data }: UptimeTimelineProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-gray-500 dark:text-gray-400">
        No checks recorded yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-0.5">
        {data.map((point, index) => (
          <div key={index} className="group relative flex-1 min-w-[4px]">
            <div
              className={`h-8 rounded-sm transition-all ${
                point.success
                  ? 'bg-green-500 hover:bg-green-400'
                  : 'bg-red-500 hover:bg-red-400'
              }`}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                <div className="font-medium">
                  {point.success ? 'UP' : 'DOWN'}
                </div>
                <div className="text-gray-300">
                  {formatTime(point.time)}
                </div>
                <div className="text-gray-300">
                  Status: {point.statusCode}
                </div>
                <div className="text-gray-300">
                  Response: {point.responseMs}ms
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-900" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{formatTimeShort(data[0]?.time)}</span>
        <span>{formatTimeShort(data[data.length - 1]?.time)}</span>
      </div>
    </div>
  )
}

function formatTime(time: string): string {
  try {
    return format(parseISO(time), 'MMM d, HH:mm:ss')
  } catch {
    return time
  }
}

function formatTimeShort(time: string): string {
  try {
    return format(parseISO(time), 'MMM d, HH:mm')
  } catch {
    return time
  }
}
