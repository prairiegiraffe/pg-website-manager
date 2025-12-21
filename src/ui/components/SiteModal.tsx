import { Fragment, useEffect, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Site } from '../lib/api'

interface SiteModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<Site>) => Promise<void>
  site: Site | null
}

export default function SiteModal({ open, onClose, onSave, site }: SiteModalProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    check_interval: 5,
    timeout_ms: 5000,
    expected_status: 200,
    accept_2xx: false,
    keyword: '',
    alert_after_failures: 3,
    is_active: true,
  })

  useEffect(() => {
    if (site) {
      setFormData({
        name: site.name,
        url: site.url,
        check_interval: site.check_interval,
        timeout_ms: site.timeout_ms,
        expected_status: site.expected_status,
        accept_2xx: site.accept_2xx ?? false,
        keyword: site.keyword ?? '',
        alert_after_failures: site.alert_after_failures,
        is_active: site.is_active,
      })
    } else {
      setFormData({
        name: '',
        url: '',
        check_interval: 5,
        timeout_ms: 5000,
        expected_status: 200,
        accept_2xx: false,
        keyword: '',
        alert_after_failures: 3,
        is_active: true,
      })
    }
  }, [site, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        ...formData,
        keyword: formData.keyword || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/75" />
        </TransitionChild>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 dark:bg-gray-800">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 dark:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="size-6" aria-hidden="true" />
                  </button>
                </div>

                <DialogTitle as="h3" className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                  {site ? 'Edit Site' : 'Add Site'}
                </DialogTitle>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      URL
                    </label>
                    <input
                      type="url"
                      id="url"
                      required
                      placeholder="https://example.com"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="check_interval" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Check Interval (min)
                      </label>
                      <input
                        type="number"
                        id="check_interval"
                        min={1}
                        value={formData.check_interval}
                        onChange={(e) => setFormData({ ...formData, check_interval: parseInt(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label htmlFor="timeout_ms" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Timeout (ms)
                      </label>
                      <input
                        type="number"
                        id="timeout_ms"
                        min={1000}
                        step={1000}
                        value={formData.timeout_ms}
                        onChange={(e) => setFormData({ ...formData, timeout_ms: parseInt(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="expected_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Expected Status
                      </label>
                      <input
                        type="number"
                        id="expected_status"
                        min={100}
                        max={599}
                        value={formData.expected_status}
                        onChange={(e) => setFormData({ ...formData, expected_status: parseInt(e.target.value) })}
                        disabled={formData.accept_2xx}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label htmlFor="alert_after_failures" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Alert After Failures
                      </label>
                      <input
                        type="number"
                        id="alert_after_failures"
                        min={1}
                        value={formData.alert_after_failures}
                        onChange={(e) => setFormData({ ...formData, alert_after_failures: parseInt(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="accept_2xx"
                      checked={formData.accept_2xx}
                      onChange={(e) => setFormData({ ...formData, accept_2xx: e.target.checked })}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <label htmlFor="accept_2xx" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Accept any 2xx status (200-299)
                    </label>
                  </div>

                  <div>
                    <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Keyword (optional)
                    </label>
                    <input
                      type="text"
                      id="keyword"
                      placeholder="Text to search for in response"
                      value={formData.keyword}
                      onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Active
                    </label>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
