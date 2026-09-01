/* ═══════════════════════════════════════════════════════════
   Offline merchant lexicon
   ═══════════════════════════════════════════════════════════

   Free, local, no lookup — the whole point of this file. Two layers, because
   they solve different halves of the backlog:

   BRANDS — named chains. Confidence "high", which auto-applies at the default
   autoLevel (App.jsx gates "high" through at "normaal"). Safe to auto-apply:
   recognising "Kruidvat" as a drogisterij is unambiguous and reversible.

   TRADES — generic Dutch/Flemish trade words (bakker, koffie, klimzaal…).
   Confidence "medium", which DOWNGRADES to a suggestion at the default level
   (App.jsx:238-240) — it proposes, it never writes on its own. This is the
   layer that actually matters: measured against a real 403-transaction
   backlog, only 51 counterparty names repeat at all, and ~150 distinct
   merchants appear exactly once. No brand list — however long — reaches a
   one-off independent bakery. A trade word does.

   Matched against the merchant's cleaned NAME plus the description's
   merchant-prefix (see utils/counterparty.js parseCounterparty /
   parseEvidence) — not the whole description, whose tail is city + masked
   card + wallet and would let "Antwerpen" or "Google Pay" false-trigger a
   trade word.

   Entries intentionally do NOT repeat anything already in AUTO_RULES /
   DESC_RULES (rules.js) — colruyt, delhaize, aldi, lidl, albert heijn,
   carrefour, okay, proximus/telenet, netflix/spotify, engie/luminus, frituur,
   deliveroo, apotheek, cambio, poppy, parking, ikea, brico, coolblue, bakker,
   kapper, sport/fitness/zwembad/gym, cafe/koffie are all handled there.
*/

