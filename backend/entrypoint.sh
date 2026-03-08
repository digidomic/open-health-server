#!/bin/bash
set -e

# Ensure data directory has correct permissions
chmod 777 /app/data

# Start the application
exec "$@"
