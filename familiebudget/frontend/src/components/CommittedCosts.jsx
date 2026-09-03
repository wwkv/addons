import { ChevronRight } from "lucide-react";
import { fmt } from '../utils/formatters.js';
import DashSection from './DashSection.jsx';

const TIER_COLOR = { zeker: "var(--accent)", waarschijnlijk: "var(--neutral)", mogelijk: "var(--muted)" };
const TIER_LABEL = { zeker: "Domiciliëring", waarschijnlijk: "Maandelijks patroon", mogelijk: "Vaste-lasten categorie" };

/*
 * "Wat je elke maand nodig hebt" — the household's monthly baseline.
 *
 * Two parts, because both matter and they are found in different ways:
 *   - Vaste lasten: contracts and direct debits, detected per payee.
 *   - Overige noodzakelijke uitgaven: groceries, bakker, fuel, pharmacy —
 *     everything tagged `nodig` that isn't already one of those payees.
 *
 * The total is NOT recomputed here. It comes from computeSavings, which is the
 * same figure the spaarbuffer multiplies, so the two can never disagree. An
 * earlier version reimplemented the filter and drifted by €4,50/month — enough
 * to cross a €500 rounding boundary and display two different buffer targets.
 */
export default function CommittedCosts({ commitments, baseline, incomePerMonth, bufferTarget, bufferMultiplier, onShowPayee, onOpenSavings }) {
  const { payees, weak } = commitments;
  const committed = payees.filter(p => p.counts);
  const alsoRecurring = payees.filter(p => !p.counts);
  const months = baseline?.monthsCounted || 0;

  if (months === 0) {
    return (
      <DashSection title="Wat je elke maand nodig hebt">
        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
          Nog geen noodzakelijke uitgaven gevonden in deze periode.
        </div>
      </DashSection>
    );
  }

  const canAverage = months >= 2;
  const free = incomePerMonth > 0 ? incomePerMonth - baseline.total : null;
  const pct = (v) => baseline.total > 0 ? (v / baseline.total) * 100 : 0;

  return (
    <DashSection
      title="Wat je elke maand nodig hebt"
      sub={canAverage ? `gemiddeld over ${months} maanden met uitgaven` : "Nog te weinig maanden voor een betrouwbaar maandbedrag"}
      action={canAverage ? (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 17, color: "var(--text)" }}>{fmt(-baseline.total)}</div>
          <div style={{ fontSize: 9, color: "var(--muted)" }}>per maand</div>
        </div>
      ) : null}
    >
      {/* The split, so the total is visibly made of two things */}
      <div className="stack-bar" style={{ height: 14, marginBottom: 9 }}>
        <div className="stack-seg" style={{ flexGrow: baseline.fixed, background: "var(--accent)" }} title={`Vaste lasten · ${fmt(baseline.fixed)}/maand`} />
        <div className="stack-seg" style={{ flexGrow: baseline.variable, background: "var(--neutral)" }} title={`Overige noodzakelijke uitgaven · ${fmt(baseline.variable)}/maand`} />
      </div>
      <div className="dash-legend" style={{ marginTop: 0, marginBottom: 11 }}>
        <div className="dash-legend-row">
          <span className="dash-swatch" style={{ background: "var(--accent)" }} />
          <span style={{ flex: 1 }}>Vaste lasten</span>
          <span style={{ fontFamily: "'DM Mono',monospace", color: "var(--muted)" }}>{fmt(baseline.fixed)}</span>
        </div>
        <div className="dash-legend-row">
          <span className="dash-swatch" style={{ background: "var(--neutral)" }} />
          <span style={{ flex: 1 }}>Boodschappen &amp; andere</span>
          <span style={{ fontFamily: "'DM Mono',monospace", color: "var(--muted)" }}>{fmt(baseline.variable)}</span>
        </div>
      </div>

      {/* Where the free-to-spend figure comes from, stated as the sum it is. */}
      {canAverage && free !== null && (
        <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 11, lineHeight: 1.55, background: "var(--bg)", borderRadius: 8, padding: "8px 10px" }}>
          <span style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(incomePerMonth)}</span> inkomsten
          − <span style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(baseline.total)}</span> nodig
          = <strong style={{ color: free >= 0 ? "var(--text)" : "var(--red)", fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{fmt(free)}</strong> per maand vrij
          <div style={{ opacity: 0.75, marginTop: 2 }}>Voor luxe, extra sparen en onverwachte uitgaven.</div>
        </div>
      )}

      <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
        Vaste betalers
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {committed.slice(0, 7).map(p => (
          <div
            key={p.key}
            className="rank-row"
            style={{ cursor: onShowPayee ? "pointer" : "default" }}
            onClick={() => onShowPayee && onShowPayee(p)}
            title={`${p.occurrences} betalingen over ${p.monthsSeen} maanden · ${TIER_LABEL[p.tier]}`}
          >
            <div className="rank-name" style={{ color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: TIER_COLOR[p.tier], flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
            </div>
            <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--bg)", overflow: "hidden" }}>
              <div style={{ width: `${Math.max(2, (p.monthly / committed[0].monthly) * 100)}%`, height: "100%", borderRadius: 3, background: TIER_COLOR[p.tier], opacity: 0.75 }} />
            </div>
            <div className="rank-amount" style={{ fontFamily: "'DM Mono',monospace", color: "var(--muted)" }}>{fmt(-p.monthly)}</div>
          </div>
        ))}
      </div>

      {/* The buffer is five times this number — say so, and link to it. */}
      {bufferTarget > 0 && (
        <div
          onClick={onOpenSavings}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)", cursor: onOpenSavings ? "pointer" : "default", fontSize: 10.5, color: "var(--muted)", lineHeight: 1.5 }}
        >
          <span>
            Je spaarbuffer is <strong style={{ color: "var(--text)", fontWeight: 600 }}>{bufferMultiplier}×</strong> dit bedrag
            = <span style={{ fontFamily: "'DM Mono',monospace", color: "var(--text)" }}>{fmt(bufferTarget)}</span>
          </span>
          <ChevronRight size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
        </div>
      )}

      {alsoRecurring.length > 0 && (
        <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
          Niet meegeteld als vaste last: {alsoRecurring.map(p => p.name).join(", ")} — verzamelrekeningen en losse gewoontes.
        </div>
      )}
      {weak.length > 0 && (
        <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
          Mogelijk ook vast, maar nog te weinig data: {weak.slice(0, 4).map(p => p.name).join(", ")}
          {weak.length > 4 ? ` +${weak.length - 4}` : ""}. Kwartaal- en jaarfacturen worden pas na een vol jaar herkend.
        </div>
      )}
    </DashSection>
  );
}
