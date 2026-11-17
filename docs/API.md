# REST-API von LabelLos

Basisadresse (lokal): `http://localhost:8000` · Format: JSON (UTF-8)

## Endpunkte

| Methode | Pfad | Zweck | Erfolg |
|---|---|---|---|
| GET | `/api/health` | Läuft der Server? | 200 |
| GET | `/api/entries` | Alle Einträge, optional gefiltert | 200 |
| GET | `/api/entries/{id}` | Ein Eintrag | 200 |
| POST | `/api/entries` | Neuen Eintrag anlegen | 201 + Header `Location` |
| PUT | `/api/entries/{id}` | Eintrag komplett ersetzen | 200 |
| DELETE | `/api/entries/{id}` | Eintrag löschen | 204 (kein Inhalt) |

`PUT` ersetzt den ganzen Eintrag: Das Frontend schickt immer alle Felder. Ein `PATCH` für Teiländerungen
wurde bewusst weggelassen (das Formular schickt ohnehin alles).

### Filter für `GET /api/entries`

| Parameter | Bedeutung |
|---|---|
| `q` | Textsuche in Name, Zutatenhinweisen und Quelle |
| `category` | genau diese Kategorie |
| `diet` | `VEGAN`, `VEGETARIAN`, `NOT_VEGETARIAN` oder `UNKNOWN` |
| `allergen` | Einträge, bei denen dieses Allergen **angegeben** ist |

Es gibt absichtlich keinen Filter „ohne Allergen X“: Ein fehlendes Allergen in den Daten heißt nur „keine
Angabe“ und würde Sicherheit vortäuschen.

Beispiel: `GET /api/entries?q=brezel&diet=VEGAN`

## Datenformat eines Eintrags

Anfrage (POST/PUT):

```json
{
  "name": "Laugenbrezel",
  "category": "Backware",
  "ingredientNotes": "Weizenmehl, Wasser, Salz, Hefe",
  "allergens": ["Glutenhaltiges Getreide"],
  "diet": "VEGAN",
  "source": "Auskunft der Bäckerei",
  "checkedAt": "2026-10-13"
}
```

Antwort: dieselben Felder plus `id`, `createdAt`, `updatedAt` und die berechnete `analysis`:

```json
{
  "id": "…",
  "name": "Laugenbrezel",
  "…": "…",
  "analysis": {
    "matches": [],
    "warnings": [],
    "hint": "Keine Treffer in der Prüfliste. Das bedeutet nicht, dass der Eintrag vegan ist – die Liste ist klein und unvollständig."
  }
}
```

Mit Treffer sieht ein Element in `matches` so aus:

```json
{
  "groupId": "dairy",
  "label": "Milchprodukte",
  "level": "NOT_VEGAN",
  "reason": "Das Wort deutet auf Milch oder Milchbestandteile hin.",
  "found": ["butter"]
}
```

Die `analysis` wird bei jeder Antwort neu berechnet und **nicht** gespeichert.

## Regeln (Validierung)

- `name`: Pflicht, 1–100 Zeichen
- `category`: Pflicht, einer der festen Werte (`Backware`, `Mensa-Gericht`, `Snack`, `Süßware`, `Getränk`, `Sonstiges`)
- `ingredientNotes`: optional, max. 1000 Zeichen · `source`: optional, max. 200 Zeichen
- `allergens`: optional, Liste aus den 14 EU-Allergengruppen
- `diet`: Pflicht
- `checkedAt`: Pflicht, echtes Datum `JJJJ-MM-TT`, nicht in der Zukunft
- **Fachregel:** `VEGAN` und `VEGETARIAN` sind nur mit Zutatenhinweisen **und** Quelle erlaubt.
  Sonst muss die Einstufung `UNKNOWN` bleiben.

## Fehlerformat

Alle Fehler haben dieselbe Form:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Die Eingaben sind nicht gültig.",
    "details": [{ "field": "name", "message": "Bitte einen Namen angeben." }]
  }
}
```

| Status | `code` | Wann |
|---|---|---|
| 400 | `INVALID_JSON` | Body ist kein gültiges JSON |
| 400 | `INVALID_QUERY` | Ungültiger Filterwert |
| 404 | `NOT_FOUND` | Eintrag oder Adresse existiert nicht |
| 422 | `VALIDATION_ERROR` | Daten sind formal ok, aber inhaltlich ungültig (`details` nennt die Felder) |
| 500 | `INTERNAL_ERROR` | Unerwarteter Fehler im Server |


## Anmeldung (neu)

Alle `/api/entries`-Routen verlangen eine Anmeldung (Cookie `labellos_session`). Ohne gültige Sitzung: `401`.

| Methode | Pfad | Body | Antwort |
|---|---|---|---|
| POST | `/api/auth/register` | `{ username, password }` | `201` + `{ id, username }`, setzt Cookie · `422` ungültig · `409` Name vergeben |
| POST | `/api/auth/login` | `{ username, password }` | `200` + `{ id, username }`, setzt Cookie · `401 INVALID_CREDENTIALS` |
| POST | `/api/auth/logout` | – | `204`, Sitzung beendet |
| GET | `/api/auth/me` | – | `200` + `{ id, username }` · `401 UNAUTHENTICATED` |

Zusätzliche Statuscodes: `401` nicht angemeldet / falsche Zugangsdaten, `409` Benutzername schon vergeben.
Fremde Einträge liefern `404` (Datentrennung). Details: `docs/ANMELDUNG.md`.
