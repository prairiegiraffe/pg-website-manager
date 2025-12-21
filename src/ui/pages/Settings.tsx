import { useState } from 'react'
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'

const MONITOR_SECRET = '7228be0cce9a70964367d56fbb8f43b9384b7abd7a3f256238c9e3f235bc9eec'

export default function Settings() {
  const [copied, setCopied] = useState<string | null>(null)

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure alerting and system settings
        </p>
      </div>

      {/* Cloudflare WAF Setup */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-900/20">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cloudflare WAF Setup</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          If a monitored site uses Cloudflare and shows false 403 errors, add a WAF custom rule to allow the uptime monitor.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monitor Secret Key
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-white px-3 py-2 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100 font-mono border border-gray-200 dark:border-gray-700 overflow-x-auto">
                {MONITOR_SECRET}
              </code>
              <button
                onClick={() => copyToClipboard(MONITOR_SECRET, 'secret')}
                className="shrink-0 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                {copied === 'secret' ? <CheckIcon className="size-5 text-green-600" /> : <ClipboardIcon className="size-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              WAF Rule Expression
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-white px-3 py-2 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100 font-mono border border-gray-200 dark:border-gray-700 overflow-x-auto">
                {`(any(http.request.headers["x-monitor-key"][*] eq "${MONITOR_SECRET}"))`}
              </code>
              <button
                onClick={() => copyToClipboard(`(any(http.request.headers["x-monitor-key"][*] eq "${MONITOR_SECRET}"))`, 'expression')}
                className="shrink-0 rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                {copied === 'expression' ? <CheckIcon className="size-5 text-green-600" /> : <ClipboardIcon className="size-5" />}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-md bg-white p-4 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Setup Steps:</h3>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
              <li>Go to Cloudflare dashboard for your domain</li>
              <li>Navigate to <strong>Security</strong> → <strong>WAF</strong> → <strong>Custom rules</strong></li>
              <li>Click <strong>Create rule</strong></li>
              <li>Name it "Allow Uptime Monitor"</li>
              <li>Click <strong>Edit expression</strong> and paste the expression above</li>
              <li>Set action to <strong>Skip</strong> and check all bypass options</li>
              <li>Deploy and drag the rule to the top of your rules list</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuration</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Settings are configured via Cloudflare secrets. Use the Wrangler CLI to update:
        </p>
        <div className="mt-4 rounded-md bg-gray-50 p-4 dark:bg-gray-900">
          <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
{`# Slack webhook for alerts
wrangler secret put SLACK_WEBHOOK_URL

# AWS SES credentials for email alerts
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
wrangler secret put AWS_REGION

# Alert email addresses
wrangler secret put ALERT_FROM_EMAIL
wrangler secret put ALERT_TO_EMAIL`}
          </pre>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cloudflare Access</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Authentication is handled by Cloudflare Access. Configure access policies in the
          Cloudflare Zero Trust dashboard.
        </p>
        <a
          href="https://one.dash.cloudflare.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Open Cloudflare Zero Trust Dashboard
          <svg className="ml-1 size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Backup Script</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure the backup script on your Cloudways server. See the README for setup instructions.
        </p>
        <div className="mt-4 rounded-md bg-gray-50 p-4 dark:bg-gray-900">
          <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
{`# Example cron entry (daily at 3am)
0 3 * * * /path/to/pg-backup-wp.sh >> /var/log/pg-backup.log 2>&1`}
          </pre>
        </div>
      </div>
    </div>
  )
}
