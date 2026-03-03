import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
const DB_PATH = join(DATA_DIR, 'budget.db');

// Ensure data directory exists
mkdirSync(DATA_DIR, { recursive: true });

// Open database with WAL mode for better concurrent read/write
// and protection against corruption on power loss
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// Create key-value table
db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Prepared statements
const getStmt = db.prepare('SELECT key, value, updated_at FROM app_state WHERE key = ?');
const upsertStmt = db.prepare(`
  INSERT INTO app_state (key, value, updated_at)
  VALUES (?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
`);
const getAllStmt = db.prepare('SELECT key, value, updated_at FROM app_state');
const deleteStmt = db.prepare('DELETE FROM app_state WHERE key = ?');

export function getState(key) {
  const row = getStmt.get(key);
  if (!row) return null;
  try {
    return { key: row.key, value: JSON.parse(row.value), updated_at: row.updated_at };
  } catch {
    return { key: row.key, value: row.value, updated_at: row.updated_at };
  }
}

export function setState(key, value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  upsertStmt.run(key, serialized);
}

export function getAllState() {
  const rows = getAllStmt.all();
  const result = {};
  for (const row of rows) {
    try {
      result[row.key] = JSON.parse(row.value);
    } catch {
      result[row.key] = row.value;
    }
  }
  return result;
}

export function deleteState(key) {
  deleteStmt.run(key);
}

/**
 * Bulk import: replace all state atomically
 */
export function importAll(data) {
  const transaction = db.transaction((entries) => {
    db.exec('DELETE FROM app_state');
    for (const [key, value] of entries) {
      upsertStmt.run(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  });
  transaction(Object.entries(data));
}

export function closeDb() {
  db.close();
}

export default db;
