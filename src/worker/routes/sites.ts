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
      (SELECT response_ms FROM checks WHERE site_id = s.id ORDER BY checked_at DESC LIMIT 1) as last_response_ms,
      (SELECT checked_at FROM checks WHERE site_id = s.id ORDER BY checked_at DESC LIMIT 1) as last_checked_at
    FROM sites s
    ORDER BY s.name
  `).all()

  const result = sites.results?.map((site: Record<string, unknown>) => ({
    ...site,
    is_active: Boolean(site.is_active),
    current_status: site.last_success === null ? 'unknown' : site.last_success ? 'up' : 'down',
  }))

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
    INSERT INTO sites (name, url, check_interval, timeout_ms, expected_status, keyword, alert_after_failures, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.name,
    body.url,
    body.check_interval ?? 5,
    body.timeout_ms ?? 5000,
    body.expected_status ?? 200,
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
