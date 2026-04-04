import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CALENDAR_MONTH_KEYS, TYPE_ORDER } from '../utils/constants.js';
import { fmt, mN } from '../utils/formatters.js';
import { isSubExcluded, netBalanceColor } from '../utils/helpers.js';
import MonthBarCell from '../components/MonthBarCell.jsx';

const TABLE_MONTHS = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
const GRID_TEMPLATE = "minmax(150px, 2fr) repeat(12, minmax(40px, 1fr)) 100px";

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

  const cellStyle = (isHeader) => ({
    padding: isHeader ? "4px 3px" : "2px 3px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    background: isHeader ? "var(--card)" : "transparent",
    fontWeight: isHeader ? 700 : 400,
    color: isHeader ? "var(--muted)" : "var(--text)",
  });
  const catCellStyle = (depth) => ({
    ...cellStyle(false),
    justifyContent: "flex-start",
    paddingLeft: 6 + depth * 12,
    gap: 4,
  });

  const renderSection = (label, isOpen, setIsOpen, categories, budgets, setBudgets, barColor) => {
    const allSums = Array(12).fill(0);
    categories.forEach((cat) => {
      categorySums(budgets, cat.subs).forEach((v, i) => { allSums[i] += v; });
    });
    const yearTotal = allSums.reduce((s, n) => s + n, 0);
    const maxAllSums = Math.max(...allSums, 1);

    return (
      <>
        <div style={{ ...catCellStyle(0), cursor: "pointer", background: "var(--card-60)", position: "sticky", top: 52, zIndex: 2 }} onClick={() => setIsOpen((o) => !o)}>
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span style={{ fontWeight: 700, fontSize: 11, color: barColor }}>{label}</span>
        </div>
        {TABLE_MONTHS.map((_, i) => (
          <div key={`${label}-sum-${i}`} style={{ ...cellStyle(), cursor: "pointer", background: "var(--card-60)", position: "sticky", top: 52, zIndex: 2 }} onClick={() => setIsOpen((o) => !o)}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9 }}>
              €{Math.round(allSums[i] || 0).toLocaleString("nl-BE", { maximumFractionDigits: 0 })}
            </span>
            <div style={{ position: "absolute", bottom: 0, left: 0, height: "3px", width: `${(Math.max(0, allSums[i]) / maxAllSums) * 80}%`, borderRadius: "9999px", background: barColor, opacity: 0.5, transition: "width 0.3s ease-in-out", pointerEvents: "none" }} />
          </div>
        ))}
        <div style={{ ...cellStyle(), cursor: "pointer", background: "var(--card-60)", position: "sticky", top: 52, zIndex: 2 }} onClick={() => setIsOpen((o) => !o)}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, fontSize: 9 }}>
            €{Math.round(yearTotal).toLocaleString("nl-BE", { maximumFractionDigits: 0 })}
          </span>
        </div>

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
                  <Fragment key={sub.id}>
                    <div style={{ ...catCellStyle(1), background: "var(--bg-30)" }} onClick={(e) => e.stopPropagation()}>
                      <span style={{ fontSize: 9 }}>{sub.name}</span>
                    </div>
                    {TABLE_MONTHS.map((_, i) => (
                      <div key={i} style={{ ...cellStyle(), padding: "1px 2px", background: "var(--bg-30)" }} onClick={(e) => e.stopPropagation()}>
                        <MonthBarCell
                          value={arr[i] ?? 0}
                          ghostValue={0}
                          maxScale={maxVal}
                          onChange={(v) => { const next = [...arr]; next[i] = v; setBudgets((p) => ({ ...p, [sub.id]: next })); }}
                          onStreamRight={i < 11 ? (v) => { const next = [...arr]; for (let j = i; j < 12; j++) next[j] = v; setBudgets((p) => ({ ...p, [sub.id]: next })); } : undefined}
                          barColor={barColor}
                        />
                      </div>
                    ))}
                    <div style={{ ...cellStyle(), background: "var(--bg-30)" }} onClick={(e) => e.stopPropagation()}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, fontSize: 9 }}>
                        €{Math.round(total).toLocaleString("nl-BE", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </Fragment>
                );
              });
            }

            const maxSums = Math.max(...sums, 1);
            return (
              <Fragment key={cat.id}>
                <div style={{ ...catCellStyle(1), cursor: "pointer" }} onClick={() => toggleCategory(cat.id)}>
                  {catExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  <span style={{ fontWeight: 600, fontSize: 10, color: cat.color }}>{cat.name}</span>
                </div>
                {TABLE_MONTHS.map((_, i) => (
                  <div key={i} style={{ ...cellStyle(), position: "relative" }} onClick={() => toggleCategory(cat.id)}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9 }}>
                      €{Math.round(sums[i] || 0).toLocaleString("nl-BE", { maximumFractionDigits: 0 })}
                    </span>
                    <div style={{ position: "absolute", bottom: 0, left: 0, height: "3px", width: `${(Math.max(0, sums[i]) / maxSums) * 80}%`, borderRadius: "9999px", background: cat.color, opacity: 0.5, transition: "width 0.3s ease-in-out", pointerEvents: "none" }} />
                  </div>
                ))}
                <div style={cellStyle()} onClick={() => toggleCategory(cat.id)}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, fontSize: 9 }}>
                    €{Math.round(catYearTotal).toLocaleString("nl-BE", { maximumFractionDigits: 0 })}
                  </span>
                </div>

                {catExpanded &&
                  (cat.subs || []).map((sub) => {
                    const arr = budgets[sub.id] || Array(12).fill(0);
                    const maxVal = Math.max(500, ...arr, 1);
                    const total = subTotal(arr);

                    return (
                      <Fragment key={sub.id}>
                        <div style={{ ...catCellStyle(2), background: "var(--bg-30)" }} onClick={(e) => e.stopPropagation()}>
                          <span style={{ fontSize: 9 }}>{sub.name}</span>
                        </div>
                        {TABLE_MONTHS.map((_, i) => (
                          <div key={i} style={{ ...cellStyle(), padding: "1px 2px", background: "var(--bg-30)" }} onClick={(e) => e.stopPropagation()}>
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
                          </div>
                        ))}
                        <div style={{ ...cellStyle(), background: "var(--bg-30)" }} onClick={(e) => e.stopPropagation()}>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, fontSize: 9 }}>
                            €{Math.round(total).toLocaleString("nl-BE", { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </Fragment>
                    );
                  })}
              </Fragment>
            );
          })}
      </>
    );
  };

  return (
    <div>
      <div
        style={{
          position: "sticky",
          top: 48,
          zIndex: 40,
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          padding: "6px 10px",
          marginBottom: 8,
        }}
      >
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 10, fontWeight: 600 }}
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div style={{ background: "var(--card)", borderRadius: 6, border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ overflow: "auto", maxHeight: "calc(100vh - 180px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID_TEMPLATE, rowGap: 0, columnGap: 8, minWidth: 700, alignItems: "stretch", fontSize: 10, background: "var(--card)" }}>
          <div style={{ ...catCellStyle(0), ...cellStyle(true), justifyContent: "flex-start", textTransform: "uppercase", fontSize: 8, letterSpacing: 0.3, position: "sticky", top: 0, zIndex: 4 }}>Categorie</div>
          {TABLE_MONTHS.map((m) => (
            <div key={`h-${m}`} style={{ ...cellStyle(true), textTransform: "uppercase", fontSize: 8, letterSpacing: 0.3, position: "sticky", top: 0, zIndex: 4 }}>{m}</div>
          ))}
          <div key="h-total" style={{ ...cellStyle(true), textTransform: "uppercase", fontSize: 8, letterSpacing: 0.3, position: "sticky", top: 0, zIndex: 4 }}>Totaal Jaar</div>
          {/* NETTO BALANS ROW */}
          <div style={{ ...catCellStyle(0), ...cellStyle(true), justifyContent: "flex-start", background: "var(--card)", position: "sticky", top: 24, zIndex: 3 }}>
            <span style={{ fontWeight: 800, color: "var(--text)" }}>Netto Balans</span>
          </div>
          {netBalance.map((amount, i) => (
            <div key={`net-${i}`} style={{ ...cellStyle(true), background: "var(--card)", position: "sticky", top: 24, zIndex: 3 }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, fontSize: 10, color: netBalanceColor(amount) }}>
                €{Math.round(amount).toLocaleString("nl-BE", { maximumFractionDigits: 0 })}
              </span>
              <div style={{ position: "absolute", bottom: 0, left: 0, height: "3px", width: `${(Math.abs(amount) / maxNet) * 80}%`, borderRadius: "9999px", background: netBalanceColor(amount), opacity: 0.5, transition: "width 0.3s ease-in-out", pointerEvents: "none" }} />
            </div>
          ))}
          <div style={{ ...cellStyle(true), background: "var(--card)", position: "sticky", top: 24, zIndex: 3 }}>
            <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, fontSize: 10, color: netBalanceColor(netBalanceYearTotal) }}>
              €{Math.round(netBalanceYearTotal).toLocaleString("nl-BE", { maximumFractionDigits: 0 })}
            </span>
          </div>
          {renderSection("Inkomsten", incomeOpen, setIncomeOpen, incomeCats, incomeBudgets, setIncomeBudgets, "var(--green)")}
          {renderSection("Uitgaven", expenseOpen, setExpenseOpen, expenseCats, expenseBudgets, setExpenseBudgets, "#C06E52")}
        </div>
        </div>
      </div>
    </div>
  );
}
