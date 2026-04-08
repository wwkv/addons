import { readdirSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
const BACKUP_DIR = join(DATA_DIR, 'backups');
const MAX_BACKUPS = 7;

mkdirSync(BACKUP_DIR, { recursive: true });

export function createBackup(db) {
  const timestamp = new Date().toISOString().split('T')[0];
  const backupPath = join(BACKUP_DIR, `budget-${timestamp}.db`);
  try {
    if (existsSync(backupPath)) {
      console.log(`[Backup] Already exists for today, skipping.`);
      return backupPath;
    }
    db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
    console.log(`[Backup] Created: budget-${timestamp}.db`);
    pruneOldBackups();
    return backupPath;
  } catch (err) {
    console.error('[Backup] Failed:', err.message);
    return null;
  }
}

function pruneOldBackups() {
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('budget-') && f.endsWith('.db'))
      .sort()
      .reverse();
    for (const file of files.slice(MAX_BACKUPS)) {
      unlinkSync(join(BACKUP_DIR, file));
      console.log(`[Backup] Pruned: ${file}`);
    }
  } catch (err) {
    console.error('[Backup] Prune error:', err.message);
  }
}

export function listBackups() {
  try {
    return readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('budget-') && f.endsWith('.db'))
      .sort()
      .reverse()
      .map(f => ({
        name: f,
        date: f.replace('budget-', '').replace('.db', ''),
      }));
  } catch {
    return [];
  }
}

export function scheduleDailyBackup(db) {
  // Backup on startup
  createBackup(db);

  // Schedule next at 3 AM
  const now = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  setTimeout(() => {
    createBackup(db);
    setInterval(() => createBackup(db), 24 * 60 * 60 * 1000);
  }, next.getTime() - now.getTime());

  console.log(`[Backup] Next scheduled: ${next.toISOString()}`);
}
