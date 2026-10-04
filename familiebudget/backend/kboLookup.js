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

/* A name with no entry of its own can still be answered from the names built
   on top of it. "COLRUYT" is registered nowhere as exactly that — the register
   holds "colruyt group", "colruyt food retail", "colruyt waremme" and several
   sole traders called Colruyt — so an exact lookup finds nothing and the token
   windows have nothing shorter to try. Answering nothing there is the wrong
   failure: 95% of the 286 names beginning with "colruyt " are the same trade,
   and saying so with a lower confidence is far more useful than silence.

   Measured on a real August 2026 export, counting distinct NAMES rather than
   entities (entity counts let one large group dominate):
     colruyt      286 names → 95% supermarket
     delhaize      50 names → 92% supermarket
     ikea          14 names → 64% furniture retail
     bakkerij de   50 names → 56% bakery
     brico        142 names → 55% hardware
   so a majority of the related names is a real signal down to about 55%. */
const KBO_RELATED_MIN_NAMES = 3;     // two names agreeing is a coincidence
const KBO_RELATED_MIN_SHARE = 0.5;
const KBO_RELATED_MIN_KEY = 4;       // "de ..." would match half the register
const KBO_RELATED_MAX_ROWS = 400;

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
  /* A range scan rather than LIKE, so the PRIMARY KEY index is used: every
     name that starts with "<key> " sorts between "<key> " and "<key>!".
     Bounded by LIMIT, so a common stem cannot turn one lookup into a table
     scan of 1.8 million rows. */
  const relatedStmt = db.prepare(
    `SELECT b.code AS code, b.n AS n, x.nl AS nl FROM biz b LEFT JOIN nace x ON x.code = b.code
      WHERE b.name > ? AND b.name < ? LIMIT ${KBO_RELATED_MAX_ROWS}`);

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

      /* Last resort: what do the names built on this one do for a living?
         Reported with the share as its confidence, so a 95% answer and a 55%
         answer are not presented as equally certain. */
      if (k.length >= KBO_RELATED_MIN_KEY) {
        const rows = relatedStmt.all(`${k} `, `${k}!`);
        if (rows.length >= KBO_RELATED_MIN_NAMES) {
          const byCode = new Map();
          for (const r of rows) {
            if (!r.code) continue;
            const e = byCode.get(r.code) || { names: 0, nl: r.nl };
            e.names++;
            byCode.set(r.code, e);
          }
          let best = null, bestCode = null, total = 0;
          for (const [code, e] of byCode) {
            total += e.names;
            if (!best || e.names > best.names) { best = e; bestCode = code; }
          }
          if (best && total > 0) {
            const share = best.names / total;
            if (share >= KBO_RELATED_MIN_SHARE) {
              return {
                code: bestCode, nl: best.nl, conf: share, n: total,
                matched: 'related', matchedText: k, relatedNames: total,
              };
            }
          }
        }
      }
      return null;
    } catch {
      return null;                                 // index trouble is "no answer"
    }
  }

  return { available: true, count, lookup };
}
