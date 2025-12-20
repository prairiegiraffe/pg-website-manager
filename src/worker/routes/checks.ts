import { Hono } from 'hono'
import type { Env } from '../index'

export const checksRoutes = new Hono<{ Bindings: Env }>()

// Get checks for a site
checksRoutes.get('/sites/:id/checks', async (c) => {
  const id = c.req.param('id')
  const limit = parseInt(c.req.query('limit') ?? '50')
  const db = c.env.DB

  const checks = await db.prepare(`
    SELECT * FROM checks
    WHERE site_id = ?
    ORDER BY checked_at DESC
    LIMIT ?
  `).bind(id, limit).all()

  const result = checks.results?.map((check: Record<string, unknown>) => ({
    ...check,
    success: Boolean(check.success),
  }))

  return c.json(result ?? [])
})
