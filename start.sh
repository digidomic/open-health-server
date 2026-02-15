#!/bin/bash
# Health Dashboard Starter

HEALTH_DIR="/home/dominic/.openclaw/workspace/health-dashboard"
LOG_DIR="/tmp/health-dashboard"
mkdir -p $LOG_DIR

# Kill existing processes
pkill -f "uvicorn main:app" 2>/dev/null
pkill -f "python3 -m http.server 8080" 2>/dev/null
sleep 1

# Start Backend
echo "Starting Backend..."
cd "$HEALTH_DIR/backend"
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > $LOG_DIR/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > $LOG_DIR/backend.pid
echo "Backend PID: $BACKEND_PID"

# Start Frontend
echo "Starting Frontend..."
cd "$HEALTH_DIR/frontend"
nohup python3 -m http.server 8080 > $LOG_DIR/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > $LOG_DIR/frontend.pid
echo "Frontend PID: $FRONTEND_PID"

# Wait and test
sleep 3

echo ""
echo "Testing services..."

# Test Backend
if curl -s http://localhost:8000/api/health/latest > /dev/null; then
    echo "✅ Backend running on http://192.168.9.20:8000"
else
    echo "❌ Backend failed to start"
fi

# Test Frontend
if curl -s http://localhost:8080 | grep -q "Dominic"; then
    echo "✅ Frontend running on http://192.168.9.20:8080"
else
    echo "❌ Frontend failed to start"
fi

echo ""
echo "Logs: tail -f $LOG_DIR/*.log"
echo "Stop: ./stop.sh"
