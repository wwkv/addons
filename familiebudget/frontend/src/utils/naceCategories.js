/*
 * NACE 2025 activity codes → our categories.
 *
 * The counterpart of osmCategories.js, for the local KBO index. The two answer
 * different questions and, measured on real data, different merchants: OSM maps
 * physical places (De Kampeerder, Klimzaal Blok), KBO holds registered
 * activities (Koffieland, Konditori, House of FAMM). There was zero overlap
 * between what each could answer.
 *
 * An unmapped code is still a good answer. The Dutch NACE description *is* the
 * Staatsblad activity you would otherwise go looking for by hand — the category
 * suggestion on top is a bonus, not the point.
 */

/* Keyed on the 5-digit code. KBO also carries 7-digit sub-codes
   (4755901, 9602201), so lookups take the 5-digit prefix. */
export const NACE_MAP = {
  // eten en drinken
  "56111": { cat: "eten_uit", sub: "horeca", label: "Restaurant" },
  "56112": { cat: "eten_uit", sub: "afhaal", label: "Eetgelegenheid met beperkte bediening" },
  "56120": { cat: "eten_uit", sub: "afhaal", label: "Mobiele eetgelegenheid" },
  "56210": { cat: "eten_uit", sub: "horeca", label: "Cateraar" },
  "56220": { cat: "eten_uit", sub: "horeca", label: "Cateraar" },
  "56301": { cat: "eten_uit", sub: "horeca", label: "Café of bar" },
  "56302": { cat: "ontspanning", sub: "uitstapjes", label: "Discotheek" },
  "56309": { cat: "eten_uit", sub: "horeca", label: "Drinkgelegenheid" },

  // bakkerij en voeding (vervaardiging telt hier ook: de bakker om de hoek)
  "10711": { cat: "boodschappen", sub: "bakker", label: "Bakkerij" },
  "10712": { cat: "boodschappen", sub: "bakker", label: "Ambachtelijke bakkerij" },
  "10720": { cat: "boodschappen", sub: "bakker", label: "Banketbakkerij" },
  "10520": { cat: "eten_uit", sub: "horeca", label: "IJsmakerij" },
  "10730": { cat: "boodschappen", sub: "kleine_aankopen", label: "Chocolaterie" },

  // detailhandel — voeding
  "47110": { cat: "boodschappen", sub: "supermarkt", label: "Supermarkt" },
  "47120": { cat: "boodschappen", sub: "kleine_aankopen", label: "Winkel (algemeen assortiment)" },
  "47210": { cat: "boodschappen", sub: "kleine_aankopen", label: "Groenten- en fruitwinkel" },
  "47221": { cat: "boodschappen", sub: "kleine_aankopen", label: "Slagerij" },
  "47222": { cat: "boodschappen", sub: "kleine_aankopen", label: "Slagerij" },
  "47230": { cat: "boodschappen", sub: "kleine_aankopen", label: "Viswinkel" },
  "47241": { cat: "boodschappen", sub: "bakker", label: "Broodwinkel" },
  "47242": { cat: "boodschappen", sub: "bakker", label: "Chocolade- en snoepwinkel" },
  "47251": { cat: "boodschappen", sub: "kleine_aankopen", label: "Wijnhandel" },
  "47252": { cat: "boodschappen", sub: "kleine_aankopen", label: "Drankenhandel" },
  "47271": { cat: "boodschappen", sub: "kleine_aankopen", label: "Zuivelwinkel" },
  "47279": { cat: "boodschappen", sub: "kleine_aankopen", label: "Voedingswinkel" },

  // detailhandel — non-food
  "47300": { cat: "vervoer", sub: "brandstof", label: "Tankstation" },
  "47400": { cat: "aankopen", sub: "electronica", label: "ICT-winkel" },
  "47521": { cat: "wonen", sub: "doe_het_zelf", label: "Bouwmarkt" },
  "47525": { cat: "wonen", sub: "doe_het_zelf", label: "IJzerwarenwinkel" },
  "47526": { cat: "wonen", sub: "doe_het_zelf", label: "Verfwinkel" },
  "47540": { cat: "aankopen", sub: "electronica", label: "Winkel in huishoudapparaten" },
  "47551": { cat: "wonen", sub: "meubels_interieur", label: "Meubelwinkel" },
  "47552": { cat: "wonen", sub: "meubels_interieur", label: "Verlichtingswinkel" },
  "47553": { cat: "aankopen", sub: "kleine_huishoud", label: "Winkel in huishoudartikelen" },
  "47554": { cat: "kinderen", sub: "verzorging_kind", label: "Babywinkel" },
  "47559": { cat: "aankopen", sub: "kleine_huishoud", label: "Winkel in huishoudartikelen" },
  "47610": { cat: "ontspanning", sub: "hobby_volw", label: "Boekhandel" },
  "47621": { cat: "ontspanning", sub: "hobby_volw", label: "Krantenwinkel" },
  "47622": { cat: "aankopen", sub: "overige_aankopen", label: "Kantoorboekhandel" },
  "47632": { cat: "vervoer", sub: "fiets", label: "Fietsenwinkel" },
  "47639": { cat: "ontspanning", sub: "sport", label: "Sportwinkel" },
  "47640": { cat: "kinderen", sub: "speelgoed", label: "Speelgoedwinkel" },
  "47690": { cat: "ontspanning", sub: "hobby_volw", label: "Winkel in cultuur- en recreatieartikelen" },
  "47711": { cat: "persoonlijk", sub: "kledij_rox", label: "Dameskledingwinkel" },
  "47712": { cat: "persoonlijk", sub: "kledij_ward", label: "Herenkledingwinkel" },
  "47713": { cat: "kinderen", sub: "kledij_kind", label: "Kinderkledingwinkel" },
  "47714": { cat: "persoonlijk", sub: "kledij_rox", label: "Lingeriewinkel" },
  "47715": { cat: "persoonlijk", sub: "kledij_ward", label: "Winkel in kledingaccessoires" },
  "47716": { cat: "persoonlijk", sub: "kledij_ward", label: "Kledingwinkel" },
  "47721": { cat: "persoonlijk", sub: "kledij_ward", label: "Schoenenwinkel" },
  "47722": { cat: "persoonlijk", sub: "kledij_ward", label: "Lederwarenwinkel" },
  "47730": { cat: "gezondheid", sub: "apotheek", label: "Apotheek" },
  "47741": { cat: "gezondheid", sub: "dokter", label: "Winkel in medische artikelen" },
  "47742": { cat: "gezondheid", sub: "brillen", label: "Opticien" },
  "47750": { cat: "boodschappen", sub: "drogisterij", label: "Parfumerie" },
  "47761": { cat: "aankopen", sub: "cadeaus", label: "Bloemenwinkel" },
  "47762": { cat: "aankopen", sub: "overige_aankopen", label: "Dierenwinkel" },
  "47770": { cat: "aankopen", sub: "cadeaus", label: "Juwelier" },
  "47782": { cat: "gezondheid", sub: "brillen", label: "Winkel in optiek en fotografie" },
  "47783": { cat: "boodschappen", sub: "drogisterij", label: "Drogisterij" },
  "47789": { cat: "aankopen", sub: "overige_aankopen", label: "Detailhandel" },
  "47791": { cat: "aankopen", sub: "overige_aankopen", label: "Antiekwinkel" },
  "47792": { cat: "persoonlijk", sub: "kledij_ward", label: "Tweedehandskledingwinkel" },
  "47820": { cat: "vervoer", sub: "brandstof", label: "Winkel in auto-onderdelen" },

  // diensten
  "96210": { cat: "persoonlijk", sub: "kapper", label: "Kapper" },
  "96220": { cat: "persoonlijk", sub: "kapper", label: "Schoonheidssalon" },
  "96230": { cat: "ontspanning", sub: "sport", label: "Sauna of kuuroord" },
  "96102": { cat: "wonen", sub: "woning_onderhoud", label: "Wasserette" },
  "74201": { cat: "aankopen", sub: "overige_aankopen", label: "Fotograaf" },

  // zorg
  "86210": { cat: "gezondheid", sub: "dokter", label: "Huisartsenpraktijk" },
  "86220": { cat: "gezondheid", sub: "dokter", label: "Specialist" },
  "86230": { cat: "gezondheid", sub: "dokter", label: "Tandarts" },
  "86901": { cat: "gezondheid", sub: "dokter", label: "Kinesist" },
  "86905": { cat: "gezondheid", sub: "dokter", label: "Paramedische praktijk" },
  "86101": { cat: "gezondheid", sub: "dokter", label: "Ziekenhuis" },

  // kinderen, sport, vrije tijd
  "88911": { cat: "kinderen", sub: "creche", label: "Kinderopvang" },
  "88912": { cat: "kinderen", sub: "creche", label: "Kinderopvang" },
  "85101": { cat: "kinderen", sub: "schoolkosten", label: "Kleuteronderwijs" },
  "85201": { cat: "kinderen", sub: "schoolkosten", label: "Lager onderwijs" },
  "93110": { cat: "ontspanning", sub: "sport", label: "Sportaccommodatie" },
  "93130": { cat: "ontspanning", sub: "sport", label: "Fitnesscentrum" },
  "93210": { cat: "ontspanning", sub: "uitstapjes", label: "Pretpark" },
  "93293": { cat: "ontspanning", sub: "uitstapjes", label: "Recreatiedomein" },
  "59140": { cat: "ontspanning", sub: "uitstapjes", label: "Bioscoop" },
  "91020": { cat: "ontspanning", sub: "uitstapjes", label: "Museum" },
  "55100": { cat: "ontspanning", sub: "vakantie", label: "Hotel" },
  "55201": { cat: "ontspanning", sub: "vakantie", label: "Vakantieverblijf" },
  "49320": { cat: "vervoer", sub: "taxi", label: "Taxibedrijf" },
};

/** The category a NACE code maps to, or null. Falls back to the 5-digit prefix
 *  so 7-digit sub-codes (4755901) resolve via 47559. */
export function naceCategory(code) {
  if (!code) return null;
  const c = String(code);
  return NACE_MAP[c] || NACE_MAP[c.slice(0, 5)] || null;
}

/**
 * A short sentence plus, when we recognise the trade, the category it maps to.
 * `nl` is the official NACE description straight from the register — the same
 * text you would read on the Staatsblad.
 */
export function describeNace(kbo) {
  if (!kbo || !kbo.code) return null;
  const mapped = naceCategory(kbo.code);
  return {
    summary: kbo.nl || (mapped ? mapped.label : null) || `NACE ${kbo.code}`,
    label: mapped ? mapped.label : null,
    catId: mapped ? mapped.cat : null,
    subId: mapped ? mapped.sub : null,
    code: kbo.code,
  };
}
