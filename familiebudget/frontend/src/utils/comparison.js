/* ═══════════════════════════════════════════════════════════
   Comparison engine
   ═══════════════════════════════════════════════════════════

   One abstraction — a "dataset" — makes every comparison the user asked for
   the same operation:

     month vs month          → period(2026,[07]) vs period(2026,[08])
     month vs rest of year   → period(2026,[08]) vs periodExcept(2026,[08])
     actual vs budget        → period(2026,[08]) vs budget(2026,[08])
     year vs national avg    → period(2026,[])   vs benchmark()

   A dataset resolves to spending-per-category plus the number of months it
   spans, so periods of different length can be compared fairly by
   normalising to a per-month figure.

   The national benchmark is share-based rather than euro-based (see
   benchmark.js for why), so it is compared on share-of-spending. Everything
   else is compared in euros, with an optional per-month normalisation.
*/

import { CALENDAR_MONTH_KEYS } from './constants.js';
import { BENCHMARK_GROUPS, BENCHMARK_META, spendingByBenchmarkGroup } from './benchmark.js';

export const MONTH_NAMES = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export const monthLabel = (m) => MONTH_NAMES[parseInt(m, 10) - 1] || m;

function periodLabel(year, months) {
  if (!months || months.length === 0) return `Heel ${year}`;
  if (months.length === 1) return `${monthLabel(months[0])} ${year}`;
  if (months.length === 12) return `Heel ${year}`;
  return `${months.length} maanden ${year}`;
}

/* ── Dataset descriptors ───────────────────────────────────── */

export const DATASET_KINDS = {
  PERIOD: "period",
  PERIOD_EXCEPT: "periodExcept",
  BUDGET: "budget",
  BENCHMARK: "benchmark",
};

/**
 * Resolve a descriptor into comparable numbers.
 * ctx: { expanded, cats, budgets, isExcluded }
 *
 * Returns { label, sublabel, mode, byKey, total, monthCount, unit }
 *   mode "eur"   → byKey is categoryId -> euros
 *   mode "share" → byKey is benchmarkGroupId -> percentage of total
 */
export function resolveDataset(desc, ctx) {
  const { expanded, cats, budgets, isExcluded } = ctx;

  if (desc.kind === DATASET_KINDS.BENCHMARK) {
    const byKey = {};
    for (const g of BENCHMARK_GROUPS) byKey[g.id] = g.share;
    return {
      label: "Gemiddeld gezin in België",
      sublabel: `${BENCHMARK_META.source} · ${BENCHMARK_META.year}`,
      mode: "share",
      byKey,
      total: 100,
      monthCount: 1,
      unit: "%",
    };
  }

  if (desc.kind === DATASET_KINDS.BUDGET) {
    const { year, months } = desc;
    const yearBudget = (budgets && budgets[year]) || {};
    const expense = yearBudget.expense || {};
    const monthIdxs = (months && months.length)
      ? months.map(m => parseInt(m, 10) - 1)
      : CALENDAR_MONTH_KEYS.map((_, i) => i);

    const byKey = {};
    let total = 0;
    for (const cat of cats) {
      if (cat.type === "inkomsten" || cat.type === "transfers") continue;
      let sum = 0;
      for (const sub of (cat.subs || [])) {
        const arr = expense[sub.id];
        if (!arr) continue;
        for (const i of monthIdxs) sum += Number(arr[i]) || 0;
      }
      if (sum > 0) byKey[cat.id] = sum;
      total += sum;
    }
    return {
      label: `Budget — ${periodLabel(year, months)}`,
      sublabel: total === 0 ? "Geen budget ingesteld" : null,
      mode: "eur",
      byKey,
      total,
      monthCount: monthIdxs.length,
      unit: "€",
    };
  }

  /* period / periodExcept — actual spending */
  const { year, months } = desc;
  const isExcept = desc.kind === DATASET_KINDS.PERIOD_EXCEPT;

  const inScope = (t) => {
    if (!t.date.startsWith(year)) return false;
    const m = t.date.slice(5, 7);
    if (!months || months.length === 0) return !isExcept;
    return isExcept ? !months.includes(m) : months.includes(m);
  };

  const scoped = expanded.filter(t => inScope(t) && !isExcluded(t));
  const spend = scoped.filter(t => t.amount < 0);

  const byKey = {};
  let total = 0;
  for (const t of spend) {
    const amt = Math.abs(t.amount);
    const key = t.categoryId || "_uncat";
    byKey[key] = (byKey[key] || 0) + amt;
    total += amt;
  }

  const monthsWithData = new Set(spend.map(t => t.date.slice(5, 7)));
  const monthCount = Math.max(1, monthsWithData.size);

  let label;
  if (isExcept) {
    label = months && months.length
      ? `Rest van ${year}`
      : `Heel ${year}`;
  } else {
    label = periodLabel(year, months);
  }

  return {
    label,
    sublabel: `${monthCount} ${monthCount === 1 ? "maand" : "maanden"} met data`,
    mode: "eur",
    byKey,
    total,
    monthCount,
    unit: "€",
  };
}

