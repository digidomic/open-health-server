# 🏥 Open Health Server

Ein modernes, selbstgehostetes Health-Tracking-System für persönliche Gesundheitsdaten.

![Open Health Server](https://img.shields.io/badge/version-1.0.0-emerald)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- **📱 Mobile-First Design** - Optimiert für iPhone und Smartphones
- **📊 Schöne Charts** - Schritte, Schlaf, Herzfrequenz mit Chart.js
- **🚀 Schnelle Dateneingabe** - Einfaches Formular für alle Metriken
- **📈 Statistiken** - Durchschnittswerte und Trends
- **🗂️ Verlauf** - Übersicht aller Einträge mit Filter
- **🐳 Docker-Deployment** - Ein-Klick-Start mit Docker Compose

## 🏗️ Architektur

```
health-dashboard/
├── backend/           # FastAPI + SQLite
│   ├── main.py       # REST API Endpoints
│   ├── database.py   # SQLAlchemy Models
│   └── schemas.py    # Pydantic Schemas
├── frontend/         # HTML + Tailwind + Chart.js
│   ├── index.html    # Hauptseite
│   └── app.js        # App-Logik
├── db/               # SQLite Datenbank
└── docker-compose.yml
```

## 🚀 Schnellstart

### Mit Docker (empfohlen)

```bash
# Repository klonen oder entpacken
cd health-dashboard

# Starten
./start.sh
```

Die Anwendung ist dann verfügbar unter:
- **Web-App:** http://localhost:8080
- **API:** http://localhost:8000
- **API-Docs:** http://localhost:8000/docs

### Manuelle Installation

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd frontend
# Einfachen Server starten
python -m http.server 8080
# oder
npx serve .
```

## 📡 API Endpoints

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| GET | `/api/health` | Alle Einträge (mit Filter) |
| POST | `/api/health` | Neuer Eintrag |
| GET | `/api/health/latest` | Letzter Eintrag |
| GET | `/api/health/stats` | Statistiken (30 Tage) |
| GET | `/api/health/chart/{metric}` | Chart-Daten |
| PUT | `/api/health/{id}` | Eintrag aktualisieren |
| DELETE | `/api/health/{id}` | Eintrag löschen |

## 📊 Gespeicherte Daten

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| datum | String | Datum (YYYY-MM-DD) |
| schritte | Integer | Tägliche Schritte |
| schlaf_stunden | Float | Schlafdauer |
| schlaf_index | Float | Schlafqualität (0-100) |
| herzfrequenz_ruhe | Integer | Ruheherzfrequenz |
| herzfrequenz_avg | Integer | Durchschnitts-HF |
| gewicht | Float | Körpergewicht in kg |
| aktivitaetsenergie | Integer | Aktive Kalorien |
| training_minuten | Integer | Trainingsdauer |
| notizen | Text | Persönliche Notizen |

## 🐳 Docker Befehle

```bash
# Starten
docker-compose up -d

# Mit Neubau
docker-compose up --build -d

# Logs anzeigen
docker-compose logs -f

# Stoppen
docker-compose down

# Mit Löschen aller Daten
docker-compose down -v
```

## ⚙️ Konfiguration

In der `.env` Datei können folgende Werte angepasst werden:

```env
PORT=8080              # Frontend Port
BACKEND_PORT=8000      # API Port
DATABASE_URL=sqlite:///./db/health.db
```

## 📱 Progressive Web App

Die App ist als PWA konfiguriert und kann auf dem Homescreen installiert werden:

1. Safari/Chrome öffnen
2. `Teilen` → `Zum Homescreen hinzufügen`
3. App starten

## 🔒 Backup

Die SQLite-Datenbank wird im `db/` Verzeichnis gespeichert:

```bash
# Backup erstellen
cp db/health.db db/health_backup_$(date +%Y%m%d).db
```

## 🛠️ Entwicklung

**Backend Tests:**
```bash
curl http://localhost:8000/api/health/stats
curl -X POST http://localhost:8000/api/health \
  -H "Content-Type: application/json" \
  -d '{"datum":"2024-01-15","schritte":10000}'
```

## 📄 Lizenz

MIT License - Open Health Server

---

Entwickelt mit ❤️ für Self-Hosting
