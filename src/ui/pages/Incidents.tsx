import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, Incident } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import { formatDateTime, formatDuration } from '../lib/utils'

export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getIncidents(
          filter === 'all' ? undefined : { active: filter === 'active' }
        )
        setIncidents(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load incidents')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filter])

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading...</div>
  }

  if (error) {
    return <div className="text-red-600 dark:text-red-400">Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Incidents</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View all downtime incidents
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'active', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {incidents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No incidents found</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Site</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Started</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Resolved</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Failures</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {incidents.map((incident) => {
                const isActive = !incident.resolved_at
                const duration = incident.resolved_at
                  ? new Date(incident.resolved_at).getTime() - new Date(incident.started_at).getTime()
                  : Date.now() - new Date(incident.started_at).getTime()

                return (
                  <tr key={incident.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        to={`/sites/${incident.site_id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                      >
                        {incident.site_name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={isActive ? 'down' : 'up'} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(incident.started_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {incident.resolved_at ? formatDateTime(incident.resolved_at) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDuration(duration)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {incident.failure_count}
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