export const BRANDS = [
  // Drogisterij
  { p: /kruidvat/i, c: "boodschappen", s: "drogisterij", v: "high", note: "drogisterijketen" },
  { p: /\bdi\b.*(antwerp|herent|mechelen|be\b)|^di\s/i, c: "boodschappen", s: "drogisterij", v: "medium", note: "DI drogisterij" },
  { p: /ici\s*paris/i, c: "boodschappen", s: "drogisterij", v: "high", note: "parfumerieketen" },
  { p: /douglas/i, c: "boodschappen", s: "drogisterij", v: "high", note: "parfumerieketen" },
  { p: /holland\s*&?\s*barrett/i, c: "boodschappen", s: "drogisterij", v: "high", note: "gezondheidswinkel" },

  // Supermarkt (chains not already in AUTO_RULES)
  { p: /\bspar\b/i, c: "boodschappen", s: "supermarkt", v: "high", note: "supermarktketen" },
  { p: /\bproxy\b/i, c: "boodschappen", s: "supermarkt", v: "high", note: "Carrefour buurtwinkel" },
  { p: /\bcrf\s*exp\b/i, c: "boodschappen", s: "supermarkt", v: "high", note: "Carrefour Express" },
  { p: /intermarch[eé]/i, c: "boodschappen", s: "supermarkt", v: "high", note: "supermarktketen" },

  // Kleding
  { p: /\bjbc\b/i, c: "persoonlijk", s: "kledij_ward", v: "high", note: "kledingketen" },
  { p: /zeeman/i, c: "persoonlijk", s: "kledij_ward", v: "high", note: "kledingketen" },
  { p: /\bveritas\b/i, c: "persoonlijk", s: "kledij_ward", v: "medium", note: "stoffen/kleding" },
  { p: /\bh\s*&?\s*m\b|^hm\s*be\d/i, c: "persoonlijk", s: "kledij_ward", v: "high", note: "kledingketen" },
  { p: /\bc\s*&?\s*a\b/i, c: "persoonlijk", s: "kledij_ward", v: "high", note: "kledingketen" },
  { p: /\bzara\b/i, c: "persoonlijk", s: "kledij_ward", v: "high", note: "kledingketen" },
  { p: /primark/i, c: "persoonlijk", s: "kledij_ward", v: "high", note: "kledingketen" },
  { p: /uniqlo/i, c: "persoonlijk", s: "kledij_ward", v: "high", note: "kledingketen" },
  { p: /\bonly\b|vero\s*moda|jack\s*&?\s*jones|bestseller/i, c: "persoonlijk", s: "kledij_ward", v: "medium", note: "kledingmerk" },
  { p: /carhartt|america\s*today|bellerose/i, c: "persoonlijk", s: "kledij_ward", v: "high", note: "kledingmerk" },

  // Kinderkleding/speelgoed
  { p: /dreambaby|dreamland/i, c: "kinderen", s: "speelgoed", v: "high", note: "speelgoedketen" },
  { p: /intertoys/i, c: "kinderen", s: "speelgoed", v: "high", note: "speelgoedketen" },
  { p: /\b4kids\b/i, c: "kinderen", s: "kledij_kind", v: "high", note: "kinderkleding" },
  { p: /\blego\b.*store|store.*\blego\b/i, c: "kinderen", s: "speelgoed", v: "high", note: "Lego Store" },

  // Sport & outdoor
  { p: /basic-?fit/i, c: "ontspanning", s: "sport", v: "high", note: "fitnessketen" },
  { p: /decathlon/i, c: "ontspanning", s: "sport", v: "high", note: "sportwinkel" },
  { p: /\bas\s*adventure\b/i, c: "ontspanning", s: "sport", v: "high", note: "outdoorwinkel" },

  // Online / algemeen
  { p: /bol\.?com/i, c: "aankopen", s: "online_overig", v: "medium", note: "webshop" },
  { p: /\baction\b/i, c: "boodschappen", s: "kleine_aankopen", v: "high", note: "budgetwinkel" },
  { p: /\bhema\b/i, c: "boodschappen", s: "kleine_aankopen", v: "high", note: "warenhuis" },
  { p: /dille\s*(en|&)\s*kamille/i, c: "aankopen", s: "kleine_huishoud", v: "high", note: "woonwinkel" },
  { p: /mediamarkt|media\s*markt/i, c: "aankopen", s: "electronica", v: "high", note: "elektronicaketen" },
  { p: /standaard\s*boekha|\bstd\s*bh\b/i, c: "aankopen", s: "overige_aankopen", v: "high", note: "boekhandel" },
  { p: /\bfnac\b/i, c: "aankopen", s: "electronica", v: "high", note: "elektronica/media" },

  // Ontspanning
  { p: /kinepolis/i, c: "ontspanning", s: "uitstapjes", v: "high", note: "bioscoopketen" },
  { p: /planckendael|zoo\s*antwerp|bellewaerde|plopsa|walibi|pairi\s*daiza/i, c: "ontspanning", s: "uitstapjes", v: "high", note: "pretpark/dierenpark" },

  // Vervoer
  { p: /\boptimobil\b/i, c: "vervoer", s: "deelwagen", v: "high", note: "Cambio-operator" },
  { p: /\btotal(?!energ)/i, c: "vervoer", s: "brandstof", v: "high", note: "tankstationketen" },
  { p: /\blukoil\b/i, c: "vervoer", s: "brandstof", v: "high", note: "tankstationketen" },
  { p: /\bshell\b/i, c: "vervoer", s: "brandstof", v: "high", note: "tankstationketen" },
  { p: /\besso\b|\btexaco\b|\bq8\b/i, c: "vervoer", s: "brandstof", v: "high", note: "tankstationketen" },
  { p: /\bflitsmeister\b/i, c: "vervoer", s: "boetes", v: "medium", note: "verkeersboete-app" },

  // Gezondheid & verzekering
  { p: /\bbenu\b/i, c: "gezondheid", s: "apotheek", v: "high", note: "apotheekketen" },
  { p: /\bag\s*insurance\b|\bag\s*so\b/i, c: "financieel", s: "overige_verzekering", v: "high", note: "verzekeraar" },
  { p: /\baxa\b/i, c: "financieel", s: "overige_verzekering", v: "high", note: "verzekeraar" },
  { p: /\bdkv\b/i, c: "gezondheid", s: "hospitalisatie", v: "high", note: "hospitalisatieverzekering" },
  { p: /\bbaloise\b/i, c: "financieel", s: "overige_verzekering", v: "high", note: "verzekeraar" },
  { p: /\bethias\b/i, c: "financieel", s: "overige_verzekering", v: "high", note: "verzekeraar" },
  { p: /doccle/i, c: "financieel", s: "bankkosten", v: "medium", note: "facturenplatform" },

  // Water / nuts (aanvulling op AUTO_RULES)
  { p: /pidpa|de\s*watergroep/i, c: "wonen", s: "energie", v: "high", note: "waterbedrijf" },
];

