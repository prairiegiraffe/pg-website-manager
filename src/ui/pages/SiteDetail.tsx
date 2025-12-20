import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { api, Site, Check, Incident } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import { formatDateTime, formatDuration } from '../lib/utils'

export default function SiteDetail() {
  const { id } = useParams<{ id: string }>()
  const [site, setSite] = useState<Site | null>(null)
  const [checks, setChecks] = useState<Check[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        const [siteData, checksData, incidentsData] = await Promise.all([
          api.getSite(parseInt(id)),
          api.getChecks(parseInt(id), 50),
          api.getIncidents({ site_id: parseInt(id) }),
        ])
        setSite(siteData)
        setChecks(checksData)
        setIncidents(incidentsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load site')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading...</div>
  }

  if (error || !site) {
    return <div className="text-red-600 dark:text-red-400">Error: {error ?? 'Site not found'}</div>
  }

  const upChecks = checks.filter((c) => c.success).length
  const uptimePercent = checks.length > 0 ? ((upChecks / checks.length) * 100).toFixed(1) : '0'
  const avgResponse = checks.length > 0
    ? Math.round(checks.reduce((sum, c) => sum + c.response_ms, 0) / checks.length)
    : 0

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/sites"
          className="inline-flex items-center gap-x-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Sites
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{site.name}</h1>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              {site.url}
            </a>
          </div>
          <StatusBadge status={site.current_status ?? 'unknown'} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Uptime" value={`${uptimePercent}%`} />
        <StatCard label="Avg Response" value={`${avgResponse}ms`} />
        <StatCard label="Total Checks" value={checks.length} />
        <StatCard label="Incidents" value={incidents.length} />
      </div>

      {/* Recent Checks */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Checks</h2>
        {checks.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No checks yet</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {checks.map((check) => (
                  <tr key={check.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(check.checked_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge status={check.success ? 'up' : 'down'} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {check.status_code}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {check.response_ms}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incidents */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Incidents</h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No incidents</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Started</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Resolved</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Failures</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {incidents.map((incident) => {
                  const duration = incident.resolved_at
                    ? new Date(incident.resolved_at).getTime() - new Date(incident.started_at).getTime()
                    : Date.now() - new Date(incident.started_at).getTime()
                  return (
                    <tr key={incident.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(incident.started_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {incident.resolved_at ? formatDateTime(incident.resolved_at) : (
                          <span className="text-red-600 dark:text-red-400">Ongoing</span>
                        )}
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
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
