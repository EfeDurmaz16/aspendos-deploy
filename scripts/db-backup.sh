#!/usr/bin/env bash
# YULA OS Database Backup Script
# Usage: ./scripts/db-backup.sh [daily|weekly|manual]
#
# Environment variables:
#   DATABASE_URL     - PostgreSQL connection string (required)
#   BACKUP_DIR       - Directory to store backups (default: ./backups)
#   RETENTION_DAYS   - Days to keep daily backups (default: 7)
#   RETENTION_WEEKS  - Weeks to keep weekly backups (default: 4)
#
# Cron examples:
#   Daily at 3 AM:    0 3 * * * /path/to/db-backup.sh daily
#   Weekly on Sunday:  0 4 * * 0 /path/to/db-backup.sh weekly

set -euo pipefail

BACKUP_TYPE="${1:-manual}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
RETENTION_WEEKS="${RETENTION_WEEKS:-4}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Validate DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL environment variable is required"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly" "$BACKUP_DIR/manual"

# Determine backup path
case "$BACKUP_TYPE" in
    daily)
        BACKUP_PATH="$BACKUP_DIR/daily/yula_${TIMESTAMP}.sql.gz"
        ;;
    weekly)
        BACKUP_PATH="$BACKUP_DIR/weekly/yula_${TIMESTAMP}.sql.gz"
        ;;
    manual)
        BACKUP_PATH="$BACKUP_DIR/manual/yula_${TIMESTAMP}.sql.gz"
        ;;
    *)
        echo "Usage: $0 [daily|weekly|manual]"
        exit 1
        ;;
esac

echo "Starting $BACKUP_TYPE backup..."
echo "Target: $BACKUP_PATH"

# Run pg_dump with compression
START_TIME=$(date +%s)
pg_dump "$DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --format=custom \
    --compress=9 \
    | gzip > "$BACKUP_PATH"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
SIZE=$(du -h "$BACKUP_PATH" | cut -f1)

echo "Backup completed in ${DURATION}s (${SIZE})"

# Verify backup is not empty
if [ ! -s "$BACKUP_PATH" ]; then
    echo "ERROR: Backup file is empty!"
    rm -f "$BACKUP_PATH"
    exit 1
fi

# Cleanup old backups
echo "Cleaning up old backups..."

# Remove daily backups older than RETENTION_DAYS
find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
DAILY_COUNT=$(find "$BACKUP_DIR/daily" -name "*.sql.gz" | wc -l | tr -d ' ')
echo "  Daily backups retained: $DAILY_COUNT"

# Remove weekly backups older than RETENTION_WEEKS * 7 days
WEEKLY_RETENTION_DAYS=$((RETENTION_WEEKS * 7))
find "$BACKUP_DIR/weekly" -name "*.sql.gz" -mtime +"$WEEKLY_RETENTION_DAYS" -delete 2>/dev/null || true
WEEKLY_COUNT=$(find "$BACKUP_DIR/weekly" -name "*.sql.gz" | wc -l | tr -d ' ')
echo "  Weekly backups retained: $WEEKLY_COUNT"

# Total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "  Total backup storage: $TOTAL_SIZE"

echo ""
echo "Backup summary:"
echo "  Type:     $BACKUP_TYPE"
echo "  File:     $BACKUP_PATH"
echo "  Size:     $SIZE"
echo "  Duration: ${DURATION}s"
echo "  Status:   SUCCESS"
