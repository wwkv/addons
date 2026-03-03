/* Default categories for Belgian household budget */
export const DEFAULT_CATEGORIES = [
  { id: "wonen", name: "Wonen & Vaste Lasten", type: "uitgaven", color: "#2D5A7B", subs: [
    { id: "lening", name: "Lening", label: "vast" },
    { id: "eigendomsbelasting", name: "Eigendomsbelasting", label: "variabel" },
    { id: "verzekering_wonen", name: "Verzekering", label: "luxe" },
    { id: "energie", name: "Energie & Water", label: "variabel" },
    { id: "internet_telefonie", name: "Internet & Telefonie", label: "vast" },
    { id: "abonnementen", name: "Abonnementen (Streaming)", label: "luxe" },
    { id: "dienstencheques", name: "Dienstencheques", label: "variabel" },
    { id: "woning_onderhoud", name: "Woning Onderhoud", label: "variabel" },
    { id: "meubels_interieur", name: "Meubels & Interieur", label: "luxe" },
    { id: "doe_het_zelf", name: "Doe-het-zelf & Tuin", label: "variabel" },
  ]},
  { id: "kinderen", name: "Kinderen", type: "uitgaven", color: "#C06E52", subs: [
    { id: "creche", name: "Crèche", label: "vast" },
    { id: "schoolkosten", name: "Schoolkosten", label: "variabel" },
    { id: "opvang_babysit", name: "Opvang & Babysit", label: "variabel" },
    { id: "verzorging_kind", name: "Verzorging Kinderen", label: "variabel" },
    { id: "kledij_kind", name: "Kleding & Schoenen Kinderen", label: "variabel" },
    { id: "speelgoed", name: "Speelgoed & Boeken", label: "luxe" },
    { id: "hobby_kind", name: "Hobby's Kinderen", label: "luxe" },
  ]},
  { id: "boodschappen", name: "Boodschappen & Huishouden", type: "uitgaven", color: "#4A7C59", subs: [
    { id: "supermarkt", name: "Supermarkt", label: "variabel" },
    { id: "drogisterij", name: "Drogisterij & Verzorging", label: "variabel" },
    { id: "kleine_aankopen", name: "Kleine Aankopen Huis", label: "variabel" },
    { id: "bakker", name: "Bakker & Kleinhandel", label: "variabel" },
  ]},
  { id: "gezondheid", name: "Gezondheid", type: "uitgaven", color: "#7B6B8D", subs: [
    { id: "dokter", name: "Dokter & Ziekenhuis", label: "variabel" },
    { id: "apotheek", name: "Apotheek & Medicatie", label: "variabel" },
    { id: "hospitalisatie", name: "Hospitalisatieverzekering", label: "vast" },
    { id: "mutualiteit", name: "Mutualiteit", label: "vast" },
    { id: "brillen", name: "Brillen & Lenzen", label: "variabel" },
  ]},
  { id: "eten_uit", name: "Eten & Drinken (Buiten)", type: "uitgaven", color: "#D4845A", subs: [
    { id: "horeca", name: "Horeca & Tussendoortjes", label: "luxe" },
    { id: "afhaal", name: "Afhaal & Frituur", label: "luxe" },
    { id: "lunch_werk", name: "Lunch op het werk", label: "variabel" },
  ]},
  { id: "ontspanning", name: "Ontspanning & Vrije Tijd", type: "uitgaven", color: "#5B8C6D", subs: [
    { id: "vakantie", name: "Vakantie & Weekends", label: "luxe" },
    { id: "sport", name: "Sport & Lidmaatschappen", label: "variabel" },
    { id: "uitstapjes", name: "Uitstapjes", label: "luxe" },
    { id: "hobby_volw", name: "Hobby's Volwassenen", label: "luxe" },
  ]},
  { id: "persoonlijk", name: "Persoonlijk & Lifestyle", type: "uitgaven", color: "#C4956A", subs: [
    { id: "kledij_ward", name: "Kleding Ward", label: "variabel" },
    { id: "kledij_rox", name: "Kleding Rox", label: "variabel" },
    { id: "kapper", name: "Kapper & Schoonheidsspecialist", label: "variabel" },
  ]},
  { id: "aankopen", name: "Aankopen", type: "uitgaven", color: "#B5597B", subs: [
    { id: "cadeaus", name: "Cadeaus & Feesten", label: "luxe" },
    { id: "electronica", name: "Electronica & Gadgets", label: "luxe" },
    { id: "kleine_huishoud", name: "Kleine Huishoudspullen", label: "variabel" },
    { id: "online_overig", name: "Online Aankopen (Overig)", label: "variabel" },
    { id: "overige_aankopen", name: "Overige Aankopen", label: "variabel" },
  ]},
  { id: "vervoer", name: "Vervoer", type: "uitgaven", color: "#5B8C8D", subs: [
    { id: "deelwagen", name: "Deelwagens (Cambio/Poppy)", label: "variabel" },
    { id: "huurauto", name: "Huurauto (Vakantie/Weekend)", label: "luxe" },
    { id: "brandstof", name: "Brandstof & Laden", label: "variabel" },
    { id: "ov", name: "Openbaar Vervoer", label: "variabel" },
    { id: "fiets", name: "Fiets", label: "variabel" },
    { id: "parking", name: "Parking & Garage", label: "variabel" },
    { id: "taxi", name: "Taxi & Uber", label: "luxe" },
    { id: "boetes", name: "Boetes (Verkeersovertredingen)", label: "variabel" },
  ]},
  { id: "financieel", name: "Financieel", type: "uitgaven", color: "#6B7B8D", subs: [
    { id: "overige_verzekering", name: "Overige Verzekeringen", label: "vast" },
    { id: "bankkosten", name: "Bankkosten", label: "vast" },
    { id: "levensverzekering", name: "Levensverzekering / Schuldsaldo", label: "vast" },
  ]},
  { id: "inkomen", name: "Inkomsten", type: "inkomsten", color: "#3D8B37", subs: [
    { id: "loon", name: "Loon", label: "vast" },
    { id: "eindejaar", name: "Eindejaarspremie & Vakantiegeld", label: "vast" },
    { id: "groeipakket", name: "Groeipakket", label: "vast" },
    { id: "ziekte_mut", name: "Ziekteuitkering / Mutualiteit", label: "variabel" },
    { id: "belasting_terug", name: "Belastingteruggave", label: "variabel" },
    { id: "verkoop_2dehands", name: "Verkoop Tweedehands", label: "variabel" },
    { id: "gift_inkomen", name: "Gift", label: "variabel" },
    { id: "andere_inkomen", name: "Andere", label: "variabel" },
  ]},
  { id: "sparen", name: "Sparen & Beleggen", type: "transfers", color: "#4A6B8A", subs: [
    { id: "pensioensparen", name: "Pensioensparen", label: "vast" },
    { id: "beleggingen", name: "Beleggingen", label: "variabel" },
    { id: "spaarrekening", name: "Spaarrekening", label: "variabel" },
    { id: "sparen_kinderen", name: "Spaarrekening Kinderen", label: "variabel" },
  ]},
  { id: "projecten", name: "Projecten", type: "uitgaven", color: "#8B7355", subs: [
    { id: "trouw", name: "Trouw", label: "luxe" },
    { id: "renovatie", name: "Renovatie", label: "variabel" },
  ]},
  { id: "nog_te_verwerken", name: "Nog te verwerken", type: "overige", color: "#888888", subs: [
    { id: "te_categoriseren", name: "Te Categoriseren", label: "variabel" },
    { id: "correcties", name: "Correcties", label: "variabel" },
  ]},
];

export const TYPE_ORDER = ["uitgaven", "inkomsten", "transfers", "overige"];
export const CALENDAR_MONTH_KEYS = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"));


