# Open Health Server - Production Deployment

## Quick Start (Production)

```bash
# Clone repository
git clone https://github.com/digidomic/open-health-server.git
cd open-health-server

# Create config
cp config.json.example config.json
# Edit config.json with your settings

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Update (zero downtime)
docker-compose pull
docker-compose up -d
```

## Configuration

### config.json
Edit `config.json` to add users and tokens.

### Environment Variables
Create `.env` file:
```env
# Optional: Change ports
FRONTEND_PORT=8080
BACKEND_PORT=8000

# Optional: Log level (debug, info, warning, error)
LOG_LEVEL=info
```

### Data Persistence
Data is stored in `./data/` directory. Backup this folder regularly:
```bash
# Backup
tar czf backup-$(date +%Y%m%d).tar.gz data/

# Restore
tar xzf backup-20260308.tar.gz
```

## Monitoring

### Health Checks
- Backend: http://your-server:8000/health
- Frontend: http://your-server:8080

### Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100
```

## Updates

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up --build -d

# Or update without build if only code changed
docker-compose restart
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Check disk space
df -h

# Check permissions
ls -la data/
```

### Reset everything
```bash
docker-compose down -v
docker-compose up --build -d
```

## Security Notes

- Backend runs as non-root user (`ohs`)
- Frontend runs as `nginx` user
- Config file is mounted read-only
- Security headers are enabled
- Gzip compression enabled
- Logging limited to prevent disk fill
