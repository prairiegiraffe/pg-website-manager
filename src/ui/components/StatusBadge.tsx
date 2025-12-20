import { classNames } from '../lib/utils'

type Status = 'up' | 'down' | 'unknown'

const statusStyles: Record<Status, string> = {
  up: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  down: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
}

const statusLabels: Record<Status, string> = {
  up: 'Up',
  down: 'Down',
  unknown: 'Unknown',
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
