import { fmt } from '../utils/formatters.js';
import { isSubExcluded } from '../utils/helpers.js';

export default function SummaryCards({ expanded, year, uncatN, cats, setFCat, setView }) {
  const yt = expanded.filter(t => t.date.startsWith(year));
  const notExcluded = t => !isSubExcluded(cats, t.categoryId, t.subCategoryId);
  const inc = yt.filter(t => t.amount > 0 && notExcluded(t)).reduce((a, t) => a + t.amount, 0);
  const exp = yt.filter(t => t.amount < 0 && notExcluded(t)).reduce((a, t) => a + Math.abs(t.amount), 0);
  const cards = [
    { l: "Inkomen " + year, v: fmt(inc), c: "#4A7C59" },
    { l: "Uitgaven " + year, v: fmt(-exp), c: "#C06E52" },
    { l: "Balans", v: fmt(inc - exp), c: inc - exp >= 0 ? "#4A7C59" : "#C06E52" },
    { l: "Te categoriseren", v: `${uncatN}`, c: uncatN > 0 ? "var(--accent)" : "#4A7C59", click: uncatN > 0 ? () => { setFCat("_none"); setView("transactions"); } : undefined },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 7, marginBottom: 14 }}>
      {cards.map((card, i) => (
        <div key={i} onClick={card.click} style={{ background: "var(--card)", borderRadius: 7, padding: "10px 12px", borderLeft: `3px solid ${card.c}`, cursor: card.click ? "pointer" : "default", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 8, opacity: 0.5, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text)" }}>{card.l}</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: card.c }}>{card.v}</div>
        </div>
      ))}
    </div>
  );
}
