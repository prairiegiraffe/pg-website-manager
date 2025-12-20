import { useEffect, useState } from 'react'
import { api, BackupHeartbeat } from '../lib/api'
import { formatDateTime, timeAgo } from '../lib/utils'

export default function Backups() {
  const [heartbeats, setHeartbeats] = useState<BackupHeartbeat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getBackupHeartbeats()
        setHeartbeats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load backups')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading...</div>
  }

  if (error) {
    return <div className="text-red-600 dark:text-red-400">Error: {error}</div>
  }

  function getBackupStatus(heartbeat: BackupHeartbeat): { status: 'ok' | 'warning' | 'error'; label: string } {
    const lastBackup = new Date(heartbeat.last_backup_at)
    const hoursSince = (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60)

    if (heartbeat.status === 'failed') {
      return { status: 'error', label: 'Failed' }
    }
    if (hoursSince > 48) {
      return { status: 'error', label: 'Overdue' }
    }
    if (hoursSince > 24) {
      return { status: 'warning', label: 'Stale' }
    }
    return { status: 'ok', label: 'OK' }
  }

  const statusStyles = {
    ok: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Backups</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Backup heartbeat status for your WordPress sites
        </p>
      </div>

      {heartbeats.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No backup heartbeats received yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Configure your backup script to send heartbeats to /api/backup-heartbeat
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Site</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Last Backup</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Time Ago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {heartbeats.map((heartbeat) => {
                const { status, label } = getBackupStatus(heartbeat)
                return (
                  <tr key={heartbeat.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {heartbeat.site_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
                        {label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(heartbeat.last_backup_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {timeAgo(heartbeat.last_backup_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
