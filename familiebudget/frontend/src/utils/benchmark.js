/* ═══════════════════════════════════════════════════════════
   National spending benchmark — Statbel Huishoudbudgetonderzoek
   ═══════════════════════════════════════════════════════════

   Source: Statbel (Belgian statistical office), Household Budget Survey
   (Huishoudbudgetonderzoek / HBS), 2024 edition, ~5.500 surveyed households.
   https://statbel.fgov.be/nl/themas/huishoudens/huishoudbudget

   IMPORTANT — why this compares SHARES (%) and not euro amounts:

   Statbel publishes this breakdown as a percentage distribution of the
   total household budget. It does NOT publish (on the public figures page)
   absolute euro amounts broken down by household composition. So we cannot
   honestly say "a family of 4 spends €X on groceries" — that number is not
   in the source data, and inventing one for a finance app would be worse
   than useless.

   What we CAN say honestly: "housing is 38% of your spending; nationally
   it averages 30,6%". That comparison is meaningful, is directly supported
   by the source, and has the useful side effect of being income-neutral —
   a household earning twice the average still has a comparable *shape*.

   If Statbel later publishes per-household-type absolute figures, add them
   as a second dataset; `kind: "benchmark"` in comparison.js is written so
   another benchmark source can slot in without touching the UI.
*/

export const BENCHMARK_META = {
  source: "Statbel — Huishoudbudgetonderzoek",
  year: "2024",
  url: "https://statbel.fgov.be/nl/themas/huishoudens/huishoudbudget",
  note: "Gemiddelde verdeling van het huishoudbudget in België. Vergelijking op basis van aandeel (%), niet op bedrag.",
};

/* COICOP groups as published, with their share of the total household budget.
   These 10 groups sum to 100%. */
export const BENCHMARK_GROUPS = [
  { id: "wonen_nuts", name: "Wonen, water, energie", share: 30.6 },
  { id: "voeding", name: "Voeding & niet-alcoholische dranken", share: 14.0 },
  { id: "vervoer", name: "Vervoer", share: 11.7 },
  { id: "overig", name: "Overige uitgaven", share: 13.3 },
  { id: "ontspanning", name: "Ontspanning & cultuur", share: 7.9 },
  { id: "horeca", name: "Restaurants & hotels", share: 7.3 },
  { id: "inrichting", name: "Inrichting & huishoudtoestellen", share: 5.0 },
  { id: "gezondheid", name: "Gezondheid", share: 4.8 },
  { id: "kleding", name: "Kleding & schoenen", share: 3.7 },
  { id: "alcohol_tabak", name: "Alcohol & tabak", share: 1.7 },
];

/* Map the app's own subcategories onto the COICOP groups above.
   Keyed by subcategory id (see utils/constants.js). The app's categories were
   designed around how this household actually thinks about money, not around
   COICOP, so the mapping is deliberately explicit rather than derived — and
   anything not listed here falls into "overig", which is exactly what the
   COICOP "Overige uitgaven" bucket is for. */
export const SUB_TO_BENCHMARK = {
  // Wonen, water, energie
  lening: "wonen_nuts",
  eigendomsbelasting: "wonen_nuts",
  verzekering_wonen: "wonen_nuts",
  energie: "wonen_nuts",
  woning_onderhoud: "wonen_nuts",

  // Voeding
  supermarkt: "voeding",
  bakker: "voeding",

  // Vervoer
  deelwagen: "vervoer",
  huurauto: "vervoer",
  brandstof: "vervoer",
  ov: "vervoer",
  fiets: "vervoer",
  parking: "vervoer",
  taxi: "vervoer",

  // Ontspanning & cultuur
  abonnementen: "ontspanning",
  vakantie: "ontspanning",
  sport: "ontspanning",
  uitstapjes: "ontspanning",
  hobby_volw: "ontspanning",
  hobby_kind: "ontspanning",
  speelgoed: "ontspanning",

  // Restaurants & hotels
  horeca: "horeca",
  afhaal: "horeca",
  lunch_werk: "horeca",

  // Inrichting & huishoudtoestellen
  meubels_interieur: "inrichting",
  doe_het_zelf: "inrichting",
  kleine_aankopen: "inrichting",
  kleine_huishoud: "inrichting",

  // Gezondheid
  dokter: "gezondheid",
  apotheek: "gezondheid",
  hospitalisatie: "gezondheid",
  mutualiteit: "gezondheid",
  brillen: "gezondheid",

  // Kleding & schoenen
  kledij_kind: "kleding",
  kledij_ward: "kleding",
  kledij_rox: "kleding",
  // (everything else -> "overig")
};

export function benchmarkGroupFor(subId) {
  return SUB_TO_BENCHMARK[subId] || "overig";
}

/* Aggregate real spending into the COICOP groups, as shares of total. */
export function spendingByBenchmarkGroup(txs, cats, isExcluded) {
  const byGroup = {};
  for (const g of BENCHMARK_GROUPS) byGroup[g.id] = 0;
  let total = 0;
  for (const t of txs) {
    if (t.amount >= 0) continue;
    if (isExcluded && isExcluded(t)) continue;
    const amt = Math.abs(t.amount);
    // Uncategorised spending can't be attributed to a group; leaving it out
    // of both numerator and denominator keeps the shares honest.
    if (!t.subCategoryId) continue;
    byGroup[benchmarkGroupFor(t.subCategoryId)] += amt;
    total += amt;
  }
  return { byGroup, total };
}
