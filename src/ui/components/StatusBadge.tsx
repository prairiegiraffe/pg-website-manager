import { classNames } from '../lib/utils'

type Status = 'up' | 'down' | 'degraded' | 'unknown' | 'paused'

const statusStyles: Record<Status, string> = {
  up: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  down: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  paused: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

const statusLabels: Record<Status, string> = {
  up: 'Up',
  degraded: 'Slow',
  down: 'Down',
  unknown: 'Pending',
  paused: 'Paused',
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status],
        className ?? ''
      )}
    >
      {statusLabels[status]}
    </span>
  )
}
