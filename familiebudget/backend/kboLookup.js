/* ═══════════════════════════════════════════════════════════
   KBO/BCE lookup — "what kind of business is this?"
   ═══════════════════════════════════════════════════════════

   Separated from server.js so the matching can be tested against a real
   SQLite index without starting an HTTP server or loading better-sqlite3:
   the database handle is passed in, and anything with
   `prepare().get()/.all()` satisfies it (node:sqlite's DatabaseSync does).
   That matters because the matching rules below are the whole feature, and
   they were wrong in a way no amount of reading caught.
*/

/* Below this, the name is split across trades too evenly to answer with.
   Lives here rather than in the index so it can be retuned without
   rebuilding 2 GB of CSV. Rows written before the index carried a confidence
   have conf = NULL, which `>=` rejects — such an index answers nothing until
   it is rebuilt, rather than answering as if every name were certain. */
export const KBO_MIN_CONF = 0.6;

/* Only try a prefix once the stem is long enough to mean something; a
   four-letter LIKE would match half the register. */
const KBO_MIN_PREFIX = 8;

/* Tokens that are never a business name on their own. Pure digits are branch
   and terminal numbers; the rest are the words a statement wraps a name in. */
const KBO_STOP = new Set([
  'bvba', 'bv', 'nv', 'sa', 'srl', 'vzw', 'cv', 'cvba', 'vof', 'se',
  'betaling', 'aankoop', 'contactloos', 'maestro', 'bancontact', 'visa',
  'mastercard', 'payconiq', 'apple', 'google', 'pay', 'via', 'card',
]);

const LEGAL_FORM = /\b(bv|bvba|nv|vzw|srl|sa|sprl|cvba|cv|vof|comm\.?\s*v|scs|se)\b\.?/gi;

/* Must mirror build-kbo-index.mjs exactly, or the two sides key differently
   and nothing ever matches. */
export const kboKey = (s) => String(s || '')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(LEGAL_FORM, ' ')
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/* Every contiguous run of tokens, longest first, and among equals the one
   that starts earliest.

   This is the half that was broken. The old code tried the whole cleaned
   string, then `LIKE 'that string%'` — registered names STARTING WITH the
   bank string. Bank strings run the other way: they are the name plus
   whatever the terminal appended, so "colruyt 1234 halle" could never reach
   "colruyt". Asking instead "which registered name is contained in this
   line" is the right question, and longest-first stops
   "sint pieters bakkerij" being answered as "bakkerij".

   Earliest-start is the tie-break because a statement leads with the
   merchant and trails with the place: in "colruyt 1234 halle" both "colruyt"
   and "halle" may be real companies, and the first is the one that was paid.

   Cost is bounded — tokens are capped at 8, so at most 36 lookups against a
   PRIMARY KEY. Microseconds, and no new index. */
export function kboWindows(tokens) {
  const out = [];
  for (let len = tokens.length; len >= 1; len--) {
    for (let i = 0; i + len <= tokens.length; i++) {
      // A lone short token is noise far more often than a business.
      if (len === 1 && tokens[i].length < 4) continue;
      out.push({ text: tokens.slice(i, i + len).join(' '), len, at: i });
    }
  }
  return out.sort((a, b) => b.len - a.len || a.at - b.at);
}

export function kboTokens(key) {
  return key.split(' ').filter(t => t && !KBO_STOP.has(t) && !/^\d+$/.test(t)).slice(0, 8);
}

const usable = (row) => !!row && typeof row.conf === 'number' && row.conf >= KBO_MIN_CONF;

/**
 * Bind the matcher to an open index. `db` may be absent, in which case the
 * lookup reports itself unavailable and answers null — the add-on runs
 * perfectly well without an index, and the desktop build never has one.
 */
export function createKboLookup(db) {
  if (!db) return { available: false, count: 0, lookup: () => null };

  const exactStmt = db.prepare(
    'SELECT b.code AS code, b.conf AS conf, b.n AS n, x.nl AS nl FROM biz b LEFT JOIN nace x ON x.code = b.code WHERE b.name = ?');
  const prefixStmt = db.prepare(
    'SELECT b.code AS code, b.conf AS conf, b.n AS n, x.nl AS nl FROM biz b LEFT JOIN nace x ON x.code = b.code WHERE b.name LIKE ? LIMIT 2');

  let count = 0;
  try { count = db.prepare('SELECT COUNT(*) c FROM biz').get().c; } catch { /* reported as 0 */ }

  function lookup(name) {
    const k = kboKey(name);
    if (k.length < 4) return null;
    try {
      const exact = exactStmt.get(k);
      if (usable(exact)) return { ...exact, matched: 'exact' };

      if (k.length >= KBO_MIN_PREFIX) {
        const rows = prefixStmt.all(`${k.replace(/[%_]/g, '')}%`);
        if (rows.length === 1 && usable(rows[0])) return { ...rows[0], matched: 'prefix' };
      }

      /* No length guard here. An earlier version skipped this unless the
         key had more than one token, which silently excluded the commonest
         shape of all: "BAKKERIJ 0042", where dropping the terminal number
         leaves exactly one token and that token IS the answer. The
         already-tried-as-exact check below makes a guard unnecessary — for a
         key that is a single token the only window equals the key and is
         skipped, costing nothing. */
      for (const w of kboWindows(kboTokens(k))) {
        if (w.text === k) continue;                // already tried as exact
        const hit = exactStmt.get(w.text);
        if (usable(hit)) return { ...hit, matched: 'tokens', matchedText: w.text };
      }
      return null;
    } catch {
      return null;                                 // index trouble is "no answer"
    }
  }

  return { available: true, count, lookup };
}
