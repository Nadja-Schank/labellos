// types.ts – Die Datenformen, die das Frontend von der API bekommt bzw. schickt.
// Das Frontend hat seine eigene Kopie: Frontend und Backend teilen keinen Code (= entkoppelt).


export const DIETS = ["VEGAN", "VEGETARIAN", "NOT_VEGETARIAN", "UNKNOWN"] as const;
export type Diet = (typeof DIETS)[number];

export const DIET_LABELS: Record<Diet, string> = {
  VEGAN: "vegan",
  VEGETARIAN: "vegetarisch",
  NOT_VEGETARIAN: "nicht vegetarisch (Fleisch/Fisch)",
  UNKNOWN: "unbekannt",
};

export const CATEGORIES = [
  "Backware",
  "Mensa-Gericht",
  "Snack",
  "Süßware",
  "Getränk",
  "Sonstiges",
] as const;
export type Category = (typeof CATEGORIES)[number];

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

export interface IngredientMatch {
  groupId: string;
  label: string;
  level: "NOT_VEGETARIAN" | "NOT_VEGAN";
  reason: string;
  found: string[];
}

export interface Analysis {
  matches: IngredientMatch[];
  warnings: string[];
  hint: string;
}

// Was das Formular schickt:
export interface EntryInput {
  name: string;
  category: Category;
  ingredientNotes: string;
  allergens: Allergen[];
  diet: Diet;
  source: string;
  checkedAt: string;
}

// Was die API zurückgibt:
export interface Entry extends EntryInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  analysis: Analysis;
}

export interface FieldError {
  field: string;
  message: string;
}

// Filter-Werte: "" bedeutet "kein Filter".
export interface FilterState {
  q: string;
  category: Category | "";
  diet: Diet | "";
  allergen: Allergen | "";
}

// Der angemeldete Benutzer ohne Passwort/Hash(das sieht das Frontend nie).
export interface PublicUser {
  id: string;
  username: string;
}

export interface Credentials {
  username: string;
  password: string;
}
