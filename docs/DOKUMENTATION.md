# LabelLos – Projektdokumentation

Prüfungsprojekt im Modul **T4: Entwicklung von Webanwendungen mit entkoppelter Architektur**

| | |
|---|---|
| Name | [bitte ausfüllen] |
| Kurs / Matrikelnummer | [bitte ausfüllen] |
| Abgabedatum | [bitte ausfüllen] |
| Git-Repository | [Link oder Pfad bitte ausfüllen] |
| Backend-Wahl | TypeScript mit Deno und Hono (nicht Java/Quarkus) |
| Frontend | Vue 3 mit TypeScript und Vite (für alle verpflichtend) |

**So liest du dieses Dokument:** Mit „Einfach gesagt“ beginnende Absätze erklären das Thema in
Alltagssprache. Alles in `[eckigen Klammern]` musst du noch selbst ausfüllen. Die Kapitel 12 bis 14
(Tests, Git, Reflexion) bekommen erst dann Inhalt, wenn du das Projekt gestartet, getestet und
über Git gesichert hast.

---

## Inhalt

1. Worum geht es?
2. Anforderungen und wo sie erfüllt sind
3. Architektur
4. Ablauf: Was passiert bei einem Klick?
5. Datenmodell
6. Fachlogik: Die Zutatenprüfung
7. REST-API
8. Validierung und Fehlerbehandlung
9. Frontend
10. Persistenz (Speichern der Daten)
11. Wichtige Entscheidungen
12. Installation, Start und Tests
13. Git
14. Reflexion
15. Quellen und Hilfsmittel
16. Abgabe-Checkliste
17. Glossar
18. Fragen fürs Prüfungsgespräch

---

## 1. Worum geht es?

### Das Problem

Bei **unverpackten Lebensmitteln** (Brezel vom Bäcker, Essen in der Mensa) gibt es keine Zutatenliste auf
einer Verpackung. Wer vegetarisch oder vegan isst oder Allergien hat, muss nachfragen oder raten.

### Die Lösung

LabelLos ist eine kleine Webanwendung, in der Nutzer:innen **bekannte Informationen** zu solchen
Lebensmitteln sammeln. Ein Eintrag besteht aus:

- Name (z. B. „Laugenbrezel“)
- Kategorie (Backware, Mensa-Gericht, Snack, Süßware, Getränk, Sonstiges)
- Zutatenhinweise (Freitext)
- Allergene (aus den 14 EU-Allergengruppen)
- Ernährungseinstufung: vegan, vegetarisch, nicht vegetarisch (Fleisch/Fisch) oder unbekannt
- Informationsquelle (woher weiß man das?)
- Prüfdatum (wann wurde es zuletzt geprüft?)

Man kann Einträge **anzeigen, anlegen, bearbeiten, löschen und filtern**.

### Die Besonderheit: die Zutatenprüfung

Das Backend vergleicht die Zutatenhinweise mit einer kleinen Liste tierischer Zutaten (z. B. Butter, Ei,
Honig, Gelatine) und zeigt **mögliche Treffer mit Begründung** an.

> **Einfach gesagt:** Schreibt jemand „Mehl, Butter, Salz“ in die Zutatenhinweise, sagt die App:
> „Achtung, ‚Butter‘ ist ein Milchprodukt, also vermutlich nicht vegan.“

Drei Regeln sind dabei besonders wichtig:

1. **Ein Treffer ist ein Hinweis, kein Beweis.** Die App kann sich irren.
2. **Kein Treffer bedeutet nicht „vegan“.** Die Liste ist klein und unvollständig.
3. **Ohne verlässliche Angaben bleibt die Einschätzung „unbekannt“.** Das Backend lehnt „vegan“ und
   „vegetarisch“ ab, wenn Zutatenhinweise oder Quelle fehlen.

### Was die App bewusst nicht kann

Kein Login, keine Kamera, keine KI-Erkennung, keine externe Produkt-API. Das hält das Projekt klein
(Leitlinie der Lehrveranstaltung: *klein, vollständig, nachvollziehbar*).

### Wichtiger Hinweis

