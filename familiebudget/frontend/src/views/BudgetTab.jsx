import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { netBalanceColor } from '../utils/helpers.js';
import MonthBarCell from '../components/MonthBarCell.jsx';

const TABLE_MONTHS = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
const HEADER_H = 26;
const NET_ROW_H = 30;

export default function BudgetTab({ cats }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [incomeBudgets, setIncomeBudgets] = useState({});
  const [expenseBudgets, setExpenseBudgets] = useState({});
  const [incomeOpen, setIncomeOpen] = useState(true);
  const [expenseOpen, setExpenseOpen] = useState(true);
  const [categoryOpen, setCategoryOpen] = useState({});

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (y - 2 + i).toString());
  }, []);

  const incomeCats = useMemo(() => (cats || []).filter((c) => c.type === "inkomsten"), [cats]);
  const expenseCats = useMemo(
    () => (cats || []).filter((c) => c.type === "uitgaven" && c.id !== "nog_te_verwerken"),
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
  const money = (n) => `€${Math.round(n || 0).toLocaleString("nl-BE", { maximumFractionDigits: 0 })}`;

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('api/state/budgets');
        const d = await r.json();
        const byYear = d?.value ? (d.value[selectedYear] || {}) : {};
        setIncomeBudgets(byYear.income || {});
        setExpenseBudgets(byYear.expense || {});
      } catch (e) {
        setIncomeBudgets({});
        setExpenseBudgets({});
      }
    })();
  }, [selectedYear]);

  useEffect(() => {
    if (!selectedYear) return;
    const save = async () => {
      try {
        let existing = {};
        const r = await fetch('api/state/budgets');
        const d = await r.json();
        if (d?.value) existing = d.value;
        existing[selectedYear] = { income: incomeBudgets, expense: expenseBudgets };
        await fetch('api/state/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: existing }) });
      } catch (e) { /* ok */ }
    };
    const t = setTimeout(save, 500);
    return () => clearTimeout(t);
  }, [incomeBudgets, expenseBudgets, selectedYear]);

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
  const maxNet = Math.max(...netBalance.map(Math.abs), 1);

  const toggleCategory = (catId) => setCategoryOpen((p) => ({ ...p, [catId]: !p[catId] }));

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
                const maxVal = Math.max(500, ...arr, 1);
                const total = subTotal(arr);
                return (
                  <tr key={sub.id}>
                    <td style={catTd(1, { bg: "var(--bg-30)" })}>
                      <span style={{ fontSize: 9 }}>{sub.name}</span>
                    </td>
                    {TABLE_MONTHS.map((_, i) => (
                      <td key={i} style={{ ...td(false), padding: "1px 3px", background: "var(--bg-30)" }}>
                        <MonthBarCell
                          value={arr[i] ?? 0}
                          ghostValue={0}
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
                    const maxVal = Math.max(500, ...arr, 1);
                    const total = subTotal(arr);

                    return (
                      <tr key={sub.id}>
                        <td style={catTd(2, { bg: "var(--bg-30)" })}>
                          <span style={{ fontSize: 9 }}>{sub.name}</span>
                        </td>
                        {TABLE_MONTHS.map((_, i) => (
                          <td key={i} style={{ ...td(false), padding: "1px 3px", background: "var(--bg-30)" }}>
                            <MonthBarCell
                              value={arr[i] ?? 0}
                              ghostValue={0}
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

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, color: "var(--text)", margin: "0 0 16px" }}>Budget</h1>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "0 0 8px",
        }}
      >
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          style={{ padding: "4px 7px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 10, fontWeight: 600 }}
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

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
              {renderSection("Inkomsten", incomeOpen, setIncomeOpen, incomeCats, incomeBudgets, setIncomeBudgets, "var(--green)")}
              {renderSection("Uitgaven", expenseOpen, setExpenseOpen, expenseCats, expenseBudgets, setExpenseBudgets, "var(--danger)")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