export const TRADES = [
  // Bakker/patisserie (aanvulling — "bakker|brood|gebak|patisserie" al gedekt)
  { p: /banket|konditor|patisser|tarte|wafel/i, c: "boodschappen", s: "bakker", v: "medium", note: "bakker/banket" },

  // Koffie & horeca (aanvulling — "cafe|koffie|drink" al gedekt)
  { p: /coffee|kaffee|espresso|barista|roaster/i, c: "eten_uit", s: "horeca", v: "medium", note: "koffiezaak" },
  { p: /brasserie|bistro|traiteur|tavern/i, c: "eten_uit", s: "horeca", v: "medium", note: "restaurant" },
  { p: /gelato|ijssalon|ice\s*cream/i, c: "eten_uit", s: "horeca", v: "medium", note: "ijssalon" },
  { p: /snackbar|snack\b|kebab|pita\b|shoarma/i, c: "eten_uit", s: "afhaal", v: "medium", note: "snackbar" },
  { p: /pizzeria|pizza\s*phone/i, c: "eten_uit", s: "afhaal", v: "medium", note: "pizzeria" },
  { p: /broodje|sandwich|lunchroom|lunchbar/i, c: "eten_uit", s: "lunch_werk", v: "medium", note: "broodjeszaak" },

  // Sport & vrije tijd (aanvulling — "sport|fitness|zwembad|gym" al gedekt)
  { p: /klimzaal|boulder|klim\s*en\b/i, c: "ontspanning", s: "sport", v: "medium", note: "klimhal" },
  { p: /sportoase|zwembad|meerminnen|piscine/i, c: "ontspanning", s: "sport", v: "medium", note: "zwembad" },
  { p: /tennisclub|padel|squash/i, c: "ontspanning", s: "sport", v: "medium", note: "sportclub" },

  // Kapper & schoonheid (aanvulling — "kapper|coiffeur|haircut" al gedekt)
  { p: /kapsalon|coiffure|barbier|hairstyl/i, c: "persoonlijk", s: "kapper", v: "medium", note: "kapper" },
  { p: /schoonheidssalon|nagelstudio|beauty\s*salon|manicure|pedicure/i, c: "persoonlijk", s: "kapper", v: "medium", note: "schoonheidssalon" },

  // Gezondheid — specialismen (nieuw, niet gedekt)
  { p: /tandarts|dentist|dent\b/i, c: "gezondheid", s: "dokter", v: "medium", note: "tandarts" },
  { p: /dermatolog|huidarts/i, c: "gezondheid", s: "dokter", v: "medium", note: "dermatoloog" },
  { p: /huisarts|huisartsenpraktijk/i, c: "gezondheid", s: "dokter", v: "medium", note: "huisarts" },
  { p: /kinesist|kinesitherap|fysiotherap/i, c: "gezondheid", s: "dokter", v: "medium", note: "kinesist" },
  { p: /\buza\b|\bgza\b|\bzas\b|ziekenhuis|az\s+[a-z]/i, c: "gezondheid", s: "dokter", v: "medium", note: "ziekenhuis" },
  { p: /dierenarts|veterinair/i, c: "boodschappen", s: "kleine_aankopen", v: "medium", note: "dierenarts" },

  // Kinderopvang (aanvulling — creche bestaat al als sub, maar geen woordherkenning)
  { p: /kinderdagverblijf|kribbe\b|onthaalouder/i, c: "kinderen", s: "creche", v: "medium", note: "kinderopvang" },
  { p: /speel-o-theek|speelotheek/i, c: "kinderen", s: "hobby_kind", v: "medium", note: "speelotheek" },

  // Winkels & diensten (nieuw)
  { p: /bloemen|bloemist|bloemerie/i, c: "aankopen", s: "cadeaus", v: "medium", note: "bloemenwinkel" },
  { p: /boekhandel|boekwinkel/i, c: "aankopen", s: "overige_aankopen", v: "medium", note: "boekhandel" },
  { p: /wasserette|stomerij|wasserij/i, c: "aankopen", s: "overige_aankopen", v: "medium", note: "stomerij" },
  { p: /fietsenmaker|fietsherstel|velo\b/i, c: "vervoer", s: "fiets", v: "medium", note: "fietsenmaker" },
  { p: /dierenwinkel|petshop|pet\s*store/i, c: "boodschappen", s: "kleine_aankopen", v: "medium", note: "dierenwinkel" },

  // Klussen & interieur (aanvulling — "ikea|leen bakker|casa" en "brico|gamma|hubo" al gedekt)
  { p: /schilder(werk)?en|behangwerk/i, c: "wonen", s: "woning_onderhoud", v: "medium", note: "schilderwerk" },
  { p: /loodgieter|elektricien|klusjesman/i, c: "wonen", s: "woning_onderhoud", v: "medium", note: "vakman" },
  { p: /tuinaanleg|tuinman|hovenier/i, c: "wonen", s: "woning_onderhoud", v: "medium", note: "tuinonderhoud" },
];
