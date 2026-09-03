import { ChevronRight } from "lucide-react";
import { fmt } from '../utils/formatters.js';
import DashSection from './DashSection.jsx';

const POT_COLORS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)"];

function Bar({ label, current, target, color, note }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>
          {note || `${Math.round(pct)}%`}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "var(--bg)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: color }} />
      </div>
    </div>
  );
}

/*
 * Buffer and pots, mirrored from Sparen onto the overview.
 *
 * All figures come from savingsSummary (utils/savings.js) — the same object the
 * Sparen tab renders, so the two pages cannot disagree. The lowest-risk section
 * on the dashboard: its inputs are user-entered, so thin transaction history
 * and uncategorised money don't touch it.
 */
export default function GoalsCard({ savingsSummary, onOpen }) {
  const { liveTotal, bufferTarget, bufferAllocated, bufferPct, potsWithAllocation, unassigned } = savingsSummary;

  // Never invent progress against a balance that was never set up.
  if (!liveTotal && !bufferTarget) {
    return (
      <DashSection title="Doelen">
        <div onClick={onOpen} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: "pointer", fontSize: 11, color: "var(--muted)" }}>
          <span>Stel je spaarsaldo in om buffer en potjes te volgen</span>
          <ChevronRight size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
        </div>
      </DashSection>
    );
  }

  const pots = [...potsWithAllocation].sort((a, b) => (b.target || 0) - (a.target || 0));
  const shown = pots.slice(0, 3);

  return (
    <DashSection
      title="Doelen"
      sub={`Saldo ${fmt(liveTotal)}`}
      action={unassigned >= 250 ? (
        <button onClick={onOpen} style={{ padding: "4px 10px", borderRadius: 999, border: "none", background: "var(--accent-20)", color: "var(--accent)", cursor: "pointer", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
          Te verdelen {fmt(unassigned)}
        </button>
      ) : null}
    >
      <div onClick={onOpen} style={{ cursor: "pointer" }}>
        {bufferTarget > 0 && (
          <Bar
            label="Spaarbuffer"
            current={bufferAllocated}
            target={bufferTarget}
            color="var(--accent)"
            note={`${fmt(bufferAllocated)} / ${fmt(bufferTarget)}`}
          />
        )}
        {shown.map((pot, i) => (
          <Bar
            key={pot.id}
            label={pot.name}
            current={pot.allocated}
            target={Number(pot.target) || 0}
            color={POT_COLORS[i % POT_COLORS.length]}
            /* A pot with nothing allocated because the buffer hasn't filled is
               not a pot at 0% — saying so avoids it looking broken. */
            note={pot.allocated === 0 && bufferAllocated < bufferTarget ? "wacht op buffer" : undefined}
          />
        ))}
        {pots.length === 0 && bufferTarget > 0 && (
          <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>Nog geen potjes aangemaakt.</div>
        )}
        {pots.length > shown.length && (
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>+{pots.length - shown.length} meer</div>
        )}
      </div>
    </DashSection>
  );
}
