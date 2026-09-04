#!/usr/bin/env node
/*
 * Sanity-check the budget rhythm classifier against a real database.
 *
 *   node backend/tools/check-rhythm.mjs [path/to/budget.db]
 *
 * There is no test runner in this project, and adding one for a single pure
 * function would be more machinery than it earns. But `utils/rhythm.js` decides
 * how much money a whole year's budget contains, and its failure mode is
 * silent: a wrong rhythm produces a plausible number in the right currency.
 * The bugs found while writing it were all of that kind —
 *
 *   - median amount x 12 halved the mortgage, because two loans are debited on
 *     the same date and deduplicating dates hid the second one;
 *   - peeling "outlier" payments deleted EUR 585 of real pharmacy spending by
 *     reclassifying it as a one-off worth nothing;
 *   - an ended salary was projected across twelve months of next year.
 *
 * None of those look wrong on screen. So: run this after touching rhythm.js.
 * Read-only; it never writes to the database.
 */
import Database from 'better-sqlite3';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { classifyRhythm, rowsToBudget, RHYTHMS } from '../../frontend/src/utils/rhythm.js';

const DB = resolve(process.argv[2] || join(import.meta.dirname, '../data/budget.db'));
if (!existsSync(DB)) {
  console.error(`geen database op ${DB}`);
  process.exit(1);
}

const db = new Database(DB, { readonly: true });
const row = db.prepare("SELECT value FROM app_state WHERE key='main'").get();
if (!row) { console.error('geen "main" rij in app_state'); process.exit(1); }
const { txs = [], cats = [] } = JSON.parse(row.value);
if (!txs.length) { console.error('geen transacties'); process.exit(1); }

const years = [...new Set(txs.map((t) => t.date.slice(0, 4)))].sort();
const out = classifyRhythm(txs, cats, { years });
const inc = classifyRhythm(txs, cats, { years, direction: 'in' });

const eur = (n) => `EUR ${Math.round(n).toLocaleString('nl-BE')}`;
let failed = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
};

console.log(`${DB}`);
console.log(`${out.monthsObserved} maanden waargenomen: ${out.observedMonthKeys.join(', ')}`);
console.log(`volledige jaardekking: ${out.coverage.full ? 'ja' : 'nee'}`);
if (out.uncategorised.count) {
  console.log(`niet gebudgetteerd (geen categorie): ${out.uncategorised.count} transacties, ${eur(out.uncategorised.total)}`);
}

const counts = {};
for (const r of out.rows) counts[r.rhythm] = (counts[r.rhythm] || 0) + 1;
console.log(`\nritmes: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')}`);

console.log('\ngrootste uitgaven');
for (const r of out.rows.slice(0, 12)) {
  console.log(
    `  ${r.name.slice(0, 30).padEnd(31)}${r.rhythm.padEnd(21)}${eur(r.yearTotal).padStart(12)}` +
    `  ${(r.confidence || '').padEnd(7)}${r.ended ? ' GESTOPT' : ''}`
  );
}

console.log('\ninkomsten');
for (const r of inc.rows.slice(0, 10)) {
  console.log(
    `  ${r.name.slice(0, 30).padEnd(31)}${r.rhythm.padEnd(21)}${eur(r.yearTotal).padStart(12)}` +
    `  ${r.ended ? `GESTOPT${r.replacedBy ? ` -> ${r.replacedBy}` : ''}` : ''}${r.started ? ' GESTART' : ''}`
  );
}

console.log('\ninvarianten');

/* 1. Nothing may vanish. Every euro that is not deliberately classified as a
      one-off has to survive into the budget arrays. This is the check that
      catches the whole class of "silently dropped money" bugs. */
const rowsTotal = out.rows.reduce((s, r) => s + r.yearTotal, 0);
const budget = rowsToBudget(out.rows);
const budgetTotal = Object.values(budget).reduce((s, a) => s + a.reduce((x, y) => x + y, 0), 0);
check('rowsToBudget behoudt het totaal', Math.abs(budgetTotal - rowsTotal) < 1,
  `${eur(budgetTotal)} vs ${eur(rowsTotal)}`);

/* 2. Rhythm implies shape. A monthly cost must be in all twelve months, a
      quarterly one in exactly four, an annual one in exactly one. A right
      yearly total with the money in the wrong months is still wrong: it is what
      the Netto Balans row and "your heaviest month" are computed from. */
const shape = { [RHYTHMS.MONTHLY]: 12, [RHYTHMS.QUARTERLY]: 4, [RHYTHMS.ANNUAL]: 1, [RHYTHMS.MAYBE_ANNUAL]: 1 };
let shapeBad = null;
for (const r of [...out.rows, ...inc.rows]) {
  const want = shape[r.rhythm];
  if (!want) continue;
  const got = r.months.filter((v) => v > 0).length;
  if (got !== want) { shapeBad = `${r.name}: ${r.rhythm} vult ${got} maanden, verwacht ${want}`; break; }
}
check('ritme komt overeen met de maandverdeling', !shapeBad, shapeBad || '');

// 3. One-offs contribute nothing and are listed separately, never budgeted.
check('eenmalige uitgaven tellen niet mee',
  out.rows.filter((r) => r.rhythm === RHYTHMS.ONE_OFF).every((r) => r.yearTotal === 0));

// 4. Never negative, never NaN — these end up in the database.
const bad = [...out.rows, ...inc.rows].find((r) => r.months.some((v) => !Number.isFinite(v) || v < 0));
check('alle maandbedragen zijn eindige, niet-negatieve getallen', !bad, bad ? bad.name : '');

/* 5. Seasonal shapes need a full year of coverage. With a part-year history
      there is nothing to say about the missing months, and inventing a winter
      is worse than drawing a flat line. */
check('geen seizoenspatroon zonder volledige jaardekking',
  out.coverage.full || !out.rows.some((r) => r.rhythm === RHYTHMS.SEASONAL));

/* 6. The point of the whole exercise: classification must come out BELOW naive
      averaging, because naive averaging multiplies annual bills by twelve. */
const naive = out.rows.reduce((s, r) => s + (r.total / Math.max(out.monthsObserved, 1)) * 12, 0);
check('geclassificeerd ligt onder naief gemiddelde', rowsTotal <= naive,
  `${eur(rowsTotal)} vs naief ${eur(naive)}`);

console.log(`\ntotaal uitgaven ${eur(rowsTotal)} · naief zou ${eur(naive)} zijn`);
console.log(failed ? `\n${failed} controle(s) mislukt` : '\nalles in orde');
process.exit(failed ? 1 : 0);
