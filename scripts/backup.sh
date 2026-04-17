#!/bin/bash
# ERP System Daily Backup Script
# This script creates daily backups of the MySQL database

# Configuration - modify these values according to your setup
DB_HOST="localhost"
DB_USER="root"
DB_NAME="erp_system"
DB_PASSWORD=""  # You can leave empty if using .my.cnf
BACKUP_DIR="/var/backups/erp"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/erp_backup_$TIMESTAMP.sql.gz"

# Echo start time
echo "Starting backup at $(date)"

# Create the backup using mysqldump
if [ -n "$DB_PASSWORD" ]; then
  mysqldump -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" | gzip > "$BACKUP_FILE"
else
  mysqldump -h"$DB_HOST" -u"$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
fi

# Check if backup succeeded
if [ $? -eq 0 ]; then
  echo "Backup completed successfully: $BACKUP_FILE"
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup size: $FILE_SIZE"
else
  echo "Backup failed!"
  exit 1
fi

# Delete backups older than RETENTION_DAYS
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "erp_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleanup completed"

# Count current backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "erp_backup_*.sql.gz" | wc -l)
echo "Total backups kept: $BACKUP_COUNT"

echo "Backup process finished at $(date)"
