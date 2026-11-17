// Tests für den Filter. Starten mit:  deno task test
import { assertEquals, assertThrows } from "@std/assert";
import { filterEntries, parseFilter } from "./filter.ts";
import { ApiError } from "./errors.ts";
import type { Entry } from "./types.ts";

const base: Omit<Entry, "id" | "name"> = {
  ownerId: "u1",
  category: "Backware",
  ingredientNotes: "",
  allergens: [],
  diet: "UNKNOWN",
  source: "",
  checkedAt: "2026-10-01",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const entries: Entry[] = [
  { ...base, id: "1", name: "Brezel", diet: "VEGAN", allergens: ["Glutenhaltiges Getreide"] },
  { ...base, id: "2", name: "Spätzle", category: "Mensa-Gericht", allergens: ["Eier"] },
];

Deno.test("Suche nach Text, Kategorie, Einstufung und Allergen", () => {
  assertEquals(filterEntries(entries, { q: "brez" }).map((e) => e.id), ["1"]);
  assertEquals(filterEntries(entries, { category: "Mensa-Gericht" }).map((e) => e.id), ["2"]);
  assertEquals(filterEntries(entries, { diet: "VEGAN" }).map((e) => e.id), ["1"]);
  assertEquals(filterEntries(entries, { allergen: "Eier" }).map((e) => e.id), ["2"]);
  assertEquals(filterEntries(entries, {}).length, 2);
});

Deno.test("Ungültige Filterwerte werden mit 400 abgelehnt", () => {
  assertThrows(() => parseFilter({ diet: "KEINE_AHNUNG" }), ApiError);
});
