export function normalizeSub(sub) {
  const label = sub.label || "variabel";
  return {
    ...sub,
    type: sub.type || (label === "vast" ? "vast" : "variabel"),
    necessity: sub.necessity || (label === "luxe" ? "luxe" : "nodig"),
    excluded: sub.excluded === true,
  };
}

export function isSubExcluded(cats, categoryId, subCategoryId) {
  const { sub } = resolveCatSub(cats, categoryId, subCategoryId);
  return sub ? sub.excluded === true : false;
}

/* The single definition of "this transaction is spending", used by the
   dashboard, category stats and every comparison so they cannot drift apart.
   Exclusions are pure user data — see applyDefaultSavingsExclusion for how
   savings end up excluded by default while staying removable. */
export function isSpendingTx(cats, t) {
  return t.amount < 0 && !isSubExcluded(cats, t.categoryId, t.subCategoryId);
}

/* Money coming BACK into a spending category: a colleague's half of the
   lunch, a refunded order, a returned deposit. Nothing was earned, so
   treating it as income got the ledger wrong twice at once — income rose by
   the repayment AND the lunch still showed its full gross cost, when the
   household had only ever been out the difference. Netting it against its own
   category makes both sides right.

   An UNCATEGORISED positive stays income. With no category there is nothing
   to net against, and guessing would quietly move salary out of income —
   which is how most positives with no category arrive. */
export function isRepayment(cats, t) {
  if (!(t.amount > 0)) return false;
  if (isSubExcluded(cats, t.categoryId, t.subCategoryId)) return false;
  const c = (cats || []).find(x => x.id === t.categoryId);
  return !!c && c.type !== "inkomsten";
}

/* Signed contribution to spending: positive for an expense, negative for a
   repayment, zero for anything that is not spending at all. Callers sum this
   rather than Math.abs(), which is what let the two directions cancel. */
export function spendingAmount(cats, t) {
  return (isSpendingTx(cats, t) || isRepayment(cats, t)) ? -t.amount : 0;
}

/* Money moved to savings or investments has not been spent — it is still
   yours, just somewhere else — so transfer subcategories start out on the
   exclusion list. This is a DEFAULT, not a rule: it writes the same
   `excluded` flag the user toggles in Settings, so they can drop any of
   these chips to count savings as spending again, or add their own.
   Applied once per database via settings.savingsExclusionApplied, so a
   deliberate removal is never silently undone on the next load. */
export function applyDefaultSavingsExclusion(cats) {
  return (cats || []).map(c => c.type !== "transfers" ? c : {
    ...c,
    subs: (c.subs || []).map(s => ({ ...s, excluded: true })),
  });
}

export function normalizeCats(cats) {
  return (cats || []).map(c => ({ ...c, subs: (c.subs || []).map(normalizeSub) }));
}

export function resolveCatSub(cats, rawCatId, rawSubId) {
  if (!rawCatId) return { cat: null, sub: null };
  let cId = rawCatId, sId = rawSubId;
  if (typeof rawCatId === "string" && rawCatId.includes("|")) { const p = rawCatId.split("|"); cId = p[0]; sId = p[1]; }
  if (typeof rawSubId === "string" && rawSubId.includes("|")) { const p = rawSubId.split("|"); sId = p[1] || p[0]; }
  const cat = cats.find(c => c.id === cId);
  if (!cat) { for (const c of cats) { const s = c.subs.find(x => x.id === sId || x.id === rawSubId); if (s) return { cat: c, sub: s }; } return { cat: null, sub: null }; }
  const sub = cat.subs.find(s => s.id === sId) || cat.subs.find(s => s.id === rawSubId);
  return { cat, sub: sub || null };
}

export function getSuggestion(tx, cats, autoCat) {
  const m = autoCat(tx);
  if (m && m.categoryId) {
    const { cat, sub } = resolveCatSub(cats, m.categoryId, m.subCategoryId);
    if (cat && sub) return { catId: cat.id, subId: sub.id, catName: cat.name, subName: sub.name, color: cat.color, src: "auto" };
  }
  return null;
}

export function safeEvalMath(str) {
  const s = str.replace(/,/g, ".");
  if (/[^0-9+\-*/.()\s]/.test(s)) return NaN;
  try { return Function('"use strict"; return (' + s + ")")(); } catch { return NaN; }
}

/* Savings state was originally stored as baseBalance/baseDate; it is now
   knownBalance/knownDate. Old backups and databases still carry the old
   names, so keep reading both when loading. */
export function normalizeSavings(s) {
  const src = s || {};
  return {
    knownBalance: src.knownBalance ?? src.baseBalance ?? 0,
    knownDate: src.knownDate ?? src.baseDate ?? new Date().toISOString().split("T")[0],
    pots: src.pots || [],
  };
}

export function netBalanceColor(amount) {
  if (amount > 0) return "var(--green)";
  if (amount < 0) return "var(--red)";
  return "var(--muted)";
}
