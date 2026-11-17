# LabelLos

Kleine Webanwendung: Nutzersammeln bekannte Informationen zu
unverpackten Lebensmitteln (z. B. vom Bäcker oder aus der Mensa).

Die Anwendung gibt keine Vegan- oder Allergensicherheitsgarantie. Alle Angaben stammen von Nutzern.

## Funktionen

- Einträge anzeigen, anlegen, bearbeiten, löschen und filtern
- Ein Eintrag hat: Name, Kategorie, Zutatenhinweise, Allergene, Ernährungseinstufung
  (vegan, vegetarisch, nicht vegetarisch (Fleisch/Fisch), unbekannt), Informationsquelle, Prüfdatum
- Das **Backend** prüft die Zutatenhinweise gegen eine kleine Liste tierischer Zutaten und zeigt mögliche
  Treffer mit Begründung. *Kein Treffer bedeutet nicht „vegan“.* Ohne verlässliche Angaben bleibt die
  Einschätzung „unbekannt“.

## Architektur in einem Satz

Ein Vue-Frontend spricht per HTTP/JSON mit einer eigenen REST-API (Deno + Hono), die ihre Daten in einer
JSON-Datei speichert. Frontend und Backend sind getrennte Programme und kennen nur die Schnittstelle dazwischen
(die API). 

## Voraussetzungen

| Werkzeug | Wofür | Prüfen mit |

| [Node.js](https://nodejs.org) 20.19+ oder 22.12+ | Frontend (Vite) | `node -v` |

| [Deno](https://deno.com) 2.x | Backend | `deno --version` |

| [Git](https://git-scm.com) | Versionsverwaltung | `git --version` |

| VS Code mit Erweiterungen *Deno* und *Vue (Official)* | Editor |

## Starten (zwei Terminals)

**Terminal 1 – Backend**

```bash
cd backend
deno task dev
```

Läuft auf <http://localhost:8000>. Test im Browser: <http://localhost:8000/api/health>

**Terminal 2 – Frontend**

```bash
cd frontend
npm install
npm run dev
```

Läuft auf <http://localhost:5173>.

## Tests

```bash
cd backend
deno task test
```

Prüft Zutatenanalyse, Validierung und Filter.

## Ordnerstruktur

```
labellos/
├─ backend/
│  ├─ main.ts               Startpunkt: setzt alles zusammen, startet den Server
│  ├─ deno.json             Aufgaben (deno task ...) und Importe
│  ├─ data/entries.json     "Datenbank" der Einträge (JSON-Datei, jeder Eintrag hat eine ownerId)
│  ├─ data/users.json       Benutzer mit Passwort-HASH (wird beim ersten Registrieren erzeugt, nicht in Git)
│  └─ src/
│     ├─ app.ts             REST-Routen (Hono) + zentrale Fehlerbehandlung
│     ├─ validation.ts      Prüft eingehende Daten
│     ├─ analysis.ts        Zutatenprüfung (Geschäftslogik)
│     ├─ filter.ts          Suche/Filter
│     ├─ repository.ts      Lesen/Schreiben der JSON-Datei
│     ├─ errors.ts, types.ts
│     └─ *_test.ts          Tests
├─ frontend/
│  ├─ index.html, vite.config.ts, package.json, tsconfig.json
│  └─ src/
│     ├─ main.ts            Startpunkt
│     ├─ App.vue            Hauptkomponente
│     ├─ components/        EntryCard, EntryForm, FilterBar, DietBadge
│     ├─ composables/       useEntries (Laden, Filter, Ladezustand)
│     ├─ api/client.ts      einzige Stelle, die mit dem Backend spricht
│     ├─ types.ts, styles.css
└─ docs/                    API- und Architektur-Dokumentation
```



## Anmeldung

Beim ersten Start: **Registrieren** (Benutzername + Passwort mit mind. 8 Zeichen). Jede Person sieht nur ihre eigenen
Einträge. 
