#!/bin/sh
set -e

echo "Fixing permissions for /app/data..."
chmod -R 777 /app/data 2>/dev/null || true
echo "Permissions fixed. Starting application..."

exec "$@"
