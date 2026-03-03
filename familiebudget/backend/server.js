import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
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

// ─── Serve frontend build ───
const publicDir = join(__dirname, 'public');
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
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
