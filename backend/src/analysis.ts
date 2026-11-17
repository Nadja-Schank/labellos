// analysis.ts – Die "Geschäftslogik" von LabelLos:
// Zutatenhinweise werden mit einer kleinen Liste tierischer Zutaten verglichen.
//
// Problem:
// - Ein Treffer ist nur ein HINWEIS 
// - KEIN Treffer heißt NICHT "vegan": Die Liste ist klein und unvollständig.
// - Ohne Zutatenhinweise bleibt die Einschätzung "unbekannt".

import type { Analysis, Diet, IngredientMatch, MatchLevel } from "./types.ts";

// "word"  = ganzes Wort (nicht Teil eines längeren Worts), z. B. "ei" soll nicht in "Reis" treffen
// "start" = Wortanfang, z. B. "eier" trifft "Eiernudeln"
// "part"  = irgendwo im Wort, z. B. "fleisch" trifft "Hühnerfleisch"
type MatchMode = "word" | "start" | "part";

interface Rule {
  term: string;
  mode: MatchMode;
}

interface Group {
  id: string;
  label: string;
  level: MatchLevel;
  reason: string;
  rules: Rule[];
}

const w = (term: string): Rule => ({ term, mode: "word" });
const s = (term: string): Rule => ({ term, mode: "start" });
const p = (term: string): Rule => ({ term, mode: "part" });

export const GROUPS: Group[] = [
  {
    id: "meat",
    label: "Fleisch und Wurst",
    level: "NOT_VEGETARIAN",
    reason: "Das Wort deutet auf Fleisch oder Wurstwaren hin.",
    rules: [
      p("fleisch"), p("wurst"), p("schinken"), p("speck"), w("bacon"),
      p("salami"), p("hähnchen"), p("hühnchen"), s("hühner"), s("huhn"),
      w("pute"), s("puten"), w("rind"), s("rinder"), p("schwein"),
      p("kalb"), w("lamm"), w("gans"), w("ente"),
    ],
  },
  {
    id: "fish",
    label: "Fisch und Meeresfrüchte",
    level: "NOT_VEGETARIAN",
    reason: "Das Wort deutet auf Fisch, Krebs- oder Weichtiere hin.",
    rules: [
      p("fisch"), p("lachs"), p("hering"), p("sardine"), p("sardelle"),
      p("anchovis"), s("forelle"), p("garnele"), p("shrimp"), p("krabbe"),
      p("muschel"), p("calamari"), p("surimi"), s("krebs"), p("kaviar"),
    ],
  },
  {
    id: "gelatin_fat",
    label: "Gelatine und tierisches Fett",
    level: "NOT_VEGETARIAN",
    reason:
      "Gelatine wird aus Knochen und Haut von Tieren gewonnen. Schmalz und Talg sind tierische Fette.",
    rules: [p("gelatine"), w("e441"), p("schmalz"), p("talg"), p("aspik"), p("knochen")],
  },
  {
    id: "insect_dye",
    label: "Farb- und Überzugsstoffe tierischer Herkunft",
    level: "NOT_VEGAN",
    reason:
      "Karmin (E120) wird aus Schildläusen gewonnen, Schellack (E904) aus dem Sekret von Lackschildläusen.",
    rules: [p("karmin"), p("cochenille"), w("e120"), p("schellack"), w("e904")],
  },
  {
    id: "dairy",
    label: "Milchprodukte",
    level: "NOT_VEGAN",
    reason: "Das Wort deutet auf Milch oder Milchbestandteile hin.",
    rules: [
      p("milch"), p("butter"), p("sahne"), s("rahm"), p("käse"), p("joghurt"),
      p("jogurt"), p("quark"), p("molke"), p("laktose"), p("lactose"),
      p("kasein"), p("casein"), w("schmand"), p("kefir"), p("mascarpone"),
      p("ricotta"), p("mozzarella"), p("parmesan"), w("feta"), p("gouda"),
      p("emmentaler"), p("cheddar"), w("ghee"), p("fraîche"), p("fraiche"),
    ],
  },
  {
    id: "egg",
    label: "Ei und Eiprodukte",
    level: "NOT_VEGAN",
    reason:
      "Das Wort deutet auf Ei hin. „Eiweiß“ kann Hühnereiweiß sein – bitte prüfen. Mayonnaise enthält meist Ei.",
    rules: [
      w("ei"), s("eier"), p("eigelb"), w("eiweiß"), w("eiweiss"), p("eiklar"),
      p("eipulver"), p("vollei"), p("hühnerei"), p("eischnee"), p("rührei"),
      p("spiegelei"), p("mayonnaise"), p("majonäse"),
    ],
  },
  {
    id: "honey_wax",
    label: "Honig und Bienenprodukte",
    level: "NOT_VEGAN",
    reason: "Honig, Bienenwachs (E901) und Propolis stammen von Bienen.",
    rules: [p("honig"), p("bienenwachs"), w("e901"), p("propolis")],
  },
];

