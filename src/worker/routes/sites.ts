import { Hono } from 'hono'
import type { Env } from '../index'

export const sitesRoutes = new Hono<{ Bindings: Env }>()

// Get all sites with current status
sitesRoutes.get('/sites', async (c) => {
  const db = c.env.DB

  const sites = await db.prepare(`
    SELECT
      s.*,
      (SELECT success FROM checks WHERE site_id = s.id ORDER BY checked_at DESC LIMIT 1) as last_success,
      (SELECT is_degraded FROM checks WHERE site_id = s.id ORDER BY checked_at DESC LIMIT 1) as last_is_degraded,
      (SELECT response_ms FROM checks WHERE site_id = s.id ORDER BY checked_at DESC LIMIT 1) as last_response_ms,
      (SELECT checked_at FROM checks WHERE site_id = s.id ORDER BY checked_at DESC LIMIT 1) as last_checked_at,
      (SELECT error_message FROM checks WHERE site_id = s.id ORDER BY checked_at DESC LIMIT 1) as last_error_message
    FROM sites s
    ORDER BY s.name
  `).all()

  const result = sites.results?.map((site: Record<string, unknown>) => {
    let status: 'up' | 'down' | 'degraded' | 'unknown' = 'unknown'
    if (site.last_success === null) {
      status = 'unknown'
    } else if (!site.last_success) {
      status = 'down'
    } else if (site.last_is_degraded) {
      status = 'degraded'
    } else {
      status = 'up'
    }
    return {
      ...site,
      is_active: Boolean(site.is_active),
      current_status: status,
    }
  })

  return c.json(result ?? [])
})

// Get single site
sitesRoutes.get('/sites/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB

  const site = await db.prepare(`
    SELECT
      s.*,
      (SELECT success FROM checks WHERE site_id = s.id ORDER BY checked_at DESC LIMIT 1) as last_success,
      (SELECT response_ms FROM checks WHERE site_id = s.id ORDER BY checked_at DESC LIMIT 1) as last_response_ms,
      (SELECT checked_at FROM checks WHERE site_id = s.id ORDER BY checked_at DESC LIMIT 1) as last_checked_at
    FROM sites s
    WHERE s.id = ?
  `).bind(id).first()

  if (!site) {
    return c.json({ error: 'Site not found' }, 404)
  }

  return c.json({
    ...site,
    is_active: Boolean(site.is_active),
    current_status: site.last_success === null ? 'unknown' : site.last_success ? 'up' : 'down',
  })
})

// Create site
sitesRoutes.post('/sites', async (c) => {
  const body = await c.req.json()
  const db = c.env.DB

  const result = await db.prepare(`
    INSERT INTO sites (name, url, check_interval, timeout_ms, expected_status, accept_2xx, keyword, alert_after_failures, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.name,
    body.url,
    body.check_interval ?? 5,
    body.timeout_ms ?? 5000,
    body.expected_status ?? 200,
    body.accept_2xx ? 1 : 0,
    body.keyword ?? null,
    body.alert_after_failures ?? 3,
    body.is_active !== false ? 1 : 0
  ).run()

  // Initialize site status
  await db.prepare(`
    INSERT INTO site_status (site_id, consecutive_failures, last_check_success)
    VALUES (?, 0, NULL)
  `).bind(result.meta.last_row_id).run()

  return c.json({ id: result.meta.last_row_id, ...body }, 201)
})

// Update site
sitesRoutes.put('/sites/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const db = c.env.DB

  await db.prepare(`
    UPDATE sites SET
      name = ?,
      url = ?,
      check_interval = ?,
      timeout_ms = ?,
      expected_status = ?,
      accept_2xx = ?,
      keyword = ?,
      alert_after_failures = ?,
      is_active = ?
    WHERE id = ?
  `).bind(
    body.name,
    body.url,
    body.check_interval,
    body.timeout_ms,
    body.expected_status,
    body.accept_2xx ? 1 : 0,
    body.keyword,
    body.alert_after_failures,
    body.is_active ? 1 : 0,
    id
  ).run()

  return c.json({ id: parseInt(id), ...body })
})

// Delete site
sitesRoutes.delete('/sites/:id', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB

  await db.prepare('DELETE FROM sites WHERE id = ?').bind(id).run()
  await db.prepare('DELETE FROM site_status WHERE site_id = ?').bind(id).run()

  return c.json({ success: true })
})

// Manual re-test a site
sitesRoutes.post('/sites/:id/test', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB

  // Get site details
  const site = await db.prepare('SELECT * FROM sites WHERE id = ?').bind(id).first<{
    id: number
    name: string
    url: string
    timeout_ms: number
    expected_status: number
    accept_2xx: number
    keyword: string | null
  }>()

  if (!site) {
    return c.json({ error: 'Site not found' }, 404)
  }

  const startTime = Date.now()
  let success = false
  let statusCode = 0
  let errorMessage: string | null = null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), site.timeout_ms)

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Cache-Control': 'no-cache',
    }
    // Add monitor secret header if configured
    if (c.env.MONITOR_SECRET) {
      headers['X-Monitor-Key'] = c.env.MONITOR_SECRET
    }

    const response = await fetch(site.url, {
      method: 'GET',
      signal: controller.signal,
      headers,
    })

    clearTimeout(timeout)
    statusCode = response.status

    // Check status code - either exact match or any 2xx if accept_2xx is enabled
    if (site.accept_2xx) {
      success = statusCode >= 200 && statusCode < 300
    } else {
      success = statusCode === site.expected_status
    }

    if (success && site.keyword) {
      const text = await response.text()
      success = text.includes(site.keyword)
      if (!success) {
        errorMessage = `Keyword "${site.keyword}" not found in response`
      }
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Unknown error'
    success = false
    statusCode = 0
  }

  const responseMs = Date.now() - startTime

  // Provide a descriptive error message for status code mismatches
  if (!success && !errorMessage) {
    if (site.accept_2xx) {
      errorMessage = `Expected 2xx, got ${statusCode}`
    } else if (statusCode !== site.expected_status) {
      errorMessage = `Expected ${site.expected_status}, got ${statusCode}`
    }
  }

  // Store check result
  await db.prepare(`
    INSERT INTO checks (site_id, status_code, response_ms, success, error_message)
    VALUES (?, ?, ?, ?, ?)
  `).bind(site.id, statusCode, responseMs, success ? 1 : 0, errorMessage).run()

  // Update site status
  if (success) {
    await db.prepare(`
      UPDATE site_status SET consecutive_failures = 0, last_check_success = 1
      WHERE site_id = ?
    `).bind(site.id).run()
  } else {
    await db.prepare(`
      UPDATE site_status SET consecutive_failures = consecutive_failures + 1, last_check_success = 0
      WHERE site_id = ?
    `).bind(site.id).run()
  }

  return c.json({
    success,
    statusCode,
    responseMs,
    error: errorMessage,
    checkedAt: new Date().toISOString(),
  })
})
