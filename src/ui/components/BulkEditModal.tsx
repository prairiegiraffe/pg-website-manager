import { Fragment, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Site } from '../lib/api'

interface BulkEditModalProps {
  open: boolean
  onClose: () => void
  onSave: (updates: Partial<Site>) => Promise<void>
  selectedCount: number
}

interface FieldState {
  enabled: boolean
  value: number | boolean
}

export default function BulkEditModal({ open, onClose, onSave, selectedCount }: BulkEditModalProps) {
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState<{
    check_interval: FieldState
    timeout_ms: FieldState
    expected_status: FieldState
    accept_2xx: FieldState
    skip_cache_buster: FieldState
    no_follow_redirects: FieldState
    alert_after_failures: FieldState
    is_active: FieldState
  }>({
    check_interval: { enabled: false, value: 5 },
    timeout_ms: { enabled: false, value: 5000 },
    expected_status: { enabled: false, value: 200 },
    accept_2xx: { enabled: false, value: false },
    skip_cache_buster: { enabled: false, value: false },
    no_follow_redirects: { enabled: false, value: false },
    alert_after_failures: { enabled: false, value: 3 },
    is_active: { enabled: false, value: true },
  })

  function resetFields() {
    setFields({
      check_interval: { enabled: false, value: 5 },
      timeout_ms: { enabled: false, value: 5000 },
      expected_status: { enabled: false, value: 200 },
      accept_2xx: { enabled: false, value: false },
      skip_cache_buster: { enabled: false, value: false },
      no_follow_redirects: { enabled: false, value: false },
      alert_after_failures: { enabled: false, value: 3 },
      is_active: { enabled: false, value: true },
    })
  }

  function handleClose() {
    resetFields()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const updates: Partial<Site> = {}
      if (fields.check_interval.enabled) updates.check_interval = fields.check_interval.value as number
      if (fields.timeout_ms.enabled) updates.timeout_ms = fields.timeout_ms.value as number
      if (fields.expected_status.enabled) updates.expected_status = fields.expected_status.value as number
      if (fields.accept_2xx.enabled) updates.accept_2xx = fields.accept_2xx.value as boolean
      if (fields.skip_cache_buster.enabled) updates.skip_cache_buster = fields.skip_cache_buster.value as boolean
      if (fields.no_follow_redirects.enabled) updates.no_follow_redirects = fields.no_follow_redirects.value as boolean
      if (fields.alert_after_failures.enabled) updates.alert_after_failures = fields.alert_after_failures.value as number
      if (fields.is_active.enabled) updates.is_active = fields.is_active.value as boolean

      await onSave(updates)
      resetFields()
    } finally {
      setSaving(false)
    }
  }

  function toggleField(field: keyof typeof fields) {
    setFields(prev => {
      const isBoolean = typeof prev[field].value === 'boolean'
      const wasEnabled = prev[field].enabled
      // For boolean fields, when enabling, also set value to true for convenience
      const newValue = isBoolean && !wasEnabled ? true : prev[field].value
      return {
        ...prev,
        [field]: { enabled: !wasEnabled, value: newValue }
      }
    })
  }

  function updateValue(field: keyof typeof fields, value: number | boolean) {
    setFields(prev => ({
      ...prev,
      [field]: { ...prev[field], value }
    }))
  }

  const hasEnabledFields = Object.values(fields).some(f => f.enabled)

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
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
                    onClick={handleClose}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 dark:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="size-6" aria-hidden="true" />
                  </button>
                </div>

                <DialogTitle as="h3" className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                  Edit {selectedCount} Site{selectedCount !== 1 ? 's' : ''}
                </DialogTitle>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Check the fields you want to update. Unchecked fields will remain unchanged.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {/* Check Interval */}
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="enable_check_interval"
                      checked={fields.check_interval.enabled}
                      onChange={() => toggleField('check_interval')}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <div className="flex-1">
                      <label htmlFor="check_interval" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Check Interval (min)
                      </label>
                      <input
                        type="number"
                        id="check_interval"
                        min={1}
                        value={fields.check_interval.value as number}
                        onChange={(e) => updateValue('check_interval', parseInt(e.target.value))}
                        disabled={!fields.check_interval.enabled}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Timeout */}
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="enable_timeout_ms"
                      checked={fields.timeout_ms.enabled}
                      onChange={() => toggleField('timeout_ms')}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <div className="flex-1">
                      <label htmlFor="timeout_ms" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Timeout (ms)
                      </label>
                      <input
                        type="number"
                        id="timeout_ms"
                        min={1000}
                        step={1000}
                        value={fields.timeout_ms.value as number}
                        onChange={(e) => updateValue('timeout_ms', parseInt(e.target.value))}
                        disabled={!fields.timeout_ms.enabled}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Expected Status */}
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="enable_expected_status"
                      checked={fields.expected_status.enabled}
                      onChange={() => toggleField('expected_status')}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <div className="flex-1">
                      <label htmlFor="expected_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Expected Status
                      </label>
                      <input
                        type="number"
                        id="expected_status"
                        min={100}
                        max={599}
                        value={fields.expected_status.value as number}
                        onChange={(e) => updateValue('expected_status', parseInt(e.target.value))}
                        disabled={!fields.expected_status.enabled || fields.accept_2xx.value as boolean}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Alert After Failures */}
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="enable_alert_after_failures"
                      checked={fields.alert_after_failures.enabled}
                      onChange={() => toggleField('alert_after_failures')}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <div className="flex-1">
                      <label htmlFor="alert_after_failures" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Alert After Failures
                      </label>
                      <input
                        type="number"
                        id="alert_after_failures"
                        min={1}
                        value={fields.alert_after_failures.value as number}
                        onChange={(e) => updateValue('alert_after_failures', parseInt(e.target.value))}
                        disabled={!fields.alert_after_failures.enabled}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Accept 2xx */}
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="enable_accept_2xx"
                      checked={fields.accept_2xx.enabled}
                      onChange={() => toggleField('accept_2xx')}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <div className="flex-1 flex items-center">
                      <input
                        type="checkbox"
                        id="accept_2xx"
                        checked={fields.accept_2xx.value as boolean}
                        onChange={(e) => updateValue('accept_2xx', e.target.checked)}
                        disabled={!fields.accept_2xx.enabled}
                        className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label htmlFor="accept_2xx" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Accept any 2xx status (200-299)
                      </label>
                    </div>
                  </div>

                  {/* Skip Cache Buster */}
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="enable_skip_cache_buster"
                      checked={fields.skip_cache_buster.enabled}
                      onChange={() => toggleField('skip_cache_buster')}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <div className="flex-1 flex items-center">
                      <input
                        type="checkbox"
                        id="skip_cache_buster"
                        checked={fields.skip_cache_buster.value as boolean}
                        onChange={(e) => updateValue('skip_cache_buster', e.target.checked)}
                        disabled={!fields.skip_cache_buster.enabled}
                        className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label htmlFor="skip_cache_buster" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Skip cache-buster
                      </label>
                    </div>
                  </div>

                  {/* No Follow Redirects */}
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="enable_no_follow_redirects"
                      checked={fields.no_follow_redirects.enabled}
                      onChange={() => toggleField('no_follow_redirects')}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <div className="flex-1 flex items-center">
                      <input
                        type="checkbox"
                        id="no_follow_redirects"
                        checked={fields.no_follow_redirects.value as boolean}
                        onChange={(e) => updateValue('no_follow_redirects', e.target.checked)}
                        disabled={!fields.no_follow_redirects.enabled}
                        className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label htmlFor="no_follow_redirects" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Don't follow redirects
                      </label>
                    </div>
                  </div>

                  {/* Active */}
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id="enable_is_active"
                      checked={fields.is_active.enabled}
                      onChange={() => toggleField('is_active')}
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <div className="flex-1 flex items-center">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={fields.is_active.value as boolean}
                        onChange={(e) => updateValue('is_active', e.target.checked)}
                        disabled={!fields.is_active.enabled}
                        className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Active
                      </label>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !hasEnabledFields}
                      className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Applying...' : 'Apply Changes'}
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
