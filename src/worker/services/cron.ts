import type { Env } from '../index'
import { sendSlackAlert } from './slack'
import { sendEmailAlert } from './ses'

interface Site {
  id: number
  name: string
  url: string
  check_interval: number
  timeout_ms: number
  expected_status: number
  accept_2xx: number
  skip_cache_buster: number
  keyword: string | null
  alert_after_failures: number
  slow_threshold_ms: number | null
}

// Default slow threshold if not set per-site (3 seconds)
const DEFAULT_SLOW_THRESHOLD_MS = 3000

// Add cache-busting query param to URL
function addCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_cb=${Date.now()}`
}

interface SiteStatus {
  site_id: number
  consecutive_failures: number
  last_check_success: number | null
}

// Retention period for check data (7 days)
const RETENTION_DAYS = 7

export async function cronHandler(env: Env): Promise<void> {
  const db = env.DB

  // Get all active sites that need checking based on their interval
  // Check if enough time has passed since last check
  const sitesResult = await db.prepare(`
    SELECT s.* FROM sites s
    LEFT JOIN (
      SELECT site_id, MAX(checked_at) as last_checked
      FROM checks
      GROUP BY site_id
    ) c ON s.id = c.site_id
    WHERE s.is_active = 1
    AND (
      c.last_checked IS NULL
      OR datetime(c.last_checked, '+' || s.check_interval || ' minutes') <= datetime('now')
    )
  `).all<Site>()

  const sites = sitesResult.results ?? []

  console.log(`[CRON] Checking ${sites.length} sites (due for check)`)

  for (const site of sites) {
    try {
      await checkSite(site, env)
    } catch (err) {
      console.error(`[CRON] Error checking site ${site.name}:`, err)
    }
  }

  // Run cleanup periodically (every run is fine, query is fast with indexes)
  await cleanupOldData(env)
}

// Delete old check data and resolved incidents to prevent database bloat
async function cleanupOldData(env: Env): Promise<void> {
  const db = env.DB

  try {
    // Delete checks older than retention period
    const checksResult = await db.prepare(`
      DELETE FROM checks WHERE checked_at < datetime('now', '-${RETENTION_DAYS} days')
    `).run()

    // Delete resolved incidents older than retention period
    const incidentsResult = await db.prepare(`
      DELETE FROM incidents
      WHERE resolved_at IS NOT NULL
      AND resolved_at < datetime('now', '-${RETENTION_DAYS} days')
    `).run()

    const checksDeleted = checksResult.meta.changes ?? 0
    const incidentsDeleted = incidentsResult.meta.changes ?? 0

    if (checksDeleted > 0 || incidentsDeleted > 0) {
      console.log(`[CLEANUP] Deleted ${checksDeleted} old checks, ${incidentsDeleted} old incidents`)
    }
  } catch (err) {
    console.error('[CLEANUP] Error during cleanup:', err)
  }
}

// Browser-like headers to avoid bot blocking
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Cache-Control': 'no-cache',
}

// Build request headers, including monitor secret if configured
function getRequestHeaders(env: Env): Record<string, string> {
  const headers = { ...BROWSER_HEADERS }
  if (env.MONITOR_SECRET) {
    headers['X-Monitor-Key'] = env.MONITOR_SECRET
  }
  return headers
}

async function checkSite(site: Site, env: Env): Promise<void> {
  const db = env.DB
  const startTime = Date.now()
  let success = false
  let statusCode = 0
  let errorMessage: string | null = null
  let isDegraded = false

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), site.timeout_ms)

    // Add cache-busting to bypass CDN caches and get fresh origin response
    // Unless skip_cache_buster is enabled for this site (some sites have issues with it)
    const urlToFetch = site.skip_cache_buster ? site.url : addCacheBuster(site.url)

    // Always use GET - HEAD requests are more likely to be blocked by bot protection
    const response = await fetch(urlToFetch, {
      method: 'GET',
      signal: controller.signal,
      headers: getRequestHeaders(env),
    })

    clearTimeout(timeout)
    statusCode = response.status

    // Check status code - either exact match or any 2xx if accept_2xx is enabled
    if (site.accept_2xx) {
      success = statusCode >= 200 && statusCode < 300
      if (!success) {
        errorMessage = `Expected 2xx, got ${statusCode}`
      }
    } else {
      success = statusCode === site.expected_status
      if (!success) {
        errorMessage = `Expected ${site.expected_status}, got ${statusCode}`
      }
    }

    // Keyword check if configured
    if (success && site.keyword) {
      const text = await response.text()
      success = text.includes(site.keyword)
      if (!success) {
        errorMessage = `Keyword "${site.keyword}" not found in response`
        console.log(`[CHECK] ${site.name} - ${errorMessage}`)
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    // Provide more descriptive error messages
    if (errMsg.includes('aborted')) {
      errorMessage = `Timeout after ${site.timeout_ms}ms`
    } else if (errMsg.includes('ENOTFOUND') || errMsg.includes('getaddrinfo')) {
      errorMessage = `DNS resolution failed`
    } else if (errMsg.includes('ECONNREFUSED')) {
      errorMessage = `Connection refused`
    } else if (errMsg.includes('ECONNRESET')) {
      errorMessage = `Connection reset`
    } else if (errMsg.includes('certificate')) {
      errorMessage = `SSL/TLS certificate error: ${errMsg}`
    } else {
      errorMessage = errMsg
    }
    console.log(`[CHECK] ${site.name} - Error: ${errorMessage}`)
    success = false
    statusCode = 0
  }

  const responseMs = Date.now() - startTime

  // Check if response is slow (degraded) but still successful
  const slowThreshold = site.slow_threshold_ms ?? DEFAULT_SLOW_THRESHOLD_MS
  if (success && responseMs > slowThreshold) {
    isDegraded = true
    errorMessage = `Slow response: ${responseMs}ms (threshold: ${slowThreshold}ms)`
  }

  // Store check result with error message and degraded flag
  await db.prepare(`
    INSERT INTO checks (site_id, status_code, response_ms, success, error_message, is_degraded)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(site.id, statusCode, responseMs, success ? 1 : 0, errorMessage, isDegraded ? 1 : 0).run()

  const statusLabel = success ? (isDegraded ? 'DEGRADED' : 'UP') : 'DOWN'
  console.log(`[CHECK] ${site.name} - ${statusLabel} (${statusCode}) ${responseMs}ms${errorMessage ? ` - ${errorMessage}` : ''}`)

  // Update site status and handle incidents
  await updateSiteStatus(site, success, statusCode, env)
}

