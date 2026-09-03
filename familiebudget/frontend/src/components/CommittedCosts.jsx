import { fmt } from '../utils/formatters.js';
import DashSection from './DashSection.jsx';

const TIER_COLOR = { zeker: "var(--accent)", waarschijnlijk: "var(--neutral)", mogelijk: "var(--muted)" };
const TIER_LABEL = { zeker: "Domiciliëring", waarschijnlijk: "Maandelijks patroon", mogelijk: "Vaste-lasten categorie" };

/*
 * "Vaste lasten" — what you are locked into before you decide anything.
 *
 * Deliberately payee-derived rather than category-derived, which means it stays
 * honest while half the transactions are still uncategorised: a direct debit is
 * a direct debit whether or not it has been filed yet.
 */
export default function CommittedCosts({ commitments, income, monthsWithData, onShowPayee }) {
  const { payees, weak, monthlyTotal } = commitments;
  const committed = payees.filter(p => p.counts);
  const alsoRecurring = payees.filter(p => !p.counts);

  if (committed.length === 0 && weak.length === 0) {
    return (
      <DashSection title="Vaste lasten">
        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
          Nog geen vaste lasten gevonden. Er wordt gezocht naar domiciliëringen en
          betalingen die elke maand terugkomen.
        </div>
      </DashSection>
    );
  }

  // A per-month figure needs more than one month behind it.
  const canAverage = monthsWithData >= 2;
  const free = income > 0 ? income / Math.max(1, monthsWithData) - monthlyTotal : null;

  return (
    <DashSection
      title="Vaste lasten"
      sub={canAverage ? `${committed.length} vaste betalers · gem. over ${monthsWithData} maanden met data` : "Nog te weinig maanden voor een betrouwbaar maandbedrag"}
      action={canAverage ? (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 17, color: "var(--text)" }}>{fmt(-monthlyTotal)}</div>
          <div style={{ fontSize: 9, color: "var(--muted)" }}>per maand</div>
        </div>
      ) : null}
    >
      {/* Not surplus — this still has to cover groceries, fuel and everything
          else variable. Phrasing it as "blijft over" invited exactly that
          misreading, so it names what the money is for. */}
      {canAverage && free !== null && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 11, lineHeight: 1.5 }}>
          Blijft <strong style={{ color: "var(--text)", fontWeight: 600 }}>{fmt(free)}</strong> per maand
          voor boodschappen, vervoer, ontspanning en sparen.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {committed.slice(0, 8).map(p => (
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

      {/* Recurring, but not something you're locked into. Kept visible so the
          headline can be checked rather than taken on trust. */}
      {alsoRecurring.length > 0 && (
        <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
          Niet meegeteld: {alsoRecurring.map(p => p.name).join(", ")} — {alsoRecurring.some(p => p.aggregator) ? "verzamelrekeningen en losse gewoontes" : "losse gewoontes"}, geen vaste last.
        </div>
      )}

      {weak.length > 0 && (
        <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
          Mogelijk ook vast, maar nog te weinig data voor een maandbedrag: {weak.slice(0, 5).map(p => p.name).join(", ")}
          {weak.length > 5 ? ` +${weak.length - 5}` : ""}. Kwartaal- en jaarfacturen worden pas na een vol jaar herkend.
        </div>
      )}
    </DashSection>
  );
}
