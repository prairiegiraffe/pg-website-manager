export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure alerting and system settings
        </p>
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
