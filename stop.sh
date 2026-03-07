#!/bin/bash
# Health Dashboard Stopper

LOG_DIR="/tmp/health-dashboard"

if [ -f $LOG_DIR/backend.pid ]; then
    kill $(cat $LOG_DIR/backend.pid) 2>/dev/null
    echo "Backend stopped"
fi

if [ -f $LOG_DIR/frontend.pid ]; then
    kill $(cat $LOG_DIR/frontend.pid) 2>/dev/null
    echo "Frontend stopped"
fi

pkill -f "uvicorn main:app" 2>/dev/null
pkill -f "python3 -m http.server 8080" 2>/dev/null

echo "Health Dashboard stopped"
