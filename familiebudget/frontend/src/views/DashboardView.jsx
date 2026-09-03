import { Inbox, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { fmt, mN } from '../utils/formatters.js';
import { CALENDAR_MONTH_KEYS } from '../utils/constants.js';
import MonthSelector from '../components/MonthSelector.jsx';
import NetTrendChart from '../components/NetTrendChart.jsx';
import DashSection from '../components/DashSection.jsx';
import { periodTotals, coverage } from '../utils/totals.js';
import CoverageCard, { CoverageNote } from '../components/CoverageCard.jsx';
import CommittedCosts from '../components/CommittedCosts.jsx';
import GoalsCard from '../components/GoalsCard.jsx';
import FlowBars from '../components/FlowBars.jsx';

export default function DashboardView({ txs, expanded, year, months, cats, catStats, totalExp, mStats, uncatN, fRef, setFCats, setView, setMonths, setCatDetail, setSearch, commitments, savingsSummary, bufferMultiplier }) {
  const monthLabel = months.length === 1 ? mN(months[0]) : months.length > 1 ? `${months.length} maanden` : null;

  if (txs.length === 0) return (
    <div style={{ textAlign: "center", padding: "80px 20px" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--accent-20)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Inbox size={26} strokeWidth={1.8} /></div>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, color: "var(--text)", margin: "0 0 6px" }}>Welkom bij FamilieBudget</h2>
      <p style={{ fontSize: 12.5, opacity: 0.6, color: "var(--text)", maxWidth: 380, margin: "0 auto 18px" }}>Importeer je eerste Crelan CSV.</p>
      <button onClick={() => fRef.current && fRef.current.click()} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 22px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}><Inbox size={14} />Importeer</button>
    </div>
  );

  /* Headline totals. Complete — isSpendingTx has no category test, so these
     include uncategorised money. See utils/totals.js. */
  const { inc, exp, net, spaarquote, monthsWithData } = periodTotals(expanded, cats, year, months);
  /* The monthly baseline is a whole-year average (the buffer is a yearly
     concept), so the "vrij per maand" comparison has to use whole-year income
     too. Using the month-scoped `inc` would put one month's salary next to a
     four-month average and call the difference free money. */
  const yearTotals = months.length ? periodTotals(expanded, cats, year, []) : { inc, monthsWithData };
  /* What the category breakdowns actually cover. Built from catStats, never
     from `exp` — see utils/totals.js. */
  const cov = coverage(catStats, totalExp);
  const showUncategorised = () => { setFCats(["_none"]); setView("transactions"); };
  const showPayee = (p) => { setSearch(p.name); setView("transactions"); };
  /* NET savings movement for the scoped period — both directions, using the
     same construction utils/savings.js uses for the balance. Reported under
     the flow bars to explain the surplus; deliberately never added to a total,
     because gross one-way savings traffic is exactly what the user's
     `excluded` setting exists to keep out of income and expenses. */
  const savedNet = expanded
    .filter(t => t.date.startsWith(year) && (!months.length || months.includes(t.date.slice(5, 7))))
    .filter(t => t.categoryId === "sparen")
    .reduce((a, t) => a + (-(t.amount || 0)), 0);

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
        <NetTrendChart mStats={mStats} months={months} />
      </div>

      <div className="kpi-grid">
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 13, padding: "13px 15px" }}>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Inkomsten</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 500, marginTop: 6, color: "var(--text)" }}>{fmt(inc)}</div>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 13, padding: "13px 15px" }}>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Uitgaven</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 500, marginTop: 6, color: "var(--text)" }}>{fmt(exp)}</div>
          {/* This total is complete; the breakdowns below are not. Saying so
              here is what stops the two numbers looking contradictory. */}
          <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.3 }}>
            {cov.unknown > 0 ? `waarvan ${fmt(cov.unknown)} nog niet ingedeeld` : "volledig ingedeeld"}
          </div>
        </div>
        <div
          onClick={() => setView("savings")}
          title="Deel van je inkomsten dat je niet uitgeeft"
          style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 13, padding: "13px 15px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Spaarquote</div>
            <ChevronRight size={12} style={{ opacity: 0.35, flexShrink: 0 }} />
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, fontWeight: 500, marginTop: 6, color: spaarquote === null ? "var(--muted)" : "var(--text)" }}>{spaarquote === null ? "—" : `${spaarquote}%`}</div>
          <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.3 }}>
            {spaarquote === null ? "Nog geen inkomsten in deze periode" : `van je inkomsten hou je over${months.length ? "" : " dit jaar"}`}
          </div>
        </div>
      </div>

      <FlowBars
        inc={inc} exp={exp} catStats={catStats} cats={cats}
        uncategorised={cov.unknown} savedNet={savedNet}
        onPickCategory={setCatDetail} onShowUncategorised={showUncategorised}
      />

      <div className="dash-two">
        <CommittedCosts
          commitments={commitments}
          baseline={savingsSummary.baseline}
          incomePerMonth={yearTotals.monthsWithData > 0 ? yearTotals.inc / yearTotals.monthsWithData : 0}
          bufferTarget={savingsSummary.bufferTarget}
          bufferMultiplier={bufferMultiplier}
          onShowPayee={showPayee}
          onOpenSavings={() => setView("savings")}
        />
        <GoalsCard savingsSummary={savingsSummary} onOpen={() => setView("savings")} />
      </div>

      <DashSection title="Grootste uitgaven" sub={<CoverageNote coverage={cov} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {ranked.map(({ cat, total }) => (
            <div key={cat.id} onClick={() => setCatDetail(cat.id)} className="rank-row" style={{ cursor: "pointer" }}>
              <div className="rank-name" style={{ color: "var(--text)" }} title={cat.name}>{cat.name}</div>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--bg)", overflow: "hidden" }}>
                <div style={{ width: `${Math.max(2, (total / rankMax) * 100)}%`, height: "100%", borderRadius: 4, background: cat.color }} />
              </div>
              <div className="rank-amount" style={{ fontFamily: "'DM Mono',monospace", color: "var(--muted)" }}>{fmt(-total)}</div>
              <ChevronRight size={11} style={{ opacity: 0.3, flexShrink: 0 }} />
            </div>
          ))}
          {ranked.length === 0 && <div style={{ textAlign: "center", padding: 20, opacity: 0.4, fontSize: 12 }}>Geen uitgaven in deze periode</div>}
        </div>
      </DashSection>

      <CoverageCard coverage={cov} onShowUncategorised={showUncategorised} />
    </>
  );
}
