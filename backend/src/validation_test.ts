// Tests für die Validierung. Starten mit:  deno task test
import { assert, assertEquals } from "@std/assert";
import { validateEntryInput } from "./validation.ts";

const NOW = new Date("2026-10-13T10:00:00Z");

const valid = {
  name: "  Laugenbrezel ",
  category: "Backware",
  ingredientNotes: "Mehl, Wasser",
  allergens: ["Glutenhaltiges Getreide", "Glutenhaltiges Getreide"],
  diet: "VEGAN",
  source: "Aushang",
  checkedAt: "2026-10-13",
};

Deno.test("Gültige Eingabe wird bereinigt (trim, Duplikate)", () => {
  const result = validateEntryInput(valid, NOW);
  assert(result.ok);
  if (result.ok) {
    assertEquals(result.value.name, "Laugenbrezel");
    assertEquals(result.value.allergens, ["Glutenhaltiges Getreide"]);
  }
});

Deno.test("Pflichtfelder fehlen -> Fehler pro Feld", () => {
  const result = validateEntryInput({}, NOW);
  assert(!result.ok);
  if (!result.ok) {
    const fields = result.errors.map((e) => e.field);
    assert(fields.includes("name"));
    assert(fields.includes("category"));
    assert(fields.includes("diet"));
    assert(fields.includes("checkedAt"));
  }
});

Deno.test("„vegan“ ohne Zutatenhinweise und Quelle wird abgelehnt", () => {
  const result = validateEntryInput({ ...valid, ingredientNotes: "", source: "" }, NOW);
  assert(!result.ok);
  if (!result.ok) {
    const fields = result.errors.map((e) => e.field);
    assert(fields.includes("ingredientNotes"));
    assert(fields.includes("source"));
  }
});

Deno.test("„unbekannt“ ohne Zutatenhinweise ist erlaubt", () => {
  const result = validateEntryInput(
    { ...valid, diet: "UNKNOWN", ingredientNotes: "", source: "" },
    NOW,
  );
  assert(result.ok);
});

Deno.test("Ungültiges oder zukünftiges Datum wird abgelehnt", () => {
  assert(!validateEntryInput({ ...valid, checkedAt: "2026-02-31" }, NOW).ok);
  assert(!validateEntryInput({ ...valid, checkedAt: "13.10.2026" }, NOW).ok);
  assert(!validateEntryInput({ ...valid, checkedAt: "2027-01-01" }, NOW).ok);
});

Deno.test("Kein Objekt im Body wird abgelehnt", () => {
  assert(!validateEntryInput("hallo", NOW).ok);
  assert(!validateEntryInput([], NOW).ok);
  assert(!validateEntryInput(null, NOW).ok);
});
