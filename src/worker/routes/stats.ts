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

// Get aggregate response time chart data for all sites
statsRoutes.get('/stats/chart', async (c) => {
  const period = c.req.query('period') ?? '24h'
  const db = c.env.DB

  if (period === '24h') {
    // Hourly aggregates across all sites
    const hourlyStats = await db.prepare(`
      SELECT
        strftime('%Y-%m-%d %H:00:00', checked_at) as hour,
        AVG(response_ms) as avg_response,
        MIN(response_ms) as min_response,
        MAX(response_ms) as max_response,
        COUNT(*) as total_checks,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_checks,
        COUNT(DISTINCT site_id) as sites_checked
      FROM checks
      WHERE checked_at >= datetime('now', '-24 hours')
      GROUP BY strftime('%Y-%m-%d %H:00:00', checked_at)
      ORDER BY hour ASC
    `).all()

    return c.json({
      period: '24h',
      data: hourlyStats.results?.map((row: Record<string, unknown>) => ({
        time: row.hour,
        avgResponse: Math.round(row.avg_response as number),
        minResponse: row.min_response,
        maxResponse: row.max_response,
        totalChecks: row.total_checks,
        successfulChecks: row.successful_checks,
        sitesChecked: row.sites_checked,
        uptime: ((row.successful_checks as number) / (row.total_checks as number) * 100).toFixed(1),
      })) ?? [],
    })
  } else {
    // Daily aggregates
    const dailyStats = await db.prepare(`
      SELECT
        date(checked_at) as day,
        AVG(response_ms) as avg_response,
        MIN(response_ms) as min_response,
        MAX(response_ms) as max_response,
        COUNT(*) as total_checks,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_checks,
        COUNT(DISTINCT site_id) as sites_checked
      FROM checks
      WHERE checked_at >= datetime('now', '-30 days')
      GROUP BY date(checked_at)
      ORDER BY day ASC
    `).all()

    return c.json({
      period: '30d',
      data: dailyStats.results?.map((row: Record<string, unknown>) => ({
        time: row.day,
        avgResponse: Math.round(row.avg_response as number),
        minResponse: row.min_response,
        maxResponse: row.max_response,
        totalChecks: row.total_checks,
        successfulChecks: row.successful_checks,
        sitesChecked: row.sites_checked,
        uptime: ((row.successful_checks as number) / (row.total_checks as number) * 100).toFixed(1),
      })) ?? [],
    })
  }
})

// Get per-site response averages for comparison chart
statsRoutes.get('/stats/sites-comparison', async (c) => {
  const db = c.env.DB

  // Simplified query - get stats from checks in last 24h only
  const siteStats = await db.prepare(`
    SELECT
      s.id,
      s.name,
      s.url,
      COALESCE(stats.avg_response, 0) as avg_response,
      COALESCE(stats.total_checks, 0) as total_checks,
      COALESCE(stats.successful_checks, 0) as successful_checks,
      COALESCE(stats.last_success, 1) as last_success
    FROM sites s
    LEFT JOIN (
      SELECT
        site_id,
        AVG(response_ms) as avg_response,
        COUNT(*) as total_checks,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_checks,
        (SELECT success FROM checks c2 WHERE c2.site_id = checks.site_id ORDER BY checked_at DESC LIMIT 1) as last_success
      FROM checks
      WHERE checked_at >= datetime('now', '-24 hours')
      GROUP BY site_id
    ) stats ON s.id = stats.site_id
    WHERE s.is_active = 1
    ORDER BY avg_response DESC
  `).all()

  return c.json(siteStats.results?.map((row: Record<string, unknown>) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    avgResponse: row.avg_response ? Math.round(row.avg_response as number) : 0,
    totalChecks: row.total_checks ?? 0,
    successfulChecks: row.successful_checks ?? 0,
    uptime: row.total_checks ? ((row.successful_checks as number) / (row.total_checks as number) * 100).toFixed(1) : '100',
    currentStatus: row.last_success ? 'up' : 'down',
  })) ?? [])
})
