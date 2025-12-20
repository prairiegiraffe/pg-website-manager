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
  keyword: string | null
  alert_after_failures: number
}

interface SiteStatus {
  site_id: number
  consecutive_failures: number
  last_check_success: number | null
}

export async function cronHandler(env: Env): Promise<void> {
  const db = env.DB

  // Get all active sites
  const sitesResult = await db.prepare(`
    SELECT * FROM sites WHERE is_active = 1
  `).all<Site>()

  const sites = sitesResult.results ?? []

  console.log(`[CRON] Checking ${sites.length} sites`)

  for (const site of sites) {
    try {
      await checkSite(site, env)
    } catch (err) {
      console.error(`[CRON] Error checking site ${site.name}:`, err)
    }
  }
}

async function checkSite(site: Site, env: Env): Promise<void> {
  const db = env.DB
  const startTime = Date.now()
  let success = false
  let statusCode = 0

  try {
    // Try HEAD first, fallback to GET
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), site.timeout_ms)

    let response: Response
    try {
      response = await fetch(site.url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'PG-Uptime-Monitor/1.0',
          'Cache-Control': 'no-cache',
        },
      })
    } catch {
      // Fallback to GET for servers that don't support HEAD
      response = await fetch(site.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'PG-Uptime-Monitor/1.0',
          'Cache-Control': 'no-cache',
        },
      })
    }

    clearTimeout(timeout)
    statusCode = response.status

    // Check status code
    success = statusCode === site.expected_status

    // Keyword check if configured and using GET
    if (success && site.keyword) {
      const text = await response.text()
      success = text.includes(site.keyword)
    }
  } catch (err) {
    console.log(`[CHECK] ${site.name} - Error: ${err}`)
    success = false
    statusCode = 0
  }

  const responseMs = Date.now() - startTime

  // Store check result
  await db.prepare(`
    INSERT INTO checks (site_id, status_code, response_ms, success)
    VALUES (?, ?, ?, ?)
  `).bind(site.id, statusCode, responseMs, success ? 1 : 0).run()

  console.log(`[CHECK] ${site.name} - ${success ? 'UP' : 'DOWN'} (${statusCode}) ${responseMs}ms`)

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
