import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getAssetFromKV, NotFoundError } from '@cloudflare/kv-asset-handler'
import { sitesRoutes } from './routes/sites'
import { checksRoutes } from './routes/checks'
import { incidentsRoutes } from './routes/incidents'
import { backupsRoutes } from './routes/backups'
import { statsRoutes } from './routes/stats'
import { cronHandler } from './services/cron'
// @ts-expect-error - injected by wrangler at build time
import manifestJSON from '__STATIC_CONTENT_MANIFEST'

const assetManifest = JSON.parse(manifestJSON)

export interface Env {
  DB: D1Database
  __STATIC_CONTENT: KVNamespace
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

async function serveAsset(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  try {
    return await getAssetFromKV(
      { request, waitUntil: ctx.waitUntil.bind(ctx) },
      {
        ASSET_NAMESPACE: env.__STATIC_CONTENT,
        ASSET_MANIFEST: assetManifest,
      }
    )
  } catch (e) {
    if (e instanceof NotFoundError) {
      // Serve index.html for SPA routing
      const indexRequest = new Request(new URL('/index.html', request.url).toString(), request)
      return await getAssetFromKV(
        { request: indexRequest, waitUntil: ctx.waitUntil.bind(ctx) },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
        }
      )
    }
    throw e
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // Handle API routes with Hono
    if (url.pathname.startsWith('/api')) {
      return app.fetch(request, env, ctx)
    }

    // Serve static assets
    try {
      return await serveAsset(request, env, ctx)
    } catch {
      return new Response('Not Found', { status: 404 })
    }
  },

  // Cron trigger for uptime checks
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(cronHandler(env))
  },
}
