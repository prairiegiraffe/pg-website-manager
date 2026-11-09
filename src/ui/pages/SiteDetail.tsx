import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { api, Site, Check, Incident, ChartData, TimelinePoint, TestResult } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import ResponseTimeChart from '../components/ResponseTimeChart'
import UptimeChart from '../components/UptimeChart'
import UptimeTimeline from '../components/UptimeTimeline'
import { formatDateTime, formatDuration, parseDbDate } from '../lib/utils'

type ChartPeriod = '24h' | '30d'

export default function SiteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [site, setSite] = useState<Site | null>(null)
  const [checks, setChecks] = useState<Check[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [timeline, setTimeline] = useState<TimelinePoint[]>([])
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('24h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        const [siteData, checksData, incidentsData, chartDataRes, timelineData] = await Promise.all([
          api.getSite(parseInt(id)),
          api.getChecks(parseInt(id), 50),
          api.getIncidents({ site_id: parseInt(id) }),
          api.getChartData(parseInt(id), chartPeriod),
          api.getTimeline(parseInt(id)),
        ])
        setSite(siteData)
        setChecks(checksData)
        setIncidents(incidentsData)
        setChartData(chartDataRes)
        setTimeline(timelineData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load site')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, chartPeriod])

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

  const archived = site.off_reason === 'archived'
  const quietButton = 'rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'

  async function handleArchive() {
    if (!site || !window.confirm(`Archive ${site.name}? It stops being checked and leaves the list. You can restore it later.`)) return
    await api.archiveSite(site.id)
    navigate('/sites')
  }

  async function handleRestore() {
    if (!site) return
    await api.restoreSite(site.id)
    window.location.reload()
  }

  async function handleDelete() {
    if (!site || !window.confirm(`Delete ${site.name} and all its history for good? This can't be undone.`)) return
    await api.deleteSite(site.id)
    navigate('/sites')
  }

  async function handleTest() {
    if (!id) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await api.testSite(parseInt(id))
      setTestResult(result)
      // Refresh site data to get updated status
      const [siteData, checksData] = await Promise.all([
        api.getSite(parseInt(id)),
        api.getChecks(parseInt(id), 50),
      ])
      setSite(siteData)
      setChecks(checksData)
    } catch (err) {
      console.error('Test failed:', err)
    } finally {
      setTesting(false)
    }
  }

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
          <div className="flex items-center gap-3">
            {archived ? (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">Archived</span>
            ) : (
              <StatusBadge status={site.current_status ?? 'unknown'} />
            )}
            {archived ? (
              <>
                <button onClick={handleRestore} className={quietButton}>Restore</button>
                {!site.platform_project_id && !site.platform_site_id && (
                  <button onClick={handleDelete} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-400">Delete</button>
                )}
              </>
            ) : (
              <button onClick={handleArchive} className={quietButton}>Archive</button>
            )}
            {!archived && <button
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowPathIcon className={`size-4 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Testing...' : 'Re-test'}
            </button>}
          </div>
        </div>
        {testResult && (
          <div className={`mt-3 rounded-lg p-3 text-sm ${
            testResult.success
              ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
          }`}>
            <span className="font-medium">{testResult.success ? 'Success' : 'Failed'}</span>
            {' — '}
            Status: {testResult.statusCode}, Response: {testResult.responseMs}ms
            {testResult.error && <span className="ml-2">({testResult.error})</span>}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Uptime" value={`${uptimePercent}%`} />
        <StatCard label="Avg Response" value={`${avgResponse}ms`} />
        <StatCard label="Total Checks" value={checks.length} />
        <StatCard label="Incidents" value={incidents.length} />
      </div>

      {/* Uptime Timeline */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Uptime Timeline
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            (last 90 checks)
          </span>
        </h2>
        <UptimeTimeline data={timeline} />
      </div>

      {/* Charts with Period Selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Analytics</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setChartPeriod('24h')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                chartPeriod === '24h'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Last 24 Hours
            </button>
            <button
              onClick={() => setChartPeriod('30d')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                chartPeriod === '30d'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Response Time Chart */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Response Time
            </h3>
            <ResponseTimeChart data={chartData?.data ?? []} period={chartPeriod} />
            <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 bg-indigo-500"></span>
                Avg
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 bg-green-500 border-dashed border-green-500"></span>
                Min
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-0.5 bg-amber-500 border-dashed border-amber-500"></span>
                Max
              </span>
            </div>
          </div>

          {/* Uptime Chart */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Uptime Percentage
            </h3>
            <UptimeChart data={chartData?.data ?? []} period={chartPeriod} />
          </div>
        </div>
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
                    ? parseDbDate(incident.resolved_at).getTime() - parseDbDate(incident.started_at).getTime()
                    : Date.now() - parseDbDate(incident.started_at).getTime()
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
