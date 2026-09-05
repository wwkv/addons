import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { ChevronDown, ChevronRight, Sparkles, AlertTriangle, Info } from "lucide-react";
import { netBalanceColor } from '../utils/helpers.js';
import { fmt0 } from '../utils/formatters.js';
import MonthBarCell from '../components/MonthBarCell.jsx';
import BudgetSeedFlow from '../modals/BudgetSeedFlow.jsx';

const TABLE_MONTHS = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
const MONTH_FULL = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const HEADER_H = 26;
const NET_ROW_H = 30;
const EMPTY_12 = Object.freeze(Array(12).fill(0));

/* The rhythm of a line, read back off the line itself. Nothing stores a rhythm
   — the twelve numbers ARE the budget — but a row holding one December figure
   reads as eleven mistakes unless it is marked as the annual bill it is. */
function rhythmMark(arr) {
  const n = arr.filter((v) => Number(v) > 0).length;
  if (n === 0 || n === 12) return null;
  if (n === 1) return { label: "J", title: "Jaarlijks — één keer per jaar" };
  if (n === 4) return { label: "K", title: "Per kwartaal" };
  return { label: `${n}×`, title: `In ${n} van de 12 maanden` };
}

export default function BudgetTab({ cats, txs = [], mStats, globalYear }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [incomeBudgets, setIncomeBudgets] = useState({});
  const [expenseBudgets, setExpenseBudgets] = useState({});
  const [incomeOpen, setIncomeOpen] = useState(true);
  const [expenseOpen, setExpenseOpen] = useState(true);
  const [categoryOpen, setCategoryOpen] = useState({});
  const [seeding, setSeeding] = useState(false);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (y - 2 + i).toString());
  }, []);

  // Years that actually hold transactions — what the seeder can learn from,
  // as opposed to the synthetic window above that you can budget into.
  const dataYears = useMemo(
    () => [...new Set((txs || []).map((t) => t.date?.slice(0, 4)).filter(Boolean))].sort(),
    [txs]
  );

  /* `archived` is filtered here for the same reason CatGrid does it: onboarding
     lets you hide categories you do not use, and without this they came back as
     empty rows to fill in on exactly the screen where that is most tedious. */
  const incomeCats = useMemo(
    () => (cats || []).filter((c) => c.type === "inkomsten" && !c.archived),
    [cats]
  );
  const expenseCats = useMemo(
    () => (cats || []).filter((c) => c.type === "uitgaven" && !c.archived && c.id !== "nog_te_verwerken"),
    [cats]
  );

  const categorySums = useCallback((budgetsMap, subs) => {
    const sums = Array(12).fill(0);
    (subs || []).forEach((sub) => {
      const arr = budgetsMap[sub.id] || Array(12).fill(0);
      arr.forEach((v, i) => { sums[i] += Number(v) || 0; });
    });
    return sums;
  }, []);

  const subTotal = (arr) => (arr || []).reduce((s, n) => s + (Number(n) || 0), 0);
  const money = fmt0;

  /* Loading and saving are gated on `loadedYear`, and that gate is the whole
     point. Both effects key on selectedYear; the save debounces 500 ms and
     writes whatever is in component state at that moment. Without a gate, a
     GET slower than 500 ms means the save fires with the PREVIOUS year's
     numbers still in state and writes them into the year you just switched
     to. That is how the stored value ended up as three empty year shells —
     merely visiting the tab was enough to write. A seeded budget would go the
     same way on the next year switch.

     So: never save a year whose load has not landed, and never save a year
     the user has not actually edited. `loadFailed` is separate from "not
     loaded yet" because a failed load must never be persisted as {} either. */
  const [loadedYear, setLoadedYear] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadedYear(null);
    setDirty(false);
    setLoadFailed(false);
    (async () => {
      try {
        const r = await fetch('api/state/budgets');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        if (cancelled) return;
        const byYear = d?.value ? (d.value[selectedYear] || {}) : {};
        setIncomeBudgets(byYear.income || {});
        setExpenseBudgets(byYear.expense || {});
        setLoadedYear(selectedYear);
      } catch (e) {
        if (cancelled) return;
        // Show empty, but stay un-loaded so the autosave cannot persist it.
        setIncomeBudgets({});
        setExpenseBudgets({});
        setLoadFailed(true);
        console.error('budget laden mislukt', e);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedYear]);

  useEffect(() => {
    if (!selectedYear || loadedYear !== selectedYear || !dirty) return;
    const save = async () => {
      try {
        let existing = {};
        const r = await fetch('api/state/budgets');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        if (d?.value) existing = d.value;
        existing[selectedYear] = { income: incomeBudgets, expense: expenseBudgets };
        const p = await fetch('api/state/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: existing }) });
        if (!p.ok) throw new Error(`HTTP ${p.status}`);
      } catch (e) {
        console.error('budget opslaan mislukt', e);
      }
    };
    const t = setTimeout(save, 500);
    return () => clearTimeout(t);
  }, [incomeBudgets, expenseBudgets, selectedYear, loadedYear, dirty]);

  const monthIncome = useMemo(() => {
    const s = Array(12).fill(0);
    incomeCats.forEach((cat) => {
      categorySums(incomeBudgets, cat.subs).forEach((v, i) => { s[i] += v; });
    });
    return s;
  }, [incomeCats, incomeBudgets, categorySums]);

  const monthExpenses = useMemo(() => {
    const s = Array(12).fill(0);
    expenseCats.forEach((cat) => {
      categorySums(expenseBudgets, cat.subs).forEach((v, i) => { s[i] += v; });
    });
    return s;
  }, [expenseCats, expenseBudgets, categorySums]);

  const netBalance = useMemo(
    () => Array(12).fill(0).map((_, i) => (monthIncome[i] || 0) - (monthExpenses[i] || 0)),
    [monthIncome, monthExpenses]
  );
  const netBalanceYearTotal = netBalance.reduce((s, n) => s + n, 0);

  /* Everything below is DERIVED from the grid — nothing here is stored, so
     editing any cell moves the year overview with it. That is the whole
     contract of this screen: the twelve-month lines are the budget, and the
     yearly figures are a reading of them, never a second place to type. */
  const overview = useMemo(() => {
    const inc = monthIncome.reduce((s, n) => s + n, 0);
    const exp = monthExpenses.reduce((s, n) => s + n, 0);

    const rows = expenseCats
      .map((cat) => {
        const sums = categorySums(expenseBudgets, cat.subs);
        return { id: cat.id, name: cat.name, color: cat.color, total: sums.reduce((s, n) => s + n, 0), months: sums };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);

    /* Which months carry the annual and quarterly bills. This is the thing a
       yearly budget can tell you that a monthly average structurally cannot,
       and it only exists because annual costs were placed in their real month
       instead of being smeared across twelve. */
    const avg = exp / 12;
    const heavy = monthExpenses
      .map((v, i) => ({ i, v }))
      .filter((m) => m.v > avg * 1.15)
      .sort((a, b) => b.v - a.v)
      .slice(0, 2);

    return { inc, exp, net: inc - exp, rows, avg, heavy };
  }, [monthIncome, monthExpenses, expenseCats, expenseBudgets, categorySums]);

  /* Actuals per subcategory per month, for the ghost bar behind each cell.
     mStats cannot supply this — it holds month totals, and the ghost has to sit
     behind the row it belongs to or it means nothing. Keyed on the year being
     edited, so budgeting 2027 shows no ghost at all rather than last year's
     numbers wearing this year's label. */
  const actualsBySub = useMemo(() => {
    const out = {};
    for (const t of txs || []) {
      if (!t.date || !t.subCategoryId) continue;
      if (t.date.slice(0, 4) !== selectedYear) continue;
      const arr = out[t.subCategoryId] || (out[t.subCategoryId] = Array(12).fill(0));
      arr[parseInt(t.date.slice(5, 7), 10) - 1] += Math.abs(t.amount);
    }
    return out;
  }, [txs, selectedYear]);

  const toggleCategory = (catId) => setCategoryOpen((p) => ({ ...p, [catId]: !p[catId] }));

  /* Edits go through these, never through the raw setters — an edit is the
     only thing that may unlock the autosave (see the load/save gate above). */
  const editIncome = useCallback((u) => { setDirty(true); setIncomeBudgets(u); }, []);
  const editExpense = useCallback((u) => { setDirty(true); setExpenseBudgets(u); }, []);

  // ── Plain (non-sticky) row cell: height is content-driven, this is safe
  // because these rows never stack with other sticky rows. ──
  const td = (isBold) => ({
    padding: "4px 6px",
    borderBottom: "1px solid var(--border)",
    textAlign: "center",
    verticalAlign: "middle",
    position: "relative",
    whiteSpace: "nowrap",
    fontWeight: isBold ? 600 : 400,
    color: "var(--text)",
  });
  const catTd = (depth, extra) => ({
    ...td(false),
    textAlign: "left",
    paddingLeft: 8 + depth * 14,
    background: extra?.bg,
  });

  const markStyle = {
    marginLeft: 5, padding: "0 3px", borderRadius: 3, fontSize: 7.5, fontWeight: 700,
    background: "var(--border)", color: "var(--muted)", verticalAlign: "middle",
  };

  const bar = (value, max, color) => (
    <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, width: `${(Math.max(0, value) / max) * 80}%`, borderRadius: 9999, background: color, opacity: 0.5, transition: "width 0.3s ease-in-out", pointerEvents: "none" }} />
  );

  const renderSection = (label, isOpen, setIsOpen, categories, budgets, setBudgets, barColor) => {
    const allSums = Array(12).fill(0);
    categories.forEach((cat) => {
      categorySums(budgets, cat.subs).forEach((v, i) => { allSums[i] += v; });
    });
    const yearTotal = allSums.reduce((s, n) => s + n, 0);
    const maxAllSums = Math.max(...allSums, 1);

    return (
      <Fragment key={label}>
        <tr style={{ cursor: "pointer", background: "var(--card-60)" }} onClick={() => setIsOpen((o) => !o)}>
          <td style={catTd(0)}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span style={{ fontWeight: 700, fontSize: 11, color: barColor }}>{label}</span>
            </div>
          </td>
          {TABLE_MONTHS.map((_, i) => (
            <td key={`${label}-sum-${i}`} style={td(false)}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9 }}>{money(allSums[i])}</span>
              {bar(allSums[i], maxAllSums, barColor)}
            </td>
          ))}
          <td style={td(true)}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, fontSize: 9 }}>{money(yearTotal)}</span>
          </td>
        </tr>

        {isOpen &&
          categories.map((cat) => {
            const sums = categorySums(budgets, cat.subs);
            const catYearTotal = sums.reduce((s, n) => s + n, 0);
            const catExpanded = categoryOpen[cat.id] ?? false;
            const skipCategoryHeader = cat.name.trim().toLowerCase() === label.trim().toLowerCase();

            if (skipCategoryHeader) {
              return (cat.subs || []).map((sub) => {
                const arr = budgets[sub.id] || Array(12).fill(0);
                const ghost = actualsBySub[sub.id] || EMPTY_12;
                const mark = rhythmMark(arr);
                const maxVal = Math.max(500, ...arr, 1);
                const total = subTotal(arr);
                return (
                  <tr key={sub.id}>
                    <td style={catTd(1, { bg: "var(--bg-30)" })}>
                      <span style={{ fontSize: 9 }}>{sub.name}</span>
                      {mark && <span title={mark.title} style={markStyle}>{mark.label}</span>}
                    </td>
                    {TABLE_MONTHS.map((_, i) => (
                      <td key={i} style={{ ...td(false), padding: "1px 3px", background: "var(--bg-30)" }}>
                        <MonthBarCell
                          value={arr[i] ?? 0}
                          ghostValue={ghost[i]}
                          maxScale={maxVal}
                          onChange={(v) => { const next = [...arr]; next[i] = v; setBudgets((p) => ({ ...p, [sub.id]: next })); }}
                          onStreamRight={i < 11 ? (v) => { const next = [...arr]; for (let j = i; j < 12; j++) next[j] = v; setBudgets((p) => ({ ...p, [sub.id]: next })); } : undefined}
                          barColor={barColor}
                        />
                      </td>
                    ))}
                    <td style={{ ...td(true), background: "var(--bg-30)" }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, fontSize: 9 }}>{money(total)}</span>
                    </td>
                  </tr>
                );
              });
            }

            const maxSums = Math.max(...sums, 1);
            return (
              <Fragment key={cat.id}>
                <tr style={{ cursor: "pointer" }} onClick={() => toggleCategory(cat.id)}>
                  <td style={catTd(1)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {catExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      <span style={{ fontWeight: 600, fontSize: 10, color: cat.color }}>{cat.name}</span>
                    </div>
                  </td>
                  {TABLE_MONTHS.map((_, i) => (
                    <td key={i} style={td(false)}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9 }}>{money(sums[i])}</span>
                      {bar(sums[i], maxSums, cat.color)}
                    </td>
                  ))}
                  <td style={td(true)}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, fontSize: 9 }}>{money(catYearTotal)}</span>
                  </td>
                </tr>

                {catExpanded &&
                  (cat.subs || []).map((sub) => {
                    const arr = budgets[sub.id] || Array(12).fill(0);
                    const ghost = actualsBySub[sub.id] || EMPTY_12;
                    const mark = rhythmMark(arr);
                    const maxVal = Math.max(500, ...arr, 1);
                    const total = subTotal(arr);

                    return (
                      <tr key={sub.id}>
                        <td style={catTd(2, { bg: "var(--bg-30)" })}>
                          <span style={{ fontSize: 9 }}>{sub.name}</span>
                          {mark && <span title={mark.title} style={markStyle}>{mark.label}</span>}
                        </td>
                        {TABLE_MONTHS.map((_, i) => (
                          <td key={i} style={{ ...td(false), padding: "1px 3px", background: "var(--bg-30)" }}>
                            <MonthBarCell
                              value={arr[i] ?? 0}
                              ghostValue={ghost[i]}
                              maxScale={maxVal}
                              onChange={(v) => {
                                const next = [...arr];
                                next[i] = v;
                                setBudgets((p) => ({ ...p, [sub.id]: next }));
                              }}
                              onStreamRight={i < 11 ? (v) => { const next = [...arr]; for (let j = i; j < 12; j++) next[j] = v; setBudgets((p) => ({ ...p, [sub.id]: next })); } : undefined}
                              barColor={barColor}
                            />
                          </td>
                        ))}
                        <td style={{ ...td(true), background: "var(--bg-30)" }}>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, fontSize: 9 }}>{money(total)}</span>
                        </td>
                      </tr>
                    );
                  })}
              </Fragment>
            );
          })}
      </Fragment>
    );
  };

  // Sticky header cells: EXPLICIT fixed height on every cell in both frozen
  // rows, so the second row's `top` (= HEADER_H) always matches the first
  // row's real rendered height exactly — no guessed offsets that can drift
  // out of sync with font size / zoom and start overlapping.
  const headTd = (align = "center") => ({
    height: HEADER_H,
    padding: "0 6px",
    boxSizing: "border-box",
    position: "sticky",
    top: 0,
    zIndex: 5,
    background: "var(--card)",
    borderBottom: "1px solid var(--border)",
    textAlign: align,
    verticalAlign: "middle",
    textTransform: "uppercase",
    fontSize: 8,
    letterSpacing: 0.3,
    fontWeight: 700,
    color: "var(--muted)",
    whiteSpace: "nowrap",
  });
  const netTd = (align = "center") => ({
    height: NET_ROW_H,
    padding: "0 6px",
    boxSizing: "border-box",
    position: "sticky",
    top: HEADER_H,
    zIndex: 4,
    background: "var(--card)",
    borderBottom: "2px solid var(--border)",
    textAlign: align,
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  });

  /* Seeding replaces the year outright rather than merging into it. Merging
     would silently double a line you had already typed, and there is no way to
     tell a seeded 500 from a typed 500 afterwards. The flow says so on its last
     screen, and the grid stays editable, so replacing is both honest and
     recoverable. */
  const applySeed = ({ income, expense }) => {
    setDirty(true);
    setIncomeBudgets(income);
    setExpenseBudgets(expense);
    setSeeding(false);
  };

  return (
    <div>
      {seeding && (
        <BudgetSeedFlow
          txs={txs}
          cats={cats}
          targetYear={selectedYear}
          availableYears={dataYears}
          onApply={applySeed}
          onClose={() => setSeeding(false)}
        />
      )}
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, color: "var(--text)", margin: "0 0 16px" }}>Budget</h1>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 8,
          padding: "0 0 8px",
        }}
      >
        {dataYears.length > 0 && (
          <button
            onClick={() => setSeeding(true)}
            title="Vul dit budget op basis van je werkelijke uitgaven"
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}
          >
            <Sparkles size={12} />Opbouwen uit historiek
          </button>
        )}
        {/* This selector is LOCAL to the budget table — you plan next year while
            still looking at this year's figures everywhere else. But the Compare
            tab reads budgets under the GLOBAL year in the header, so editing
            2027 here and comparing there silently reports on 2026. Rather than
            force the two together (which would break planning ahead), say which
            year each one governs, and only speak up when they actually differ. */}
        <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--muted)", fontWeight: 700 }}>Budget voor</span>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          title="Welk jaar je hier bewerkt. De Vergelijk-tab gebruikt het jaar uit de kopbalk."
          style={{ padding: "4px 7px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 10, fontWeight: 600 }}
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* A failed load shows an empty grid, which is indistinguishable from a
          year you have not budgeted yet — and that silence is what let the old
          code persist the emptiness. Saving is already blocked in this state;
          say so too, so nobody starts typing over a budget that is merely
          unreachable. */}
      {loadFailed && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--card)", border: "1px solid var(--danger)", borderRadius: 10, padding: "9px 12px", marginBottom: 10, fontSize: 11, color: "var(--text)" }}>
          <AlertTriangle size={14} style={{ color: "var(--danger)", flexShrink: 0 }} />
          Budget kon niet geladen worden. Er wordt niets opgeslagen tot dit lukt — herlaad de pagina.
        </div>
      )}

      {globalYear && String(globalYear) !== selectedYear && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", marginBottom: 10, fontSize: 10.5, color: "var(--muted)", lineHeight: 1.45 }}>
          <Info size={13} style={{ flexShrink: 0, opacity: 0.8 }} />
          <span>
            Je bewerkt hier het budget van <strong style={{ color: "var(--text)" }}>{selectedYear}</strong>, maar de rest van de app staat op{" "}
            <strong style={{ color: "var(--text)" }}>{String(globalYear)}</strong>. Het tabblad Vergelijk gebruikt dat jaar uit de kopbalk — zet die ook op {selectedYear} om dit budget daar terug te zien.
          </span>
        </div>
      )}

      {overview.exp > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "stretch" }}>
          {[
            ["Inkomsten", overview.inc, "var(--green)"],
            ["Uitgaven", overview.exp, "var(--danger)"],
            ["Netto", overview.net, netBalanceColor(overview.net)],
          ].map(([label, value, color]) => (
            <div key={label} style={{ flex: "1 1 140px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px" }}>
              <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--muted)", fontWeight: 700 }}>{label} {selectedYear}</div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, fontWeight: 700, color, marginTop: 2 }}>{money(value)}</div>
            </div>
          ))}
          {overview.heavy.length > 0 && (
            <div style={{ flex: "2 1 260px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--muted)", fontWeight: 700 }}>Zwaarste maanden</div>
              <div style={{ fontSize: 10.5, color: "var(--text)", marginTop: 3, lineHeight: 1.45 }}>
                {overview.heavy.map((h, i) => (
                  <span key={h.i}>
                    {i > 0 && " en "}
                    <strong>{MONTH_FULL[h.i]}</strong> ({money(h.v)})
                  </span>
                ))}
                <span style={{ color: "var(--muted)" }}> — tegenover {money(overview.avg)} gemiddeld</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ background: "var(--card)", borderRadius: 11, border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ overflow: "auto", maxHeight: "calc(100vh - 180px)" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", width: "100%", minWidth: 900, fontSize: 10, background: "var(--card)" }}>
            <colgroup>
              <col />
              {TABLE_MONTHS.map((m) => <col key={m} style={{ width: 56 }} />)}
              <col style={{ width: 96 }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...headTd("left") }}>Categorie</th>
                {TABLE_MONTHS.map((m) => <th key={`h-${m}`} style={headTd()}>{m}</th>)}
                <th style={headTd()}>Totaal Jaar</th>
              </tr>
              <tr>
                <td style={{ ...netTd("left") }}>
                  <span style={{ fontWeight: 800, fontSize: 10.5, color: "var(--text)" }}>Netto Balans</span>
                </td>
                {netBalance.map((amount, i) => (
                  <td key={`net-${i}`} style={netTd()}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, fontSize: 10, color: netBalanceColor(amount) }}>{money(amount)}</span>
                  </td>
                ))}
                <td style={netTd()}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, fontSize: 10, color: netBalanceColor(netBalanceYearTotal) }}>{money(netBalanceYearTotal)}</span>
                </td>
              </tr>
            </thead>
            <tbody>
              {renderSection("Inkomsten", incomeOpen, setIncomeOpen, incomeCats, incomeBudgets, editIncome, "var(--green)")}
              {renderSection("Uitgaven", expenseOpen, setExpenseOpen, expenseCats, expenseBudgets, editExpense, "var(--danger)")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
