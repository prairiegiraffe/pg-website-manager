import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, Site, Incident, Stats } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import { timeAgo } from '../lib/utils'

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [statsData, sitesData, incidentsData] = await Promise.all([
          api.getStats(),
          api.getSites(),
          api.getIncidents({ active: true }),
        ])
        setStats(statsData)
        setSites(sitesData)
        setIncidents(incidentsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of your monitored sites and system health
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Sites" value={stats.total_sites} />
          <StatCard label="Sites Up" value={stats.sites_up} className="text-green-600 dark:text-green-400" />
          <StatCard label="Sites Down" value={stats.sites_down} className="text-red-600 dark:text-red-400" />
          <StatCard label="Uptime" value={`${stats.uptime_percentage.toFixed(1)}%`} />
        </div>
      )}

      {/* Active Incidents */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Incidents</h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No active incidents</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Started</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Failures</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {incidents.map((incident) => (
                  <tr key={incident.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {incident.site_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {timeAgo(incident.started_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {incident.failure_count}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <StatusBadge status="down" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sites Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sites</h2>
          <Link
            to="/sites"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.slice(0, 6).map((site) => (
            <Link
              key={site.id}
              to={`/sites/${site.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-400"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white">{site.name}</span>
                <StatusBadge status={site.current_status ?? 'unknown'} />
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">{site.url}</p>
              {site.last_response_ms !== undefined && (
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  {site.last_response_ms}ms · {site.last_checked_at ? timeAgo(site.last_checked_at) : 'never'}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${className ?? 'text-gray-900 dark:text-white'}`}>
        {value}
      </p>
    </div>
  )
}
