import { parseEvidence } from './counterparty.js';

/*
 * Calendar cues: "what was on the agenda when this was paid".
 *
 * Strictly an evidence surface — it never proposes a category. A calendar
 * entry does not map to one reliably ("Ilse jarig" could be a gift, a dinner,
 * or nothing), but shown next to an unrecognisable merchant it answers the
 * question the user is actually stuck on. Measured against the real database:
 * ~30% of timed transactions get a cue at ±90 minutes.
 *
 * Everything here keys off the PURCHASE date from parseEvidence, never
 * tx.date. The bank books card payments 1-6 days late, and matching on the
 * booking date pairs transactions with events from a day they did not happen
 * on — which looked plausible and was almost entirely noise.
 */

export const CAL_WINDOW_MIN = 90;

const ms = (d) => new Date(d).getTime();

/** Best calendar event for a transaction, or null. Timed events win over
 *  all-day ones: an all-day entry covers everything that day and is weak
 *  evidence, so it is only a fallback. */
export function matchEvent(tx, events, windowMin = CAL_WINDOW_MIN) {
  if (!events || events.length === 0) return null;
  const e = parseEvidence(tx);
  if (!e.date) return null;

  const W = windowMin * 60000;
  let allDay = null;

  if (e.time) {
    const when = ms(`${e.date}T${e.time}:00`);
    if (Number.isNaN(when)) return null;
    let best = null, bestGap = Infinity;
    for (const ev of events) {
      if (ev.allDay) {
        if (!allDay && ev.start <= e.date && e.date < (ev.end || ev.start)) allDay = ev;
        continue;
      }
      const s = ms(ev.start), t = ms(ev.end);
      if (Number.isNaN(s)) continue;
      if (when >= s - W && when <= (Number.isNaN(t) ? s : t) + W) {
        // Closest event wins when several overlap the window.
        const gap = when < s ? s - when : (when > t ? when - t : 0);
        if (gap < bestGap) { best = ev; bestGap = gap; }
      }
    }
    if (best) return { ...best, kind: 'timed' };
  } else {
    for (const ev of events) {
      if (ev.allDay && ev.start <= e.date && e.date < (ev.end || ev.start)) { allDay = ev; break; }
    }
  }
  return allDay ? { ...allDay, kind: 'allday' } : null;
}

/** "Klimmen 🧗 · 19:30" — one short line for a tooltip or cue chip. */
export function eventLine(ev) {
  if (!ev) return '';
  const bits = [ev.summary || '(zonder titel)'];
  if (ev.kind === 'timed' && ev.start) {
    const t = new Date(ev.start);
    if (!Number.isNaN(t.getTime())) {
      bits.push(`${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`);
    }
  } else if (ev.kind === 'allday') {
    bits.push('hele dag');
  }
  if (ev.location) bits.push(ev.location.split(',')[0].trim());
  return bits.join(' · ');
}

/** Everything on the agenda the day a transaction was actually paid, in time
 *  order: "maandag · 15:00 kids · 19:00 klimmen". The day is always returned,
 *  even with no calendar at all, because knowing it was a Saturday is itself a
 *  cue — and it is the purchase day, not the day the bank got round to it. */
export function dayContext(tx, events) {
  const e = parseEvidence(tx);
  if (!e.date) return null;
  const out = { date: e.date, day: e.day, lagDays: e.lagDays, booked: e.booked, events: [] };
  for (const ev of events || []) {
    const start = (ev.start || '').slice(0, 10);
    if (ev.allDay) {
      if (start <= e.date && e.date < (ev.end || ev.start)) out.events.push({ ...ev, label: 'hele dag' });
    } else if (start === e.date) {
      const d = new Date(ev.start);
      const hh = Number.isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      out.events.push({ ...ev, label: hh, sort: hh });
    }
  }
  out.events.sort((a, b) => (a.sort || '').localeCompare(b.sort || ''));
  return out;
}

/** One line for a tooltip: "vrijdag 05/06 · 15:00 kids · 19:00 klimmen". */
export function dayContextLine(ctx) {
  if (!ctx) return '';
  const [y, m, d] = ctx.date.split('-');
  const head = [ctx.day, `${d}/${m}`].filter(Boolean).join(' ');
  const evs = ctx.events.map(e => `${e.label} ${e.summary}`.trim());
  return [head, ...evs].join(' · ');
}

/** Date range covering the transactions we might want cues for, as ISO
 *  instants for the HA API. Widened a day each side so a purchase late on the
 *  boundary still sees its event. */
export function rangeFor(txs) {
  const dates = txs.map(t => parseEvidence(t).date).filter(Boolean).sort();
  if (dates.length === 0) return null;
  const pad = (d, days) => {
    const x = new Date(`${d}T00:00:00Z`);
    x.setUTCDate(x.getUTCDate() + days);
    return x.toISOString();
  };
  return { start: pad(dates[0], -1), end: pad(dates[dates.length - 1], 1) };
}