LabelLos gibt **keine Garantie**, dass etwas vegan oder frei von Allergenen ist. Das steht auch in der
Anwendung selbst (Hinweiskasten oben und Fußzeile). Bei Allergien muss man immer beim Anbieter nachfragen.

---

## 2. Anforderungen und wo sie erfüllt sind

Die linke Spalte stammt aus den Folien des Modulbriefings. Die rechte zeigt, wo du es im Projekt findest.

| Anforderung (laut Folien) | Wo im Projekt |
|---|---|
| Vue.js, Single File Components, Composition API | `frontend/src/**/*.vue`, alle Komponenten nutzen `<script setup>` |
| TypeScript (Frontend) | `frontend/src/**/*.ts` und `.vue` mit `lang="ts"`, `types.ts` |
| Komponentenorientierte Struktur | `frontend/src/components/` (EntryCard, EntryForm, FilterBar, DietBadge) |
| REST-Kommunikation im Frontend | `frontend/src/api/client.ts` |
| Angemessene Benutzeroberfläche | `App.vue`, `styles.css`, Kapitel 9 |
| Backend mit Deno/Hono | `backend/main.ts`, `backend/src/app.ts` |
| REST-API mit JSON | Kapitel 7 und `docs/API.md` |
| Validierung | `backend/src/validation.ts` |
| Geschäftslogik | `backend/src/analysis.ts` (Zutatenprüfung) |
| Persistente Datenhaltung | JSON-Datei `backend/data/entries.json`, verwaltet von `repository.ts` |
| Fehlerbehandlung | `errors.ts`, zentraler Handler in `app.ts`, Anzeige im Frontend |
| Git | Kapitel 13 |
| Vite für das Frontend | `frontend/vite.config.ts` |
| API nachvollziehbar, konsistent, dokumentiert | `docs/API.md` |
| Wesentliche Entscheidungen begründen | Kapitel 11 und `docs/ARCHITEKTUR.md` |
| Entkoppelte Architektur | Kapitel 3 |

---

## 3. Architektur

### Überblick

```
┌────────────────────────┐   HTTP + JSON   ┌────────────────────────┐   liest/schreibt   ┌──────────────┐
│ Frontend (Browser)     │ ──────────────► │ Backend (Server)       │ ─────────────────► │ entries.json │
│ Vue 3 + TypeScript     │ ◄────────────── │ Deno + Hono (REST-API) │                    │ (Datei)      │
│ Port 5173              │                 │ Port 8000              │                    └──────────────┘
└────────────────────────┘                 └────────────────────────┘
```

### Was bedeutet „entkoppelt“?

> **Einfach gesagt:** Frontend und Backend sind zwei getrennte Programme. Sie kennen nur eine
> Vereinbarung miteinander: die **API** („Wenn du mir *das* schickst, schicke ich dir *das* zurück“).
> Wie das Backend intern arbeitet, weiß das Frontend nicht. Deshalb könnte man das Frontend durch eine
> Handy-App ersetzen, ohne das Backend zu ändern.

Das Frontend kommuniziert **nie direkt** mit der Datei bzw. Datenbank. Die Speicherung ist eine interne
Angelegenheit des Backends.

### Aufgabenverteilung im Backend

| Datei | Aufgabe (ein Satz) |
|---|---|
| `main.ts` | Startet den Server und setzt die Teile zusammen |
| `app.ts` | Legt die Adressen (Routen) fest und baut die Antworten |
| `validation.ts` | Prüft, ob die Daten vom Frontend in Ordnung sind |
| `analysis.ts` | Berechnet die Zutatenprüfung |
| `filter.ts` | Sucht und filtert Einträge |
| `repository.ts` | Liest und schreibt die JSON-Datei, sonst nichts |
| `errors.ts` | Ein eigener Fehlertyp für erwartete Fehler |
| `types.ts` | Beschreibt, wie die Daten aussehen |

### Aufgabenverteilung im Frontend

| Datei | Aufgabe |
|---|---|
| `main.ts` | Startet die Vue-App |
| `App.vue` | Hauptkomponente, verbindet alles |
| `components/EntryCard.vue` | Zeigt einen Eintrag samt Zutatenprüfung |
| `components/EntryForm.vue` | Formular zum Anlegen und Bearbeiten |
| `components/FilterBar.vue` | Suchfeld und Filter |
| `components/DietBadge.vue` | Kleines Etikett mit der Einstufung |
| `composables/useEntries.ts` | Lädt die Liste, merkt sich Filter, Ladezustand und Fehler |
| `api/client.ts` | Einzige Stelle, die mit dem Backend spricht |

