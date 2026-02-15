# Open Health Server - iOS App

React Native App für iOS, die Apple Health-Daten an deinen Open Health Server sendet und das Web-Dashboard anzeigt.

## Features

- 📊 **Apple Health Integration** - Liest Schritte, Schlaf, Herzfrequenz, Gewicht, Aktivitätskalorien
- 🔄 **Automatischer Sync** - Im Hintergrund (ca. alle 15 Minuten)
- 🖥️ **Web Dashboard** - Integriertes Frontend direkt in der App
- ⚙️ **Einfache Konfiguration** - IP, Ports und Token in der App einstellbar
- 🔒 **Multi-User Support** - Jeder User sieht nur seine Daten

## Voraussetzungen

- macOS mit Xcode (für iOS Build)
- Node.js 16+
- React Native CLI
- iPhone mit iOS 14+ (für HealthKit)

## Installation

### 1. React Native Umgebung einrichten

Folge der [offiziellen React Native Anleitung](https://reactnative.dev/docs/environment-setup) für "React Native CLI Quickstart" > iOS.

Kurzfassung:
```bash
# Homebrew installieren (falls nicht vorhanden)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node, Watchman
brew install node watchman

# Xcode über Mac App Store installieren
# Dann: Xcode öffnen > Preferences > Locations > Command Line Tools auswählen

# CocoaPods
sudo gem install cocoapods
```

### 2. Projekt einrichten

```bash
# In das mobile-app Verzeichnis wechseln
cd /path/to/health-dashboard/mobile-app

# Dependencies installieren
npm install

# iOS Pods installieren
cd ios
pod install
cd ..
```

### 3. App konfigurieren

Die App fragt beim ersten Start nach:
- **Server IP**: Deine lokale IP (z.B. `192.168.9.20`)
- **Frontend Port**: `8080`
- **Backend Port**: `8000`
- **Auth Token**: Dein Token aus `config.json`

### 4. Auf iPhone starten

```bash
# iPhone per USB anschließen
# Im Xcode das iPhone als Target auswählen

# Metro Bundler starten
npx react-native start

# In einem neuen Terminal:
npx react-native run-ios --device
```

Oder über Xcode: `ios/HealthTracker.xcworkspace` öffnen und auf Play klicken.

### 5. HealthKit Berechtigungen

Beim ersten Start fragt iOS nach Erlaubnis für Health-Daten. Alle Kategorien erlauben.

## Background Sync einrichten

Für automatisches Syncen im Hintergrund:

1. **Xcode öffnen** > `ios/HealthTracker.xcodeproj`
2. **Capabilities** hinzufügen:
   - Background Modes: ✅ Background fetch
   - HealthKit: ✅ aktivieren

3. In `ios/HealthTracker/AppDelegate.mm` hinzufügen:

```objc
#import "RNBackgroundFetch.h"

// In didFinishLaunchingWithOptions:
[RNBackgroundFetch configure];
```

## Architektur

```
App.js
├── Settings Screen (Einstellungen)
├── DashboardWebView (WebView für Frontend)
└── Services/
    ├── HealthKitService.js (Apple Health Zugriff)
    └── ApiService.js (Backend Kommunikation)
```

## Datenfluss

1. User öffnet App → WebView zeigt Dashboard
2. "Sync" Button → HealthKitService liest Daten
3. ApiService sendet an Backend (`POST /api/health`)
4. WebView lädt neu → Neue Daten sichtbar

## Troubleshooting

### "Cannot connect to server"
- Sind iPhone und Server im selben WLAN?
- Firewall am Server prüfen (Port 8000/8080)
- IP-Adresse korrekt?

### "Health data is 0"
- HealthKit Berechtigungen in iOS Einstellungen prüfen
- Sind überhaupt Daten in Apple Health vorhanden?

### App crasht beim Start
- `npm install` ausgeführt?
- `pod install` im ios-Verzeichnis?
- Node-Version >= 16?

## Development Build vs. App Store

Für dich selbst (ohne Developer Account):
- Gratis, aber App muss alle 7 Tage neu installiert werden

Für TestFlight (Beta-Tester):
- Apple Developer Account nötig (99€/Jahr)
- App kann bis zu 90 Tage an externe Tester verteilt werden

## Nächste Schritte

- [ ] Push Notifications für Sync-Erinnerungen
- [ ] Offline-Modus (Daten zwischenspeichern)
- [ ] Apple Watch App
- [ ] Siri Shortcuts Integration

## Hilfe

Bei Problemen:
1. `npx react-native doctor` ausführen
2. Logs checken: `npx react-native log-ios`
3. Metro Bundler neustarten

---

Made with ❤️ for Dominic