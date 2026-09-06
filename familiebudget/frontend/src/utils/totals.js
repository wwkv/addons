import { isSubExcluded, isSpendingTx } from './helpers.js';

/*
 * Period aggregates for the dashboard. Lifted out of DashboardView so the
 * figures are reusable and, more importantly, so `spaarquote` stops being an
 * inline expression nothing else can reach.
 */

/** Year + optional month scope, matching the scope catStats/totalExp use. */
export function scopeTo(expanded, year, months) {
  return expanded.filter(t =>
    t.date.startsWith(year) && (!months.length || months.includes(t.date.slice(5, 7)))
  );
}

/**
 * Headline totals. These are COMPLETE — `isSpendingTx` has no category test,
 * so uncategorised money is counted here. Do not attach a coverage warning to
 * anything this returns; see `coverage()` for what is actually partial.
 */
export function periodTotals(expanded, cats, year, months) {
  const scoped = scopeTo(expanded, year, months);
  const inc = scoped
    .filter(t => t.amount > 0 && !isSubExcluded(cats, t.categoryId, t.subCategoryId))
    .reduce((a, t) => a + t.amount, 0);
  const exp = scoped
    .filter(t => isSpendingTx(cats, t))
    .reduce((a, t) => a + Math.abs(t.amount), 0);
  const net = inc - exp;
  // Same rule as comparison.js, so per-month figures agree across the app.
  const monthsWithData = new Set(scoped.map(t => t.date.slice(5, 7))).size;
  return { inc, exp, net, spaarquote: inc > 0 ? Math.round((net / inc) * 100) : null, monthsWithData };
}

/**
 * How much of the spending BREAKDOWN is real.
 *
 * Takes catStats/totalExp, never `exp`. The Uitgaven KPI counts every euro
 * spent; the category bars sum only categorised euros. That gap is what this
 * reconciles — attaching it to the headline instead would flag a number that
 * is already complete.
 */
export function coverage(catStats, totalExp) {
  const known = totalExp || 0;
  const unknown = catStats?._uncat?.total || 0;
  const total = known + unknown;
  return {
    known,
    unknown,
    total,
    count: catStats?._uncat?.count || 0,
    pct: total > 0 ? (known / total) * 100 : null,
  };
}