---

## 4. Ablauf: Was passiert bei einem Klick?

Das ist die wichtigste Frage fürs Prüfungsgespräch. Hier das Beispiel **„Speichern“ eines neuen Eintrags**:

1. Die Nutzerin klickt auf „Speichern“. `EntryForm.vue` meldet die eingegebenen Daten mit `emit("save")`
   nach oben an `App.vue`. Das Formular selbst kennt die API nicht.
2. `App.vue` ruft `createEntry(...)` in `api/client.ts` auf.
3. `client.ts` schickt `POST /api/entries` mit den Daten als JSON an das Backend.
4. Im Backend nimmt `app.ts` die Anfrage an und ruft `validation.ts` auf. Die Validierung prüft
   Pflichtfelder, erlaubte Werte, das Datum und die Fachregel („vegan nur mit Zutatenhinweisen und Quelle“).
5. **Fall A – Daten ungültig:** Das Backend antwortet mit Status `422` und einer Liste, welches Feld
   falsch ist. Das Formular zeigt die Meldungen direkt am Feld an.
6. **Fall B – Daten gültig:** `repository.ts` hängt den Eintrag an und schreibt die Datei
   `entries.json`. `analysis.ts` berechnet die Zutatenprüfung. Das Backend antwortet mit `201 Created`
   und dem neuen Eintrag.
7. `App.vue` schließt das Formular, lädt die Liste neu, und Vue zeichnet die Oberfläche neu.

> **Einfach gesagt:** Formular → App → Client → *Internet-Anfrage* → Backend prüft → Datei speichern →
> Antwort zurück → Liste neu laden → Anzeige.

### Weitere Abläufe

- **Seite öffnen / filtern:** `useEntries.ts` lädt beim Start `GET /api/entries`. Bei jeder
  Filteränderung wartet es 300 Millisekunden und fragt dann neu an, z. B.
  `GET /api/entries?diet=VEGAN&q=brezel`. Das Filtern passiert **im Backend** (`filter.ts`).
- **Bearbeiten:** wie Speichern, aber `PUT /api/entries/{id}`.
- **Löschen:** erst eine Rückfrage im Browser, dann `DELETE /api/entries/{id}`. Antwort: `204`
  (erledigt, kein Inhalt). Danach wird die Liste neu geladen.
- **Backend nicht erreichbar:** `client.ts` fängt den Fehler ab, die Oberfläche zeigt eine verständliche
  Meldung mit „Erneut versuchen“.

---

## 5. Datenmodell

Ein Eintrag (so liegt er in der JSON-Datei):

| Feld | Typ | Bedeutung | Pflicht? |
|---|---|---|---|
| `id` | Text | Eindeutige Nummer, vom Backend vergeben | automatisch |
| `name` | Text, 1–100 Zeichen | Name des Lebensmittels | ja |
| `category` | Auswahl | Backware, Mensa-Gericht, Snack, Süßware, Getränk, Sonstiges | ja |
| `ingredientNotes` | Text, bis 1000 Zeichen | Zutatenhinweise | nein* |
| `allergens` | Liste | Angegebene Allergene (14 EU-Gruppen) | nein |
| `diet` | Auswahl | `VEGAN`, `VEGETARIAN`, `NOT_VEGETARIAN`, `UNKNOWN` | ja |
| `source` | Text, bis 200 Zeichen | Woher stammt die Information? | nein* |
| `checkedAt` | Datum `JJJJ-MM-TT` | Prüfdatum, nicht in der Zukunft | ja |
| `createdAt`, `updatedAt` | Zeitstempel | Anlage und letzte Änderung, vom Backend gesetzt | automatisch |

\* Pflicht, sobald `diet` auf `VEGAN` oder `VEGETARIAN` steht.

Die **Zutatenprüfung (`analysis`)** gehört nicht zum gespeicherten Eintrag. Sie wird bei jeder Antwort
neu berechnet (Begründung: Kapitel 11).

