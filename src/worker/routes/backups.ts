import { Hono } from 'hono'
import type { Env } from '../index'

export const backupsRoutes = new Hono<{ Bindings: Env }>()

// Get backup heartbeats
backupsRoutes.get('/backups', async (c) => {
  const db = c.env.DB

  const heartbeats = await db.prepare(`
    SELECT * FROM backup_heartbeats
    ORDER BY site_name
  `).all()

  return c.json(heartbeats.results ?? [])
})

// Receive backup heartbeat
backupsRoutes.post('/backup-heartbeat', async (c) => {
  const body = await c.req.json()
  const db = c.env.DB

  const { site, status, timestamp } = body

  if (!site) {
    return c.json({ error: 'site is required' }, 400)
  }

  // Upsert heartbeat
  await db.prepare(`
    INSERT INTO backup_heartbeats (site_name, last_backup_at, status)
    VALUES (?, ?, ?)
    ON CONFLICT(site_name) DO UPDATE SET
      last_backup_at = excluded.last_backup_at,
      status = excluded.status
  `).bind(
    site,
    timestamp ?? new Date().toISOString(),
    status ?? 'success'
  ).run()

  return c.json({ success: true })
})
