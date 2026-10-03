import { merchantKey } from './counterparty.js';

/* ═══════════════════════════════════════════════════════════
   Patterns, grouped the way a person thinks about them
   ═══════════════════════════════════════════════════════════

   A learned pattern is keyed on the canonical merchant (see merchantKey), and
   several raw bank spellings collapse onto one key — that collapsing is the
   whole point of the pattern database, and a flat table of keys hid it
   completely. This builds the shape the Patronen tab renders:

     category → subcategory → merchant → aliases

   ALIASES ARE DERIVED, NOT STORED. The only record of "COLRUYT 1234 HALLE"
   having ever existed is the transactions carrying it, so they are read back
   from `txs` each time. That has a useful consequence: an alias disappears
   from the list when its last transaction is deleted, because the alias was
   never a fact about the rule — it is a fact about the data.

   A rule can also have no aliases at all: imported from a backup, added by
   hand, or every transaction since removed. Those still belong in the tree —
   the rule is live and will match the next import — so they render with the
   canonical key standing in for itself.
*/
export function buildMerchantIndex({ rules, txs, cats, query = "" }) {
  /* Pass 1: every raw spelling seen per canonical key, with how often. */
  const aliasesByKey = new Map();
  for (const t of txs || []) {
    const raw = String(t.counterparty || "").trim();
    if (!raw) continue;
    const k = merchantKey(raw);
    let m = aliasesByKey.get(k);
    if (!m) { m = new Map(); aliasesByKey.set(k, m); }
    m.set(raw, (m.get(raw) || 0) + 1);
  }

  const q = query.trim().toLowerCase();
  const catById = new Map((cats || []).map(c => [c.id, c]));

  /* Pass 2: hang each rule under its (sub)category. */
  const byCat = new Map();
  for (const [key, rule] of Object.entries(rules || {})) {
    if (!rule) continue;
    const cat = catById.get(rule.catId) || null;
    const sub = cat ? (cat.subs || []).find(s => s.id === rule.subId) || null : null;

    const aliasMap = aliasesByKey.get(key);
    const aliases = aliasMap
      ? [...aliasMap.entries()].map(([raw, count]) => ({ raw, count })).sort((a, b) => b.count - a.count || a.raw.localeCompare(b.raw))
      : [];
    const txCount = aliases.reduce((s, a) => s + a.count, 0);

    /* Search matches the merchant, any of its spellings, or the category it
       sits under — searching "boodschappen" should return its shops, and
       searching a half-remembered bank string should find the merchant it
       was folded into. */
    if (q) {
      const hay = [key, ...aliases.map(a => a.raw), cat?.name || "", sub?.name || ""].join(" ").toLowerCase();
      if (!hay.includes(q)) continue;
    }

    /* A rule pointing at a deleted category still exists and still fires, so
       it gets a bucket of its own rather than being dropped from the view —
       otherwise it is unreachable and cannot even be deleted. */
    const catKey = cat ? cat.id : "_orphan";
    let cEntry = byCat.get(catKey);
    if (!cEntry) {
      cEntry = {
        id: catKey,
        name: cat ? cat.name : "Categorie bestaat niet meer",
        color: cat ? cat.color : "var(--neutral)",
        orphan: !cat,
        subs: new Map(),
      };
      byCat.set(catKey, cEntry);
    }

    const subKey = sub ? sub.id : "_nosub";
    let sEntry = cEntry.subs.get(subKey);
    if (!sEntry) {
      sEntry = { id: subKey, name: sub ? sub.name : "Zonder subcategorie", merchants: [] };
      cEntry.subs.set(subKey, sEntry);
    }
    sEntry.merchants.push({ key, aliases, txCount, aliasCount: aliases.length });
  }

  /* Pass 3: order. Merchants and subcategories by weight — the shops you
      actually use belong at the top of their group; alphabetical would bury
      them. Categories follow the order the user arranged in Categorieën,
      because that order is itself a deliberate choice. */
  const catOrder = new Map((cats || []).map((c, i) => [c.id, i]));
  const tree = [...byCat.values()].map(c => {
    const subs = [...c.subs.values()].map(s => ({
      ...s,
      merchants: s.merchants.sort((a, b) => b.txCount - a.txCount || a.key.localeCompare(b.key)),
      merchantCount: s.merchants.length,
      txCount: s.merchants.reduce((n, m) => n + m.txCount, 0),
    })).sort((a, b) => b.txCount - a.txCount || a.name.localeCompare(b.name));
    return {
      ...c,
      subs,
      merchantCount: subs.reduce((n, s) => n + s.merchantCount, 0),
      txCount: subs.reduce((n, s) => n + s.txCount, 0),
      mergedCount: subs.reduce((n, s) => n + s.merchants.filter(m => m.aliasCount > 1).length, 0),
    };
  }).sort((a, b) => {
    if (a.orphan !== b.orphan) return a.orphan ? 1 : -1;   // orphans last
    return (catOrder.get(a.id) ?? 1e9) - (catOrder.get(b.id) ?? 1e9);
  });

  const allMerchants = tree.flatMap(c => c.subs.flatMap(s => s.merchants));
  return {
    tree,
    totals: {
      merchants: allMerchants.length,
      aliases: allMerchants.reduce((n, m) => n + m.aliasCount, 0),
      merged: allMerchants.filter(m => m.aliasCount > 1).length,
    },
  };
}
