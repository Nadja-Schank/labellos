// filter.ts – Filtert die Einträge nach den Suchparametern aus der URL.
// Beispiel: GET /api/entries?q=brezel&category=Backware&diet=VEGAN

import { ApiError } from "./errors.ts";
import {
  ALLERGENS,
  CATEGORIES,
  DIETS,
  type Entry,
  type EntryFilter,
} from "./types.ts";

function pick<T extends readonly string[]>(
  list: T,
  value: string | undefined,
  name: string,
): T[number] | undefined {
  if (value === undefined || value === "") return undefined;
  if (!(list as readonly string[]).includes(value)) {
    throw new ApiError(400, "INVALID_QUERY", `Ungültiger Wert für „${name}“.`);
  }
  return value as T[number];
}

// Wandelt die rohen URL-Parameter in einen geprüften Filter um.
export function parseFilter(query: Record<string, string>): EntryFilter {
  return {
    q: query.q?.trim() || undefined,
    category: pick(CATEGORIES, query.category, "category"),
    diet: pick(DIETS, query.diet, "diet"),
    allergen: pick(ALLERGENS, query.allergen, "allergen"),
  };
}

// Hinweis: "allergen" findet Einträge, bei denen das Allergen angegeben ist.
// Es gibt bewusst keinen Filter "ohne Allergen X" weil er  Sicherheit vortäuschen würde.
export function filterEntries(entries: Entry[], filter: EntryFilter): Entry[] {
  const q = filter.q?.toLowerCase();
  return entries.filter((entry) => {
    if (filter.category && entry.category !== filter.category) return false;
    if (filter.diet && entry.diet !== filter.diet) return false;
    if (filter.allergen && !entry.allergens.includes(filter.allergen)) return false;
    if (q) {
      const haystack = `${entry.name} ${entry.ingredientNotes} ${entry.source}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
