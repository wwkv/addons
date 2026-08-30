import { Inbox, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { fmt, mN } from '../utils/formatters.js';
import { CALENDAR_MONTH_KEYS } from '../utils/constants.js';
import { isSubExcluded } from '../utils/helpers.js';
import MonthSelector from '../components/MonthSelector.jsx';
import ComparePanel from '../components/ComparePanel.jsx';

export default function DashboardView({ txs, expanded, year, months, cats, catStats, totalExp, mStats, uncatN, fRef, setFCats, setView, setMonths, setCatDetail, years }) {
  const monthLabel = months.length === 1 ? mN(months[0]) : months.length > 1 ? `${months.length} maanden` : null;

  if (txs.length === 0) return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--accent-20)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Inbox size={26} strokeWidth={1.8} /></div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, color: "var(--text)", margin: "0 0 6px" }}>Welkom bij FamilieBudget</h2>
      <p style={{ fontSize: 12.5, opacity: 0.6, color: "var(--text)", maxWidth: 380, margin: "0 auto 18px" }}>Importeer je eerste Crelan CSV.</p>
      <button onClick={() => fRef.current && fRef.current.click()} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 22px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}><Inbox size={14} />Importeer</button>
    </div>
  );

  /* ── KPI scope: year + optional month filter, same scope as catStats/totalExp ── */
  const notExcluded = t => !isSubExcluded(cats, t.categoryId, t.subCategoryId);
  const scoped = expanded.filter(t => t.date.startsWith(year) && (!months.length || months.includes(t.date.slice(5, 7))) && notExcluded(t));
  const inc = scoped.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0);
  const exp = scoped.filter(t => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);
  const net = inc - exp;
  const spaarquote = inc > 0 ? Math.round((net / inc) * 100) : null;

  /* ── Trend: only meaningful when scoped to exactly one month ── */
  let trend = null;
  if (months.length === 1) {
    const idx = CALENDAR_MONTH_KEYS.indexOf(months[0]);
    const prevKey = idx > 0 ? CALENDAR_MONTH_KEYS[idx - 1] : null;
    const prevStat = prevKey ? mStats[prevKey] : null;
    const curStat = mStats[months[0]];
    if (prevStat && curStat && prevStat.cnt > 0) {
      const prevNet = prevStat.inc - prevStat.exp;
      const curNet = curStat.inc - curStat.exp;
      if (prevNet !== 0) trend = { up: curNet >= prevNet, pct: Math.round(Math.abs((curNet - prevNet) / Math.abs(prevNet)) * 100) };
    }
  }

  /* ── Sparkline: net per month across the year ── */
  const sparkVals = CALENDAR_MONTH_KEYS.map(m => { const s = mStats[m]; return s ? s.inc - s.exp : 0; });
  const maxV = Math.max(...sparkVals, 0), minV = Math.min(...sparkVals, 0);
  const range = (maxV - minV) || 1;
  const sparkPts = sparkVals.map((v, i) => `${(i / (sparkVals.length - 1)) * 600},${65 - ((v - minV) / range) * 60}`);
  const areaPath = `M${sparkPts[0]} L${sparkPts.join(" L")} L600,70 L0,70 Z`;

  /* ── Ranked expense list ── */
  const ranked = cats
    .filter(c => c.type !== "inkomsten" && catStats[c.id] && catStats[c.id].total > 0)
    .map(c => ({ cat: c, total: catStats[c.id].total }))
    .sort((a, b) => b.total - a.total);
  const rankMax = ranked.length ? ranked[0].total : 1;

  return (
    <>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, color: "var(--text)", margin: "0 0 14px" }}>Overzicht</h1>

      <MonthSelector months={months} setMonths={setMonths} mStats={mStats} year={year} />

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 22px 8px", marginBottom: 14 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Netto{monthLabel ? ` — ${monthLabel} ${year}` : year ? ` — ${year}` : ""}</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 52, fontWeight: 400, lineHeight: 1.1, color: net >= 0 ? "var(--green)" : "var(--red)", marginTop: 4 }}>
          {net >= 0 ? "+" : ""}{fmt(net)}
        </div>
        {trend && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {trend.up ? <ChevronUp size={12} /> : <ChevronDown size={12} />}{trend.pct}% t.o.v. vorige maand
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <svg viewBox="0 0 600 70" width="100%" height="70" preserveAspectRatio="none">
            <path d={areaPath} fill="var(--accent)" opacity="0.15" />
            <polyline points={sparkPts.join(" ")} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 13, padding: "13px 15px" }}>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Inkomsten</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 500, marginTop: 6, color: "var(--green)" }}>{fmt(inc)}</div>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 13, padding: "13px 15px" }}>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Uitgaven</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 500, marginTop: 6, color: "var(--text)" }}>{fmt(exp)}</div>
        </div>
        <div onClick={uncatN > 0 ? () => { setFCats(["_none"]); setView("transactions"); } : undefined} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 13, padding: "13px 15px", cursor: uncatN > 0 ? "pointer" : "default" }}>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Spaarquote</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 500, marginTop: 6, color: spaarquote === null ? "var(--muted)" : spaarquote >= 0 ? "var(--text)" : "var(--red)" }}>{spaarquote === null ? "—" : `${spaarquote}%`}</div>
        </div>
      </div>

      <ComparePanel expanded={expanded} cats={cats} year={year} months={months} years={years} />

      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 15, padding: "17px 19px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12, flexShrink: 0 }}>Grootste uitgaven</div>
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
          {ranked.map(({ cat, total }) => (
            <div key={cat.id} onClick={() => setCatDetail(cat.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 12, cursor: "pointer" }}>
              <div style={{ width: 176, flex: "0 0 176px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }} title={cat.name}>{cat.name}</div>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--bg)", overflow: "hidden" }}>
                <div style={{ width: `${Math.max(2, (total / rankMax) * 100)}%`, height: "100%", borderRadius: 4, background: cat.color }} />
              </div>
              <div style={{ width: 84, flex: "0 0 84px", textAlign: "right", fontFamily: "'DM Mono',monospace", color: "var(--muted)", fontSize: 11.5 }}>{fmt(-total)}</div>
              <ChevronRight size={11} style={{ opacity: 0.3, flexShrink: 0 }} />
            </div>
          ))}
          {ranked.length === 0 && <div style={{ textAlign: "center", padding: 20, opacity: 0.4, fontSize: 12 }}>Geen uitgaven in deze periode</div>}
        </div>
      </div>
    </>
  );
}
