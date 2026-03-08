#!/bin/sh
set -e

echo "Creating and fixing /app/data..."
mkdir -p /app/data
chmod -R 777 /app/data 2>/dev/null || true
ls -la /app/data
echo "Permissions fixed. Starting application..."

exec "$@"
