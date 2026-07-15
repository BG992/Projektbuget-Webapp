# Projektbudget

Eine schlanke, selbst gehostete Web-App zur Planung und Kontrolle mehrstufiger Projektbudgets. Sie unterscheidet konsequent zwischen geplanten und tatsächlichen Kosten: Solange eine Position offen ist, zählt der Planwert; nach dem Abschluss zählt der Istwert.

## Funktionen

- mehrere Projekte mit eigenem Gesamtbudget
- frei definierbare Teilbudgets mit individueller Warnschwelle
- Positionen mit Plan- und Istkosten sowie direktem Erledigt-Status
- automatische Summen, Restbudget, Budgetverteilung und Abweichungen
- visuelle Warnungen bei erreichter Schwelle oder überschrittenem Budget
- Suche über Teilbudgets und Positionen
- Analyseansicht mit Verteilung und Projektfortschritt
- Bestätigungsdialoge vor dem Löschen
- JSON-Backup aller Daten über die Seitenleiste
- responsive Dark-Theme-Oberfläche für Desktop, Tablet und Smartphone
- persistente SQLite-Datenbank und Docker-Betrieb

## Schnellstart mit Docker

Voraussetzung ist eine aktuelle Docker-Installation mit Docker Compose.

```bash
docker compose up --build -d
```

Danach ist die App unter [http://localhost:3000](http://localhost:3000) erreichbar. Die Daten liegen auf dem Host in `server/data/` und bleiben bei einem Container-Neustart erhalten.

Zum Beenden:

```bash
docker compose down
```

## Nutzung auf mehreren Geräten

Alle Geräte greifen auf dieselbe SQLite-Datenbank des Servers zu. Im lokalen Netzwerk kann die App über die IP-Adresse des Docker-Hosts geöffnet werden, zum Beispiel `http://192.168.1.20:3000`.

> Die App enthält bewusst noch keine Benutzeranmeldung. Veröffentliche Port 3000 daher nicht ungeschützt im Internet. Für einen externen Zugriff sollte ein Reverse Proxy mit HTTPS und Authentifizierung vorgeschaltet werden.

## Lokale Entwicklung

Voraussetzung: Node.js 24 und npm.

Backend starten:

```bash
cd server
npm ci
npm run dev
```

Frontend in einem zweiten Terminal starten:

```bash
cd client
npm ci
npm run dev
```

Der Vite-Entwicklungsserver leitet API-Aufrufe automatisch an `http://localhost:3000` weiter. Der normale Docker-/Produktions-Build liefert Frontend und API gemeinsam über Port 3000 aus.

## Qualitätssicherung

```bash
npm --prefix client run lint
npm --prefix client run build
npm --prefix server test
```

Die API-Tests decken Validierung, die komplette Budgetlogik, Statuswechsel, Backup und kaskadierendes Löschen ab.

## Architektur

- **Frontend:** React 19, Material UI 9 und Vite 8
- **Backend:** Node.js 24 und Express 5
- **Datenbank:** SQLite über `better-sqlite3`
- **Betrieb:** mehrstufiger Docker-Build und persistentes Datenverzeichnis

Beim ersten Start ergänzt die App ältere Datenbanken automatisch um die neu benötigten Zeitstempel. Vor einem größeren Update empfiehlt sich trotzdem ein Backup über die Schaltfläche in der Seitenleiste.
