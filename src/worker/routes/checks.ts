import { Hono } from 'hono'
import type { Env } from '../index'

export const checksRoutes = new Hono<{ Bindings: Env }>()

// Get aggregated stats for charts (hourly data for last 24h, daily for last 30d)
checksRoutes.get('/sites/:id/stats/chart', async (c) => {
  const id = c.req.param('id')
  const period = c.req.query('period') ?? '24h' // '24h' or '30d'
  const db = c.env.DB

  if (period === '24h') {
    // Hourly data for last 24 hours
    const hourlyStats = await db.prepare(`
      SELECT
        strftime('%Y-%m-%d %H:00:00', checked_at) as hour,
        AVG(response_ms) as avg_response,
        MIN(response_ms) as min_response,
        MAX(response_ms) as max_response,
        COUNT(*) as total_checks,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_checks
      FROM checks
      WHERE site_id = ?
        AND checked_at >= datetime('now', '-24 hours')
      GROUP BY strftime('%Y-%m-%d %H:00:00', checked_at)
      ORDER BY hour ASC
    `).bind(id).all()

    return c.json({
      period: '24h',
      data: hourlyStats.results?.map((row: Record<string, unknown>) => ({
        time: row.hour,
        avgResponse: Math.round(row.avg_response as number),
        minResponse: row.min_response,
        maxResponse: row.max_response,
        totalChecks: row.total_checks,
        successfulChecks: row.successful_checks,
        uptime: ((row.successful_checks as number) / (row.total_checks as number) * 100).toFixed(1),
      })) ?? [],
    })
  } else {
    // Daily data for last 30 days
    const dailyStats = await db.prepare(`
      SELECT
        date(checked_at) as day,
        AVG(response_ms) as avg_response,
        MIN(response_ms) as min_response,
        MAX(response_ms) as max_response,
        COUNT(*) as total_checks,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_checks
      FROM checks
      WHERE site_id = ?
        AND checked_at >= datetime('now', '-30 days')
      GROUP BY date(checked_at)
      ORDER BY day ASC
    `).bind(id).all()

    return c.json({
      period: '30d',
      data: dailyStats.results?.map((row: Record<string, unknown>) => ({
        time: row.day,
        avgResponse: Math.round(row.avg_response as number),
        minResponse: row.min_response,
        maxResponse: row.max_response,
        totalChecks: row.total_checks,
        successfulChecks: row.successful_checks,
        uptime: ((row.successful_checks as number) / (row.total_checks as number) * 100).toFixed(1),
      })) ?? [],
    })
  }
})

// Get uptime timeline (last 90 check results for visual timeline)
checksRoutes.get('/sites/:id/stats/timeline', async (c) => {
  const id = c.req.param('id')
  const db = c.env.DB

  const checks = await db.prepare(`
    SELECT
      checked_at,
      success,
      status_code,
      response_ms
    FROM checks
    WHERE site_id = ?
    ORDER BY checked_at DESC
    LIMIT 90
  `).bind(id).all()

  return c.json(checks.results?.map((check: Record<string, unknown>) => ({
    time: check.checked_at,
    success: Boolean(check.success),
    statusCode: check.status_code,
    responseMs: check.response_ms,
  })).reverse() ?? [])
})

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