/**
 * Compare two resolved datasets.
 * opts: { perMonth } — normalise euro datasets to a per-month figure so a
 * single month can be fairly compared against a whole year.
 *
 * Returns { rows, totalA, totalB, delta, pct, mode, unit, comparable }
 * rows are sorted by absolute delta, biggest mover first (the AppBlock
 * "top increase / top saver" idea: what actually moved, both directions).
 */
export function compareDatasets(a, b, opts = {}) {
  // Share-based datasets (the national benchmark) live in a different key
  // space — COICOP groups, not app categories — so they go through
  // compareToBenchmark instead.
  if (a.mode === "share" || b.mode === "share") return null;

  const div = opts.perMonth
    ? { a: a.monthCount || 1, b: b.monthCount || 1 }
    : { a: 1, b: 1 };

  const keys = new Set([...Object.keys(a.byKey), ...Object.keys(b.byKey)]);
  const rows = [];
  for (const k of keys) {
    const av = (a.byKey[k] || 0) / div.a;
    const bv = (b.byKey[k] || 0) / div.b;
    if (av === 0 && bv === 0) continue;
    rows.push({ key: k, a: av, b: bv, delta: bv - av, pct: av > 0 ? ((bv - av) / av) * 100 : null });
  }
  rows.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  const totalA = a.total / div.a;
  const totalB = b.total / div.b;

  return {
    rows,
    totalA,
    totalB,
    delta: totalB - totalA,
    pct: totalA > 0 ? ((totalB - totalA) / totalA) * 100 : null,
    mode: "eur",
    unit: "€",
    perMonth: !!opts.perMonth,
  };
}

/**
 * Compare a real spending period against the national benchmark, on shares.
 * Kept separate because the key space is COICOP groups, not app categories.
 */
export function compareToBenchmark(periodDesc, ctx) {
  const { expanded, cats, isExcluded } = ctx;
  const { year, months } = periodDesc;

  const scoped = expanded.filter(t =>
    t.date.startsWith(year) &&
    (!months || months.length === 0 || months.includes(t.date.slice(5, 7)))
  );

  const { byGroup, total } = spendingByBenchmarkGroup(scoped, cats, isExcluded);

  const rows = BENCHMARK_GROUPS.map(g => {
    const mine = total > 0 ? (byGroup[g.id] / total) * 100 : 0;
    return {
      key: g.id,
      name: g.name,
      a: mine,
      b: g.share,
      delta: mine - g.share,
      eur: byGroup[g.id],
    };
  }).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  // Spending we couldn't attribute — shown so the user knows what's excluded
  // rather than silently skewing the shares.
  const attributed = Object.values(byGroup).reduce((s, v) => s + v, 0);
  const unattributed = scoped
    .filter(t => t.amount < 0 && !isExcluded(t) && !t.subCategoryId)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return {
    rows,
    total: attributed,
    unattributed,
    label: periodLabel(year, months),
    meta: BENCHMARK_META,
  };
}
