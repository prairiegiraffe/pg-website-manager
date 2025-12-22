import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PlusIcon, FunnelIcon, XMarkIcon, ArrowPathIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { api, Site, ChartData, SiteComparison } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import SiteModal from '../components/SiteModal'
import BulkEditModal from '../components/BulkEditModal'
import ResponseTimeChart from '../components/ResponseTimeChart'
import SitesComparisonChart from '../components/SitesComparisonChart'
import { timeAgo } from '../lib/utils'

type StatusFilter = 'all' | 'up' | 'degraded' | 'down'
type ChartPeriod = '24h' | '30d'

export default function Sites() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sites, setSites] = useState<Site[]>([])
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [sitesComparison, setSitesComparison] = useState<SiteComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [testingIds, setTestingIds] = useState<Set<number>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkModalOpen, setBulkModalOpen] = useState(false)

  // Filter state - default to 'down' if there are down sites
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get('status') as StatusFilter) || 'all'
  )
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('24h')

  async function loadData() {
    try {
      const [sitesData, chartDataRes, comparisonData] = await Promise.all([
        api.getSites(),
        api.getAggregateChart(chartPeriod),
        api.getSitesComparison(),
      ])
      setSites(sitesData)
      setChartData(chartDataRes)
      setSitesComparison(comparisonData)

      // Auto-filter to down sites if any are down and no filter is set
      const hasDownSites = sitesData.some(s => s.current_status === 'down')
      if (hasDownSites && !searchParams.get('status')) {
        setStatusFilter('down')
        setSearchParams({ status: 'down' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [chartPeriod])

  // Update URL when filter changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (searchQuery) params.set('q', searchQuery)
    setSearchParams(params)
  }, [statusFilter, searchQuery])

  // Filter sites
  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      // Status filter
      if (statusFilter === 'up' && site.current_status !== 'up') return false
      if (statusFilter === 'degraded' && site.current_status !== 'degraded') return false
      if (statusFilter === 'down' && site.current_status !== 'down') return false

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!site.name.toLowerCase().includes(query) &&
            !site.url.toLowerCase().includes(query)) {
          return false
        }
      }

      return true
    })
  }, [sites, statusFilter, searchQuery])

  // Count by status
  const statusCounts = useMemo(() => ({
    all: sites.length,
    up: sites.filter(s => s.current_status === 'up').length,
    degraded: sites.filter(s => s.current_status === 'degraded').length,
    down: sites.filter(s => s.current_status === 'down').length,
  }), [sites])

  function handleAdd() {
    setEditingSite(null)
    setModalOpen(true)
  }

  function handleEdit(site: Site) {
    setEditingSite(site)
    setModalOpen(true)
  }

  async function handleSave(data: Partial<Site>) {
    if (editingSite) {
      await api.updateSite(editingSite.id, data)
    } else {
      await api.createSite(data)
    }
    setModalOpen(false)
    loadData()
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this site?')) return
    await api.deleteSite(id)
    loadData()
  }

  async function handleTest(id: number) {
    setTestingIds(prev => new Set(prev).add(id))
    try {
      const result = await api.testSite(id)
      // Reload data to get updated status
      await loadData()
      // Show result feedback
      if (result.success) {
        alert(`Test passed! Status: ${result.statusCode}, Response: ${result.responseMs}ms`)
      } else {
        alert(`Test failed! Status: ${result.statusCode}${result.error ? `\nError: ${result.error}` : ''}`)
      }
    } catch (err) {
      alert(`Test error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setTestingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  function clearFilters() {
    setStatusFilter('all')
    setSearchQuery('')
    setSearchParams({})
  }

  const hasActiveFilters = statusFilter !== 'all' || searchQuery !== ''

  function toggleSelection(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    const filteredIds = filteredSites.map(s => s.id)
    const allSelected = filteredIds.every(id => selectedIds.has(id))
    if (allSelected) {
      // Deselect all filtered sites
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      // Select all filtered sites
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function handleBulkSave(updates: Partial<Site>) {
    await api.bulkUpdateSites([...selectedIds], updates)
    setSelectedIds(new Set())
    setBulkModalOpen(false)
    loadData()
  }

  const allFilteredSelected = filteredSites.length > 0 && filteredSites.every(s => selectedIds.has(s.id))

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading...</div>
  }

  if (error) {
    return <div className="text-red-600 dark:text-red-400">Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sites</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your monitored websites
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <PlusIcon className="-ml-0.5 size-5" aria-hidden="true" />
          Add Site
        </button>
      </div>

      {/* Aggregate Charts */}
      {sites.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Response Time Trend */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Overall Response Time
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartPeriod('24h')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    chartPeriod === '24h'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  24h
                </button>
                <button
                  onClick={() => setChartPeriod('30d')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    chartPeriod === '30d'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  30d
                </button>
              </div>
            </div>
            <ResponseTimeChart data={chartData?.data ?? []} period={chartPeriod} />
          </div>

          {/* Sites Comparison */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Site Response Times (24h avg)
            </h2>
            <div className="max-h-80 overflow-y-auto">
              <SitesComparisonChart data={sitesComparison} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Status Filter Tabs */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            All ({statusCounts.all})
          </button>
          <button
            onClick={() => setStatusFilter('up')}
            className={`px-4 py-2 text-sm font-medium border-l border-gray-200 dark:border-gray-700 transition-colors ${
              statusFilter === 'up'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            Up ({statusCounts.up})
          </button>
          {statusCounts.degraded > 0 && (
            <button
              onClick={() => setStatusFilter('degraded')}
              className={`px-4 py-2 text-sm font-medium border-l border-gray-200 dark:border-gray-700 transition-colors ${
                statusFilter === 'degraded'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Slow ({statusCounts.degraded})
            </button>
          )}
          <button
            onClick={() => setStatusFilter('down')}
            className={`px-4 py-2 text-sm font-medium border-l border-gray-200 dark:border-gray-700 transition-colors ${
              statusFilter === 'down'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            Down ({statusCounts.down})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-x-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <XMarkIcon className="size-4" />
            Clear filters
          </button>
        )}
      </div>

      {/* Down Sites Alert */}
      {statusCounts.down > 0 && statusFilter === 'all' && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-red-600 dark:text-red-400 font-medium">
                {statusCounts.down} site{statusCounts.down > 1 ? 's' : ''} currently down
              </span>
            </div>
            <button
              onClick={() => setStatusFilter('down')}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
            >
              View down sites
            </button>
          </div>
        </div>
      )}

      {/* Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-indigo-700 dark:text-indigo-300 font-medium">
              {selectedIds.size} site{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBulkModalOpen(true)}
                className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                <PencilSquareIcon className="-ml-0.5 size-4" aria-hidden="true" />
                Bulk Edit
              </button>
              <button
                onClick={clearSelection}
                className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sites List */}
      {filteredSites.length === 0 ? (
        <div className="text-center py-12">
          {sites.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No sites yet. Add your first site to start monitoring.</p>
          ) : (
            <div className="space-y-2">
              <FunnelIcon className="mx-auto size-8 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">No sites match your filters.</p>
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3">
            {filteredSites.map((site) => (
              <div
                key={site.id}
                className={`rounded-lg border p-4 ${
                  selectedIds.has(site.id)
                    ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/20'
                    : site.current_status === 'down'
                    ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                    : site.current_status === 'degraded'
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(site.id)}
                      onChange={() => toggleSelection(site.id)}
                      className="mt-1 size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/sites/${site.id}`}
                        className="font-medium text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                      >
                        {site.name}
                      </Link>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                      {site.url}
                    </p>
                    {(site.current_status === 'down' || site.current_status === 'degraded') && site.last_error_message && (
                      <p className={`mt-1 text-sm ${site.current_status === 'down' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {site.last_error_message}
                      </p>
                    )}
                    </div>
                  </div>
                  <StatusBadge status={site.current_status ?? 'unknown'} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className="flex gap-4 text-gray-500 dark:text-gray-400">
                    <span>
                      {site.last_response_ms != null ? `${site.last_response_ms}ms` : 'Awaiting first check'}
                    </span>
                    <span>
                      {site.last_checked_at ? timeAgo(site.last_checked_at) : ''}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleTest(site.id)}
                      disabled={testingIds.has(site.id)}
                      className="text-green-600 hover:text-green-900 dark:text-green-400 disabled:opacity-50"
                    >
                      {testingIds.has(site.id) ? (
                        <ArrowPathIcon className="size-4 animate-spin" />
                      ) : (
                        'Test'
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(site)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(site.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">URL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Response</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Last Check</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {filteredSites.map((site) => (
                  <tr key={site.id} className={
                    selectedIds.has(site.id) ? 'bg-indigo-50 dark:bg-indigo-900/10' :
                    site.current_status === 'down' ? 'bg-red-50 dark:bg-red-900/10' :
                    site.current_status === 'degraded' ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                  }>
                    <td className="whitespace-nowrap px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(site.id)}
                        onChange={() => toggleSelection(site.id)}
                        className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link to={`/sites/${site.id}`} className="font-medium text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">
                        {site.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {site.url}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <StatusBadge status={site.current_status ?? 'unknown'} />
                        {(site.current_status === 'down' || site.current_status === 'degraded') && site.last_error_message && (
                          <span className={`mt-1 text-xs ${site.current_status === 'down' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {site.last_error_message}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {site.last_response_ms != null ? `${site.last_response_ms}ms` : 'Awaiting check'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {site.last_checked_at ? timeAgo(site.last_checked_at) : 'Never'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                      <button
                        onClick={() => handleTest(site.id)}
                        disabled={testingIds.has(site.id)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-4 disabled:opacity-50"
                      >
                        {testingIds.has(site.id) ? (
                          <ArrowPathIcon className="size-4 animate-spin inline" />
                        ) : (
                          'Test'
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(site)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(site.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <SiteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        site={editingSite}
      />

      <BulkEditModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSave={handleBulkSave}
        selectedCount={selectedIds.size}
      />
    </div>
  )
}
