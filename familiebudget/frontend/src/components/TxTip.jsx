import { TipLabel } from './HoverTip.jsx';
import { dayContext } from '../utils/calendar.js';
import { parseEvidence } from '../utils/counterparty.js';

const DAY_FULL = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const MONTH = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function longDate(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${DAY_FULL[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
}

/*
 * Structured hover card for a transaction row.
 *
 * Replaces a run-on string that put the day, the agenda and the raw bank line
 * in one italic blob. Three labelled blocks now, in the order you actually
 * read them — when, what was on, what you wrote — and the bank's own line is
 * parsed into place/wallet/card rather than dumped with its card number and
 * country code.
 */
export default function TxTip({ tx, calEvents = [] }) {
  const e = parseEvidence(tx);
  const ctx = dayContext(tx, calEvents);
  const events = ctx ? ctx.events : [];

  const details = [e.place, e.wallet, e.card ? `••${e.card}` : null].filter(Boolean);

  return (
    <span style={{ display: "block" }}>
      {/* WHEN — the purchase day, with the booking date only when it differs */}
      <span style={{ display: "block", fontWeight: 700, fontSize: 11 }}>
        {e.date ? longDate(e.date) : "Datum onbekend"}
        {e.time && <span style={{ fontWeight: 400, color: "var(--muted)" }}> · {e.time}</span>}
      </span>
      {e.lagDays > 0 && (
        <span style={{ display: "block", fontSize: 9, color: "var(--muted)", marginTop: 1 }}>
          door de bank geboekt op {e.booked.slice(8, 10)}/{e.booked.slice(5, 7)} ({e.lagDays}d later)
        </span>
      )}

      {/* WHAT WAS ON — times in their own column so they line up */}
      {events.length > 0 && (
        <span style={{ display: "block", marginTop: 7 }}>
          <TipLabel>Agenda</TipLabel>
          {events.map((ev, i) => (
            <span key={i} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "var(--muted)", flexShrink: 0, minWidth: 46 }}>
                {ev.label || "—"}
              </span>
              <span style={{ flex: 1, wordBreak: "break-word" }}>{ev.summary || "(zonder titel)"}</span>
            </span>
          ))}
        </span>
      )}

      {/* WHAT YOU WROTE — only real notes; card lines are parsed below instead */}
      {e.note && (
        <span style={{ display: "block", marginTop: 7 }}>
          <TipLabel>Mededeling</TipLabel>
          <span style={{ wordBreak: "break-word" }}>{e.note}</span>
        </span>
      )}

      {details.length > 0 && (
        <span style={{ display: "block", marginTop: 7, fontSize: 9, color: "var(--muted)" }}>
          {details.join(" · ")}
        </span>
      )}

      {!e.note && details.length === 0 && events.length === 0 && !e.date && (
        <span style={{ display: "block", color: "var(--muted)" }}>Geen extra informatie</span>
      )}
    </span>
  );
}
