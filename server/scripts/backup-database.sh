#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/guardianflow_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "${DB_HOST:-localhost}" \
  -p "${DB_PORT:-5432}" \
  -U "${DB_USER:-postgres}" \
  -d "${DB_NAME:-guardianflow}" \
  --format=custom \
  | gzip > "$BACKUP_FILE"

# Verify
if [ ! -s "$BACKUP_FILE" ]; then
  echo "[$(date)] ERROR: Backup file is empty or missing"
  exit 1
fi

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup created: $BACKUP_FILE ($SIZE)"

# Cleanup old backups
DELETED=$(find "$BACKUP_DIR" -name "guardianflow_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] Removed $DELETED backups older than $RETENTION_DAYS days"
fi

# Optional S3 upload
if [ -n "$S3_BACKUP_BUCKET" ]; then
  aws s3 cp "$BACKUP_FILE" "s3://$S3_BACKUP_BUCKET/backups/" && \
    echo "[$(date)] Uploaded to S3" || \
    echo "[$(date)] WARNING: S3 upload failed"
fi

echo "[$(date)] Backup completed"
