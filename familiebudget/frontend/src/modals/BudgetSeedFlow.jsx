import { useState, useMemo } from "react";
import { Check, X, ArrowLeft, ArrowRight, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { fmt0 } from '../utils/formatters.js';
import { classifyRhythm, reshapeRow, rowsToBudget, RHYTHMS } from '../utils/rhythm.js';

/*
 * Build a year's budget from what actually happened.
 *
 * The Budget tab has never been used — the stored value was three empty year
 * shells — and the reason is that it asked for ~120 numbers with nothing to go
 * on. This is the screen that answers the question first and asks for
 * confirmation second, the same contract as the categorisation review: nothing
 * is written until "Overnemen".
 *
 * Three steps, because they are three genuinely different questions:
 *   1. Which history should I learn from?
 *   2. Is this rhythm right?  ← the only one that needs a human
 *   3. Does the resulting year look sane?
 */

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_FULL = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

const RHYTHM_OPTIONS = [
  RHYTHMS.MONTHLY, RHYTHMS.QUARTERLY, RHYTHMS.ANNUAL,
  RHYTHMS.SEASONAL, RHYTHMS.VARIABLE, RHYTHMS.ONE_OFF,
];

const CONF_COLOR = { hoog: "var(--green)", midden: "var(--muted)", laag: "var(--danger)" };

const btn = (primary) => ({
  display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8,
  border: primary ? "none" : "1px solid var(--border)",
  background: primary ? "var(--accent)" : "transparent",
  color: primary ? "#fff" : "var(--muted)",
  cursor: "pointer", fontSize: 12, fontWeight: primary ? 600 : 400,
});

const th = {
  padding: "6px 5px", textAlign: "left", fontSize: 9, fontWeight: 700,
  color: "var(--muted)", textTransform: "uppercase", borderBottom: "2px solid var(--border)",
};

/** The twelve-cell preview of the grid line this row will write. */
function MonthStrip({ months, color }) {
  const max = Math.max(...months, 1);
  return (
    <div style={{ display: "flex", gap: 1, alignItems: "flex-end", height: 16 }}>
      {months.map((v, i) => (
        <div
          key={i}
          title={v > 0 ? `${MONTH_FULL[i]}: ${fmt0(v)}` : MONTH_FULL[i]}
          style={{
            width: 7, height: 16, borderRadius: 1,
            background: "var(--bg)", position: "relative", overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: `${v > 0 ? Math.max(15, (v / max) * 100) : 0}%`,
            background: color, opacity: 0.75,
          }} />
        </div>
      ))}
    </div>
  );
}

export default function BudgetSeedFlow({ txs, cats, targetYear, availableYears, onApply, onClose }) {
  const [step, setStep] = useState(1);
  const [sourceYears, setSourceYears] = useState(() => new Set(availableYears));
  // key → { drop?, rhythm?, yearTotal?, monthIdx? }
  const [edits, setEdits] = useState({});
  const [openCats, setOpenCats] = useState({});

  const years = useMemo(() => [...sourceYears].sort(), [sourceYears]);

  /* Exactly the categories the grid will draw — same filter as BudgetTab. Seed
     into anything else and the money is stored but invisible. */
  const budgetableCats = useMemo(
    () => (cats || []).filter((c) => !c.archived && c.id !== "nog_te_verwerken"),
    [cats]
  );

  const expense = useMemo(
    () => classifyRhythm(txs, budgetableCats, { years, direction: 'out' }),
    [txs, budgetableCats, years]
  );
  const income = useMemo(
    () => classifyRhythm(txs, budgetableCats, { years, direction: 'in' }),
    [txs, budgetableCats, years]
  );

  /* Apply the user's edits on top of the classification. Kept as a separate
     layer rather than mutating rows, so flipping a rhythm back and forth is
     lossless and re-running the classifier never loses a decision. */
  /* A payee that stopped is excluded BY DEFAULT, and this is the single most
     consequential default in the flow. VOXDALE's salary ended in June; left
     checked it projects €44.571 of income nobody will earn into next year —
     the largest number in the budget, and wrong. The row still shows, with
     "gestopt → BLACKBIRDS" next to it, so re-including it is one click; but
     the safe answer is the one that does not invent income.
     An explicit click always wins over the default, in both directions. */
  const isDropped = (r) => {
    const e = edits[r.key] || {};
    return e.drop !== undefined ? e.drop : !!r.ended;
  };

  const applyEdits = (rows) => rows.map((r) => {
    const e = edits[r.key] || {};
    if (isDropped(r)) return { ...r, months: Array(12).fill(0), yearTotal: 0, dropped: true };
    if (e.rhythm === undefined && e.yearTotal === undefined && e.monthIdx === undefined) return r;
    const rhythm = e.rhythm ?? r.rhythm;
    const months = reshapeRow(r, { rhythm, monthIdx: e.monthIdx, yearTotal: e.yearTotal });
    return { ...r, rhythm, months, yearTotal: months.reduce((s, n) => s + n, 0), edited: true };
  });

  const expRows = useMemo(() => applyEdits(expense.rows), [expense.rows, edits]);
  const incRows = useMemo(() => applyEdits(income.rows), [income.rows, edits]);

  const setEdit = (key, patch) => setEdits((p) => ({ ...p, [key]: { ...p[key], ...patch } }));

  /* A row needs a human if the classifier is unsure, or if it started or
     stopped inside the window — those are the ones where projecting twelve
     months forward is a guess rather than a measurement. */
  const needsReview = (r) =>
    !r.dropped && (r.confidence === 'laag' || r.ended || r.started) && r.rhythm !== RHYTHMS.ONE_OFF;

  const totals = useMemo(() => {
    const sum = (rows) => rows.reduce((s, r) => s + r.yearTotal, 0);
    return { inc: sum(incRows), exp: sum(expRows) };
  }, [incRows, expRows]);

  const catOf = (id) => cats.find((c) => c.id === id);

  // ── Step 1 ───────────────────────────────────────────────────────────
  const renderSource = () => {
    const cov = expense.coverage;
    const missing = cov.monthsWithData.map((n, i) => (n === 0 ? MONTH_FULL[i] : null)).filter(Boolean);
    return (
      <div style={{ padding: "4px 2px" }}>
        <p style={{ fontSize: 12, color: "var(--text)", margin: "0 0 14px", lineHeight: 1.5 }}>
          Welke jaren moet ik gebruiken om het budget van <strong>{targetYear}</strong> op te bouwen?
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {availableYears.map((y) => {
            const on = sourceYears.has(y);
            return (
              <button
                key={y}
                onClick={() => setSourceYears((s) => {
                  const n = new Set(s);
                  n.has(y) ? n.delete(y) : n.add(y);
                  return n.size ? n : s;   // never allow zero sources
                })}
                style={{
                  padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                  border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                  background: on ? "var(--accent)" : "transparent",
                  color: on ? "#fff" : "var(--muted)",
                }}
              >{y}</button>
            );
          })}
        </div>

        <div style={{ background: "var(--bg-30)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11.5, color: "var(--text)", marginBottom: 6 }}>
            <strong>{expense.monthsObserved}</strong> {expense.monthsObserved === 1 ? "maand" : "maanden"} met gegevens
            {expense.observedMonthKeys.length > 0 && (
              <span style={{ color: "var(--muted)" }}>
                {" "}({expense.observedMonthKeys[0]} t/m {expense.observedMonthKeys[expense.observedMonthKeys.length - 1]})
              </span>
            )}
          </div>
          {!cov.full && (
            <div style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
              <AlertTriangle size={13} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1 }} />
              <span>
                Geen gegevens voor {missing.length > 3 ? `${missing.length} maanden` : missing.join(", ")}.
                Jaarlijkse kosten kunnen daardoor niet bevestigd worden — ze worden als
                <em> jaarlijks?</em> gemarkeerd en moet je zelf nakijken. Importeer een vorig
                jaar om dat op te lossen.
              </span>
            </div>
          )}
          {expense.uncategorised.count > 0 && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
              {expense.uncategorised.count} transacties ({fmt0(expense.uncategorised.total)}) hebben geen
              categorie en worden <strong>niet</strong> mee gebudgetteerd.
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Step 2 ───────────────────────────────────────────────────────────
  const renderRow = (r, color) => {
    const e = edits[r.key] || {};
    const dropped = isDropped(r);
    const monthIdx = e.monthIdx ?? r.months.findIndex((v) => v > 0);
    const oneMonth = r.rhythm === RHYTHMS.ANNUAL || r.rhythm === RHYTHMS.MAYBE_ANNUAL || r.rhythm === RHYTHMS.QUARTERLY;

    return (
      <tr key={r.key} style={{ opacity: dropped ? 0.35 : 1, borderBottom: "1px solid var(--bg)" }}>
        <td style={{ padding: "5px 8px" }}>
          <input
            type="checkbox" checked={!dropped}
            onChange={() => setEdit(r.key, { drop: !dropped })}
            style={{ accentColor: "var(--accent)", cursor: "pointer" }}
          />
        </td>
        <td style={{ padding: "5px", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }} title={r.name}>
          {r.name}
          {r.ended && (
            <span style={{ color: "var(--danger)", fontSize: 9, marginLeft: 5 }}>
              gestopt{r.replacedBy ? ` → ${r.replacedBy}` : ""}
            </span>
          )}
          {r.started && !r.ended && <span style={{ color: "var(--muted)", fontSize: 9, marginLeft: 5 }}>nieuw</span>}
        </td>
        <td style={{ padding: "5px" }}>
          <select
            value={r.rhythm}
            onChange={(ev) => setEdit(r.key, { rhythm: ev.target.value, yearTotal: r.yearTotal })}
            style={{ fontSize: 9.5, padding: "2px 4px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer" }}
          >
            {RHYTHM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            {r.rhythm === RHYTHMS.MAYBE_ANNUAL && <option value={RHYTHMS.MAYBE_ANNUAL}>jaarlijks?</option>}
          </select>
        </td>
        <td style={{ padding: "5px" }}>
          {oneMonth ? (
            <select
              value={monthIdx < 0 ? 0 : monthIdx}
              onChange={(ev) => setEdit(r.key, { monthIdx: Number(ev.target.value), yearTotal: r.yearTotal })}
              style={{ fontSize: 9.5, padding: "2px 4px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer" }}
            >
              {MONTH_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          ) : <span style={{ color: "var(--muted)", fontSize: 9 }}>—</span>}
        </td>
        <td style={{ padding: "5px" }}><MonthStrip months={r.months} color={color} /></td>
        <td style={{ padding: "5px", textAlign: "right", whiteSpace: "nowrap" }}>
          <input
            type="text"
            value={Math.round(r.yearTotal)}
            onChange={(ev) => {
              const v = Number(String(ev.target.value).replace(/[^\d]/g, ""));
              setEdit(r.key, { yearTotal: Number.isFinite(v) ? v : 0 });
            }}
            style={{ width: 62, textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10, padding: "2px 4px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)" }}
          />
        </td>
        <td style={{ padding: "5px", fontSize: 9, color: CONF_COLOR[r.confidence] || "var(--muted)", whiteSpace: "nowrap" }}>
          {r.confidence}
          <span style={{ color: "var(--muted)", opacity: 0.7 }}> · {r.monthsSeen}m</span>
        </td>
      </tr>
    );
  };

  const renderTable = (rows, color, emptyText) => (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
      <thead>
        <tr style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--card)" }}>
          <th style={{ ...th, width: 26 }} />
          <th style={th}>Betaler</th>
          <th style={th}>Ritme</th>
          <th style={th}>Maand</th>
          <th style={th}>Verdeling</th>
          <th style={{ ...th, textAlign: "right" }}>Per jaar</th>
          <th style={th}>Zekerheid</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={7} style={{ padding: 14, textAlign: "center", color: "var(--muted)", fontSize: 11 }}>{emptyText}</td></tr>
        )}
        {rows.map((r) => renderRow(r, color))}
      </tbody>
    </table>
  );

  const renderReview = () => {
    const review = [...incRows.filter(needsReview), ...expRows.filter(needsReview)];
    const restInc = incRows.filter((r) => !needsReview(r) && r.rhythm !== RHYTHMS.ONE_OFF);
    const restExp = expRows.filter((r) => !needsReview(r) && r.rhythm !== RHYTHMS.ONE_OFF);
    const oneOffs = [...incRows, ...expRows].filter((r) => r.rhythm === RHYTHMS.ONE_OFF);

    const sectionTotal = (rows) => fmt0(rows.reduce((s, r) => s + r.yearTotal, 0));

    const section = (id, title, subtitle, rows, color) => {
      const open = openCats[id] ?? (id === "review");
      return (
        <div style={{ marginBottom: 10, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <div
            onClick={() => setOpenCats((p) => ({ ...p, [id]: !open }))}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "var(--card-60)", cursor: "pointer" }}
          >
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text)" }}>{title}</span>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>{rows.length}</span>
            {subtitle && <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>{subtitle}</span>}
          </div>
          {open && <div style={{ overflowX: "auto" }}>{renderTable(rows, color, "Niets hier.")}</div>}
        </div>
      );
    };

    return (
      <div>
        {review.length > 0 && section(
          "review",
          "Nakijken",
          `${sectionTotal(review)} · onzeker, of gestart/gestopt`,
          review, "var(--accent)"
        )}
        {section("inc", "Inkomsten", sectionTotal(restInc), restInc, "var(--green)")}
        {section("exp", "Uitgaven", sectionTotal(restExp), restExp, "var(--danger)")}
        {oneOffs.length > 0 && section(
          "off",
          "Niet meegenomen",
          "eenmalig — tellen niet mee in het budget",
          oneOffs, "var(--muted)"
        )}
      </div>
    );
  };

  // ── Step 3 ───────────────────────────────────────────────────────────
  const renderSummary = () => {
    const byCat = new Map();
    const add = (r, kind) => {
      if (r.yearTotal <= 0) return;
      const c = catOf(r.catId);
      const k = r.catId;
      if (!byCat.has(k)) byCat.set(k, { name: c?.name || r.catId, color: c?.color || "var(--neutral)", kind, total: 0, months: Array(12).fill(0), rhythms: new Set() });
      const e = byCat.get(k);
      e.total += r.yearTotal;
      e.rhythms.add(r.rhythm);
      for (let i = 0; i < 12; i++) e.months[i] += r.months[i];
    };
    incRows.forEach((r) => add(r, "in"));
    expRows.forEach((r) => add(r, "out"));

    const groups = [...byCat.values()].sort((a, b) => b.total - a.total);
    const maxCat = Math.max(...groups.map((g) => g.total), 1);
    const net = totals.inc - totals.exp;

    // Which months carry the annual and quarterly bills — the thing a yearly
    // budget can tell you that a monthly average never can.
    const perMonth = Array(12).fill(0);
    expRows.forEach((r) => r.months.forEach((v, i) => { perMonth[i] += v; }));
    const avg = perMonth.reduce((s, n) => s + n, 0) / 12;
    const heavy = perMonth
      .map((v, i) => ({ i, v }))
      .filter((m) => m.v > avg * 1.15)
      .sort((a, b) => b.v - a.v)
      .slice(0, 2);

    const big = (label, value, color) => (
      <div style={{ flex: 1, background: "var(--bg-30)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
        <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--muted)", fontWeight: 700 }}>{label}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 700, color, marginTop: 3 }}>{fmt0(value)}</div>
      </div>
    );

    return (
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {big("Inkomsten", totals.inc, "var(--green)")}
          {big("Uitgaven", totals.exp, "var(--danger)")}
          {big("Netto", net, net >= 0 ? "var(--green)" : "var(--danger)")}
        </div>

        {heavy.length > 0 && (
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, lineHeight: 1.5, padding: "0 2px" }}>
            {heavy.length === 1
              ? <>De zwaarste maand is <strong style={{ color: "var(--text)" }}>{MONTH_FULL[heavy[0].i]}</strong> ({fmt0(heavy[0].v)}).</>
              : <>De zwaarste maanden zijn <strong style={{ color: "var(--text)" }}>{MONTH_FULL[heavy[0].i]}</strong> ({fmt0(heavy[0].v)}) en <strong style={{ color: "var(--text)" }}>{MONTH_FULL[heavy[1].i]}</strong> ({fmt0(heavy[1].v)}), tegenover {fmt0(avg)} gemiddeld.</>}
          </div>
        )}

        <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {groups.map((g) => (
            <div key={g.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderBottom: "1px solid var(--bg)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: g.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "var(--text)", width: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
              <div style={{ flex: 1, height: 5, background: "var(--bg)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${(g.total / maxCat) * 100}%`, height: "100%", background: g.color, opacity: 0.65 }} />
              </div>
              <MonthStrip months={g.months} color={g.color} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text)", width: 74, textAlign: "right" }}>{fmt0(g.total)}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 12, lineHeight: 1.5 }}>
          Dit overschrijft het budget van {targetYear}. Je kan elk bedrag daarna nog aanpassen in de tabel.
        </p>
      </div>
    );
  };

  const apply = () => {
    onApply({
      income: rowsToBudget(incRows.filter((r) => !r.dropped)),
      expense: rowsToBudget(expRows.filter((r) => !r.dropped)),
    });
  };

  const TITLES = ["Bron", "Nakijken", "Overzicht"];
  const reviewCount = [...incRows, ...expRows].filter(needsReview).length;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, padding: 20, maxWidth: 980, width: "96%", maxHeight: "90vh", overflow: "hidden", border: "1px solid var(--border)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 400, fontFamily: "var(--font-display)", color: "var(--text)" }}>
            Budget {targetYear} opbouwen
          </h2>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{step}/3 · {TITLES[step - 1]}</span>
        </div>
        <p style={{ margin: "4px 0 14px", fontSize: 11, opacity: 0.6, color: "var(--text)", flexShrink: 0 }}>
          {step === 1 && "Op basis van wat je werkelijk uitgaf, met vaste, driemaandelijkse en jaarlijkse kosten apart herkend."}
          {step === 2 && `${reviewCount} ${reviewCount === 1 ? "rij vraagt" : "rijen vragen"} om een beslissing. De rest is met zekerheid herkend.`}
          {step === 3 && "Zo ziet het jaar eruit. Er wordt nog niets opgeslagen."}
        </p>

        <div style={{ flex: 1, overflow: "auto", paddingRight: 2 }}>
          {step === 1 && renderSource()}
          {step === 2 && renderReview()}
          {step === 3 && renderSummary()}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexShrink: 0 }}>
          <button onClick={onClose} style={btn(false)}><X size={13} />Annuleer</button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 1 && (
              <button onClick={() => setStep((s) => s - 1)} style={btn(false)}><ArrowLeft size={13} />Terug</button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep((s) => s + 1)} style={btn(true)}>Volgende<ArrowRight size={13} /></button>
            ) : (
              <button onClick={apply} style={btn(true)}><Check size={14} />Overnemen</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
