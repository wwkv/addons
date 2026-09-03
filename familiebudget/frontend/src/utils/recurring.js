import { parseCounterparty } from './counterparty.js';
import { MULTI } from './rules.js';

/*
 * What are we locked into every month?
 *
 * Derived from the transactions, NOT from the vast/variabel tag. The tag can't
 * carry this: normalizeSub derives both tag axes from one seed `label` slot, so
 * `vast` forces `nodig` and `luxe` forces `variabel` — "fixed but
 * discretionary" is unrepresentable. In the real data that puts Energie & Water
 * in "variabel" even though it is the single largest direct debit, and streaming
 * subscriptions in "variabel" too. The tag survives here only as the weakest of
 * three signals.
 */

/* The bank's own word for a direct debit. Present on 50 transactions across 12
   payees in the real data, and read by nothing except TYPE_RULES until now. */
export const RECURRING_TYPE = /domicili|doorlopende\s*betalingsopdracht/i;

const MONTH = t => t.date.slice(0, 7);
const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * detectCommitments(txs, cats, { year, notRecurring })
 *
 * `txs` must be the RAW transactions, not `expanded` — split rows would count
 * one purchase as several occurrences and inflate the cadence signal.
 */
export function detectCommitments(txs, cats, { year, notRecurring = [] } = {}) {
  const excluded = new Set(notRecurring);
  const subOf = (t) => {
    const cat = cats.find(c => c.id === t.categoryId);
    return cat ? (cat.subs || []).find(s => s.id === t.subCategoryId) : null;
  };

  // Group every outgoing payment by cleaned merchant key. parseCounterparty
  // strips PSP prefixes, store numbers and padded towns, which is what
  // collapses "BOLT ENERGIE ANTWERPEN" and "Bolt Energie" into one payee.
  // (The learned-rules map keys off a raw slice(0,30) instead — reusing that
  // here would split the same merchant across two keys.)
  const groups = new Map();
  for (const t of txs) {
    if (t.amount >= 0) continue;
    const p = parseCounterparty(t.counterparty);
    const key = p.key || t.counterparty.trim().toLowerCase();
    if (!key || excluded.has(key)) continue;
    if (!groups.has(key)) groups.set(key, { key, name: p.name || t.counterparty.trim(), txs: [] });
    groups.get(key).txs.push(t);
  }

  const payees = [];
  const weak = [];

  for (const g of groups.values()) {
    const dates = [...new Set(g.txs.map(t => t.date))].sort();
    const amounts = g.txs.map(t => Math.abs(t.amount));
    const monthsSeen = new Set(g.txs.map(MONTH));
    const signals = [];

    // 1. Bank-asserted. Strongest: a direct debit is recurring by definition,
    //    and it catches the big quarterly/annual ones cadence cannot see yet.
    if (g.txs.some(t => RECURRING_TYPE.test(t.type || ""))) signals.push("bank");

    // 2. Cadence. Monthly-ish repeats with a stable amount.
    //    MULTI counterparties (bol/paypal/amazon/banksys) are many unrelated
    //    purchases behind one name — a fortnightly supermarket habit would
    //    otherwise register as a fixed cost and inflate the baseline.
    const isAggregator = MULTI.some(re => re.test(g.name) || re.test(g.key));
    if (!isAggregator && dates.length >= 3) {
      const gaps = [];
      for (let i = 1; i < dates.length; i++) {
        gaps.push((new Date(dates[i]) - new Date(dates[i - 1])) / 86400000);
      }
      const g50 = median(gaps);
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const sd = Math.sqrt(amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / amounts.length);
      const cv = mean > 0 ? sd / mean : 1;
      if (g50 >= 25 && g50 <= 35 && cv < 0.25) signals.push("cadence");
    }

    // 3. The tag. Weakest, and never sufficient on its own.
    if (g.txs.length >= 2 && g.txs.some(t => (subOf(t)?.type) === "vast")) signals.push("tag");

    if (signals.length === 0) continue;

    const sub = subOf(g.txs[0]);

    /* Recurring is not the same as committed, and the difference decides
       whether a payee belongs in the headline figure.

       Amount stability does NOT separate the two — measured on real data, the
       mortgage varies (CV 0.79, several loans under one bank label), as do
       energy (0.47) and the crèche (0.43), while a monthly takeaway is steady
       at 0.22. So the test is what kind of payee it is, not how regular the
       amount looks:

       - Aggregators (PayPal, bol, Amazon…) genuinely take a direct debit, but
         it settles arbitrary purchases. Recurring, not a commitment.
       - A discretionary category matched on cadence alone is a habit. Pizza
         once a month is a pattern you could stop tomorrow; a crèche invoice
         is not. A bank-asserted direct debit overrides this — that is a
         contract regardless of category. */
    const aggregator = isAggregator;
    const habit = !signals.includes("bank") && (sub?.necessity === "luxe");

    const entry = {
      counts: !aggregator && !habit,
      aggregator,
      habit,
      key: g.key,
      name: g.name,
      signals,
      tier: signals.includes("bank") ? "zeker" : signals.includes("cadence") ? "waarschijnlijk" : "mogelijk",
      occurrences: g.txs.length,
      monthsSeen: monthsSeen.size,
      lastDate: dates[dates.length - 1],
      categoryId: g.txs[0].categoryId,
      subCategoryId: g.txs[0].subCategoryId,
      subName: sub?.name || null,
      uncatCount: g.txs.filter(t => !t.categoryId).length,
      total: amounts.reduce((a, b) => a + b, 0),
    };

    /* A monthly figure needs enough points to be one. Two sightings of a big
       direct debit tell you it exists, not what it costs per month — dividing
       anyway would put an invented number in the headline. Those go to `weak`
       and are listed without a €/month. */
    if (monthsSeen.size >= 3) {
      entry.monthly = signals.includes("cadence")
        ? median(amounts)
        : entry.total / monthsSeen.size;
      payees.push(entry);
    } else {
      weak.push(entry);
    }
  }

  payees.sort((a, b) => b.monthly - a.monthly);
  weak.sort((a, b) => b.total - a.total);

  const monthsSpanned = new Set(txs.filter(t => !year || t.date.startsWith(String(year))).map(MONTH)).size;
  return {
    payees,
    weak,
    monthlyTotal: payees.filter(p => p.counts).reduce((s, p) => s + p.monthly, 0),
    monthsSpanned,
  };
}
