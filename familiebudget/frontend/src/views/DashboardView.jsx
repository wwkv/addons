import { fmt, mN } from '../utils/formatters.js';
import { CALENDAR_MONTH_KEYS } from '../utils/constants.js';
import Pie from '../components/Pie.jsx';
import SummaryCards from '../components/SummaryCards.jsx';

function Bar({ v, max, color, h = 18}) {
  return (
    <div style={{ background: "var(--bg)", borderRadius: 4, height: h, overflow: "hidden", flex: 1 }}>
      <div style={{ width: max > 0 ? `${Math.min((v / max) * 100, 100)}%` : "0%", height: "100%", background: color, borderRadius: 4, transition: "width 0.4s" }} />
    </div>
  );
}

export default function DashboardView({ txs, expanded, year, month, cats, catStats, typeStats, necessityStats, totalExp, mStats, uncatN, fRef, setFCat, setView, setMonth, setCatDetail }) {
  if (txs.length === 0) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>📥</div>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)" }}>Welkom bij FamilieBudget</h2>
      <p style={{ fontSize: 12, opacity: 0.6, color: "var(--text)", maxWidth: 380, margin: "0 auto 16px" }}>Importeer je eerste Crelan CSV.</p>
      <button onClick={() => fRef.current && fRef.current.click()} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#4A7C59", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>📥 Import</button>
    </div>
  );

  return (
    <>
      <SummaryCards expanded={expanded} year={year} uncatN={uncatN} cats={cats} setFCat={setFCat} setView={setView} />

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 24, marginBottom: 14, height: 540 }}>
        {/* Row 1: Main Pie (col-span-2) + Fixed vs Variable */}
        <div style={{ gridColumn: "span 2", background: "var(--card)", borderRadius: 7, padding: 14, border: "1px solid var(--border)", height: "100%", minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Verdeling Uitgaven {month ? `— ${mN(month)} ${year}` : year}</h3>
            {month && <button onClick={() => setMonth("")} style={{ padding: "3px 8px", borderRadius: 4, border: "none", background: "transparent", color: "var(--accent)", cursor: "pointer", fontSize: 9 }}>Heel jaar</button>}
          </div>
          <Pie size={200} data={cats.filter(c => c.type !== "inkomsten" && catStats[c.id] && catStats[c.id].total > 0).sort((a, b) => catStats[b.id].total - catStats[a.id].total).map(c => ({ name: c.name, value: catStats[c.id].total, color: c.color }))} />
        </div>
        <div style={{ gridColumn: "span 1", background: "var(--card)", borderRadius: 7, padding: 12, border: "1px solid var(--border)", height: "100%", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "var(--text)" }}>Vaste vs Variabele Kosten</h3>
          <Pie size={130} data={[{ name: "Vast", value: typeStats.vast, color: "#5B9BD5" }, { name: "Variabel", value: typeStats.variabel, color: "#6BAF6E" }, { name: "Onbekend", value: typeStats.onbekend, color: "#888" }].filter(d => d.value > 0)} />
        </div>
        {/* Row 2: Category List (col-span-2) + Needs vs Wants */}
        <div style={{ gridColumn: "span 2", background: "var(--card)", borderRadius: 7, padding: 14, border: "1px solid var(--border)", height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>Uitgaven per Categorie</h3>
          <div style={{ overflowY: "auto", flex: 1, minHeight: 0, display: "grid", gap: 5 }}>
            {cats.filter(c => c.type !== "inkomsten" && catStats[c.id] && catStats[c.id].total > 0).sort((a, b) => catStats[b.id].total - catStats[a.id].total).map(cat => {
              const s = catStats[cat.id];
              return (
                <div key={cat.id} onClick={() => setCatDetail(cat.id)} style={{ cursor: "pointer", padding: "4px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 500, flex: 1, color: "var(--text)" }}>{cat.name}</span>
                    <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", opacity: 0.5 }}>{totalExp > 0 ? `${((s.total / totalExp) * 100).toFixed(0)}%` : ""}</span>
                    <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>{fmt(-s.total)}</span>
                    <span style={{ fontSize: 10, opacity: 0.3 }}>→</span>
                  </div>
                  <Bar v={s.total} max={totalExp} color={cat.color} h={4} />
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ gridColumn: "span 1", background: "var(--card)", borderRadius: 7, padding: 12, border: "1px solid var(--border)", height: "100%", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "var(--text)" }}>Noodzakelijk vs Luxe</h3>
          <Pie size={130} data={[{ name: "Nodig", value: necessityStats.nodig, color: "#6BAF6E" }, { name: "Luxe", value: necessityStats.luxe, color: "#D4845A" }, { name: "Onbekend", value: necessityStats.onbekend, color: "#888" }].filter(d => d.value > 0)} />
        </div>
      </div>

      {/* Monthly — Net balance diverging bar chart */}
      <div style={{ background: "var(--card)", borderRadius: 7, padding: 12, border: "1px solid var(--border)" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Netto resultaat per maand {year}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {(() => {
            const entries = CALENDAR_MONTH_KEYS.map(m => [m, mStats[m] ?? { inc: 0, exp: 0, cnt: 0 }]);
            const maxAbs = Math.max(1, ...entries.map(([, s]) => Math.abs(s.inc - s.exp)));
            const barH = 14;
            const green = "#4A7C59";
            const redMuted = "#A85A45";
            return entries.map(([m, s]) => {
              const net = s.inc - s.exp;
              const pct = maxAbs > 0 ? (Math.abs(net) / maxAbs) * 50 : 0;
              const isEmpty = s.cnt === 0;
              return (
                <div
                  key={m}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0", opacity: isEmpty ? 0.35 : 1, cursor: s.cnt > 0 ? "pointer" : "default" }}
                  onClick={() => { if (s.cnt > 0) setMonth(m); }}
                  title={isEmpty ? "" : `Inkomsten ${fmt(s.inc)} − Uitgaven ${fmt(-s.exp)} = ${fmt(net)}`}
                >
                  <span style={{ width: 28, fontSize: 9, fontWeight: 500, color: "var(--text)", flexShrink: 0 }}>{mN(m)}</span>
                  <div style={{ flex: 1, position: "relative", height: barH, minWidth: 80, background: "transparent", display: "flex", alignItems: "stretch" }}>
                    <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--border)", marginLeft: -0.5, zIndex: 1 }} />
                    {!isEmpty && net < 0 && (
                      <div style={{ position: "absolute", right: "50%", left: `calc(50% - ${pct}%)`, height: barH, background: redMuted, borderRadius: "6px 0 0 6px", transition: "left 0.3s, right 0.3s" }} />
                    )}
                    {!isEmpty && net > 0 && (
                      <div style={{ position: "absolute", left: "50%", width: `${pct}%`, height: barH, background: green, borderRadius: "0 6px 6px 0", transition: "width 0.3s" }} />
                    )}
                  </div>
                  <span style={{ width: 72, fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 600, textAlign: "right", color: isEmpty ? "var(--muted)" : (net >= 0 ? "var(--green)" : "var(--red)"), flexShrink: 0 }}>
                    {isEmpty ? "—" : (net >= 0 ? "+" : "") + fmt(net)}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </>
  );
}
