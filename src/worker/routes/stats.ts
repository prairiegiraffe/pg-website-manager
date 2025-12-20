import { Hono } from 'hono'
import type { Env } from '../index'

export const statsRoutes = new Hono<{ Bindings: Env }>()

// Get dashboard stats
statsRoutes.get('/stats', async (c) => {
  const db = c.env.DB

  // Total sites
  const totalSites = await db.prepare('SELECT COUNT(*) as count FROM sites WHERE is_active = 1').first<{ count: number }>()

  // Sites up/down (based on last check)
  const siteStatus = await db.prepare(`
    SELECT
      SUM(CASE WHEN last_check.success = 1 THEN 1 ELSE 0 END) as sites_up,
      SUM(CASE WHEN last_check.success = 0 THEN 1 ELSE 0 END) as sites_down
    FROM sites s
    LEFT JOIN (
      SELECT site_id, success
      FROM checks c1
      WHERE checked_at = (SELECT MAX(checked_at) FROM checks c2 WHERE c2.site_id = c1.site_id)
    ) last_check ON s.id = last_check.site_id
    WHERE s.is_active = 1
  `).first<{ sites_up: number; sites_down: number }>()

  // Active incidents
  const activeIncidents = await db.prepare('SELECT COUNT(*) as count FROM incidents WHERE resolved_at IS NULL').first<{ count: number }>()

  // Uptime percentage (last 24 hours)
  const uptimeStats = await db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful
    FROM checks
    WHERE checked_at >= datetime('now', '-24 hours')
  `).first<{ total: number; successful: number }>()

  const uptimePercentage = uptimeStats && uptimeStats.total > 0
    ? (uptimeStats.successful / uptimeStats.total) * 100
    : 100

  return c.json({
    total_sites: totalSites?.count ?? 0,
    sites_up: siteStatus?.sites_up ?? 0,
    sites_down: siteStatus?.sites_down ?? 0,
    active_incidents: activeIncidents?.count ?? 0,
    uptime_percentage: uptimePercentage,
  })
})