async function updateSiteStatus(site: Site, success: boolean, statusCode: number, env: Env): Promise<void> {
  const db = env.DB

  // Get current status
  let siteStatus = await db.prepare(`
    SELECT * FROM site_status WHERE site_id = ?
  `).bind(site.id).first<SiteStatus>()

  if (!siteStatus) {
    // Initialize if not exists
    await db.prepare(`
      INSERT INTO site_status (site_id, consecutive_failures, last_check_success)
      VALUES (?, 0, NULL)
    `).bind(site.id).run()
    siteStatus = { site_id: site.id, consecutive_failures: 0, last_check_success: null }
  }

  const wasDown = siteStatus.consecutive_failures >= site.alert_after_failures

  if (success) {
    // Site is up
    if (wasDown) {
      // Recovery - resolve incident and send recovery alert
      await db.prepare(`
        UPDATE incidents SET resolved_at = datetime('now')
        WHERE site_id = ? AND resolved_at IS NULL
      `).bind(site.id).run()

      await sendRecoveryAlerts(site, siteStatus.consecutive_failures, env)
    }

    // Reset failure count
    await db.prepare(`
      UPDATE site_status SET consecutive_failures = 0, last_check_success = 1
      WHERE site_id = ?
    `).bind(site.id).run()
  } else {
    // Site is down
    const newFailureCount = siteStatus.consecutive_failures + 1

    await db.prepare(`
      UPDATE site_status SET consecutive_failures = ?, last_check_success = 0
      WHERE site_id = ?
    `).bind(newFailureCount, site.id).run()

    if (newFailureCount >= site.alert_after_failures) {
      if (!wasDown) {
        // Just crossed threshold - create incident and send alert
        await db.prepare(`
          INSERT INTO incidents (site_id, failure_count, last_status_code)
          VALUES (?, ?, ?)
        `).bind(site.id, newFailureCount, statusCode).run()

        await sendDownAlerts(site, newFailureCount, statusCode, env)
      } else {
        // Update existing incident
        await db.prepare(`
          UPDATE incidents SET failure_count = ?, last_status_code = ?
          WHERE site_id = ? AND resolved_at IS NULL
        `).bind(newFailureCount, statusCode, site.id).run()
      }
    }
  }
}

async function sendDownAlerts(site: Site, failureCount: number, statusCode: number, env: Env): Promise<void> {
  console.log(`[ALERT] Sending DOWN alerts for ${site.name}`)

  const message = {
    site: site.name,
    url: site.url,
    status: 'down',
    statusCode,
    failureCount,
    timestamp: new Date().toISOString(),
  }

  // Send Slack alert
  if (env.SLACK_WEBHOOK_URL) {
    try {
      await sendSlackAlert(env.SLACK_WEBHOOK_URL, {
        text: `🚨 *Site Down: ${site.name}*`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🚨 *Site Down: ${site.name}*\n\nURL: ${site.url}\nStatus Code: ${statusCode}\nFailures: ${failureCount}\nTime: ${message.timestamp}`,
            },
          },
        ],
      })
    } catch (err) {
      console.error('[ALERT] Slack error:', err)
    }
  }

  // Send email alert
  if (env.AWS_ACCESS_KEY_ID && env.ALERT_TO_EMAIL) {
    try {
      await sendEmailAlert(env, {
        subject: `🚨 Site Down: ${site.name}`,
        body: `Site ${site.name} is down.\n\nURL: ${site.url}\nStatus Code: ${statusCode}\nConsecutive Failures: ${failureCount}\nTime: ${message.timestamp}`,
      })
    } catch (err) {
      console.error('[ALERT] Email error:', err)
    }
  }
}

async function sendRecoveryAlerts(site: Site, previousFailures: number, env: Env): Promise<void> {
  console.log(`[ALERT] Sending RECOVERY alerts for ${site.name}`)

  const message = {
    site: site.name,
    url: site.url,
    status: 'up',
    previousFailures,
    timestamp: new Date().toISOString(),
  }

  // Send Slack alert
  if (env.SLACK_WEBHOOK_URL) {
    try {
      await sendSlackAlert(env.SLACK_WEBHOOK_URL, {
        text: `✅ *Site Recovered: ${site.name}*`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Site Recovered: ${site.name}*\n\nURL: ${site.url}\nPrevious Failures: ${previousFailures}\nTime: ${message.timestamp}`,
            },
          },
        ],
      })
    } catch (err) {
      console.error('[ALERT] Slack error:', err)
    }
  }

  // Send email alert
  if (env.AWS_ACCESS_KEY_ID && env.ALERT_TO_EMAIL) {
    try {
      await sendEmailAlert(env, {
        subject: `✅ Site Recovered: ${site.name}`,
        body: `Site ${site.name} has recovered.\n\nURL: ${site.url}\nPrevious Consecutive Failures: ${previousFailures}\nTime: ${message.timestamp}`,
      })
    } catch (err) {
      console.error('[ALERT] Email error:', err)
    }
  }
}
