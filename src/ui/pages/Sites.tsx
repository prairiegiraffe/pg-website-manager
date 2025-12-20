import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon } from '@heroicons/react/24/outline'
import { api, Site } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import SiteModal from '../components/SiteModal'
import { timeAgo } from '../lib/utils'

export default function Sites() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)

  async function loadSites() {
    try {
      const data = await api.getSites()
      setSites(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sites')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSites()
  }, [])

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
    loadSites()
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this site?')) return
    await api.deleteSite(id)
    loadSites()
  }

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading...</div>
  }

  if (error) {
    return <div className="text-red-600 dark:text-red-400">Error: {error}</div>
  }

  return (
    <div className="space-y-6">
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

      {sites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No sites yet. Add your first site to start monitoring.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">URL</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Response</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Last Check</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {sites.map((site) => (
                <tr key={site.id}>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link to={`/sites/${site.id}`} className="font-medium text-gray-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">
                      {site.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {site.url}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={site.current_status ?? 'unknown'} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {site.last_response_ms !== undefined ? `${site.last_response_ms}ms` : '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {site.last_checked_at ? timeAgo(site.last_checked_at) : 'never'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
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
      )}

      <SiteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        site={editingSite}
      />
    </div>
  )
}
