#!/bin/sh
set -e

echo "Creating and fixing /app/db..."
mkdir -p /app/db
chmod -R 777 /app/db 2>/dev/null || true
ls -la /app/db
echo "Permissions fixed. Starting application..."

exec "$@"
