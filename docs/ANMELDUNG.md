# Anmeldung, Session, Cookie, Passwort, Datentrennung

Diese Seite erklärt, wie LabelLos Benutzer unterscheidet. Sie ist bewusst **einfach** gehalten: kein Passwort-Reset,
keine E-Mail-Bestätigung, keine Rollen. Das ist eine Entscheidung (siehe unten), kein Versehen.

## Der Ablauf in 6 Schritten

1. **Registrieren** – `POST /api/auth/register` mit `{ username, password }`. Das Backend prüft die Eingabe (3–30 Zeichen
   Name, mind. 8 Zeichen Passwort) und legt den Benutzer an. Es speichert **nicht das Passwort**, sondern einen **Hash**.
2. **Session starten** – Das Backend erzeugt ein zufälliges Token (32 Bytes), merkt sich im Arbeitsspeicher
   „Token → Benutzer-id“ (`sessions.ts`) und schickt das Token im Header `Set-Cookie` zurück.
3. **Cookie** – Der Browser speichert das Cookie und schickt es ab jetzt bei **jeder** Anfrage an das Backend mit
   (im Frontend: `credentials: "include"` in `client.ts`; im Backend: CORS `credentials: true`).
4. **Geschützte Route** – Bei `/api/entries …` liest das Backend das Cookie, schlägt das Token nach und kennt so den
   Benutzer. Kein oder ungültiges Token → **401 UNAUTHENTICATED**.
5. **Datentrennung** – Jeder Eintrag trägt eine `ownerId`. `repository.ts` liefert und ändert nur Einträge mit der
   `ownerId` des angemeldeten Benutzers. Fremde Einträge → **404** (als gäbe es sie nicht).
6. **Abmelden** – `POST /api/auth/logout` löscht das Token auf dem Server und das Cookie im Browser.

## Warum ein Hash und kein Passwort?

Wenn jemand die Datei `users.json` stiehlt, soll er keine Passwörter lesen können. Ein **Hash** ist eine Einwegfunktion:
Man kann aus dem Passwort den Hash berechnen, aber nicht zurück. Beim Login hasht das Backend das eingegebene Passwort
neu und vergleicht die Hashes.

- **Salz (Salt):** Zufallswert pro Benutzer, wird mit gehasht. Gleiche Passwörter → verschiedene Hashes; vorberechnete
  Tabellen helfen Angreifern nicht.
- **PBKDF2 mit 210 000 Durchläufen:** absichtlich langsam, damit massenhaftes Raten teuer ist. Eingebaut in Web Crypto
  (`crypto.subtle`) – keine selbst erfundene Kryptografie.
- Gespeichertes Format: `pbkdf2$210000$<Salz>$<Hash>`.

## Cookie-Eigenschaften

| Eigenschaft | Bedeutung | Schutz gegen |
|---|---|---|
| `HttpOnly` | JavaScript im Browser kann das Cookie nicht lesen | Token-Diebstahl über XSS |
| `SameSite=Lax` | Cookie wird bei fremden Seiten nicht bei POST/PUT/DELETE mitgeschickt | CSRF |
| `Path=/` | gilt für die ganze API | – |
| `Max-Age` 8 h | Browser vergisst es nach 8 Stunden | – |
| `Secure` | **fehlt bewusst** – nur mit HTTPS möglich, lokal läuft HTTP | Mitlesen im Netz (im Betrieb nötig!) |

## Entscheidungen und Grenzen (offen sagen!)

| Entscheidung | Warum | Verworfen / Grenze |
|---|---|---|
| Session mit Cookie statt JWT | Server kann Sitzung jederzeit beenden; Token liegt in `HttpOnly`-Cookie | JWT: schwerer zu widerrufen, meist in `localStorage` (per XSS lesbar) |
| Sessions im Arbeitsspeicher | Einfach, kein weiterer Speicher | Neustart des Servers = alle abgemeldet; bei mehreren Servern nicht nutzbar |
| PBKDF2 (Web Crypto) | Eingebaut, kein Fremdpaket | bcrypt/argon2 wären noch besser, brauchen aber Zusatzpakete |
| Gleiche Fehlermeldung bei falschem Namen/Passwort | verrät nicht, welche Namen existieren | – |
| Kein Rate-Limit, kein Passwort-Reset | zu groß für den Projektumfang | Brute-Force-Schutz wäre die nächste Verbesserung |
| Kein HTTPS lokal | Entwicklung | Im Betrieb: HTTPS + `Secure`-Cookie |

## Wo im Code?

- `backend/src/password.ts` – Hash und Prüfung
- `backend/src/sessions.ts` – Token ↔ Benutzer
- `backend/src/users.ts` – `data/users.json`
- `backend/src/app.ts` – `/api/auth/*`, `requireUser`, Cookie-Einstellungen
- `backend/src/repository.ts` – Filter nach `ownerId`
- `frontend/src/composables/useAuth.ts`, `components/AuthForm.vue`, `App.vue` – Oberfläche
