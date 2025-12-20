# PG Website Manager

Uptime monitoring + WordPress backup system built on Cloudflare Workers.

## Features

- **Uptime Monitoring**: Check site availability on a schedule with Slack and email alerts
- **WordPress Backups**: Per-site database and wp-content backups to Cloudflare R2
- **Dashboard**: Web UI to manage sites, view incidents, and monitor backup status
- **Zero-code Auth**: Protected by Cloudflare Access

## Tech Stack

- Cloudflare Workers + D1 + R2
- Hono (API framework)
- React + Tailwind CSS (Dashboard)
- Amazon SES (Email alerts)
- Slack Webhooks

## Setup

### Prerequisites

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with Workers, D1, and R2 enabled

### 1. Install Dependencies

```bash
npm install
```

### 2. Create D1 Database

```bash
wrangler d1 create pg-uptime
```

Update `wrangler.toml` with the database ID from the output.

### 3. Run Migrations

```bash
npm run db:migrate        # Local
npm run db:migrate:prod   # Production
```

### 4. Configure Secrets

```bash
wrangler secret put SLACK_WEBHOOK_URL
wrangler secret put AWS_ACCESS_KEY_ID
wrangler secret put AWS_SECRET_ACCESS_KEY
wrangler secret put AWS_REGION
wrangler secret put ALERT_FROM_EMAIL
wrangler secret put ALERT_TO_EMAIL
```

### 5. Deploy

```bash
npm run deploy
```

### 6. Set Up Cloudflare Access

1. Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. Create an Access Application for your Worker URL
3. Add an Access Policy to allow your email addresses
4. Done - all requests now require authentication

## WordPress Backup Setup

### On Your VPS (Cloudways, etc.)

1. Copy `scripts/pg-backup-wp.sh` to your server
2. Create `scripts/.env` with your configuration (see `.env.example`)
3. Set up AWS credentials for R2:
   ```bash
   aws configure
   # Use your R2 Access Key ID and Secret
   # Region can be 'auto'
   ```
4. Make the script executable:
   ```bash
   chmod +x pg-backup-wp.sh
   ```
5. Add to cron (daily at 3am):
   ```bash
   crontab -e
   # Add:
   0 3 * * * /path/to/pg-backup-wp.sh >> /var/log/pg-backup.log 2>&1
   ```

### R2 Bucket Setup

1. Create an R2 bucket in Cloudflare dashboard
2. Create API tokens with read/write access
3. Note the S3-compatible endpoint URL

## Restore Process

1. Download backup files from R2
2. Upload wp-content via SFTP
3. Import database:
   ```bash
   gunzip < site-db-2024-01-15.sql.gz | mysql -u user -p database
   ```
4. Update `wp-config.php` if database credentials changed
5. Clear cache

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview with Wrangler
npm run preview
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/sites` | List all sites |
| POST | `/api/sites` | Create site |
| GET | `/api/sites/:id` | Get site details |
| PUT | `/api/sites/:id` | Update site |
| DELETE | `/api/sites/:id` | Delete site |
| GET | `/api/sites/:id/checks` | Get check history |
| GET | `/api/incidents` | List incidents |
| GET | `/api/backups` | List backup heartbeats |
| POST | `/api/backup-heartbeat` | Receive backup heartbeat |
| GET | `/api/stats` | Dashboard stats |

## License

Private - Prairie Giraffe
