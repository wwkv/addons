/*
 * OpenStreetMap business types → our categories.
 *
 * Nominatim answers with a structured type (`shop/toys`, `amenity/cafe`) rather
 * than prose, which is more useful than the sentence originally asked for: the
 * type maps onto a category, so a lookup can suggest where the transaction
 * belongs instead of only describing the shop.
 *
 * Measured on real data: roughly one merchant in four is found at all, but the
 * ones that are found map correctly. This is a sometimes-tool with high
 * precision — the UI has to be comfortable saying "niets gevonden".
 */
export const OSM_MAP = {
  // shops — food
  "shop/bakery": { cat: "boodschappen", sub: "bakker", label: "Bakkerij" },
  "shop/pastry": { cat: "boodschappen", sub: "bakker", label: "Patisserie" },
  "shop/confectionery": { cat: "boodschappen", sub: "bakker", label: "Chocolaterie" },
  "shop/supermarket": { cat: "boodschappen", sub: "supermarkt", label: "Supermarkt" },
  "shop/convenience": { cat: "boodschappen", sub: "supermarkt", label: "Buurtwinkel" },
  "shop/butcher": { cat: "boodschappen", sub: "kleine_aankopen", label: "Slagerij" },
  "shop/greengrocer": { cat: "boodschappen", sub: "kleine_aankopen", label: "Groentewinkel" },
  "shop/deli": { cat: "boodschappen", sub: "kleine_aankopen", label: "Delicatessenzaak" },
  "shop/cheese": { cat: "boodschappen", sub: "kleine_aankopen", label: "Kaaswinkel" },
  "shop/seafood": { cat: "boodschappen", sub: "kleine_aankopen", label: "Viswinkel" },
  "shop/beverages": { cat: "boodschappen", sub: "kleine_aankopen", label: "Drankenhandel" },
  "shop/chemist": { cat: "boodschappen", sub: "drogisterij", label: "Drogisterij" },

  // shops — goods
  "shop/clothes": { cat: "persoonlijk", sub: "kledij_ward", label: "Kledingwinkel" },
  "shop/shoes": { cat: "persoonlijk", sub: "kledij_ward", label: "Schoenenwinkel" },
  "shop/boutique": { cat: "persoonlijk", sub: "kledij_ward", label: "Boetiek" },
  "shop/hairdresser": { cat: "persoonlijk", sub: "kapper", label: "Kapper" },
  "shop/beauty": { cat: "persoonlijk", sub: "kapper", label: "Schoonheidssalon" },
  "shop/optician": { cat: "gezondheid", sub: "brillen", label: "Opticien" },
  "shop/toys": { cat: "kinderen", sub: "speelgoed", label: "Speelgoedwinkel" },
  "shop/baby_goods": { cat: "kinderen", sub: "verzorging_kind", label: "Babywinkel" },
  "shop/furniture": { cat: "wonen", sub: "meubels_interieur", label: "Meubelwinkel" },
  "shop/houseware": { cat: "aankopen", sub: "kleine_huishoud", label: "Huishoudwinkel" },
  "shop/doityourself": { cat: "wonen", sub: "doe_het_zelf", label: "Doe-het-zelfzaak" },
  "shop/hardware": { cat: "wonen", sub: "doe_het_zelf", label: "IJzerwarenwinkel" },
  "shop/garden_centre": { cat: "wonen", sub: "doe_het_zelf", label: "Tuincentrum" },
  "shop/electronics": { cat: "aankopen", sub: "electronica", label: "Electronicawinkel" },
  "shop/computer": { cat: "aankopen", sub: "electronica", label: "Computerwinkel" },
  "shop/mobile_phone": { cat: "aankopen", sub: "electronica", label: "GSM-winkel" },
  "shop/florist": { cat: "aankopen", sub: "cadeaus", label: "Bloemenwinkel" },
  "shop/gift": { cat: "aankopen", sub: "cadeaus", label: "Cadeauwinkel" },
  "shop/jewelry": { cat: "aankopen", sub: "cadeaus", label: "Juwelier" },
  "shop/books": { cat: "ontspanning", sub: "hobby_volw", label: "Boekhandel" },
  "shop/sports": { cat: "ontspanning", sub: "sport", label: "Sportwinkel" },
  "shop/bicycle": { cat: "vervoer", sub: "fiets", label: "Fietsenwinkel" },
  "shop/car_repair": { cat: "vervoer", sub: "brandstof", label: "Garage" },

  // eating and drinking
  "amenity/cafe": { cat: "eten_uit", sub: "horeca", label: "Café" },
  "amenity/bar": { cat: "eten_uit", sub: "horeca", label: "Bar" },
  "amenity/pub": { cat: "eten_uit", sub: "horeca", label: "Café" },
  "amenity/restaurant": { cat: "eten_uit", sub: "horeca", label: "Restaurant" },
  "amenity/ice_cream": { cat: "eten_uit", sub: "horeca", label: "IJssalon" },
  "amenity/fast_food": { cat: "eten_uit", sub: "afhaal", label: "Snackbar" },

  // health
  "amenity/pharmacy": { cat: "gezondheid", sub: "apotheek", label: "Apotheek" },
  "amenity/doctors": { cat: "gezondheid", sub: "dokter", label: "Dokterspraktijk" },
  "amenity/dentist": { cat: "gezondheid", sub: "dokter", label: "Tandarts" },
  "amenity/clinic": { cat: "gezondheid", sub: "dokter", label: "Kliniek" },
  "amenity/hospital": { cat: "gezondheid", sub: "dokter", label: "Ziekenhuis" },
  "healthcare/physiotherapist": { cat: "gezondheid", sub: "dokter", label: "Kinesist" },

  // transport, leisure, children
  "amenity/fuel": { cat: "vervoer", sub: "brandstof", label: "Tankstation" },
  "amenity/parking": { cat: "vervoer", sub: "parking", label: "Parking" },
  "amenity/charging_station": { cat: "vervoer", sub: "brandstof", label: "Laadpaal" },
  "amenity/cinema": { cat: "ontspanning", sub: "uitstapjes", label: "Bioscoop" },
  "amenity/theatre": { cat: "ontspanning", sub: "uitstapjes", label: "Theater" },
  "amenity/kindergarten": { cat: "kinderen", sub: "creche", label: "Kinderopvang" },
  "amenity/childcare": { cat: "kinderen", sub: "creche", label: "Kinderopvang" },
  "leisure/sports_centre": { cat: "ontspanning", sub: "sport", label: "Sportcentrum" },
  "leisure/fitness_centre": { cat: "ontspanning", sub: "sport", label: "Fitnesscentrum" },
  "leisure/swimming_pool": { cat: "ontspanning", sub: "sport", label: "Zwembad" },
  "leisure/climbing": { cat: "ontspanning", sub: "sport", label: "Klimzaal" },
  "leisure/park": { cat: "ontspanning", sub: "uitstapjes", label: "Park" },
  "tourism/hotel": { cat: "ontspanning", sub: "vakantie", label: "Hotel" },
  "tourism/museum": { cat: "ontspanning", sub: "uitstapjes", label: "Museum" },
  "tourism/attraction": { cat: "ontspanning", sub: "uitstapjes", label: "Attractie" },
};

/** "shop/toys" for a Nominatim hit. */
export function osmKey(hit) {
  if (!hit) return null;
  return hit.category && hit.type ? `${hit.category}/${hit.type}` : null;
}

/**
 * A short Dutch sentence about the place, plus the category it maps to when we
 * recognise the type. Unmapped types still get a sentence — the user reads it
 * and decides — they simply carry no suggestion.
 */
export function describeHit(hit) {
  if (!hit) return null;
  const key = osmKey(hit);
  const mapped = key ? OSM_MAP[key] : null;
  const a = hit.address || {};
  const town = a.city || a.town || a.village || a.suburb || "";
  const street = a.road || "";

  // Fall back to the raw OSM type so an unmapped result still says something.
  const what = mapped ? mapped.label : (hit.type ? String(hit.type).replace(/_/g, " ") : "Zaak");
  const where = [street && `in de ${street}`, town].filter(Boolean).join(", ");

  return {
    summary: where ? `${what} ${where}.` : `${what}.`,
    catId: mapped ? mapped.cat : null,
    subId: mapped ? mapped.sub : null,
    osmType: key,
    name: hit.name || hit.display_name?.split(",")[0] || null,
  };
}
