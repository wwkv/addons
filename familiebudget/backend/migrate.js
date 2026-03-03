/**
 * Migration script: Import a JSON backup file into the SQLite database
 *
 * Usage:
 *   node migrate.js /path/to/budget-backup-2025-02-28.json
 *
 * This handles the old format (flat JSON from window.storage export)
 * and imports it into the new SQLite key-value store.
 */
import { readFileSync } from 'fs';
import { setState } from './db.js';

const backupPath = process.argv[2];

if (!backupPath) {
  console.error('Usage: node migrate.js <path-to-backup.json>');
  console.error('Example: node migrate.js ./budget-backup-2025-02-28.json');
  process.exit(1);
}

try {
  console.log(`Reading backup from: ${backupPath}`);
  const raw = readFileSync(backupPath, 'utf-8');
  const data = JSON.parse(raw);

  // Old format: flat JSON with txs, cats, rules, settings, lookups, pending, blacklist, savings
  // New format: has _budgets and _version keys
  const { _budgets, _exportedAt, _version, ...mainState } = data;

  // Validate we have something useful
  const hasData = mainState.txs || mainState.cats || mainState.rules;
  if (!hasData) {
    console.error('Warning: backup does not seem to contain txs, cats, or rules.');
    console.error('Keys found:', Object.keys(data).join(', '));
  }

  // Store main state
  console.log('Importing main state...');
  console.log(`  Transactions: ${(mainState.txs || []).length}`);
  console.log(`  Categories: ${(mainState.cats || []).length}`);
  console.log(`  Rules: ${Object.keys(mainState.rules || {}).length}`);
  console.log(`  Pending: ${Object.keys(mainState.pending || {}).length}`);
  console.log(`  Blacklist: ${(mainState.blacklist || []).length}`);
  console.log(`  Lookups: ${Object.keys(mainState.lookups || {}).length}`);
  setState('main', mainState);

  // Store budgets if present
  if (_budgets && Object.keys(_budgets).length > 0) {
    console.log(`Importing budgets for ${Object.keys(_budgets).length} year(s)...`);
    setState('budgets', _budgets);
  } else {
    console.log('No budget data found (this is normal for first-time imports).');
    setState('budgets', {});
  }

  console.log('\n✓ Migration complete! Start the server with: npm start');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
}