---

## 6. Fachlogik: Die Zutatenprüfung

Die Logik steht in `backend/src/analysis.ts`.

### So funktioniert sie

1. Der Text der Zutatenhinweise wird in Kleinbuchstaben umgewandelt.
2. Wörter, die **fälschlich** treffen würden, werden vorher entfernt. Beispiele: „Hafermilch“ (enthält
   „milch“), „Kakaobutter“ (enthält „butter“), „laktosefrei“.
3. „Leberkäse“ und „Fleischkäse“ werden als Fleisch gezählt, nicht als Käse.
4. Dann sucht das Programm nach Wörtern aus sieben Gruppen:

| Gruppe | Beispiele | Wirkung |
|---|---|---|
| Fleisch und Wurst | Fleisch, Wurst, Schinken, Speck | nicht vegetarisch |
| Fisch und Meeresfrüchte | Fisch, Lachs, Garnele | nicht vegetarisch |
| Gelatine und tierisches Fett | Gelatine, Schmalz, Talg | nicht vegetarisch |
| Farb- und Überzugsstoffe | Karmin (E120), Schellack (E904) | nicht vegan |
| Milchprodukte | Milch, Butter, Käse, Sahne | nicht vegan |
| Ei und Eiprodukte | Ei, Eier, Eigelb, Mayonnaise | nicht vegan |
| Honig und Bienenprodukte | Honig, Bienenwachs | nicht vegan |

5. Kurze Wörter wie „Ei“ werden nur als **ganzes Wort** gefunden. Sonst würde „Reis“ fälschlich
   als Ei gelten.
6. Pro Gruppe zeigt die App das **ganze gefundene Wort** (z. B. „hühnerfleisch“) und eine Begründung.

### Warnungen

Die App warnt, wenn Einstufung und Treffer nicht zusammenpassen, z. B. „vegan“ trotz Fund von „Honig“.

### Beispiele

| Zutatenhinweise | Ergebnis |
|---|---|
| „Weizenmehl, Butter, Salz“ | Treffer Milchprodukte („butter“) |
| „Hafermilch, Zucker“ | kein Treffer |
| „Reis, Eiernudeln“ | Treffer Ei („eiernudeln“) |
| „Leberkäse“ | Treffer Fleisch, **nicht** Milch |
| (leer) | Hinweis: bleibt „unbekannt“ |

### Grenzen (ehrlich benannt)

- Die Liste ist klein. Nicht aufgeführte Zutaten (z. B. „Aroma“, „Vitamin D3“) werden nicht erkannt.
- „Veganer Käse“ würde als Milchprodukt markiert, weil das Programm nur Wörter vergleicht und den Sinn
  nicht versteht.
- Deshalb gilt: **Hinweis, kein Beweis**, und kein Treffer heißt nie automatisch „vegan“.

---

## 7. REST-API

> **Einfach gesagt:** Die API ist eine Art Speisekarte des Backends. Jede „Bestellung“ besteht aus einer
> Methode (was soll passieren?) und einer Adresse (womit?).

| Methode | Adresse | Wirkung | Erfolgs-Status |
|---|---|---|---|
| GET | `/api/health` | Läuft der Server? | 200 |
| GET | `/api/entries` | Liste (optional gefiltert) | 200 |
| GET | `/api/entries/{id}` | Ein Eintrag | 200 |
| POST | `/api/entries` | Neuen Eintrag anlegen | 201 |
| PUT | `/api/entries/{id}` | Eintrag ersetzen | 200 |
| DELETE | `/api/entries/{id}` | Eintrag löschen | 204 |

Filter bei der Liste: `q` (Text), `category`, `diet`, `allergen`. Alle Details mit Beispielen:
**`docs/API.md`**.

Es gibt bewusst keinen Filter „ohne Allergen X“: Ein fehlendes Allergen in den Daten bedeutet nur
„keine Angabe“. Der Filter würde eine Sicherheit vortäuschen, die es nicht gibt.

---

## 8. Validierung und Fehlerbehandlung

> **Einfach gesagt:** Das Backend glaubt dem Frontend nie blind. Jeder könnte die API auch ohne unsere
> Oberfläche aufrufen und Unsinn schicken. Deshalb prüft das Backend jede Eingabe selbst.

