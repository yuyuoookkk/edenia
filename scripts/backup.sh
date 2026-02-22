#!/bin/bash
# Script to backup the SQLite database and uploaded files for Villa Edenia

BACKUP_DIR="/home/bryan/project edenia/backups"
APP_DIR="/home/bryan/project edenia"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/edenia_backup_$DATE.zip"

echo "Starting Villa Edenia backup..."

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Navigate to app directory
cd "$APP_DIR" || exit

# Create the archive containing the database and uploads directory
if [ -f "dev.db" ] && [ -d "public/uploads" ]; then
    zip -r "$BACKUP_FILE" dev.db public/uploads
    echo "Backup successfully created at $BACKUP_FILE"
elif [ -f "dev.db" ]; then
    zip "$BACKUP_FILE" dev.db
    echo "Backup created (Only database found) at $BACKUP_FILE"
else
    echo "Error: dev.db not found. Backup failed."
    exit 1
fi

# Keep only the last 5 backups
ls -dt "$BACKUP_DIR"/* | tail -n +6 | xargs rm -f
echo "Old backups cleaned up."
