#!/bin/bash
# ERP System Database Restore Script
# Usage: ./restore.sh /path/to/backup.sql.gz

# Configuration
DB_HOST="localhost"
DB_USER="root"
DB_NAME="erp_system"
DB_PASSWORD=""

if [ $# -ne 1 ]; then
  echo "Usage: $0 <backup-file-path>"
  echo "Example: $0 /var/backups/erp/erp_backup_20240101_000000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will overwrite the current database ($DB_NAME)!"
read -p "Are you sure you want to continue? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Restore cancelled."
  exit 0
fi

echo "Starting restore at $(date)"

if [[ "$BACKUP_FILE" == *.gz ]]; then
  if [ -n "$DB_PASSWORD" ]; then
    gunzip < "$BACKUP_FILE" | mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
  else
    gunzip < "$BACKUP_FILE" | mysql -h"$DB_HOST" -u"$DB_USER" "$DB_NAME"
  fi
else
  if [ -n "$DB_PASSWORD" ]; then
    mysql -h"$DB_HOST" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$BACKUP_FILE"
  else
    mysql -h"$DB_HOST" -u"$DB_USER" "$DB_NAME" < "$BACKUP_FILE"
  fi
fi

if [ $? -eq 0 ]; then
  echo "Restore completed successfully!"
else
  echo "Restore failed!"
  exit 1
fi

echo "Restore finished at $(date)"
