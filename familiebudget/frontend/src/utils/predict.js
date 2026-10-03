import { merchantKey, parseCounterparty } from './counterparty.js';

/* ═══════════════════════════════════════════════════════════
   Guessing a category from what you have already sorted
   ═══════════════════════════════════════════════════════════

   The federal register answers "what trade is this company in". It cannot
   answer "where does Ward file this", and for a one-off independent shop it
   usually answers nothing at all. Your own sorted transactions can answer
   both, they cost nothing to consult, and they get better every time you
   categorise something. So they go first.

   Two signals, deliberately different in kind:

   SIMILARITY — this looks like a merchant you already know. Catches the
   spellings canonicalisation could not merge on its own ("SHELL STATION" vs
   "SHELL"), truncations, and typos.

   TRADE WORDS — this name shares a word with merchants you have sorted, and
   that word points somewhere specific. "SLAGERIJ VAN DEN BERGHE" is a shop
   you have never seen, but if "slagerij" has shown up three times and gone to
   Boodschappen › Bakker every time, that is a real answer. This is the one
   that generalises to merchants you have never transacted with — no brand
   list, however long, reaches a one-off butcher.

   Both are reported with their reason attached. A suggestion you cannot
   interrogate is one you cannot safely accept, and these are suggestions: the
   caller decides whether to apply or merely offer.
*/

/* Words that carry no information about a trade. Not a stopword list for
   language — a list of what BANK STRINGS are padded with. */
const NOISE = new Set([
  'bvba', 'bv', 'nv', 'sa', 'srl', 'vzw', 'cv', 'cvba', 'vof', 'se', 'comm',
  'de', 'het', 'een', 'van', 'der', 'den', 'ter', 'tot', 'in', 'en', 'the',
  'and', 'aan', 'op', 'bij', 'sint', 'st',
  'betaling', 'aankoop', 'contactloos', 'maestro', 'bancontact', 'visa',
  'mastercard', 'payconiq', 'apple', 'google', 'pay', 'via', 'card', 'be',
]);

const tokens = (s) => String(s || '')
  .toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ')
  .split(/\s+/)
  .filter(t => t.length >= 4 && !NOISE.has(t) && !/^\d+$/.test(t));

const trigrams = (s) => {
  const t = ` ${String(s || '').replace(/\s+/g, ' ')} `;
  const out = new Set();
  for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
  return out;
};

const dice = (a, b) => {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const x of a) if (b.has(x)) shared++;
  return (2 * shared) / (a.size + b.size);
};

/**
 * Index the labelled merchants once, so a whole import can be scored without
 * rebuilding this per transaction.
 *
 * `rules` is merchantKey -> { catId, subId }.
 */
