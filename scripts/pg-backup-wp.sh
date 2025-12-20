#!/bin/bash
#
# pg-backup-wp.sh - WordPress Backup Script
#
# Backs up a WordPress site's database and wp-content directory to Cloudflare R2.
# Designed to run via cron on Cloudways/VPS servers.
#
# Usage:
#   ./pg-backup-wp.sh
#
# Configuration via environment variables or .env file:
#   SITE_NAME      - Human-readable site name (used in R2 path)
#   APP_PATH       - Path to WordPress installation
#   DB_NAME        - Database name
#   DB_USER        - Database user
#   DB_PASS        - Database password
#   DB_HOST        - Database host (default: localhost)
#   R2_BUCKET      - R2 bucket name
#   R2_ENDPOINT    - R2 S3-compatible endpoint URL
#   HEARTBEAT_URL  - (Optional) URL to send backup heartbeat
#

set -euo pipefail

# Load .env file if exists
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/.env" ]]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

# Validate required variables
required_vars=(SITE_NAME APP_PATH DB_NAME DB_USER DB_PASS R2_BUCKET R2_ENDPOINT)
for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
        echo "ERROR: $var is not set"
        exit 1
    fi
done

# Defaults
DB_HOST="${DB_HOST:-localhost}"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

# Temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "=== WordPress Backup: $SITE_NAME ==="
echo "Date: $DATE"
echo "Temp directory: $TEMP_DIR"

# Step 1: Dump database
echo ""
echo ">>> Dumping database..."
DB_BACKUP_FILE="$TEMP_DIR/${SITE_NAME}-db-${DATE}.sql.gz"
mysqldump \
    --single-transaction \
    --quick \
    --host="$DB_HOST" \
    --user="$DB_USER" \
    --password="$DB_PASS" \
    "$DB_NAME" | gzip > "$DB_BACKUP_FILE"

DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
echo "Database backup complete: $DB_SIZE"

# Step 2: Archive wp-content
echo ""
echo ">>> Archiving wp-content..."
WP_CONTENT_PATH="$APP_PATH/wp-content"
FILES_BACKUP_FILE="$TEMP_DIR/${SITE_NAME}-wp-content-${DATE}.tar.gz"

if [[ ! -d "$WP_CONTENT_PATH" ]]; then
    echo "ERROR: wp-content directory not found at $WP_CONTENT_PATH"
    exit 1
fi

tar \
    --exclude='*/cache/*' \
    --exclude='*/Cache/*' \
    --exclude='*/.cache/*' \
    --exclude='*/backup*' \
    --exclude='*/logs/*' \
    --exclude='*/tmp/*' \
    --exclude='*.log' \
    -czf "$FILES_BACKUP_FILE" \
    -C "$APP_PATH" \
    wp-content

FILES_SIZE=$(du -h "$FILES_BACKUP_FILE" | cut -f1)
echo "Files backup complete: $FILES_SIZE"

# Step 3: Upload to R2
echo ""
echo ">>> Uploading to R2..."

# Use AWS CLI with R2 endpoint
upload_to_r2() {
    local src="$1"
    local dest="$2"

    aws s3 cp "$src" "s3://${R2_BUCKET}/${dest}" \
        --endpoint-url "$R2_ENDPOINT" \
        --only-show-errors

    if [[ $? -eq 0 ]]; then
        echo "Uploaded: $dest"
        return 0
    else
        echo "ERROR: Failed to upload $dest"
        return 1
    fi
}

# Upload database backup
DB_R2_PATH="${SITE_NAME}/db/${SITE_NAME}-db-${DATE}.sql.gz"
upload_to_r2 "$DB_BACKUP_FILE" "$DB_R2_PATH"

# Upload files backup
FILES_R2_PATH="${SITE_NAME}/files/${SITE_NAME}-wp-content-${DATE}.tar.gz"
upload_to_r2 "$FILES_BACKUP_FILE" "$FILES_R2_PATH"

# Step 4: Verify uploads
echo ""
echo ">>> Verifying uploads..."

verify_upload() {
    local path="$1"
    aws s3 ls "s3://${R2_BUCKET}/${path}" \
        --endpoint-url "$R2_ENDPOINT" \
        > /dev/null 2>&1

    if [[ $? -eq 0 ]]; then
        echo "Verified: $path"
        return 0
    else
        echo "ERROR: Verification failed for $path"
        return 1
    fi
}

verify_upload "$DB_R2_PATH"
verify_upload "$FILES_R2_PATH"

# Step 5: Send heartbeat (optional)
if [[ -n "${HEARTBEAT_URL:-}" ]]; then
    echo ""
    echo ">>> Sending heartbeat..."
    curl -s -X POST "$HEARTBEAT_URL" \
        -H "Content-Type: application/json" \
        -d "{\"site\": \"$SITE_NAME\", \"status\": \"success\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
        > /dev/null && echo "Heartbeat sent" || echo "Heartbeat failed (non-fatal)"
fi

echo ""
echo "=== Backup Complete ==="
echo "Database: $DB_SIZE -> $DB_R2_PATH"
echo "Files: $FILES_SIZE -> $FILES_R2_PATH"
echo "Duration: $SECONDS seconds"
