#!/usr/bin/env node
/*
 * Build a compact lookup index from the KBO/BCE open data.
 *
 *   node backend/tools/build-kbo-index.mjs <KboOpenData_dir> [out.db]
 *
 * Turns ~2 GB of CSV into a ~78 MB SQLite file mapping business name → NACE
 * activity, so the "?" button can answer "what kind of company is this"
 * entirely offline. Takes about a minute.
 *
 * WHY THIS IS NOT SHIPPED PREBUILT
 * The index contains the names of sole traders, who are natural persons, so it
 * holds personal data — and the FPS Economy licence grants *use* of the open
 * data, not redistribution. It therefore has to be built by whoever registered
 * for the download, from their own copy, and must never be committed. The
 * script refuses to write into a git working tree for exactly that reason.
 */
import { createReadStream, existsSync, statSync, unlinkSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, resolve, dirname } from 'node:path';
import Database from 'better-sqlite3';

const [, , srcArg, outArg] = process.argv;
if (!srcArg) {
  console.error('usage: node build-kbo-index.mjs <KboOpenData_dir> [out.db]');
  process.exit(1);
}
const SRC = resolve(srcArg);
const OUT = resolve(outArg || join(SRC, 'kbo-index.db'));

for (const f of ['activity.csv', 'denomination.csv', 'code.csv']) {
  if (!existsSync(join(SRC, f))) {
    console.error(`missing ${f} in ${SRC} — point this at an extracted KboOpenData_* directory`);
    process.exit(1);
  }
}

/* Refuse to write anywhere a `git add -A` could pick it up. 78 MB of personal
   data in a public repository is not a mistake worth leaving available. */
for (let d = dirname(OUT); ; d = dirname(d)) {
  if (existsSync(join(d, '.git'))) {
    console.error(`refusing to write inside a git working tree (${d}).`);
    console.error('The index holds sole traders\' names and must not be committed.');
    console.error('Write it somewhere else, e.g. ~/kbo-index.db, and copy it to HA /config.');
    process.exit(1);
  }
  if (d === dirname(d)) break;
}

const LEGAL = /\b(bv|bvba|nv|vzw|srl|sa|sprl|cvba|cv|vof|comm\.?\s*v|scs|se)\b\.?/gi;
/* Must match how the frontend normalises a counterparty before querying, or
   the two sides key differently and nothing ever matches. */
const norm = (s) => String(s || '')
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(LEGAL, ' ')
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Parse one CSV line. The KBO files are quoted, comma-separated, no embedded newlines.
function cells(line) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function eachRow(file, fn) {
  const rl = createInterface({ input: createReadStream(join(SRC, file), { encoding: 'utf8' }), crlfDelay: Infinity });
  let head = null, n = 0;
  for await (const line of rl) {
    if (!line) continue;
    const c = cells(line);
    if (!head) { head = c; continue; }
    const row = {};
    for (let i = 0; i < head.length; i++) row[head[i]] = c[i];
    fn(row); n++;
  }
  return n;
}

const t0 = Date.now();
const secs = () => ((Date.now() - t0) / 1000).toFixed(0);

/* 1. One MAIN activity per entity, from a SINGLE NACE vintage.
      Entities carry codes under 2003, 2008 and 2025, and those numbering
      schemes are not comparable — 47742 and 52485 are the same trade. Taking
      "the newest available per entity" therefore made two branches of the same
      business look like different trades and got the name discarded as
      ambiguous in step 2; 'T Stad Leest was lost exactly that way.
      2025 alone covers 99% of entities, so pinning to it costs almost nothing
      and removes the whole class of problem. */
const NACE_VERSION = '2025';
const entCode = new Map();
const nAct = await eachRow('activity.csv', (r) => {
  if (r.Classification !== 'MAIN') return;
  if (r.NaceVersion !== NACE_VERSION) return;
  if (!entCode.has(r.EntityNumber)) entCode.set(r.EntityNumber, r.NaceCode);
});
console.log(`activity.csv: ${nAct.toLocaleString('nl-BE')} rijen → ${entCode.size.toLocaleString('nl-BE')} entiteiten met een NACE ${NACE_VERSION}-code (${secs()}s)`);

/* 2. Name → activity, keeping only names that resolve to exactly ONE activity.
      A name used by several companies in different trades cannot answer the
      question, and a confident wrong answer is worse than none. */
const byName = new Map();
const nDen = await eachRow('denomination.csv', (r) => {
  const code = entCode.get(r.EntityNumber);
  if (!code) return;
  const n = norm(r.Denomination);
  if (n.length < 4) return;
  const cur = byName.get(n);
  if (cur === undefined) byName.set(n, code);
  else if (cur !== null && cur !== code) byName.set(n, null); // ambiguous
});
console.log(`denomination.csv: ${nDen.toLocaleString('nl-BE')} rijen → ${byName.size.toLocaleString('nl-BE')} namen (${secs()}s)`);

// 3. Write.
if (existsSync(OUT)) unlinkSync(OUT);
const db = new Database(OUT);
db.pragma('journal_mode = OFF');
db.exec('CREATE TABLE nace(code TEXT PRIMARY KEY, nl TEXT); CREATE TABLE biz(name TEXT PRIMARY KEY, code TEXT);');

const insNace = db.prepare('INSERT OR REPLACE INTO nace VALUES (?, ?)');
let nCodes = 0;
db.transaction(() => {
  // eachRow is async; codes are small so read them synchronously afterwards
})();
await eachRow('code.csv', (r) => {
  if (!String(r.Category || '').startsWith('Nace')) return;
  if (r.Language !== 'NL') return;
  insNace.run(r.Code, r.Description); nCodes++;
});

const insBiz = db.prepare('INSERT OR REPLACE INTO biz VALUES (?, ?)');
let kept = 0;
db.transaction(() => {
  for (const [name, code] of byName) {
    if (code === null) continue;          // ambiguous
    insBiz.run(name, code); kept++;
  }
})();
db.exec('VACUUM');
db.close();

const mb = (statSync(OUT).size / 1e6).toFixed(0);
console.log(`\n${OUT}`);
console.log(`  ${kept.toLocaleString('nl-BE')} ondubbelzinnige namen · ${nCodes.toLocaleString('nl-BE')} NACE-omschrijvingen · ${mb} MB · ${secs()}s`);
console.log(`\nKopieer dit bestand naar /config van je Home Assistant (naast budget.db).`);
console.log(`Niet committen: het bevat namen van eenmanszaken.`);