export function buildPredictor({ rules, cats }) {
  const known = [];
  const byToken = new Map();            // token -> Map("catId/subId" -> count)

  for (const [key, rule] of Object.entries(rules || {})) {
    if (!rule || !rule.catId || !rule.subId) continue;
    const label = `${rule.catId}/${rule.subId}`;
    known.push({ key, label, catId: rule.catId, subId: rule.subId, tri: trigrams(key), toks: new Set(tokens(key)) });
    for (const t of new Set(tokens(key))) {
      let m = byToken.get(t);
      if (!m) { m = new Map(); byToken.set(t, m); }
      m.set(label, (m.get(label) || 0) + 1);
    }
  }

  const nameOf = (catId, subId) => {
    const cat = (cats || []).find(c => c.id === catId);
    const sub = cat ? (cat.subs || []).find(s => s.id === subId) : null;
    return { catName: cat ? cat.name : null, subName: sub ? sub.name : null, color: cat ? cat.color : null };
  };

  /* A token only speaks if it points somewhere. Purity is the share of its
     sightings landing on one label; support is how many sightings there are.
     One sighting of "zonnebloem" going to Kinderen is a coincidence, three
     sightings of "slagerij" going to Bakker is a rule. */
  function tokenVerdict(t) {
    const m = byToken.get(t);
    if (!m) return null;
    let best = null, bestN = 0, total = 0;
    for (const [label, n] of m) { total += n; if (n > bestN) { best = label; bestN = n; } }
    if (!best || total < 2) return null;             // a single sighting proves nothing
    const purity = bestN / total;
    if (purity < 0.75) return null;                  // the word is used across trades
    return { label: best, purity, support: bestN };
  }

  function suggest(counterparty) {
    const raw = String(counterparty || '').trim();
    if (!raw) return null;
    /* Person-to-person transfers are never a trade: guessing a category for
       a friend's name is the kind of confident nonsense that makes people
       distrust the rest of the app.

       The test is parseCounterparty's `p2p` marker, NOT isPerson(). isPerson
       asks "is every word capitalised", which is true of almost every bank
       string — they arrive in caps — so "SLAGERIJ VAN DEN BERGHE" reads as a
       person and the guard silently disabled this whole feature. p2p keys off
       the bank's own P2P MOBILE marker, which means what it says. */
    if (parseCounterparty(raw).p2p) return null;

    const key = merchantKey(raw);
    if (key.length < 3) return null;
    if (Object.prototype.hasOwnProperty.call(rules || {}, key)) return null;  // already known outright

    const candidates = [];

    // ── Signal 1: looks like a merchant already sorted ──
    const tri = trigrams(key);
    const toks = new Set(tokens(key));
    let bestSim = null;
    for (const k of known) {
      // Token overlap and character overlap catch different mistakes; take
      // whichever is more convinced rather than averaging them away.
      const score = Math.max(dice(tri, k.tri), dice(toks, k.toks));
      if (!bestSim || score > bestSim.score) bestSim = { score, k };
    }
    if (bestSim && bestSim.score >= 0.55) {
      candidates.push({
        catId: bestSim.k.catId, subId: bestSim.k.subId,
        confidence: Math.min(0.95, bestSim.score),
        via: 'similarity',
        reason: `lijkt op "${bestSim.k.key}"`,
      });
    }

    // ── Signal 2: a trade word you have already sorted ──
    const votes = new Map();
    for (const t of toks) {
      const v = tokenVerdict(t);
      if (!v) continue;
      const cur = votes.get(v.label) || { score: 0, words: [] };
      // log-ish weighting: the fourth sighting of a word adds less than the second
      cur.score += v.purity * (1 + Math.log(v.support));
      cur.words.push({ word: t, support: v.support, purity: v.purity });
      votes.set(v.label, cur);
    }
    if (votes.size) {
      const [label, v] = [...votes.entries()].sort((a, b) => b[1].score - a[1].score)[0];
      const [catId, subId] = label.split('/');
      const words = v.words.sort((a, b) => b.support - a.support);
      candidates.push({
        catId, subId,
        confidence: Math.min(0.9, 0.45 + 0.15 * v.score),
        via: 'trade-word',
        reason: words.length === 1
          ? `"${words[0].word}" ging ${words[0].support}× naar deze categorie`
          : `${words.map(w => `"${w.word}"`).join(' en ')} gingen hiernaartoe`,
      });
    }

    if (!candidates.length) return null;
    const best = candidates.sort((a, b) => b.confidence - a.confidence)[0];
    const names = nameOf(best.catId, best.subId);
    const where = names.catName && names.subName ? `${names.catName} › ${names.subName}` : 'een categorie';

    /* The sentence is built here rather than in the view, the way
       describeNace and describeHit do, so every source in the lookup panel
       reads the same way. It always names the evidence: a suggestion drawn
       from your own history is only trustworthy if you can see which part of
       your history it came from. */
    const summary = best.via === 'similarity'
      ? `Deze naam lijkt op "${best.reason.replace(/^lijkt op "|"$/g, '')}", die je op ${where} zet.`
      : `${best.reason.replace(/ ging .*$/, '')} kwam eerder voor en ging naar ${where}.`;

    return { ...best, ...names, summary, alternatives: candidates.filter(c => c !== best) };
  }

  return { suggest, knownCount: known.length, tokenCount: byToken.size };
}
