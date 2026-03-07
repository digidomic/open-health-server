# Open Health Server - Docker Production Setup

## Quick Start

### 1. Build und Start
```bash
docker-compose up --build -d
```

### 2. Logs ansehen
```bash
# Alle Services
docker-compose logs -f

# Nur Backend
docker-compose logs -f backend

# Nur Frontend
docker-compose logs -f frontend
```

### 3. Status prüfen
```bash
docker-compose ps
```

### 4. Stoppen
```bash
docker-compose down
```

### 5. Neustarten
```bash
docker-compose restart
```

## URLs

- **Frontend:** http://localhost:8080
- **Backend:** http://localhost:8000
- **Health Check:** http://localhost:8000/health

## Daten

Die SQLite-Datenbank wird im `data/` Ordner gespeichert (persistenter Volume).

## Config

Die `config.json` wird als read-only Volume in den Backend-Container gemountet.

## Updates

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose up --build -d
```
