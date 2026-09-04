import { parseCounterparty } from './counterparty.js';
import { MULTI } from './rules.js';
import { isSubExcluded } from './helpers.js';
import { RECURRING_TYPE } from './recurring.js';

/*
 * ═══════════════════════════════════════════════════════════
 *   How often does this cost actually happen?
 * ═══════════════════════════════════════════════════════════
 *
 * A budget is twelve numbers per subcategory, and the whole difficulty is that
 * a year of spending arrives as one undifferentiated list. Averaging it and
 * multiplying by twelve is the obvious move and it is badly wrong. Measured on
 * the real data:
 *
 *     naive (average everything, ×12)   €47.971
 *     rhythm-classified                 €40.514
 *
 * The €7.457 gap is annual bills counted twelve times. "Overige Verzekeringen"
 * alone holds a monthly premium (AG SO Via Louiza, ~€19/mo) next to two ANNUAL
 * ones (AXA Belgium €954,15 and AXA €454,47). Averaging the subcategory turns
 * roughly €1.600/yr into €4.457/yr — nearly triple. No amount of careful typing
 * in a blank grid fixes that, because the person typing does not remember which
 * of those three was annual either.
 *
 * So this classifies every payee by its RHYTHM and returns a `number[12]` —
 * money placed in the months it actually falls, not smeared across the year.
 * Placement is half the value: it is what makes the Netto Balans row and
 * "January is your heaviest month" mean anything.
 *
 * TWO DELIBERATE DIVERGENCES FROM detectCommitments()
 *
 * 1. No CV gate. `recurring.js` requires amount CV < 0.25 before it calls
 *    something a cadence, because it is deciding whether you are LOCKED IN.
 *    Rhythm is a different question: the mortgage has CV 0.79 (several loans
 *    under one bank label) and is unambiguously monthly. Gaps decide the
 *    rhythm; amount variance only lowers confidence.
 *
 * 2. Aggregators are kept. `recurring.js` drops bol/PayPal/BANKSYS from the
 *    committed total, correctly — that direct debit settles arbitrary
 *    purchases. But money spent at bol.com is still money you must budget. So
 *    they stay, capped at `variabel`: never presented as a fixed monthly bill.
 *
 * Pure function over transactions. No state, no I/O.
 */

export const RHYTHMS = {
  MONTHLY: 'maandelijks',
  QUARTERLY: 'kwartaal',
  ANNUAL: 'jaarlijks',
  SEASONAL: 'seizoen',
  VARIABLE: 'doorlopend variabel',
  MAYBE_ANNUAL: 'jaarlijks?',
  ONE_OFF: 'eenmalig',
};

/* A single sighting below this is noise to be listed and skipped; above it,
   something worth asking the user about before dropping it from a year's
   budget. €250 is the same block size the savings tab already treats as the
   smallest meaningful amount of money (ASSIGN_BLOCK). */
const MAYBE_ANNUAL_MIN = 250;

const MONTH_KEY = (d) => d.slice(0, 7);
const MONTH_IDX = (d) => parseInt(d.slice(5, 7), 10) - 1;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const zeros = () => Array(12).fill(0);

/**
 * classifyRhythm(txs, cats, opts)
 *
 * `txs` must be the RAW transactions, not `expanded` — split rows would count
 * one purchase as several occurrences and fake a cadence, the same trap
 * detectCommitments documents.
 *
 * opts:
 *   years      array of year strings to learn from, e.g. ["2025","2026"]
 *   direction  "out" (default) for expenses, "in" for income
 *
 * Returns { rows, monthsObserved, observedMonthKeys, coverage, uncategorised }
 *   rows[]     { key, catId, subId, name, rhythm, months[12], yearTotal,
 *                confidence, occurrences, monthsSeen, total, signals,
 *                firstDate, lastDate, ended, started, aggregator }
 *   coverage   { full, monthsWithData[12] } — which calendar months the
 *              learning window can actually speak to
 */
