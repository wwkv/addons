import { parseEvidence } from './counterparty.js';

/*
 * Who paid — from the card number the bank puts in the description.
 *
 * Google Pay and card lines carry a masked PAN ending in four digits, and in a
 * two-adult household those digits identify the person. That is often the
 * deciding cue when a merchant is ambiguous: the same clothing shop is a
 * different subcategory depending on whose card it was.
 *
 * The mapping lives in `settings.cardOwners`, NOT in this file. It is personal
 * data — card digits paired with names — and this repository is public. It is
 * also per-household config, which does not belong in source either way.
 * Nesting it under `settings` additionally avoids the four-place problem that a
 * new top-level state key would create.
 */

/** "7067" -> "Rox", or null when the card is unknown or unmapped. */
export function cardOwner(tx, cardOwners) {
  if (!cardOwners) return null;
  const card = parseEvidence(tx).card;
  if (!card) return null;
  const name = cardOwners[card];
  return name && String(name).trim() ? String(name).trim() : null;
}

/** "Rox ••7067" for display, falling back to "••7067" while unmapped. */
export function cardLabel(tx, cardOwners) {
  const card = parseEvidence(tx).card;
  if (!card) return null;
  const owner = cardOwner(tx, cardOwners);
  return owner ? `${owner} ••${card}` : `••${card}`;
}

/**
 * Every card seen in the data, most-used first, so Settings can offer the real
 * cards to name instead of asking the user to recall four digits.
 */
export function knownCards(txs) {
  const counts = new Map();
  for (const t of txs || []) {
    const card = parseEvidence(t).card;
    if (!card) continue;
    counts.set(card, (counts.get(card) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([card, count]) => ({ card, count }))
    .sort((a, b) => b.count - a.count);
}