### Was geprüft wird

- Pflichtfelder vorhanden, Texte nicht zu lang
- Kategorie, Einstufung und Allergene stammen aus den erlaubten Listen
- Prüfdatum ist ein echtes Datum und liegt nicht in der Zukunft
- Fachregel: „vegan“/„vegetarisch“ nur mit Zutatenhinweisen **und** Quelle

### Einheitliches Fehlerformat

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Die Eingaben sind nicht gültig.",
    "details": [{ "field": "source", "message": "Für „vegan“ oder „vegetarisch“ ist eine Informationsquelle nötig. …" }]
  }
}
```

### Statuscodes in einfachen Worten

| Code | Bedeutung | Wann bei LabelLos |
|---|---|---|
| 200 | In Ordnung | Lesen und Ändern hat geklappt |
| 201 | Angelegt | Neuer Eintrag wurde gespeichert |
| 204 | In Ordnung, nichts zurückzugeben | Eintrag wurde gelöscht |
| 400 | Anfrage kaputt | Kein gültiges JSON oder ungültiger Filterwert |
| 404 | Nicht gefunden | Eintrag existiert nicht |
| 422 | Inhalt ungültig | Daten verletzen die Regeln (z. B. Name fehlt) |
| 500 | Fehler im Server | Unerwarteter Fehler (Details nur im Server-Log) |

### Im Frontend

Fehler erscheinen **am betroffenen Feld** und als allgemeine Meldung. Ladezustand („Einträge werden
geladen …“), leere Liste und Serverfehler haben jeweils eine eigene verständliche Anzeige.

---

## 9. Frontend

### Aufbau mit Vue

> **Einfach gesagt:** Die Oberfläche besteht aus kleinen Bausteinen (**Komponenten**). Jeder Baustein hat
> eine Aufgabe. Er bekommt Daten von oben (`props`) und meldet Klicks nach oben (`emit`). Ändern sich
> die Daten, zeichnet Vue die Anzeige automatisch neu.

Die Logik zum Laden und Filtern liegt in `useEntries.ts` (ein **Composable**, wiederverwendbare Logik
mit der Composition API). So bleibt `App.vue` übersichtlich.

### Barrierefreiheit (so umgesetzt)

- Jedes Eingabefeld hat ein sichtbares Label; Gruppen (Allergene, Einstufung) haben eine Überschrift
- Fehlermeldungen stehen am Feld und sind mit dem Feld verknüpft (für Screenreader)
- Bedeutung steckt im Text, nicht nur in der Farbe (z. B. das Etikett „nicht vegan“)
- Deutlich sichtbarer Fokus, vollständig per Tastatur bedienbar, „Zum Inhalt springen“-Link
- Statusmeldungen („gespeichert“, „gelöscht“) werden Screenreadern vorgelesen
- Große Klickflächen, ausreichende Kontraste, Rücksicht auf „weniger Bewegung“
- Der Hinweis, dass die App keine Garantie gibt, ist immer sichtbar

---

## 10. Persistenz (Speichern der Daten)

Die Daten liegen in `backend/data/entries.json`. Nur `repository.ts` kennt diese Datei.

- **Sicheres Schreiben:** Erst wird in eine Hilfsdatei geschrieben, dann wird sie umbenannt. So bleibt die
  Datei heil, auch wenn der Server mittendrin abstürzt.
- **Warteschlange:** Schreibvorgänge laufen nacheinander. So überschreiben sich zwei gleichzeitige
  Anfragen nicht gegenseitig.
- **Austauschbar:** Wollte man später eine Datenbank nutzen, müsste nur `repository.ts` ersetzt werden.
- **Beispieldaten:** Es gibt keine mitgelieferten Einträge mehr: Jeder Benutzer legt seine eigenen an (Datentrennung).

---

## 11. Wichtige Entscheidungen

Die ausführliche Tabelle steht in `docs/ARCHITEKTUR.md`. Hier die wichtigsten:

| Entscheidung | Begründung | Verworfene Alternative |
|---|---|---|
| Validierung im Backend | Das Backend darf nicht darauf vertrauen, dass nur unser Frontend es aufruft | Nur im Formular prüfen |
| Zutatenprüfung im Backend | Fachlogik an einer Stelle, jede künftige App profitiert | Im Frontend prüfen |
| Analyse berechnen statt speichern | Bleibt aktuell, wenn die Liste verbessert wird | Mitspeichern (veraltet schnell) |
| Strenge Fachregel für „vegan“ | Verhindert unbelegte Behauptungen | Alles erlauben |
| JSON-Datei statt Datenbank | Einfach, Architektur bleibt sichtbar | SQLite o. Ä. |
| Eigene Validierung statt Bibliothek | Keine zusätzliche Abhängigkeit, jeder Schritt erklärbar | Zod |
| `PUT` statt `PATCH` | Das Formular schickt immer alle Felder | `PATCH` |
| Reines CSS | Wenige Abhängigkeiten, volle Kontrolle über Barrierefreiheit | Bootstrap |
| Typen im Frontend separat | Echte Entkopplung, nur die API verbindet beide | Gemeinsamer Code |
| Eingeschränkte Deno-Rechte | Backend darf nur den Ordner `data` lesen/schreiben | Alle Rechte erlauben |

**Ergänzen:** Eine Entscheidung, die dir wichtig ist, schreibst du bitte in eigenen Worten dazu:
[bitte ausfüllen]

---

## 12. Installation, Start und Tests

### Voraussetzungen

Node.js (20.19+ oder 22.12+), Deno 2.x, Git, VS Code mit den Erweiterungen *Deno* und *Vue (Official)*.

### Starten (zwei Terminals)

```powershell
cd backend
deno task dev
```

Prüfen: <http://localhost:8000/api/health> zeigt `{"status":"ok"}`.

```powershell
cd frontend
npm install
npm run dev
```

Dann <http://localhost:5173> öffnen.

### Automatische Tests

```powershell
cd backend
deno task test
```

Die Tests prüfen Zutatenprüfung, Validierung und Filter (17 Testfälle in `*_test.ts`).
**Ergebnis bei mir:** [bitte nach dem Ausführen eintragen, z. B. „17 passed, 0 failed“]

Nicht automatisch getestet sind die HTTP-Routen und das Frontend. Sie werden von Hand geprüft:

### Manuelle Testliste (bitte abhaken)

- [ ] Backend startet, `/api/health` antwortet
- [ ] Die Liste zeigt die drei Beispieleinträge
- [ ] Neuer Eintrag mit gültigen Daten wird gespeichert und erscheint in der Liste
- [ ] Neuer Eintrag ohne Namen zeigt eine Fehlermeldung am Feld
- [ ] „Vegan“ ohne Quelle wird abgelehnt (Meldung erscheint)
- [ ] Zutatenhinweis „Butter“ zeigt einen Treffer „Milchprodukte“ mit Begründung
- [ ] Zutatenhinweis „Hafermilch“ zeigt keinen Treffer
- [ ] Bearbeiten ändert den Eintrag
- [ ] Löschen fragt nach und entfernt den Eintrag
- [ ] Suche und Filter verkleinern die Liste; „Filter zurücksetzen“ funktioniert
- [ ] Nach einem Neuladen der Seite sind die Daten noch da (Persistenz)
- [ ] Backend ausgeschaltet: Frontend zeigt eine verständliche Fehlermeldung
- [ ] Bedienung nur mit der Tastatur (Tab, Enter, Leertaste) ist möglich

---

## 13. Git

> **Einfach gesagt:** Git ist ein Verlaufsspeicher für deinen Code. Jeder **Commit** ist ein Speicherpunkt
> mit Beschreibung. So kannst du nachvollziehen (und nachweisen), wie das Projekt entstanden ist.

Eintragen, sobald das Repository eingerichtet ist:

- Repository-Adresse: [bitte ausfüllen]
- Grundregeln: kleine, sinnvolle Commits mit verständlichen Meldungen, z. B. „Backend: Validierung
  ergänzt“. `node_modules/` und `.env` stehen in der `.gitignore` und werden nicht hochgeladen.
- Ausgabe von `git log --oneline` als Nachweis: [bitte einfügen]

---

## 14. Reflexion

Dieses Kapitel musst du **selbst und in eigenen Worten** schreiben, denn es soll zeigen, was *du*
verstanden hast. Leitfragen:

1. Was hat gut funktioniert? Was war schwierig, und wie hast du es gelöst?
2. Was hast du über entkoppelte Architektur gelernt? (Beispiel: Was wäre bei einer Handy-App anders?)
3. Welche Entscheidung würdest du heute anders treffen und warum?
4. Wo liegen die Grenzen der Anwendung?
   - Die Zutatenliste ist klein und erkennt nur bekannte Wörter.
   - Die JSON-Datei eignet sich nicht für viele gleichzeitige Nutzer:innen.
   - Es gibt keinen Login: Jede:r darf alles ändern und löschen.
   - Frontend und HTTP-Routen sind nicht automatisch getestet.
5. Was würdest du mit mehr Zeit ergänzen? (z. B. Datenbank, Login, Barcode-Abruf über Open Food Facts
   für verpackte Produkte, mehr Tests)

Meine Reflexion: [bitte ausfüllen]

---

## 15. Quellen und Hilfsmittel

Die Themenwahl verlangt, dass auch Guides, Blogs, Vlogs und **KI-Modelle** angegeben werden.
Bitte hier nur eintragen, was du wirklich genutzt hast, und mit deiner Angabe im Moodle-Fragebogen
abgleichen.

| Quelle | Wofür genutzt |
|---|---|
| Offizielle Dokumentation: Vue, Hono, Deno, Vite, MDN Web Docs | Nachschlagen von Syntax und Konzepten |
| Folien der Lehrveranstaltung (Modulbriefing T4) | Anforderungen, Architekturidee |
| Claude (KI-Modell von Anthropic) | Projektentwurf, Beispielcode für Frontend und Backend, Erklärungen, Entwurf dieser Dokumentation |
| [weitere Quellen bitte ergänzen] | |

**Ehrlicher Hinweis zur eigenen Leistung:** Beschreibe hier in zwei bis drei Sätzen, was du selbst
geändert, ergänzt oder getestet hast und wie du den Code verstanden hast. [bitte ausfüllen]

---

## 16. Abgabe-Checkliste

> **Wichtig:** Die genauen Abgabebedingungen (Termin, Form, Umfang, Ablauf des Prüfungsgesprächs) stehen
> nicht in den Folien. Frag bei der Betreuung nach oder schau in Moodle. Diese Liste sammelt, was sich
> aus den Folien ergibt.

- [ ] Thema im Moodle-Fragebogen eingetragen und im Kurs abgesprochen
- [ ] Backend und Frontend laufen und lassen sich nach der README starten
- [ ] Alle Funktionen funktionieren: anzeigen, anlegen, bearbeiten, löschen, filtern, speichern
- [ ] `deno task test` läuft ohne Fehler
- [ ] Manuelle Testliste (Kapitel 12) abgehakt
- [ ] Git-Repository mit nachvollziehbaren Commits
- [ ] `README.md`, `docs/API.md`, `docs/ARCHITEKTUR.md` und diese Dokumentation vollständig
- [ ] Alle `[bitte ausfüllen]`-Stellen ausgefüllt
- [ ] Reflexion in eigenen Worten geschrieben
- [ ] Quellen und KI-Nutzung angegeben (stimmt mit dem Moodle-Fragebogen überein)
- [ ] Ich kann den Datenfluss (Kapitel 4) ohne Nachsehen erklären
- [ ] Abgabeform und Termin geklärt: [bitte ausfüllen]

---

## 17. Glossar

| Begriff | Einfach erklärt |
|---|---|
| **Frontend** | Der Teil, den man im Browser sieht und bedient |
| **Backend** | Das Programm im Hintergrund, das Daten prüft und speichert |
| **API** | Die Schnittstelle: Regeln, wie Frontend und Backend miteinander reden |
| **REST** | Eine übliche Art, APIs zu gestalten: Adressen für Dinge, Methoden für Aktionen |
| **HTTP** | Das Protokoll, mit dem der Browser Anfragen verschickt |
| **JSON** | Ein Textformat für Daten, z. B. `{"name": "Brezel"}` |
| **Endpunkt / Route** | Eine einzelne Adresse der API, z. B. `/api/entries` |
| **GET / POST / PUT / DELETE** | Methoden: lesen / neu anlegen / ersetzen / löschen |
| **Statuscode** | Dreistellige Zahl, die sagt, ob eine Anfrage geklappt hat (200, 404 …) |
| **Entkoppelt** | Teile sind getrennt und kennen nur die Schnittstelle zueinander |
| **Validierung** | Prüfen, ob Eingaben gültig und erlaubt sind |
| **Geschäftslogik** | Die fachlichen Regeln des Projekts (bei uns: Zutatenprüfung) |
| **Persistenz** | Dauerhaftes Speichern, sodass Daten nach dem Neustart noch da sind |
| **Repository (im Code)** | Die Klasse, die das Speichern kapselt. Nicht verwechseln mit dem Git-Repository |
| **Git / Commit / Git-Repository** | Verlaufsspeicher für Code / ein Speicherpunkt / der Ordner mit dem ganzen Verlauf |
| **CORS** | Browser-Sicherheitsregel: Das Backend muss dem Frontend ausdrücklich erlauben, es aufzurufen |
| **Vue** | Bibliothek zum Bauen von Oberflächen aus Komponenten |
| **Komponente** | Ein wiederverwendbarer Baustein der Oberfläche (eine `.vue`-Datei) |
| **Props / Emit** | Daten von oben nach unten / Meldungen von unten nach oben |
| **Composition API / Composable** | Moderne Vue-Schreibweise / ausgelagerte, wiederverwendbare Logik |
| **TypeScript** | JavaScript mit Typen. Der Editor erkennt Fehler schon beim Schreiben |
| **Vite** | Werkzeug, das das Frontend startet und baut |
| **Deno / Hono** | Laufzeitumgebung für TypeScript auf dem Server / Framework für die REST-API |
| **Barrierefreiheit** | Die Anwendung ist auch mit Tastatur, Screenreader und bei Seheinschränkung nutzbar |

---

## 18. Fragen fürs Prüfungsgespräch

Übe, jede Antwort **laut in eigenen Worten** zu sagen. Die Kurzantworten sind nur Stichworte.

1. **Was passiert, wenn ich auf „Speichern“ klicke?**
   Kapitel 4: Formular → App → Client → `POST` → Validierung → Repository → Datei → `201` → Liste neu laden.
2. **Warum prüft das Backend, obwohl das Formular schon prüft?**
   Jeder kann die API ohne unser Frontend aufrufen. Dem Client wird nicht vertraut.
3. **Was wäre, wenn wir das Vue-Frontend durch eine Handy-App ersetzen?**
   Das Backend bleibt gleich, die App nutzt dieselbe API. Genau das bedeutet Entkopplung.
4. **Wozu gibt es `repository.ts`?**
   Nur dort wird die Datei gelesen und geschrieben. Bei einer Datenbank ändert sich nur diese Datei.
5. **Warum heißt „kein Treffer“ nicht „vegan“?**
   Die Liste ist klein und unvollständig, und die App vergleicht nur Wörter.
6. **Warum gibt es die Fachregel für „vegan“?**
   Ohne Zutatenhinweise und Quelle wäre die Angabe unbelegt, sie muss „unbekannt“ bleiben.
7. **Was ist CORS und warum brauchen wir es?**
   Frontend (Port 5173) und Backend (Port 8000) sind für den Browser verschiedene Herkünfte. Das Backend
   muss den Zugriff ausdrücklich erlauben.
8. **Was bedeuten 201, 204, 404 und 422?**
   Angelegt, erledigt ohne Inhalt, nicht gefunden, Inhalt ungültig.
9. **Warum wird die Analyse nicht gespeichert?**
   Sie ist abgeleitet und bleibt so immer aktuell.
10. **Warum ist `EntryCard.vue` eine eigene Komponente?**
    Sie hat eine klare Aufgabe (einen Eintrag anzeigen), kennt die API nicht und ist wiederverwendbar.
11. **Welche Alternative hast du verworfen, und warum?** (Beispiele in Kapitel 11)
12. **Wo liegen die Grenzen deiner Anwendung?** (Kapitel 14)
