/*
 * The savings waterfall — one definition.
 *
 * This block previously existed twice, verbatim: once in App.jsx (to feed the
 * Sparen notification dot) and once in SavingsTab (to render the page). Two
 * copies of the same arithmetic drift the moment either is touched, and the
 * numbers they produce sit next to each other in the UI.
 *
 * Deliberately unchanged while lifting: the `expanded ?? txs` fallback, the
 * hardcoded `"sparen"` category id, and the round-up to the nearest €500. The
 * buffer is also still computed from all non-luxe spending even though the UI
 * calls it "vaste lasten" — that is a pre-existing quirk, and quietly changing
 * the maths during a de-duplication would be the wrong place to fix it.
 */
export function computeSavings({ txs, expanded, cats, year, savings, settings }) {
  const startOfYear = `${year}-01-01`;
  const knownDate = savings?.knownDate || "";

  // Back-solve the 1 Jan balance from the balance the user actually vouched for.
  const savingsWindowTxs = knownDate
    ? txs.filter(tx => tx.categoryId === "sparen" && tx.date >= startOfYear && tx.date <= knownDate)
    : [];
  const netChange = savingsWindowTxs.reduce((sum, tx) => sum + (-(tx.amount || 0)), 0);
  const jan1Balance = (savings?.knownBalance || 0) - netChange;

  const yearTxs = txs.filter(tx => tx.categoryId === "sparen" && tx.date >= startOfYear);
  const totalSavedThisYear = yearTxs.reduce((sum, tx) => sum + (-(tx.amount || 0)), 0);
  const liveTotal = jan1Balance + totalSavedThisYear;

  /* Buffer target: average monthly necessary spend × multiplier. Averaged over
     months that actually have such spending, not calendar months, so a
     part-way-through year isn't diluted toward zero. */
  const data = expanded ?? txs;
  const yearExpenses = data.filter(t => t.date.startsWith(String(year)) && Number(t.amount) < 0);
  const nodigTxs = yearExpenses.filter(t => {
    const cat = cats.find(c => c.id === t.categoryId);
    const sub = cat ? cat.subs.find(ss => ss.id === t.subCategoryId) : null;
    if (!cat || !sub || sub.excluded || cat.id === "sparen") return false;
    return (sub.necessity || "nodig") !== "luxe";
  });
  const uniqueMonths = new Set(nodigTxs.map(t => t.date.substring(0, 7)));
  const totalNodigSpend = Math.abs(nodigTxs.reduce((sum, t) => sum + Number(t.amount), 0));
  const monthsCounted = uniqueMonths.size;
  const avgMonthlyNodig = totalNodigSpend / (monthsCounted > 0 ? monthsCounted : 1);
  const bufferTarget = Math.ceil((avgMonthlyNodig * (settings?.bufferMultiplier || 5)) / 500) * 500;

  /* Reality waterfall: the buffer fills first, then each pot takes what it
     asked for out of whatever cash is left. `saved` is intent; `allocated` is
     intent capped by money that actually exists. */
  const bufferAllocated = Math.min(liveTotal, bufferTarget);
  let rollingAvailable = Math.max(0, liveTotal - bufferAllocated);
  const potsWithAllocation = (savings?.pots || []).map(pot => {
    const intent = Number(pot.saved) || 0;
    const allocated = Math.min(intent, rollingAvailable);
    rollingAvailable -= allocated;
    return { ...pot, intent, allocated };
  });

  return {
    jan1Balance,
    totalSavedThisYear,
    liveTotal,
    avgMonthlyNodig,
    monthsCounted,
    bufferTarget,
    bufferAllocated,
    // Guarded rather than leaning on `NaN || 0`: with no necessary spending
    // recorded there is no target, and 0% would read as "you have nothing".
    bufferPct: bufferTarget > 0 ? Math.min(100, (bufferAllocated / bufferTarget) * 100) : null,
    potsWithAllocation,
    unassigned: rollingAvailable,
  };
}
