import express from 'express';
import cors from 'cors';
import { join, dirname, sep } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import Database from 'better-sqlite3';
import { getState, setState, getAllState, importAll, closeDb } from './db.js';
import db from './db.js';
import { scheduleDailyBackup, createBackup, listBackups } from './backup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ─── API Routes ───

// Get all state
app.get('/api/state', (req, res) => {
  try {
    res.json(getAllState());
  } catch (err) {
    console.error('[GET /api/state]', err.message);
    res.status(500).json({ error: 'Failed to read state' });
  }
});

// Get single state key
app.get('/api/state/:key', (req, res) => {
  try {
    const result = getState(req.params.key);
    if (!result) return res.json({ key: req.params.key, value: null });
    res.json(result);
  } catch (err) {
    console.error(`[GET /api/state/${req.params.key}]`, err.message);
    res.status(500).json({ error: 'Failed to read state' });
  }
});

// Save single state key
app.post('/api/state/:key', (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: 'Missing "value" in body' });
    }
    setState(req.params.key, value);
    res.json({ ok: true, key: req.params.key });
  } catch (err) {
    console.error(`[POST /api/state/${req.params.key}]`, err.message);
    res.status(500).json({ error: 'Failed to save state' });
  }
});

// Export: returns JSON backup in old-compatible format
app.post('/api/backup/export', (req, res) => {
  try {
    const state = getAllState();
    const mainState = state.main || {};
    const budgets = state.budgets || {};
    const exportData = {
      ...mainState,
      _budgets: budgets,
      _exportedAt: new Date().toISOString(),
      _version: '2.0',
    };
    res.setHeader('Content-Disposition',
      `attachment; filename="budget-backup-${new Date().toISOString().split('T')[0]}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    console.error('[POST /api/backup/export]', err.message);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Import: accepts JSON payload, replaces all state
app.post('/api/backup/import', (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid backup data' });
    }

    // Safety backup before import
    createBackup(db);

    // Handle both old format (flat) and new format (with _budgets)
    const { _budgets, _exportedAt, _version, ...mainState } = data;

    importAll({
      main: mainState,
      budgets: _budgets || {},
    });

    res.json({ ok: true, message: 'Backup imported' });
  } catch (err) {
    console.error('[POST /api/backup/import]', err.message);
    res.status(500).json({ error: 'Import failed' });
  }
});

// List backups
app.get('/api/backup/list', (req, res) => {
  try {
    res.json(listBackups());
  } catch {
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Trigger manual backup
app.post('/api/backup/create', (req, res) => {
  try {
    const path = createBackup(db);
    res.json(path ? { ok: true } : { error: 'Backup failed' });
  } catch {
    res.status(500).json({ error: 'Backup failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

/* ─── Merchant lookup (OpenStreetMap) ───
   Answers "what kind of business is this" for a counterparty the user cannot
   place. This is the ONE route in the app that talks to the outside world, so
   it is deliberately narrow:

   - It only ever runs on an explicit click, one transaction at a time. The
     frontend hides the button entirely unless the user has opted in.
   - Nominatim is a free community service. Its usage policy requires an
     identifying User-Agent and at most one request per second, and forbids
     systematic/bulk querying — which is why there is no "look up everything"
     endpoint here and must never be one.
   - A business type does not change, so results are cached hard. The cache is
     size-capped, unlike the calendar one, because merchant keys are unbounded. */
/* The local KBO index, if the user has built one (see
   tools/build-kbo-index.mjs). Opened read-only at startup; absent simply means
   this half of the lookup never answers. Unlike the OSM half it makes no
   network request at all, so it is not behind the opt-in — there is nothing to
   consent to. */
const KBO_PATH = join(process.env.DATA_DIR || join(__dirname, 'data'), 'kbo-index.db');
let kboDb = null;
try {
  if (existsSync(KBO_PATH)) {
    kboDb = new Database(KBO_PATH, { readonly: true, fileMustExist: true });
    const n = kboDb.prepare('SELECT COUNT(*) c FROM biz').get().c;
    console.log(`[KBO] index geladen: ${n.toLocaleString('nl-BE')} namen`);
  }
} catch (e) {
  console.error('[KBO] index kon niet geopend worden:', e.message);
  kboDb = null;
}
const kboStmt = kboDb
  ? kboDb.prepare('SELECT b.code AS code, n.nl AS nl FROM biz b LEFT JOIN nace n ON n.code = b.code WHERE b.name = ?')
  : null;

/* Must mirror build-kbo-index.mjs exactly, or the two sides key differently
   and nothing ever matches. */
const LEGAL_FORM = /\b(bv|bvba|nv|vzw|srl|sa|sprl|cvba|cv|vof|comm\.?\s*v|scs|se)\b\.?/gi;
const kboKey = (s) => String(s || '')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(LEGAL_FORM, ' ')
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function lookupKbo(name) {
  if (!kboStmt) return null;
  const k = kboKey(name);
  if (k.length < 4) return null;
  try { return kboStmt.get(k) || null; } catch { return null; }
}

// NOMINATIM_URL overrides the endpoint so the offline path can be tested.
const NOMINATIM = process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org/search';
const LOOKUP_UA = 'FamilieBudget/1.7 (self-hosted personal budget add-on)';
const lookupCache = new Map();              // "name|town" -> { at, data }
const LOOKUP_TTL = 30 * 24 * 60 * 60 * 1000;
const LOOKUP_CACHE_MAX = 500;
const LOOKUP_MIN_GAP = 1100;                // ms between outbound calls
let lastLookupAt = 0;

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

async function lookupOsm(name, town) {
  const key = `${norm(name)}|${norm(town)}`;
  const hit = lookupCache.get(key);
  if (hit && Date.now() - hit.at < LOOKUP_TTL) return { cached: true, result: hit.data };

  /* Rate limit on the server, not on the click. The policy binds this
     application as a whole, and nothing stops a user clicking three rows in
     a second. */
  const wait = LOOKUP_MIN_GAP - (Date.now() - lastLookupAt);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastLookupAt = Date.now();

  const qs = new URLSearchParams({
    q: [name, town].filter(Boolean).join(' '),
    format: 'jsonv2', limit: '1', addressdetails: '1', extratags: '1', countrycodes: 'be',
  });
  const r = await fetch(`${NOMINATIM}?${qs}`, {
    headers: { 'User-Agent': LOOKUP_UA, 'Accept-Language': 'nl' },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`Nominatim ${r.status}`);
  const rows = await r.json();

  let result = null;
  if (Array.isArray(rows) && rows.length) {
    const h = rows[0];
    const a = h.address || {};
    const got = a.city || a.town || a.village || a.suburb || '';
    /* Town check. Without it "Vroom & Vroom" matched an arts centre in
       Brussels — a confident answer about the wrong business is worse than
       no answer, so an unverifiable hit is discarded. */
    const townOk = !town
      || norm(got).includes(norm(town)) || norm(town).includes(norm(got))
      || norm(h.display_name).includes(norm(town));
    if (townOk) {
      result = {
        name: h.name || null,
        category: h.category || null,
        type: h.type || null,
        address: { road: a.road || null, city: got || null },
        display_name: h.display_name || null,
      };
    }
  }

  if (lookupCache.size >= LOOKUP_CACHE_MAX) lookupCache.delete(lookupCache.keys().next().value);
  lookupCache.set(key, { at: Date.now(), data: result });
  return { cached: false, result };
}

/* Two endpoints rather than one, deliberately.
   Combining them behind a single request meant the instant local answer waited
   on the network one: with an unreachable Nominatim the whole response took 10
   seconds to deliver a KBO result that was ready in 20 ms. The frontend fires
   both at once and renders each as it arrives, so the local half is never held
   hostage by the outbound half. */
app.get('/api/lookup/kbo', (req, res) => {
  const name = String(req.query.name || '').trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: 'name required' });
  let kbo = null;
  try { kbo = lookupKbo(name); } catch { /* index trouble is "no answer" */ }
  res.json({ available: !!kboStmt, kbo });
});

app.get('/api/lookup/osm', async (req, res) => {
  const name = String(req.query.name || '').trim().slice(0, 80);
  const town = String(req.query.town || '').trim().slice(0, 40);
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { cached, result } = await lookupOsm(name, town);
    res.json({ available: true, cached, osm: result });
  } catch (e) {
    // Same contract as the calendar routes: a failure is "no answer", not a
    // server error the user has to interpret.
    res.json({ available: false, osm: null, reason: String(e.message || e) });
  }
});

// Does this install have a KBO index? Lets the UI show the "?" button when the
// local half works even though the outbound half is switched off.
app.get('/api/lookup/status', (req, res) => {
  res.json({ kbo: !!kboStmt });
});

// ─── Serve frontend build ───
const publicDir = join(__dirname, 'public');
if (existsSync(publicDir)) {
  /* Cache-Control matters here. Without it Express sends no cache header at
     all, and browsers fall back to heuristic caching — they hold on to
     index.html for a while on their own. Since index.html is what names the
     content-hashed bundles, a stale copy keeps loading the OLD JS and CSS
     after an add-on update, which looks exactly like the update not having
     applied.

     Assets are content-addressed (index-<hash>.js), so a changed file always
     has a new URL and can be cached indefinitely. index.html never can. */
  app.use(express.static(publicDir, {
    etag: true,
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else if (path.includes(`${sep}assets${sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(join(publicDir, 'index.html'));
    }
  });
}

// ─── Start ───
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  FamilieBudget server running on http://0.0.0.0:${PORT}\n`);
  scheduleDailyBackup(db);
});

function shutdown() {
  console.log('\n[Server] Shutting down...');
  closeDb();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