// Diese Wörter würden fälschlich treffen (z. B. "Hafermilch" enthält "milch").
// Ich ersetze sie VOR der Suche durch ein Leerzeichen bzw. ein anderes Wort.
const REPLACEMENTS: Array<[string, string]> = [
  ["hafermilch", " "], ["sojamilch", " "], ["mandelmilch", " "],
  ["kokosmilch", " "], ["reismilch", " "], ["pflanzenmilch", " "],
  ["kakaobutter", " "], ["kokosbutter", " "], ["sheabutter", " "],
  ["erdnussbutter", " "], ["mandelbutter", " "],
  ["sojajoghurt", " "], ["pflanzenjoghurt", " "], ["kokosjoghurt", " "],
  ["milchsäure", " "], ["laktosefrei", " "], ["milchfrei", " "],
  ["eifrei", " "], ["ohne ei", " "], ["ohne milch", " "],
  // Leberkäse enthält keinen Käse, sondern Fleisch:
  ["leberkäse", "fleischwaren"], ["fleischkäse", "fleischwaren"],
];

const LETTER_OR_DIGIT = "[\\p{L}\\p{N}]";

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegex(rule: Rule): RegExp {
  const term = escapeRegex(rule.term);
  switch (rule.mode) {
    case "word":
      return new RegExp(`(?<!${LETTER_OR_DIGIT})${term}(?!${LETTER_OR_DIGIT})`, "gu");
    case "start":
      return new RegExp(`(?<!${LETTER_OR_DIGIT})${term}`, "gu");
    default:
      return new RegExp(term, "gu");
  }
}

// Reguläre Ausdrücke einmal beim Start bauen, nicht bei jeder Anfrage.
const COMPILED = GROUPS.map((group) => ({
  group,
  regexes: group.rules.map(buildRegex),
}));

export function normalize(text: string): string {
  let result = text.toLowerCase();
  result = result.replace(/\be\s+(\d{3})\b/g, "e$1"); // "E 120" -> "e120"
  for (const [from, to] of REPLACEMENTS) {
    result = result.split(from).join(to);
  }
  return result;
}

// Gibt das ganze Wort rund um einen Treffer zurück ("hühnerfleisch" statt nur "fleisch").
function wordAround(text: string, index: number, length: number): string {
  const isLetter = (ch: string | undefined) => !!ch && /[\p{L}\p{N}]/u.test(ch);
  let start = index;
  let end = index + length;
  while (start > 0 && isLetter(text[start - 1])) start--;
  while (end < text.length && isLetter(text[end])) end++;
  return text.slice(start, end);
}

export function findMatches(ingredientNotes: string): IngredientMatch[] {
  const text = normalize(ingredientNotes);
  const matches: IngredientMatch[] = [];

  for (const { group, regexes } of COMPILED) {
    const found = new Set<string>();
    for (const regex of regexes) {
      regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        found.add(wordAround(text, m.index, m[0].length));
        if (m[0].length === 0) regex.lastIndex++; // Sicherheit gegen Endlosschleifen
      }
    }
    if (found.size > 0) {
      matches.push({
        groupId: group.id,
        label: group.label,
        level: group.level,
        reason: group.reason,
        found: [...found],
      });
    }
  }
  return matches;
}

export function analyzeEntry(
  entry: { ingredientNotes: string; diet: Diet },
): Analysis {
  const notes = entry.ingredientNotes.trim();
  const matches = notes === "" ? [] : findMatches(notes);
  const warnings: string[] = [];

  const describe = (list: IngredientMatch[]) =>
    list.map((m) => `${m.label} (${m.found.join(", ")})`).join("; ");

  if (entry.diet === "VEGAN" && matches.length > 0) {
    warnings.push(
      `Eingestuft als „vegan“, aber mögliche tierische Zutaten gefunden: ${describe(matches)}. Bitte Einstufung und Zutaten prüfen.`,
    );
  }
  const notVegetarian = matches.filter((m) => m.level === "NOT_VEGETARIAN");
  if (entry.diet === "VEGETARIAN" && notVegetarian.length > 0) {
    warnings.push(
      `Eingestuft als „vegetarisch“, aber mögliche Zutaten gefunden, die nicht vegetarisch sind: ${describe(notVegetarian)}. Bitte prüfen.`,
    );
  }
  if ((entry.diet === "VEGAN" || entry.diet === "VEGETARIAN") && notes === "") {
    warnings.push(
      "Die Einstufung ist nicht durch Zutatenhinweise belegt. Sie sollte „unbekannt“ sein.",
    );
  }

  let hint: string;
  if (notes === "") {
    hint =
      "Keine Zutatenhinweise vorhanden. Ohne verlässliche Angaben bleibt die Einschätzung „unbekannt“.";
  } else if (matches.length === 0) {
    hint =
      "Keine Treffer in der Prüfliste. Das bedeutet nicht, dass der Eintrag vegan ist – die Liste ist klein und unvollständig.";
  } else {
    hint = `${matches.length} ${
      matches.length === 1 ? "Gruppe" : "Gruppen"
    } möglicher tierischer Zutaten gefunden. Bitte prüfen – ein Treffer ist ein Hinweis, kein Beweis.`;
  }

  return { matches, warnings, hint };
}
