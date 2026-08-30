import { useState, useEffect, useMemo } from "react";
import { ArrowUp, ArrowDown, Minus, Scale, Info, AlertTriangle } from "lucide-react";
import { fmt } from '../utils/formatters.js';
import { CALENDAR_MONTH_KEYS } from '../utils/constants.js';
import { isSubExcluded } from '../utils/helpers.js';
import {
  DATASET_KINDS, resolveDataset, compareDatasets, compareToBenchmark, monthLabel,
} from '../utils/comparison.js';

/* Spending deltas are signed euro amounts, so green/red apply — oriented so
   red = spent more (money left the household), green = spent less. */
const deltaColor = (d) => d > 0 ? "var(--red)" : d < 0 ? "var(--green)" : "var(--muted)";

const PRESETS = [
  { id: "prev", label: "Vorige periode" },
  { id: "rest", label: "Rest van het jaar" },
  { id: "budget", label: "Budget" },
  { id: "benchmark", label: "Gemiddeld gezin" },
];

export default function ComparePanel({ expanded, cats, year, months, years }) {
  const [preset, setPreset] = useState("prev");
  const [budgets, setBudgets] = useState({});

  // Budgets live under their own state key; the dashboard remounts on tab
  // switch so fetching here always reflects the latest Budget-tab edits.
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('api/state/budgets');
        const d = await r.json();
        setBudgets(d?.value || {});
      } catch (e) { setBudgets({}); }
    })();
  }, []);

  const ctx = useMemo(() => ({
    expanded, cats, budgets,
    isExcluded: (t) => isSubExcluded(cats, t.categoryId, t.subCategoryId),
  }), [expanded, cats, budgets]);

  const catName = (key) => {
    if (key === "_uncat") return "Niet gecategoriseerd";
    const c = cats.find(x => x.id === key);
    return c ? c.name : key;
  };
  const catColor = (key) => {
    const c = cats.find(x => x.id === key);
    return c ? c.color : "var(--neutral)";
  };

  /* ── Build the two sides from the active preset ── */
  const built = useMemo(() => {
    const single = months.length === 1;

    if (preset === "benchmark") {
      return { kind: "benchmark", data: compareToBenchmark({ year, months }, ctx) };
    }

    const aDesc = { kind: DATASET_KINDS.PERIOD, year, months };

    if (preset === "budget") {
      const a = resolveDataset({ kind: DATASET_KINDS.BUDGET, year, months }, ctx);
      const b = resolveDataset(aDesc, ctx);
      // Budget is the baseline, actual is the comparison → delta = overspend
      return { kind: "eur", a, b, cmp: compareDatasets(a, b, { perMonth: false }) };
    }

    if (preset === "rest") {
      if (!months.length) return { kind: "unavailable", why: "Kies eerst een maand om met de rest van het jaar te vergelijken." };
      const a = resolveDataset({ kind: DATASET_KINDS.PERIOD_EXCEPT, year, months }, ctx);
      const b = resolveDataset(aDesc, ctx);
      // Different lengths → always normalise to per-month
      return { kind: "eur", a, b, cmp: compareDatasets(a, b, { perMonth: true }), perMonthForced: true };
    }

    /* prev: previous month if a single month is selected, else previous year */
    if (single) {
      const idx = CALENDAR_MONTH_KEYS.indexOf(months[0]);
      if (idx <= 0) {
        const prevYear = String(Number(year) - 1);
        const a = resolveDataset({ kind: DATASET_KINDS.PERIOD, year: prevYear, months: ["12"] }, ctx);
        const b = resolveDataset(aDesc, ctx);
        return { kind: "eur", a, b, cmp: compareDatasets(a, b) };
      }
      const a = resolveDataset({ kind: DATASET_KINDS.PERIOD, year, months: [CALENDAR_MONTH_KEYS[idx - 1]] }, ctx);
      const b = resolveDataset(aDesc, ctx);
      return { kind: "eur", a, b, cmp: compareDatasets(a, b) };
    }

    const prevYear = String(Number(year) - 1);
    if (years && years.length && !years.includes(prevYear)) {
      return { kind: "unavailable", why: `Geen data voor ${prevYear} om mee te vergelijken.` };
    }
    const a = resolveDataset({ kind: DATASET_KINDS.PERIOD, year: prevYear, months }, ctx);
    const b = resolveDataset(aDesc, ctx);
    return { kind: "eur", a, b, cmp: compareDatasets(a, b, { perMonth: true }), perMonthForced: true };
  }, [preset, year, months, ctx, years]);

  const shell = (children) => (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 15, padding: "17px 19px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <Scale size={13} />Vergelijk
        </div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => setPreset(p.id)} style={{
              padding: "4px 10px", borderRadius: 7, fontSize: 10.5, fontWeight: 600, cursor: "pointer",
              border: preset === p.id ? "1px solid var(--accent)" : "1px solid var(--border)",
              background: preset === p.id ? "var(--accent-20)" : "transparent",
              color: preset === p.id ? "var(--accent)" : "var(--muted)",
            }}>{p.label}</button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );

  if (built.kind === "unavailable") {
    return shell(<div style={{ padding: "18px 0", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>{built.why}</div>);
  }

  /* ── National benchmark: share-of-spending, side by side ── */
  if (built.kind === "benchmark") {
    const { rows, total, unattributed, label, meta } = built.data;
    if (total === 0) {
      return shell(<div style={{ padding: "18px 0", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>Nog geen gecategoriseerde uitgaven in {label}.</div>);
    }
    const maxShare = Math.max(...rows.flatMap(r => [r.a, r.b]), 1);
    // Shares are only as trustworthy as the share of spending that is actually
    // categorised. Below ~80% coverage the percentages can swing wildly, so say
    // so loudly rather than presenting a confident-looking but skewed chart.
    const coverage = (total + unattributed) > 0 ? (total / (total + unattributed)) * 100 : 0;
    const lowCoverage = coverage < 80;
    return shell(
      <>
        <div style={{ fontSize: 12, color: "var(--text)", marginBottom: 3 }}>
          <strong>{label}</strong> vs gemiddeld Belgisch huishouden
        </div>
        <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: lowCoverage ? 8 : 12 }}>
          Vergelijking op <strong>aandeel van je uitgaven</strong>, niet op bedrag — {meta.source} publiceert deze verdeling in %, niet per gezinsgrootte.
        </div>
        {lowCoverage && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "9px 11px", borderRadius: 9, border: "1px solid var(--accent)", background: "var(--accent-10)", marginBottom: 12 }}>
            <AlertTriangle size={13} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 10.5, color: "var(--text)", lineHeight: 1.45 }}>
              Slechts <strong>{Math.round(coverage)}%</strong> van je uitgaven in deze periode is gecategoriseerd. Deze percentages zijn berekend op dat deel en zijn dus nog niet representatief — categoriseer meer transacties voor een betrouwbare vergelijking.
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {rows.map(r => (
            <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11.5 }}>
              <div style={{ width: 180, flex: "0 0 180px", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.name}>{r.name}</div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ height: 7, borderRadius: 4, background: "var(--bg)", overflow: "hidden" }}>
                  <div style={{ width: `${(r.a / maxShare) * 100}%`, height: "100%", borderRadius: 4, background: "var(--accent)" }} />
                </div>
                <div style={{ height: 7, borderRadius: 4, background: "var(--bg)", overflow: "hidden" }}>
                  <div style={{ width: `${(r.b / maxShare) * 100}%`, height: "100%", borderRadius: 4, background: "var(--neutral)" }} />
                </div>
              </div>
              <div style={{ width: 62, flex: "0 0 62px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text)" }}>{r.a.toFixed(1)}%</div>
              <div style={{ width: 52, flex: "0 0 52px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--muted)" }}>{r.b.toFixed(1)}%</div>
              <div style={{ width: 58, flex: "0 0 58px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 600, color: Math.abs(r.delta) < 1 ? "var(--muted)" : "var(--text)" }}>
                {r.delta > 0 ? "+" : ""}{r.delta.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, fontSize: 10, color: "var(--muted)", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--accent)" }} />Jij</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--neutral)" }} />België</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Info size={10} />{meta.source} · {meta.year}
          </span>
        </div>
        {unattributed > 0 && (
          <div style={{ marginTop: 6, fontSize: 10, color: "var(--muted)" }}>
            {fmt(-unattributed)} nog niet gecategoriseerd en dus niet meegeteld.
          </div>
        )}
      </>
    );
  }

  /* ── Euro comparison: headline delta + biggest movers both ways ── */
  const { a, b, cmp, perMonthForced } = built;
  if (!cmp || (a.total === 0 && b.total === 0)) {
    return shell(<div style={{ padding: "18px 0", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>Geen data om te vergelijken.</div>);
  }

  const up = cmp.rows.filter(r => r.delta > 0).slice(0, 5);
  const down = cmp.rows.filter(r => r.delta < 0).slice(0, 5);
  const barMax = Math.max(...cmp.rows.map(r => Math.max(r.a, r.b)), 1);
  const suffix = (perMonthForced || cmp.perMonth) ? " / maand" : "";

  const moverList = (rows, title, icon) => rows.length > 0 && (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 7 }}>
        {icon}{title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {rows.map(r => (
          <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
            <div style={{ width: 116, flex: "0 0 116px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }} title={catName(r.key)}>{catName(r.key)}</div>
            <div style={{ flex: 1, minWidth: 0, height: 6, borderRadius: 3, background: "var(--bg)", overflow: "hidden" }}>
              <div style={{ width: `${(Math.max(r.a, r.b) / barMax) * 100}%`, height: "100%", borderRadius: 3, background: catColor(r.key) }} />
            </div>
            <div style={{ width: 74, flex: "0 0 74px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: deltaColor(r.delta) }}>
              {r.delta > 0 ? "+" : ""}{fmt(r.delta)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return shell(
    <>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600 }}>{a.label}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 17, color: "var(--muted)" }}>{fmt(cmp.totalA)}{suffix}</div>
        </div>
        <div style={{ fontSize: 15, color: "var(--muted)", paddingBottom: 3 }}>→</div>
        <div>
          <div style={{ fontSize: 10.5, color: "var(--text)", fontWeight: 700 }}>{b.label}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 17, color: "var(--text)", fontWeight: 600 }}>{fmt(cmp.totalB)}{suffix}</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600, color: deltaColor(cmp.delta) }}>
            {cmp.delta > 0 ? <ArrowUp size={17} /> : cmp.delta < 0 ? <ArrowDown size={17} /> : <Minus size={15} />}
            {cmp.delta > 0 ? "+" : ""}{fmt(cmp.delta)}
          </div>
          {cmp.pct !== null && Number.isFinite(cmp.pct) && (
            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
              {cmp.pct > 0 ? "+" : ""}{Math.round(cmp.pct)}% t.o.v. {a.label.toLowerCase()}
            </div>
          )}
        </div>
      </div>

      {a.sublabel === "Geen budget ingesteld" && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
          Er is nog geen budget ingesteld voor deze periode — stel er een in op het Budget-tabblad.
        </div>
      )}
      {perMonthForced && (
        <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 10 }}>
          Perioden van ongelijke lengte — omgerekend naar een gemiddelde per maand.
        </div>
      )}

      <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
        {moverList(up, "Meer uitgegeven", <ArrowUp size={11} />)}
        {moverList(down, "Minder uitgegeven", <ArrowDown size={11} />)}
        {up.length === 0 && down.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--muted)", padding: "6px 0" }}>Geen verschillen om te tonen.</div>
        )}
      </div>
    </>
  );
}
