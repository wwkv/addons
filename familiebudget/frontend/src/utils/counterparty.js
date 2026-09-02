/* ═══════════════════════════════════════════════════════════
   Counterparty parsing & recognition evidence
   ═══════════════════════════════════════════════════════════

   The bank packs a lot into two fields and the app has been throwing most of
   it away. A typical card payment arrives as:

     counterparty: "KLIMZAAL BLOK          HOBOKEN"
     description:  "KLIMZAAL BLOK 02-06-2026 19:52 HOBOKEN 494099******6907"

   The counterparty is padded and truncated; the description carries the clean
   merchant name, the town, the date, the time of day, which card was used and
   whether it was a phone wallet. That is exactly what you need to remember a
   purchase — "19:52 in Hoboken" places an evening at the climbing gym in a way
   the merchant name alone does not — and none of it was ever shown while
   categorising.

   Two exports, deliberately separate:
     parseCounterparty()  structure for MATCHING and display
     parseEvidence()      cues for RECOGNITION, shown to the user

   Both are pure functions over a transaction; no state, no I/O.
*/

/* Payment-terminal and PSP prefixes. Whitespace around the star varies
   ("CCV*LINTS", "SumUp  *Snackbar", "Mollie *KOFFIELAND"), so this has to run
   before whitespace collapsing or the merchant name is what gets thrown away. */
const PSP_PREFIX = /^(CCV|BCK|NYA|PAY|INT|ZTL|IZ|SUMUP|SumUp|MOLLIE|Mollie|ZETTLE|STRIPE|ADYEN|PAYCONIQ|PAYPAL)\s*\*\s*/i;
const DOCCLE_PREFIX = /^Doccle\s*-\s*/i;

/* Legal forms at the very end only — "BV Bakkerij" must keep its name. */
const LEGAL_SUFFIX = /[\s,]+(bvba|bv|nv|vzw|srl|sa|comm\.?\s?v)\.?$/i;

/* A padded tail is a town far more often than not, but "VISA    REF 143" shows
   it can be a reference. Only call it a place when it reads like one. */
const PLACE_LIKE = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]{1,}$/;

const WALLET = /\b(Google Pay|Apple Pay|Garmin Pay|Fitbit Pay|Swatch Pay)\b/i;
const CARD_TAIL = /\*+\s*(\d{4})\b/;
const TIME = /\b([01]\d|2[0-3]):([0-5]\d)\b/;
const DMY = /\b(\d{2})-(\d{2})-(\d{4})\b/;

const DAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const DAYS_SHORT = ["zo", "ma", "di", "wo", "do", "vr", "za"];

/**
 * Split a raw counterparty into its useful parts.
 * Returns { raw, name, key, place, platform, truncated }.
 */
export function parseCounterparty(raw) {
  const original = (raw || "").trim();
  let s = original;
  let platform = null;
  let place = null;

  const psp = s.match(PSP_PREFIX);
  if (psp) { platform = psp[1]; s = s.slice(psp[0].length); }
  else if (DOCCLE_PREFIX.test(s)) { platform = "Doccle"; s = s.replace(DOCCLE_PREFIX, ""); }

  // Padded tail: "SLA Belpaire           Antwerpen"
  const padded = s.match(/^(.*?\S)\s{2,}(\S.*)$/);
  if (padded) {
    s = padded[1];
    const tail = padded[2].trim();
    if (PLACE_LIKE.test(tail)) place = tail;
  }

  // "NATHAN          P2P MOBILE" — a strong person signal, not part of the name
  let p2p = false;
  if (/\bP2P\s*MOBILE\b/i.test(s)) { p2p = true; s = s.replace(/\bP2P\s*MOBILE\b/gi, ""); }

  // Trailing store number, but only with leading whitespace so "HM BE0250" survives
  s = s.replace(/\s+\d{2,}\s*$/, "");
  s = s.replace(LEGAL_SUFFIX, "");
  s = s.replace(/\s+/g, " ").trim();

  const name = s || original;
  return {
    raw: original,
    name,
    key: name.toLowerCase(),
    place,
    platform,
    p2p,
    // The bank truncates around 35 chars; a name at the cap is probably cut off
    truncated: original.length >= 34,
  };
}

