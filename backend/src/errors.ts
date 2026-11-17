// errors.ts – Ein eigener Fehlertyp für "erwartete" Fehler (falsche Eingabe, nicht angemeldet, nicht gefunden ...).
// Die Route wirft ihn, der zentrale Fehler-Handler in app.ts macht daraus eine saubere JSON-Antwort.

import type { FieldError } from "./types.ts";

export type ErrorStatus = 400 | 401 | 404 | 409 | 422 | 500;

export class ApiError extends Error {
  status: ErrorStatus;
  code: string;
  details?: FieldError[];

  constructor(status: ErrorStatus, code: string, message: string, details?: FieldError[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
