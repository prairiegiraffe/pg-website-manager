import { Hono } from 'hono'
import type { Env } from '../index'

export const incidentsRoutes = new Hono<{ Bindings: Env }>()

// Get incidents
incidentsRoutes.get('/incidents', async (c) => {
  const active = c.req.query('active')
  const siteId = c.req.query('site_id')
  const db = c.env.DB

  let query = `
    SELECT i.*, s.name as site_name
    FROM incidents i
    JOIN sites s ON i.site_id = s.id
  `
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (active === 'true') {
    conditions.push('i.resolved_at IS NULL')
  } else if (active === 'false') {
    conditions.push('i.resolved_at IS NOT NULL')
  }

  if (siteId) {
    conditions.push('i.site_id = ?')
    params.push(parseInt(siteId))
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }

  query += ' ORDER BY i.started_at DESC LIMIT 100'

  const stmt = db.prepare(query)
  const incidents = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all()

  return c.json(incidents.results ?? [])
})