export function classifyRhythm(txs, cats, { years, direction = 'out' } = {}) {
  const yearSet = years && years.length ? new Set(years.map(String)) : null;
  const wantIncome = direction === 'in';

  const subOf = (t) => {
    const cat = cats.find((c) => c.id === t.categoryId);
    return cat ? (cat.subs || []).find((s) => s.id === t.subCategoryId) : null;
  };

  const budgetable = new Set();
  for (const c of cats) for (const s of c.subs || []) budgetable.add(`${c.id}|${s.id}`);

  /* The observation window, measured rather than assumed. `monthsWithData`
     counts, per calendar month, how many years in the window carry ANY
     transaction in that month. It is what stops an 8-month history from being
     asked to describe December, and what lets two years of history be averaged
     per month instead of summed. */
  const monthsWithData = zeros();
  const observedMonthKeys = new Set();
  for (const t of txs) {
    if (!t.date) continue;
    if (yearSet && !yearSet.has(t.date.slice(0, 4))) continue;
    observedMonthKeys.add(MONTH_KEY(t.date));
  }
  const yearsPerMonth = zeros();
  for (const mk of observedMonthKeys) {
    const idx = parseInt(mk.slice(5, 7), 10) - 1;
    yearsPerMonth[idx] += 1;
    monthsWithData[idx] += 1;
  }
  const coverageFull = yearsPerMonth.every((n) => n > 0);
  const sortedMonthKeys = [...observedMonthKeys].sort();
  const firstMonthKey = sortedMonthKeys[0] || null;
  const lastMonthKey = sortedMonthKeys[sortedMonthKeys.length - 1] || null;

  // ── Group by subcategory AND payee ─────────────────────────────────────
  // Budgets are keyed by subcategory, so a payee appearing under two subs is
  // two rows: they land in two different budget lines and must be able to
  // carry two different rhythms.
  const groups = new Map();
  let uncategorised = { count: 0, total: 0 };

  for (const t of txs) {
    if (!t.date) continue;
    if (yearSet && !yearSet.has(t.date.slice(0, 4))) continue;
    if (wantIncome ? t.amount <= 0 : t.amount >= 0) continue;

    /* Excluded subcategories are out, for the reason savings taught us: the
       standing order to your own savings account is not a cost, and the
       transfer back is invisible here because it is the opposite sign. */
    if (isSubExcluded(cats, t.categoryId, t.subCategoryId)) continue;

    /* Anything that cannot end up in a budget line is counted and set aside,
       never classified. `cats` is the caller's list of BUDGETABLE categories,
       so passing a filtered list (no archived, no "Nog te verwerken") is what
       keeps seeded money out of rows the grid refuses to draw — money written
       somewhere invisible is worse than money left out, because the totals
       stop reconciling and nothing on screen explains why. */
    if (!t.categoryId || !t.subCategoryId || !budgetable.has(`${t.categoryId}|${t.subCategoryId}`)) {
      uncategorised.count += 1;
      uncategorised.total += Math.abs(t.amount);
      continue;
    }

    const p = parseCounterparty(t.counterparty || '');
    const payeeKey = p.key || (t.counterparty || '').trim().toLowerCase() || '(onbekend)';
    const key = `${t.categoryId}|${t.subCategoryId}|${payeeKey}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        catId: t.categoryId,
        subId: t.subCategoryId,
        name: p.name || (t.counterparty || '').trim() || '(onbekend)',
        payeeKey,
        txs: [],
      });
    }
    groups.get(key).txs.push(t);
  }

  const rows = [];
  for (const g of groups.values()) {
    for (const part of peelOutliers(g)) {
      rows.push(classifyGroup(part, { subOf, yearsPerMonth, coverageFull, firstMonthKey, lastMonthKey }));
    }
  }

  markReplacements(rows);

  // Biggest first — the rows worth arguing about are the expensive ones.
  rows.sort((a, b) => b.yearTotal - a.yearTotal);

  return {
    rows,
    monthsObserved: observedMonthKeys.size,
    observedMonthKeys: [...observedMonthKeys].sort(),
    coverage: { full: coverageFull, monthsWithData },
    uncategorised,
  };
}

/* One payee can carry two rhythms at once, and merging them wrecks both.
   VOXDALE pays a monthly salary AND a €6.126,05 AFREKENING LOON; averaged
   together the cadence disappears (the extra payment lands on its own date, so
   the median gap drops out of the monthly band) and the yearly figure becomes a
   salary nobody earns. The same shape appears on the income side as vakantiegeld
   and eindejaarspremie, and on the expense side as an annual settlement from a
   monthly supplier.

   So: a payment several times the payee's own typical amount, occurring once,
   is peeled off into its own row. It keeps the payee's name with a suffix, gets
   classified on its own terms, and can be kept or dropped independently in the
   review screen. Needs ≥3 payments before the median means anything. */
const OUTLIER_RATIO = 2.5;

function peelOutliers(g) {
  if (g.txs.length < 3) return [g];
  const amounts = g.txs.map((t) => Math.abs(t.amount));
  const med = median(amounts);
  if (med <= 0) return [g];

  const regular = [];
  const outliers = [];
  for (const t of g.txs) {
    const a = Math.abs(t.amount);
    // Big relative to this payee AND big in absolute terms. The absolute floor
    // is what stops a €43 premium among €10 ones — or a €200 pharmacy trip
    // among €20 ones — from being treated as an event: those are ordinary
    // variance, and peeling them off would classify them as one-offs worth €0
    // and quietly delete real money from the budget.
    (a > med * OUTLIER_RATIO && a >= MAYBE_ANNUAL_MIN ? outliers : regular).push(t);
  }
  // Only peel genuinely exceptional payments — if a third of the group is
  // "outlying", the amounts are simply variable and the median never described
  // them in the first place.
  if (!outliers.length || outliers.length > g.txs.length / 3) return [g];
  if (regular.length < 2) return [g];

  /* And only when what remains is genuinely rhythmic. Peeling is a claim that
     this payee has a steady stream plus an occasional extra; if the remainder
     has no cadence, there was no stream to separate and the payee is just
     variable. Without this test a lumpy-but-ordinary payee gets split into a
     smaller flat line plus a stranded single payment. */
  const rd = [...new Set(regular.map((t) => t.date))].sort();
  if (rd.length < 3) return [g];
  const rg = [];
  for (let i = 1; i < rd.length; i++) rg.push((new Date(rd[i]) - new Date(rd[i - 1])) / 86400000);
  const rmed = median(rg);
  if (!(rmed >= 25 && rmed <= 35) && !(rmed >= 80 && rmed <= 100)) return [g];

  return [
    { ...g, txs: regular },
    ...outliers.map((t, i) => ({
      ...g,
      key: `${g.key}|extra${i}`,
      name: `${g.name} (eenmalig)`,
      txs: [t],
      peeled: true,
    })),
  ];
}

function classifyGroup(g, { subOf, yearsPerMonth, coverageFull, firstMonthKey, lastMonthKey }) {
  const dates = [...new Set(g.txs.map((t) => t.date))].sort();
  const amounts = g.txs.map((t) => Math.abs(t.amount));
  const total = amounts.reduce((a, b) => a + b, 0);
  const monthKeys = new Set(g.txs.map((t) => MONTH_KEY(t.date)));
  const monthsSeen = monthKeys.size;
  const sub = subOf(g.txs[0]);
  const signals = [];

  const bank = g.txs.some((t) => RECURRING_TYPE.test(t.type || ''));
  if (bank) signals.push('bank');
  const aggregator = MULTI.some((re) => re.test(g.name) || re.test(g.payeeKey));
  if (aggregator) signals.push('aggregator');
  if (sub?.type === 'vast') signals.push('tag');

  /* Money actually seen per calendar month, averaged over the years that month
     was observed. Summing instead would double a monthly cost when learning
     from two years. */
  const perMonth = zeros();
  for (const t of g.txs) perMonth[MONTH_IDX(t.date)] += Math.abs(t.amount);
  const perMonthAvg = perMonth.map((v, i) => (yearsPerMonth[i] > 0 ? v / yearsPerMonth[i] : 0));
  const monthIdxSeen = [...new Set(g.txs.map((t) => MONTH_IDX(t.date)))].sort((a, b) => a - b);

  const gaps = [];
  for (let i = 1; i < dates.length; i++) {
    gaps.push((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000);
  }
  const gap = gaps.length ? median(gaps) : null;

  const out = {
    key: g.key,
    catId: g.catId,
    subId: g.subId,
    name: g.name,
    payeeKey: g.payeeKey,
    signals,
    aggregator,
    occurrences: g.txs.length,
    monthsSeen,
    total,
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
    /* Started, measured against the WINDOW rather than against the payee's own
       dates — comparing a payee to itself is always true and tells you nothing.
       It matters most for income: BLACKBIRDS begins mid-history, and averaging
       it over the whole window invents a salary that was never earned. `ended`
       is set below, once the rhythm is known. */
    started: !!(firstMonthKey && MONTH_KEY(dates[0]) > firstMonthKey),
  };

  let rhythm, months, confidence;

  if (dates.length >= 3 && gap !== null && gap >= 25 && gap <= 35 && !aggregator) {
    /* Monthly. The per-month value is total/monthsSeen, NEVER the median
       amount: `Vervaldag krediet` is two loans debited on the same date, so
       deduplicating dates gives a clean 30-day cadence but a median of one
       loan — €8.266/yr against a true €16.531. The mean over months seen is
       right whether there is one payment a month or three. */
    rhythm = RHYTHMS.MONTHLY;
    months = zeros().fill(total / monthsSeen);
    confidence = 'hoog';
  } else if (dates.length >= 3 && gap !== null && gap >= 80 && gap <= 100 && !aggregator) {
    // Quarterly: place the typical invoice on its own cycle from the first
    // month it was seen, so a Q1 bill stays a Q1 bill.
    rhythm = RHYTHMS.QUARTERLY;
    const amt = median(amounts);
    months = zeros();
    for (let k = 0; k < 4; k++) months[(monthIdxSeen[0] + k * 3) % 12] = amt;
    confidence = 'hoog';
  } else if (dates.length >= 2 && gap !== null && gap >= 350 && gap <= 380) {
    rhythm = RHYTHMS.ANNUAL;
    months = zeros();
    months[monthIdxSeen[0]] = median(amounts);
    confidence = 'hoog';
  } else if (monthsSeen < 3) {
    /* Too few sightings to see a cadence. A big one is probably an annual
       bill and must not be averaged into twelve; a small one is probably a
       one-off and must not be projected at all. The bank's own word settles
       it when present — a direct debit is periodic by definition, and on a
       short history that is the ONLY way an annual bill can be confirmed. */
    const amt = median(amounts);
    if (bank || amt >= MAYBE_ANNUAL_MIN) {
      rhythm = bank ? RHYTHMS.ANNUAL : RHYTHMS.MAYBE_ANNUAL;
      months = zeros();
      months[monthIdxSeen[0]] = amt;
      confidence = bank ? 'midden' : 'laag';
    } else {
      rhythm = RHYTHMS.ONE_OFF;
      months = zeros();
      confidence = 'laag';
    }
  } else if (coverageFull && monthsSeen >= 8 && isSeasonal(perMonthAvg)) {
    /* Varies month to month in a shape that repeats — energy is the case that
       matters. Needs a full year of coverage: you cannot describe December
       from a January-to-August history, and a flat line is more honest than
       an invented winter. */
    rhythm = RHYTHMS.SEASONAL;
    months = perMonthAvg.slice();
    confidence = 'midden';
  } else {
    // Ongoing but shapeless — groceries, fuel. Flat is the honest answer.
    rhythm = RHYTHMS.VARIABLE;
    months = zeros().fill(total / monthsSeen);
    confidence = monthsSeen >= 4 ? 'midden' : 'laag';
  }

  out.rhythm = rhythm;
  out.months = months.map((v) => Math.round(v * 100) / 100);
  out.yearTotal = out.months.reduce((s, n) => s + n, 0);
  out.confidence = confidence;

  /* "Has it stopped?" only makes sense relative to how often it was due. A
     monthly payee missing from the final observed month has almost certainly
     ended — that is how VOXDALE's salary reads once BLACKBIRDS takes over. A
     quarterly one is expected to be absent most months, and an annual one is
     absent eleven out of twelve, so silence proves nothing there. Using one
     rule for all three either misses the ended salary or condemns every annual
     bill as cancelled.

     Two months of silence rather than one: payment dates drift across a month
     boundary all the time, and a single missed month would flag half the
     healthy monthly payees as cancelled. */
  const monthsSinceLast = lastMonthKey ? monthsBetween(MONTH_KEY(out.lastDate), lastMonthKey) : 0;
  const staleAfter =
    rhythm === RHYTHMS.MONTHLY || rhythm === RHYTHMS.SEASONAL || rhythm === RHYTHMS.VARIABLE
      ? 2
      : rhythm === RHYTHMS.QUARTERLY
        ? 5
        : Infinity;
  out.ended = monthsSinceLast >= staleAfter;

  return out;
}

/* Seasonal only if the swing is big enough to be worth modelling. A payee
   whose months sit within ±25% of their own mean is flat in all but name, and
   drawing a wobble there just makes the grid look precise about noise. */
function isSeasonal(perMonthAvg) {
  const vals = perMonthAvg.filter((v) => v > 0);
  if (vals.length < 8) return false;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean <= 0) return false;
  const spread = (Math.max(...vals) - Math.min(...vals)) / mean;
  return spread > 0.5;
}

/*
 * Succession: one payee stops in a subcategory and another takes over.
 *
 * This is the signal that timing alone cannot give. VOXDALE's last salary lands
 * 2026-06-02 and BLACKBIRDS' first 2026-07-01, both under `loon`. Judged only
 * on silence, VOXDALE is one month quiet — indistinguishable from a payment
 * that has not cleared yet, especially when the final month of the window is
 * partial (this snapshot stops on the 28th). Judged against its successor it is
 * unambiguous: nobody draws two full salaries in the same subcategory.
 *
 * Getting this wrong is expensive in exactly one direction. An unflagged ended
 * salary is projected across all twelve months of next year — the largest
 * single number in the budget, and wrong. So a clean handover is marked, and
 * the review screen says "gestopt — vervangen door BLACKBIRDS" rather than
 * silently choosing for you.
 *
 * Deliberately conservative: both rows must be substantial, the handover must
 * be clean (no overlap), and the gap must be short enough to read as a
 * succession rather than two unrelated things years apart.
 */
function markReplacements(rows) {
  const bySub = new Map();
  for (const r of rows) {
    if (r.rhythm === RHYTHMS.ONE_OFF) continue;
    if (!bySub.has(r.subId)) bySub.set(r.subId, []);
    bySub.get(r.subId).push(r);
  }
  /* Only a STREAM can be succeeded. Two annual insurance premiums in the same
     subcategory are just two bills, not a handover — AXA (June) followed by AXA
     Belgium (June) was being labelled "gestopt → AXA Belgium", which is both
     wrong and alarming to read. Succession is a claim about something that used
     to arrive regularly and now does not, so it only applies where "regularly"
     meant something in the first place. */
  const isStream = (r) =>
    r.rhythm === RHYTHMS.MONTHLY || r.rhythm === RHYTHMS.SEASONAL || r.rhythm === RHYTHMS.VARIABLE;

  for (const group of bySub.values()) {
    if (group.length < 2) continue;
    for (const a of group) {
      if (a.ended || !isStream(a)) continue;
      for (const b of group) {
        // Same payee peeled into several rows is not a succession.
        if (a === b || a.payeeKey === b.payeeKey) continue;
        if (b.firstDate <= a.lastDate) continue;            // must not overlap
        if (monthsBetween(MONTH_KEY(a.lastDate), MONTH_KEY(b.firstDate)) > 2) continue;
        if (a.total < MAYBE_ANNUAL_MIN || b.total < MAYBE_ANNUAL_MIN) continue;
        a.ended = true;
        a.replacedBy = b.name;
        break;
      }
    }
  }
}

/** Whole months from one YYYY-MM to another. */
function monthsBetween(a, b) {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

/**
 * Re-shape a row to a different rhythm, keeping its yearly total.
 *
 * This is what the review screen's rhythm dropdown calls. The user edits the
 * YEARLY figure — that is how people think about a budget ("about €500 a year
 * on clothes") — and the rhythm decides which months carry it. Changing the
 * rhythm therefore never changes how much; only when.
 *
 * `monthIdx` is which month an annual bill falls in, or where a quarterly cycle
 * starts. Seasonal keeps the measured shape and rescales it, so adjusting the
 * total of a seasonal line preserves its winter peak.
 */
export function reshapeRow(row, { rhythm, monthIdx, yearTotal }) {
  const r = rhythm ?? row.rhythm;
  const total = yearTotal ?? row.yearTotal;
  const m = monthIdx ?? row.months.findIndex((v) => v > 0);
  const start = m < 0 ? 0 : m;
  const months = zeros();

  if (r === RHYTHMS.MONTHLY || r === RHYTHMS.VARIABLE) {
    months.fill(total / 12);
  } else if (r === RHYTHMS.QUARTERLY) {
    for (let k = 0; k < 4; k++) months[(start + k * 3) % 12] = total / 4;
  } else if (r === RHYTHMS.ANNUAL || r === RHYTHMS.MAYBE_ANNUAL) {
    months[start] = total;
  } else if (r === RHYTHMS.SEASONAL) {
    const base = row.months.reduce((s, n) => s + n, 0);
    if (base > 0) for (let i = 0; i < 12; i++) months[i] = (row.months[i] / base) * total;
    else months.fill(total / 12);
  }
  // ONE_OFF falls through as twelve zeros: listed, never budgeted.

  return months.map((v) => Math.round(v * 100) / 100);
}

/**
 * Fold classified rows into the shape the budget store already uses:
 * { [subId]: number[12] }. Several payees in one subcategory sum, which is
 * exactly right — the grid holds one line per subcategory.
 */
export function rowsToBudget(rows) {
  const out = {};
  for (const r of rows) {
    if (!r.subId) continue;
    const arr = out[r.subId] || zeros();
    for (let i = 0; i < 12; i++) arr[i] = Math.round((arr[i] + (r.months[i] || 0)) * 100) / 100;
    out[r.subId] = arr;
  }
  return out;
}
