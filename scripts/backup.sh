#!/bin/bash

# Configuration
BACKUP_DIR="/home/deploy/backups/geotask"
CONTAINER_NAME="geotask-db"
DB_USER="postgres"
DB_NAME="geotask"
DATE=$(date +%Y-%m-%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Execute pg_dump inside the container
echo "Starting backup of $DB_NAME universe..."
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Compress the backup
gzip $BACKUP_DIR/db_backup_$DATE.sql

echo "Backup completed: $BACKUP_DIR/db_backup_$DATE.sql.gz"

# Remove old backups
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -name "*.sql.gz" -exec rm {} \;
echo "Cleanup of old backups older than $RETENTION_DAYS days completed."
