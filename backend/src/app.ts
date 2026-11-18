// app.ts – Die REST-API. Hier werden Adressen (Routen) mit Funktionen verbunden.
// Ablauf pro Anfrage:  Route -> angemeldet? -> validieren -> Repository (Datei) -> Analyse -> JSON-Antwort

import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { analyzeEntry } from "./analysis.ts";
import { ApiError } from "./errors.ts";
import { filterEntries, parseFilter } from "./filter.ts";
import { hashPassword, verifyPassword } from "./password.ts";
import type { EntryRepository } from "./repository.ts";
import { SESSION_HOURS, type SessionStore } from "./sessions.ts";
import type { Entry, EntryResponse, FieldError, PublicUser } from "./types.ts";
import type { UserRepository } from "./users.ts";
import { validateCredentials, validateEntryInput } from "./validation.ts";

const SESSION_COOKIE = "labellos_session";

// Die Analyse wird bei jeder Antwort frisch berechnet und NICHT gespeichert.
// So bleibt sie aktuell, wenn ich die Liste tierischer Zutaten verbessere.
function toResponse(entry: Entry): EntryResponse {
  return { ...entry, analysis: analyzeEntry(entry) };
}

export interface Dependencies {
  entries: EntryRepository;
  users: UserRepository;
  sessions: SessionStore;
}

export function createApp(
  { entries: repo, users, sessions }: Dependencies,
  allowedOrigins: string[] = ["http://localhost:5173", "http://127.0.0.1:5173"],
): Hono {
  const app = new Hono();

  // CORS: Der Browser erlaubt dem Frontend (Port 5173) nur dann, das Backend (Port 8000)
  // aufzurufen, wenn das Backend es ausdrücklich erlaubt.
  app.use("/api/*", cors({
    origin: allowedOrigins,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    credentials: true, // erlaubt dem Browser, das Session-Cookie mitzuschicken
  }));

  // Wer ist angemeldet? Liest das Cookie, fragt den Session-Speicher. Ohne gültige Sitzung: 401.
  const requireUser = async (c: Context): Promise<PublicUser> => {
    const userId = sessions.getUserId(getCookie(c, SESSION_COOKIE));
    const user = userId ? await users.findById(userId) : undefined;
    if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Bitte zuerst anmelden.");
    return { id: user.id, username: user.username };
  };

  // Das Cookie: HttpOnly (JavaScript im Browser kommt nicht dran), SameSite=Lax (Schutz vor CSRF).
  const startSession = (c: Context, userId: string) => {
    setCookie(c, SESSION_COOKIE, sessions.create(userId), {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: SESSION_HOURS * 3600,
    });
  };

  // ---- Anmeldung ----
  app.post("/api/auth/register", async (c) => {
    const result = validateCredentials(await readJson(c.req), true);
    if (!result.ok) throw validationError(result.errors);
    const user = await users.create(result.value.username, await hashPassword(result.value.password));
    if (!user) throw new ApiError(409, "USERNAME_TAKEN", "Dieser Benutzername ist schon vergeben.");
    startSession(c, user.id);
    return c.json({ id: user.id, username: user.username } satisfies PublicUser, 201);
  });

  app.post("/api/auth/login", async (c) => {
    const result = validateCredentials(await readJson(c.req), false);
    if (!result.ok) throw validationError(result.errors);
    const user = await users.findByUsername(result.value.username);
    // Immer dieselbe Meldung, egal ob Name oder Passwort falsch ist (verrät nicht, welche Namen existieren).
    const ok = user ? await verifyPassword(result.value.password, user.passwordHash) : false;
    if (!user || !ok) throw new ApiError(401, "INVALID_CREDENTIALS", "Benutzername oder Passwort ist falsch.");
    startSession(c, user.id);
    return c.json({ id: user.id, username: user.username } satisfies PublicUser);
  });

  app.post("/api/auth/logout", (c) => {
    sessions.destroy(getCookie(c, SESSION_COOKIE));
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.body(null, 204);
  });

  // Das Frontend fragt beim Start: "Bin ich noch angemeldet?"
  app.get("/api/auth/me", async (c) => c.json(await requireUser(c)));

  app.get("/api/health", (c) => c.json({ status: "ok" }));

  // Alle Einträge des angemeldeten Benutzers
  app.get("/api/entries", async (c) => {
    const user = await requireUser(c);
    const filter = parseFilter(c.req.query());
    const all = await repo.list(user.id);
    const result = filterEntries(all, filter)
      .sort((a, b) => a.name.localeCompare(b.name, "de"))
      .map(toResponse);
    return c.json(result);
  });

  // Ein Eintrag
  app.get("/api/entries/:id", async (c) => {
    const user = await requireUser(c);
    const entry = await repo.get(c.req.param("id"), user.id);
    if (!entry) throw notFound();
    return c.json(toResponse(entry));
  });

  // Neuen Eintrag anlegen
  app.post("/api/entries", async (c) => {
    const user = await requireUser(c);
    const body = await readJson(c.req);
    const result = validateEntryInput(body);
    if (!result.ok) throw validationError(result.errors);
    const created = await repo.create(result.value, user.id);
    c.header("Location", `/api/entries/${created.id}`);
    return c.json(toResponse(created), 201);
  });

  // Eintrag komplett ersetzen (PUT = alle Felder werden neu geschickt)
  app.put("/api/entries/:id", async (c) => {
    const user = await requireUser(c);
    const body = await readJson(c.req);
    const result = validateEntryInput(body);
    if (!result.ok) throw validationError(result.errors);
    const updated = await repo.update(c.req.param("id"), user.id, result.value);
    if (!updated) throw notFound();
    return c.json(toResponse(updated));
  });

  // Eintrag löschen
  app.delete("/api/entries/:id", async (c) => {
    const user = await requireUser(c);
    const removed = await repo.remove(c.req.param("id"), user.id);
    if (!removed) throw notFound();
    return c.body(null, 204); // 204 = "erledigt, kein Inhalt"
  });

  // Unbekannte Adresse
  app.notFound((c) =>
    c.json({ error: { code: "NOT_FOUND", message: "Diese Adresse gibt es nicht." } }, 404)
  );

  // Zentrale Fehlerbehandlung: ALLE geworfenen Fehler landen hier.
  app.onError((err, c) => {
    if (err instanceof ApiError) {
      return c.json(
        { error: { code: err.code, message: err.message, details: err.details } },
        err.status,
      );
    }
    console.error(err); // Details nur im Server-Log, nicht an den Browser
    return c.json(
      { error: { code: "INTERNAL_ERROR", message: "Interner Serverfehler. Bitte später erneut versuchen." } },
      500,
    );
  });

  return app;
}

function notFound(): ApiError {
  return new ApiError(404, "NOT_FOUND", "Eintrag nicht gefunden.");
}

function validationError(details: FieldError[]): ApiError {
  return new ApiError(422, "VALIDATION_ERROR", "Die Eingaben sind nicht gültig.", details);
}

async function readJson(req: { json: () => Promise<unknown> }): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Der Request-Body ist kein gültiges JSON.");
  }
}
