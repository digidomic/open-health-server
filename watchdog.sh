#!/bin/bash
# Frontend Watchdog - restart server if it crashes

HEALTH_DIR="/home/dominic/.openclaw/workspace/health-dashboard"
LOG_DIR="/tmp/health-dashboard"
mkdir -p $LOG_DIR

echo "$(date): Frontend watchdog started"

while true; do
    # Check if frontend is running
    if ! pgrep -f "python3 -m http.server 8080" > /dev/null; then
        echo "$(date): Frontend not running, restarting..."
        cd "$HEALTH_DIR/frontend"
        nohup python3 -m http.server 8080 > $LOG_DIR/frontend.log 2>&1 &
        echo "$(date): Frontend restarted with PID $!"
    fi
    
    # Check if frontend responds
    if ! curl -s -o /dev/null --max-time 5 http://localhost:8080/; then
        echo "$(date): Frontend not responding, killing and restarting..."
        pkill -f "python3 -m http.server 8080" 2>/dev/null
        sleep 1
        cd "$HEALTH_DIR/frontend"
        nohup python3 -m http.server 8080 > $LOG_DIR/frontend.log 2>&1 &
        echo "$(date): Frontend restarted with PID $!"
    fi
    
    # Check every 10 seconds
    sleep 10
done