/** Display name with original casing, falling back to the raw string. */
export function displayName(raw) {
  return parseCounterparty(raw).name || (raw || "").trim();
}

/**
 * Recognition cues for a transaction, drawn from description + date.
 * Returns { place, time, day, dayShort, wallet, card, note, merchantPrefix }.
 *
 * `note` is the description when it is NOT a bank-generated card line — those
 * are the user's own words ("broodje vrij 5/6", "verjaardag Nils") or a payment
 * reference, and they are the single best cue when present.
 */
export function parseEvidence(tx) {
  const desc = (tx?.description || "").trim();
  const cp = parseCounterparty(tx?.counterparty || "");
  const out = {
    place: cp.place, time: null, day: null, dayShort: null,
    date: tx?.date || null, booked: tx?.date || null, lagDays: 0,
    wallet: null, card: null, note: null, merchantPrefix: null,
  };

  /* Day-of-week is provisional here: tx.date is when the BANK booked the
     transaction, which for card payments trails the actual purchase by 1-6
     days (median 2 — measured over the real database, 331 of 366 card lines
     disagree). The description carries the true purchase date, so if we find
     one below we overwrite this. Never show a day derived from tx.date when a
     real one is available: it names the wrong weekday ~90% of the time. */
  const setDay = (iso) => {
    const dt = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return;
    out.day = DAYS[dt.getDay()];
    out.dayShort = DAYS_SHORT[dt.getDay()];
  };
  if (tx?.date) setDay(tx.date);
  if (!desc) return out;

  const hasCardShape = DMY.test(desc) || CARD_TAIL.test(desc);

  const t = desc.match(TIME);
  if (t) out.time = t[0];

  const w = desc.match(WALLET);
  if (w) out.wallet = w[1];

  const c = desc.match(CARD_TAIL);
  if (c) out.card = c[1];

  // Text before the date is the clean merchant name — often better than the
  // padded/truncated counterparty column.
  const dm = desc.match(DMY);
  if (dm && dm.index > 0) {
    const prefix = desc.slice(0, dm.index).trim().replace(/\s+/g, " ");
    if (prefix) out.merchantPrefix = prefix;
  }
  // The real purchase date — what the day-of-week cue and any calendar lookup
  // must key off, not tx.date.
  if (dm) {
    const [, d, m, y] = dm;
    const iso = `${y}-${m}-${d}`;
    if (!Number.isNaN(new Date(`${iso}T00:00:00`).getTime())) {
      out.date = iso;
      setDay(iso);
      if (out.booked) {
        out.lagDays = Math.round((new Date(`${out.booked}T00:00:00`) - new Date(`${iso}T00:00:00`)) / 86400000);
      }
    }
  }

  // Town sits between the time and the country code / card number.
  if (t) {
    const after = desc.slice(desc.indexOf(t[0]) + t[0].length);
    const pm = after.match(/^\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]*?)(?=\s+(?:BE|NL|FR|LU|DE|ES|IT)\b|\s+\d|\s*$)/);
    if (pm && PLACE_LIKE.test(pm[1].trim())) out.place = pm[1].trim();
  }

  // Not a bank card line → the user's own note or a payment reference.
  if (!hasCardShape) out.note = desc;

  return out;
}

/**
 * Compact one-line cue string for dense contexts, e.g.
 * "Antwerpen · di 27/06 14:29 · Google Pay". Empty string when nothing is known.
 */
export function evidenceLine(tx) {
  const e = parseEvidence(tx);
  const bits = [];
  if (e.place) bits.push(e.place);
  const when = [e.dayShort, e.time].filter(Boolean).join(" ");
  if (when) bits.push(when);
  if (e.wallet) bits.push(e.wallet);
  else if (e.card) bits.push(`••${e.card}`);
  return bits.join(" · ");
}
