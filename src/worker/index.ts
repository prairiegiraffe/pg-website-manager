import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sitesRoutes } from './routes/sites'
import { checksRoutes } from './routes/checks'
import { incidentsRoutes } from './routes/incidents'
import { backupsRoutes } from './routes/backups'
import { statsRoutes } from './routes/stats'
import { cronHandler } from './services/cron'

export interface Env {
  DB: D1Database
  SLACK_WEBHOOK_URL?: string
  AWS_ACCESS_KEY_ID?: string
  AWS_SECRET_ACCESS_KEY?: string
  AWS_REGION?: string
  ALERT_FROM_EMAIL?: string
  ALERT_TO_EMAIL?: string
  ENVIRONMENT?: string
}

const app = new Hono<{ Bindings: Env }>()

// CORS for local development
app.use('/api/*', cors())

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Mount routes
app.route('/api', sitesRoutes)
app.route('/api', checksRoutes)
app.route('/api', incidentsRoutes)
app.route('/api', backupsRoutes)
app.route('/api', statsRoutes)

// Serve SPA for non-API routes
app.get('*', async (c) => {
  // In production, this would serve from the static assets
  // For now, return the HTML shell
  return c.html(`
    <!DOCTYPE html>
    <html lang="en" class="h-full bg-white dark:bg-gray-900">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>PG Website Manager</title>
        <script type="module" crossorigin src="/assets/index.js"></script>
        <link rel="stylesheet" crossorigin href="/assets/index.css">
      </head>
      <body class="h-full">
        <div id="root"></div>
      </body>
    </html>
  `)
})

export default {
  fetch: app.fetch,

  // Cron trigger for uptime checks
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(cronHandler(env))
  },
}
