// Tests für die Zutatenprüfung. Starten mit:  deno task test
import { assert, assertEquals } from "@std/assert";
import { analyzeEntry, findMatches } from "./analysis.ts";

const groupIds = (text: string) => findMatches(text).map((m) => m.groupId);

Deno.test("Butter wird als Milchprodukt erkannt", () => {
  assertEquals(groupIds("Weizenmehl, Butter, Salz"), ["dairy"]);
});

Deno.test("Pflanzliche Zutaten lösen keinen falschen Treffer aus", () => {
  assertEquals(groupIds("Hafermilch, Kakaobutter, Sojajoghurt, Milchsäure"), []);
  assertEquals(groupIds("Reis, Orangenrinde, Pigmente, Computer"), []);
});

Deno.test("„Ei“ trifft nur als eigenes Wort", () => {
  assertEquals(groupIds("Reis, Eiernudeln"), ["egg"]);
  assertEquals(groupIds("Reis, Zucker"), []);
  assertEquals(groupIds("mit Ei"), ["egg"]);
});

Deno.test("Leberkäse zählt als Fleisch, nicht als Käse", () => {
  assertEquals(groupIds("Leberkäse"), ["meat"]);
});

Deno.test("Das ganze Wort wird als Fundstelle angezeigt", () => {
  const [match] = findMatches("Hühnerfleisch");
  assertEquals(match.found, ["hühnerfleisch"]);
});

Deno.test("Leere Zutatenhinweise: Hinweis auf „unbekannt“", () => {
  const result = analyzeEntry({ ingredientNotes: "  ", diet: "UNKNOWN" });
  assertEquals(result.matches, []);
  assert(result.hint.includes("unbekannt"));
});

Deno.test("Keine Treffer heißt nicht automatisch vegan", () => {
  const result = analyzeEntry({ ingredientNotes: "Mehl, Wasser", diet: "UNKNOWN" });
  assertEquals(result.matches, []);
  assert(result.hint.includes("nicht"));
});

Deno.test("Warnung, wenn „vegan“ und Treffer sich widersprechen", () => {
  const result = analyzeEntry({ ingredientNotes: "Mehl, Honig", diet: "VEGAN" });
  assertEquals(result.warnings.length, 1);
});

Deno.test("„vegetarisch“ mit Käse ist kein Widerspruch, mit Gelatine schon", () => {
  assertEquals(analyzeEntry({ ingredientNotes: "Käse", diet: "VEGETARIAN" }).warnings, []);
  assertEquals(
    analyzeEntry({ ingredientNotes: "Gelatine", diet: "VEGETARIAN" }).warnings.length,
    1,
  );
});
