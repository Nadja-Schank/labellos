// types.ts – Hier steht, wie die Daten aussehen.
// TypeScript prüft damit, dass wir überall dieselben Feldnamen benutzen.

// Erlaubte Werte für die Ernährungseinstufung.
export const DIETS = ["VEGAN", "VEGETARIAN", "NOT_VEGETARIAN", "UNKNOWN"] as const;
export type Diet = (typeof DIETS)[number];

export const CATEGORIES = [
  "Backware",
  "Mensa-Gericht",
  "Snack",
  "Süßware",
  "Getränk",
  "Sonstiges",
] as const;
export type Category = (typeof CATEGORIES)[number];

// Die 14 in der EU kennzeichnungspflichtigen Allergengruppen.
export const ALLERGENS = [
  "Glutenhaltiges Getreide",
  "Krebstiere",
  "Eier",
  "Fisch",
  "Erdnüsse",
  "Soja",
  "Milch",
  "Schalenfrüchte",
  "Sellerie",
  "Senf",
  "Sesam",
  "Sulfite",
  "Lupinen",
  "Weichtiere",
] as const;
export type Allergen = (typeof ALLERGENS)[number];

// Das schickt das Frontend beim Anlegen/Ändern (ohne id und Zeitstempel).
export interface EntryInput {
  name: string;
  category: Category;
  ingredientNotes: string;
  allergens: Allergen[];
  diet: Diet;
  source: string;
  checkedAt: string; // Datum als Text: "2026-10-13"
}

// Das wird in der JSON-Datei gespeichert.
export interface Entry extends EntryInput {
  id: string;
  ownerId: string; // wem der Eintrag gehört (id des Benutzers) – Grundlage der Datentrennung
  createdAt: string; // ISO-Zeitstempel
  updatedAt: string;
}

// "Level" sagt, wie stark ein Treffer gegen vegetarisch/vegan spricht.
export type MatchLevel = "NOT_VEGETARIAN" | "NOT_VEGAN";

export interface IngredientMatch {
  groupId: string;
  label: string; // z. B. "Milchprodukte"
  level: MatchLevel;
  reason: string; // Begründung für die Anzeige
  found: string[]; // die gefundenen Wörter aus den Zutatenhinweisen
}

export interface Analysis {
  matches: IngredientMatch[];
  warnings: string[];
  hint: string;
}

// Das liefert die API aus: der Eintrag PLUS die berechnete Analyse.
export interface EntryResponse extends Entry {
  analysis: Analysis;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface EntryFilter {
  q?: string;
  category?: Category;
  diet?: Diet;
  allergen?: Allergen;
}

// Ein Benutzerkonto. Das Passwort selbst wird nie gespeichert, nur der Hash.
export interface User {
  id: string;
  username: string;
  passwordHash: string; // Format: pbkdf2$Durchläufe$Salt$Hash
  createdAt: string;
}

// Das sieht das Frontend von einem Benutzer (ohne Hash!).
export interface PublicUser {
  id: string;
  username: string;
}

export interface Credentials {
  username: string;
  password: string;
}
