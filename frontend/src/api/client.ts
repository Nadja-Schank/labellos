// client.ts – Der einzige Ort im Frontend, der mit dem Backend spricht (fetch).
// Komponenten rufen nur diese Funktionen auf und kennen keine URLs.

import type { Credentials, Entry, EntryInput, FieldError, FilterState, PublicUser } from "../types";

const BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Ein eigener Fehlertyp, damit die Oberfläche Fehler gut anzeigen kann.
export class ApiRequestError extends Error {
  status: number;
  code: string;
  fieldErrors: FieldError[];

  constructor(status: number, code: string, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

// Wird aufgerufen, wenn der Server "nicht angemeldet" (401) meldet, z. B. weil die Sitzung abgelaufen ist.
// App.vue setzt hier eine Funktion ein, die zur Anmeldeseite zurückschaltet.
let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    // Content-Type nur setzen, wenn wir wirklich JSON senden (sonst unnötiger CORS-Vorabcheck).
    const headers = init.body ? { "Content-Type": "application/json" } : undefined;
    // credentials: "include" = das Session-Cookie wird bei jeder Anfrage an das Backend mitgeschickt.
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers, credentials: "include" });
  } catch {
    throw new ApiRequestError(
      0,
      "NETWORK_ERROR",
      "Der Server ist nicht erreichbar. Läuft das Backend (Port 8000)?",
    );
  }

  if (response.status === 204) return undefined as T; // "kein Inhalt" (z. B. nach dem Löschen)

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body?.error;
    // 401 bei einer geschützten Adresse = Sitzung weg. (Falsches Passwort beim Login zeigt nur die Meldung.)
    if (response.status === 401 && error?.code === "UNAUTHENTICATED") onUnauthorized();
    throw new ApiRequestError(
      response.status,
      error?.code ?? "UNKNOWN_ERROR",
      error?.message ?? `Unerwarteter Fehler (Status ${response.status}).`,
      error?.details ?? [],
    );
  }
  return body as T;
}

export function listEntries(filter: FilterState): Promise<Entry[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return request<Entry[]>(`/api/entries${query ? `?${query}` : ""}`);
}

export function createEntry(input: EntryInput): Promise<Entry> {
  return request<Entry>("/api/entries", { method: "POST", body: JSON.stringify(input) });
}

export function updateEntry(id: string, input: EntryInput): Promise<Entry> {
  return request<Entry>(`/api/entries/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteEntry(id: string): Promise<void> {
  return request<void>(`/api/entries/${id}`, { method: "DELETE" });
}

// ---- Anmeldung ----
export function register(credentials: Credentials): Promise<PublicUser> {
  return request<PublicUser>("/api/auth/register", { method: "POST", body: JSON.stringify(credentials) });
}

export function login(credentials: Credentials): Promise<PublicUser> {
  return request<PublicUser>("/api/auth/login", { method: "POST", body: JSON.stringify(credentials) });
}

export function logout(): Promise<void> {
  return request<void>("/api/auth/logout", { method: "POST" });
}

// Beim Start der Seite: Bin ich (noch) angemeldet?
export function fetchMe(): Promise<PublicUser> {
  return request<PublicUser>("/api/auth/me");
}
