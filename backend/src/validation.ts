// validation.ts – Prüft, ob die Daten vom Frontend brauchbar sind.
// Grundregel: Dem Frontend wird Nicht vertraut. Jeder kann die API auch ohne die Oberfläche aufrufen.
// Rückgabe: entweder { ok: true, value } mit bereinigten Daten oder { ok: false, errors } mit Fehlern pro Feld.

import {
  ALLERGENS,
  CATEGORIES,
  DIETS,
  type Allergen,
  type Category,
  type Credentials,
  type Diet,
  type EntryInput,
  type FieldError,
} from "./types.ts";

export type ValidationResult =
  | { ok: true; value: EntryInput }
  | { ok: false; errors: FieldError[] };

function isOneOf<T extends readonly string[]>(
  list: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

// Prüft "2026-10-13": richtiges Format UND wirklich existierendes Datum (nicht "2026-02-31").
function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function validateEntryInput(
  body: unknown,
  now: Date = new Date(),
): ValidationResult {
  const errors: FieldError[] = [];

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      ok: false,
      errors: [{ field: "body", message: "Erwartet wird ein JSON-Objekt." }],
    };
  }
  const raw = body as Record<string, unknown>;

  // Hilfsfunktion für optionale Textfelder (fehlt das Feld, wird "" daraus).
  const optionalText = (field: string, label: string, max: number): string => {
    const value = raw[field];
    if (value === undefined || value === null) return "";
    if (typeof value !== "string") {
      errors.push({ field, message: `${label} muss Text sein.` });
      return "";
    }
    const trimmed = value.trim();
    if (trimmed.length > max) {
      errors.push({ field, message: `${label} darf höchstens ${max} Zeichen haben.` });
    }
    return trimmed;
  };

  // name
  let name = "";
  if (typeof raw.name !== "string" || raw.name.trim() === "") {
    errors.push({ field: "name", message: "Bitte einen Namen angeben." });
  } else {
    name = raw.name.trim();
    if (name.length > 100) {
      errors.push({ field: "name", message: "Der Name darf höchstens 100 Zeichen haben." });
    }
  }

  // category
  let category: Category = CATEGORIES[0];
  if (isOneOf(CATEGORIES, raw.category)) {
    category = raw.category;
  } else {
    errors.push({ field: "category", message: "Bitte eine gültige Kategorie wählen." });
  }

  // Textfelder
  const ingredientNotes = optionalText("ingredientNotes", "Die Zutatenhinweise", 1000);
  const source = optionalText("source", "Die Informationsquelle", 200);

  // allergens
  let allergens: Allergen[] = [];
  if (raw.allergens !== undefined && raw.allergens !== null) {
    if (!Array.isArray(raw.allergens)) {
      errors.push({ field: "allergens", message: "Allergene müssen eine Liste sein." });
    } else if (!raw.allergens.every((a) => isOneOf(ALLERGENS, a))) {
      errors.push({ field: "allergens", message: "Mindestens ein Allergen ist unbekannt." });
    } else {
      allergens = [...new Set(raw.allergens as Allergen[])]; // Doppelte entfernen
    }
  }

  // diet
  let diet: Diet = "UNKNOWN";
  if (isOneOf(DIETS, raw.diet)) {
    diet = raw.diet;
  } else {
    errors.push({ field: "diet", message: "Bitte eine gültige Ernährungseinstufung wählen." });
  }

  // checkedAt
  let checkedAt = "";
  if (typeof raw.checkedAt !== "string" || !isRealDate(raw.checkedAt)) {
    errors.push({ field: "checkedAt", message: "Bitte ein gültiges Prüfdatum angeben (JJJJ-MM-TT)." });
  } else {
    checkedAt = raw.checkedAt;
    // Ein Tag Toleranz, weil Server (UTC) und Browser (lokale Zeit) verschiedene "heute" haben können.
    const latestAllowed = addDays(now.toISOString().slice(0, 10), 1);
    if (checkedAt > latestAllowed) {
      errors.push({ field: "checkedAt", message: "Das Prüfdatum darf nicht in der Zukunft liegen." });
    }
  }

  //  "vegan" oder "vegetarisch" nur mit Zutatenhinweisen und Quelle.
  // Sonst muss die Einschätzung "unbekannt" bleiben.
  if (diet === "VEGAN" || diet === "VEGETARIAN") {
    if (ingredientNotes === "") {
      errors.push({
        field: "ingredientNotes",
        message: "Für „vegan“ oder „vegetarisch“ sind Zutatenhinweise nötig. Sonst bitte „unbekannt“ wählen.",
      });
    }
    if (source === "") {
      errors.push({
        field: "source",
        message: "Für „vegan“ oder „vegetarisch“ ist eine Informationsquelle nötig. Sonst bitte „unbekannt“ wählen.",
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { name, category, ingredientNotes, allergens, diet, source, checkedAt },
  };
}

// Anmeldedaten (Registrieren / Login) 

export type CredentialsResult =
  | { ok: true; value: Credentials }
  | { ok: false; errors: FieldError[] };

export function validateCredentials(body: unknown, strict: boolean): CredentialsResult {
  // strict = true beim Registrieren (Regeln prüfen), false beim Login (nur "vorhanden?").
  const errors: FieldError[] = [];
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, errors: [{ field: "body", message: "Erwartet wird ein JSON-Objekt." }] };
  }
  const raw = body as Record<string, unknown>;
  const username = typeof raw.username === "string" ? raw.username.trim() : "";
  const password = typeof raw.password === "string" ? raw.password : "";

  if (!username) {
    errors.push({ field: "username", message: "Bitte einen Benutzernamen angeben." });
  } else if (strict && !/^[A-Za-z0-9_.-]{3,30}$/.test(username)) {
    errors.push({
      field: "username",
      message: "Der Benutzername braucht 3–30 Zeichen: Buchstaben, Ziffern, _ . -",
    });
  }
  if (!password) {
    errors.push({ field: "password", message: "Bitte ein Passwort angeben." });
  } else if (strict && (password.length < 8 || password.length > 100)) {
    errors.push({ field: "password", message: "Das Passwort braucht 8–100 Zeichen." });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { username, password } };
}
