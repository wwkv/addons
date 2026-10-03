import { merchantKey } from './counterparty.js';

/* ═══════════════════════════════════════════════════════════
   One-time migration: raw pattern keys → canonical merchant keys
   ═══════════════════════════════════════════════════════════

   Learned rules and pending counts used to be keyed on
   `counterparty.trim().toLowerCase().slice(0, 30)`. They are now keyed on
   `merchantKey()`. Without a migration every pattern the user has taught the
   app over months would stop matching — silently, because an unmatched rule
   looks exactly like a rule that was never there.

   The mapping is derived from the TRANSACTIONS, not from the old keys. Parsing
   an old key cannot reproduce the new one: the old key is a 30-character
   truncation of an already-lowercased string, so "colruyt 1234 halle" has lost
   the run of whitespace that tells parseCounterparty "halle" is a town.
   Reading both keys off the same live transaction is exact.

   Several old keys collapsing into one canonical key is the point, not a
   problem — that IS the alias grouping. Only a genuine disagreement needs a
   decision, and the rule backed by more transactions wins; ties keep whichever
   was seen first, so the result does not depend on object key order.
*/
export function migratePatternKeys({ rules, pending, txs }) {
  const oldToNew = new Map();
  const weight = new Map();            // old key -> transactions carrying it
  for (const t of txs || []) {
    const raw = String(t.counterparty || "").trim().toLowerCase().slice(0, 30);
    if (!raw) continue;
    if (!oldToNew.has(raw)) oldToNew.set(raw, merchantKey(t.counterparty));
    weight.set(raw, (weight.get(raw) || 0) + 1);
  }

  /* A rule can outlive every transaction that taught it — the user may have
     deleted them, or imported rules from a backup. Falling back to parsing the
     old key is lossy but better than dropping the rule. */
  const newKeyFor = (oldKey) => oldToNew.get(oldKey) || merchantKey(oldKey);

  const nextRules = {};
  const collisions = [];
  for (const [oldKey, rule] of Object.entries(rules || {})) {
    if (!rule) continue;
    const k = newKeyFor(oldKey);
    const sitting = nextRules[k];
    if (!sitting) { nextRules[k] = { ...rule, _from: oldKey }; continue; }
    if (sitting.catId === rule.catId && sitting.subId === rule.subId) continue;  // same answer, no conflict
    const mine = weight.get(oldKey) || 0;
    const theirs = weight.get(sitting._from) || 0;
    collisions.push({ key: k, kept: mine > theirs ? oldKey : sitting._from, dropped: mine > theirs ? sitting._from : oldKey });
    if (mine > theirs) nextRules[k] = { ...rule, _from: oldKey };
  }
  // _from was only needed to weigh collisions; it must not reach storage.
  for (const k of Object.keys(nextRules)) delete nextRules[k]._from;

  /* Pending counts SUM. Two spellings each seen twice are one merchant seen
     four times — which is the whole reason this merchant never reached the
     auto-categorise threshold before. */
  const nextPending = {};
  for (const [oldKey, entry] of Object.entries(pending || {})) {
    if (!entry) continue;
    const k = newKeyFor(oldKey);
    const sitting = nextPending[k];
    if (!sitting) { nextPending[k] = { ...entry }; continue; }
    const a = Number(sitting.count) || 0;
    const b = Number(entry.count) || 0;
    nextPending[k] = { ...(b > a ? entry : sitting), count: a + b };
  }

  return {
    rules: nextRules,
    pending: nextPending,
    stats: {
      rulesBefore: Object.keys(rules || {}).length,
      rulesAfter: Object.keys(nextRules).length,
      pendingBefore: Object.keys(pending || {}).length,
      pendingAfter: Object.keys(nextPending).length,
      collisions,
    },
  };
}
