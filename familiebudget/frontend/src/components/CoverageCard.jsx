import { fmt } from '../utils/formatters.js';
import DashSection from './DashSection.jsx';

/*
 * Reconciles the two spending numbers already on this page.
 *
 * The Uitgaven KPI counts every euro that left the account. The category bars
 * sum only the euros that have a category. Those are different totals, they
 * are both on screen, and until now nothing explained the difference.
 *
 * Deliberately not styled as a warning: no red (theme rule — red is reserved
 * for signed amounts), no alert icon. Uncategorised money is a normal state of
 * a budget you are still working through, not an error. The tone escalates
 * with the gap instead: a quiet line when it barely matters, a button only
 * when there is real work to do.
 */
export default function CoverageCard({ coverage, onShowUncategorised }) {
  const { known, unknown, total, count, pct } = coverage;
  if (!total) return null;

  const rounded = Math.round(pct);

  // Nearly everything sorted — one line, no bar, no call to action.
  if (rounded >= 95) {
    return (
      <DashSection>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          {unknown > 0
            ? <>Bijna alles is ingedeeld — nog {fmt(unknown)} over {count} transacties.</>
            : <>Alle uitgaven in deze periode zijn ingedeeld.</>}
        </div>
      </DashSection>
    );
  }

  return (
    <DashSection
      title="Datadekking"
      sub={`De opsplitsingen hierboven tonen ${fmt(known)} van ${fmt(total)}.`}
      action={rounded < 60 && count > 0 ? (
        <button
          onClick={onShowUncategorised}
          style={{ padding: "5px 11px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", cursor: "pointer", fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap" }}
        >Toon de {count} niet-ingedeelde</button>
      ) : null}
    >
      <div className="stack-bar" title={`${fmt(known)} ingedeeld · ${fmt(unknown)} onbekend`}>
        <div className="stack-seg" style={{ flexGrow: known, background: "var(--accent)" }} />
        <div className="stack-seg stack-seg--unknown" style={{ flexGrow: unknown }} />
      </div>
      <div className="dash-legend">
        <div className="dash-legend-row">
          <span className="dash-swatch" style={{ background: "var(--accent)" }} />
          <span style={{ flex: 1 }}>Ingedeeld</span>
          <span style={{ fontFamily: "var(--font-mono), monospace", color: "var(--muted)" }}>{rounded}%</span>
        </div>
        <div className="dash-legend-row">
          <span className="dash-swatch stack-seg--unknown" style={{ borderRadius: 2 }} />
          <span style={{ flex: 1 }}>Nog niet ingedeeld</span>
          <span style={{ fontFamily: "var(--font-mono), monospace", color: "var(--muted)" }}>{fmt(unknown)}</span>
        </div>
      </div>
    </DashSection>
  );
}

/* The whisper version, for the heading of any section built on categories. */
export function CoverageNote({ coverage }) {
  const { known, total, count } = coverage;
  if (!total || !count) return null;
  return <>Toont {fmt(known)} van {fmt(total)} · {count} transacties nog niet ingedeeld</>;
}
