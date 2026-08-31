import { useState } from "react";
import { Settings, Check, ChevronLeft, ChevronRight, Plus, Minus, X } from "lucide-react";
import { fmt } from '../utils/formatters.js';
import NumberInput from '../components/NumberInput.jsx';

const POT_COLORS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)"];

export default function SavingsTab({ txs, expanded, cats, savings, setSavings, year, settings, unassignedSavings }) {
  const [showSetup, setShowSetup] = useState(!savings.knownBalance);
  const [editingPotId, setEditingPotId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isAssignMode, setIsAssignMode] = useState(false);
  const [draftPot, setDraftPot] = useState({ name: "Nieuw Doel", target: 1000, saved: 0 });

  const blocksAvailable = Math.floor((unassignedSavings || 0) / 250);
  const remainder = (unassignedSavings || 0) % 250;
  const startOfYear = `${year}-01-01`;
  const knownDate = savings.knownDate || "";

  /* Spaarbuffer target: matches Noodzakelijk vs Luxe pie chart exactly */
  const { bufferTarget } = (() => {
    const data = expanded ?? txs;
    const yearExpenses = data.filter(t => t.date.startsWith(year.toString()) && Number(t.amount) < 0);
    const nodigTxs = yearExpenses.filter(t => {
      const cat = cats.find(c => c.id === t.categoryId);
      const sub = cat ? cat.subs.find(ss => ss.id === t.subCategoryId) : null;
      if (!cat || !sub || sub.excluded || cat.id === "sparen") return false;
      return (sub.necessity || "nodig") !== "luxe";
    });
    const uniqueMonths = new Set(nodigTxs.map(t => t.date.substring(0, 7)));
    const totalNodigSpend = Math.abs(nodigTxs.reduce((sum, t) => sum + Number(t.amount), 0));
    const activeMonthsCount = uniqueMonths.size > 0 ? uniqueMonths.size : 1;
    const avgMonthlyNodigVal = totalNodigSpend / activeMonthsCount;
    const rawBuffer = avgMonthlyNodigVal * (settings?.bufferMultiplier || 5);
    return { bufferTarget: Math.ceil(rawBuffer / 500) * 500 };
  })();

  const savingsWindowTxs = knownDate ? txs.filter(tx => tx.categoryId === "sparen" && tx.date >= startOfYear && tx.date <= knownDate) : [];
  const netChange = savingsWindowTxs.reduce((sum, tx) => sum + (-(tx.amount || 0)), 0);
  const jan1Balance = (savings.knownBalance || 0) - netChange;

  const yearTxs = txs.filter(tx => tx.categoryId === "sparen" && tx.date >= startOfYear);
  const totalSavedThisYear = yearTxs.reduce((sum, tx) => sum + (-(tx.amount || 0)), 0);
  const liveTotal = jan1Balance + totalSavedThisYear;

  /* Reality Waterfall: buffer first, then pots get actual allocations capped by remaining cash */
  const bufferAllocated = Math.min(liveTotal, bufferTarget);
  let rollingAvailable = Math.max(0, liveTotal - bufferAllocated);
  const potsWithAllocation = [...(savings.pots || [])].map((pot) => {
    const intent = Number(pot.saved) || 0;
    const actualAllocated = Math.min(intent, rollingAvailable);
    rollingAvailable -= actualAllocated;
    return { ...pot, allocated: actualAllocated, intent };
  });

  const updatePot = (id, patch) => setSavings(s => ({ ...s, pots: s.pots.map(p => p.id === id ? { ...p, ...patch } : p) }));
  const removePot = (id) => setSavings(s => ({ ...s, pots: s.pots.filter(p => p.id !== id) }));
  const handleAssign = (potId, amount) => setSavings(prev => ({ ...prev, pots: (prev.pots || []).map(p => p.id === potId ? { ...p, saved: Math.max(0, (Number(p.saved) || 0) + amount) } : p) }));
  const movePot = (index, direction) => setSavings(prev => {
    const newPots = [...(prev.pots || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newPots.length) return prev;
    [newPots[index], newPots[targetIndex]] = [newPots[targetIndex], newPots[index]];
    return { ...prev, pots: newPots };
  });

  const inputStyle = { padding: "6px 8px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 11 };
  const stepperStyle = (disabled) => ({ width: 28, height: 28, borderRadius: 9, background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: disabled ? "var(--muted)" : "var(--text)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1 });

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, color: "var(--text)", margin: "0 0 16px" }}>Sparen</h1>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "9px 14px", marginBottom: 14, border: "1px solid var(--border)", borderRadius: 11, background: "var(--card)", fontSize: 11, color: "var(--text)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: "var(--muted)" }}>Startsaldo (1 Jan):</span>
          <span style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(jan1Balance)}</span>
          <span style={{ color: "var(--border)" }}>|</span>
          <span style={{ color: "var(--muted)" }}>Gespaard dit jaar:</span>
          <span style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(totalSavedThisYear)}</span>
          <span style={{ color: "var(--border)" }}>|</span>
          <span style={{ color: "var(--muted)" }}>Actueel saldo:</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, color: "var(--green)" }}>{fmt(liveTotal)}</span>
        </div>
        <button onClick={() => setShowSetup(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 10, flexShrink: 0 }}><Settings size={11} />Saldo instellen</button>
      </div>

      {showSetup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 16, padding: 20, maxWidth: 320, width: "90%", border: "1px solid var(--border)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 400, fontFamily: "var(--font-display)", color: "var(--text)" }}>Saldo instellen</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, marginBottom: 4, color: "var(--muted)" }}>Bekend saldo</label>
              <NumberInput value={savings.knownBalance} onChange={v => setSavings(s => ({ ...s, knownBalance: v }))} placeholder="0" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, marginBottom: 4, color: "var(--muted)" }}>Datum van bekend saldo</label>
              <input type="date" value={knownDate} onChange={e => setSavings(s => ({ ...s, knownDate: e.target.value || "" }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
            </div>
            <button onClick={() => setShowSetup(false)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}><Check size={12} />Opslaan</button>
          </div>
        </div>
      )}

      {/* Hero: te verdelen */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", background: "var(--card)", border: "1px solid var(--accent)", borderRadius: 13, padding: "14px 18px", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Te verdelen</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--green)" }}>{fmt(unassignedSavings || 0)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {Array.from({ length: Math.min(blocksAvailable, 10) }).map((_, i) => <div key={i} style={{ width: 10, height: 10, background: "var(--accent)", borderRadius: 3 }} />)}
          {blocksAvailable > 10 && <span style={{ fontSize: 10.5, color: "var(--muted)", marginLeft: 4 }}>+{blocksAvailable - 10}</span>}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>{blocksAvailable}× €250 · restant €{remainder}</div>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => setIsAssignMode(!isAssignMode)}
            disabled={!isAssignMode && unassignedSavings < 250}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: "none", background: isAssignMode ? "transparent" : "var(--accent)", color: isAssignMode ? "var(--muted)" : "#0E1016", cursor: (!isAssignMode && unassignedSavings < 250) ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, opacity: (!isAssignMode && unassignedSavings < 250) ? 0.5 : 1, ...(isAssignMode ? { border: "1px solid var(--border)" } : {}) }}
          >
            {isAssignMode ? <><Check size={13} />Klaar met verdelen</> : "Verdeel geld"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {/* Spaarbuffer — full-width row */}
        <div style={{ gridColumn: "1 / -1", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "0 0 170px" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Spaarbuffer</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{fmt(bufferAllocated).replace("€", "")} / {fmt(bufferTarget).replace("€", "")} · {settings?.bufferMultiplier || 5}× gem. vaste lasten</div>
          </div>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#20242F", overflow: "hidden", minWidth: 100 }}>
            <div style={{ width: `${bufferTarget > 0 ? Math.min((bufferAllocated / bufferTarget) * 100, 100) : 0}%`, height: "100%", borderRadius: 4, background: "var(--accent)", transition: "width 0.4s" }} />
          </div>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: "var(--muted)", flexShrink: 0 }}>{Math.round((bufferAllocated / bufferTarget) * 100 || 0)}%</div>
        </div>

        {potsWithAllocation.map((pot, index) => {
          const target = pot.target || 0;
          const pct = target > 0 ? Math.min((pot.allocated / target) * 100, 100) : 0;
          const color = POT_COLORS[index % POT_COLORS.length];
          const isEditing = editingPotId === pot.id;

          if (isEditing) {
            return (
              <div key={pot.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <input type="text" value={pot.name} onChange={e => updatePot(pot.id, { name: e.target.value })} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} placeholder="Naam" />
                <NumberInput value={pot.target} onChange={v => updatePot(pot.id, { target: v })} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} placeholder="Doelbedrag" />
                <NumberInput value={pot.saved} onChange={v => updatePot(pot.id, { saved: v })} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} placeholder="Opgespaard" title="Manueel toegewezen bedrag" />
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={() => setEditingPotId(null)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 0", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}><Check size={11} />Klaar</button>
                  <button onClick={() => { if (!window.confirm("Weet je zeker dat je dit potje wilt verwijderen?")) return; removePot(pot.id); setEditingPotId(null); }} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--danger)", background: "transparent", color: "var(--danger)", cursor: "pointer", fontSize: 11 }}>Verwijderen</button>
                </div>
              </div>
            );
          }

          return (
            <div key={pot.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 9, position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{pot.name || "Potje"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  {index > 0 && <button onClick={() => movePot(index, -1)} style={{ ...stepperStyle(false), width: 22, height: 22, borderRadius: 6 }}><ChevronLeft size={12} /></button>}
                  {index < (savings.pots || []).length - 1 && <button onClick={() => movePot(index, 1)} style={{ ...stepperStyle(false), width: 22, height: 22, borderRadius: 6 }}><ChevronRight size={12} /></button>}
                  {!isAssignMode && <button onClick={() => setEditingPotId(pot.id)} title="Bewerken" style={{ ...stepperStyle(false), width: 22, height: 22, borderRadius: 6 }}><Settings size={11} /></button>}
                </div>
              </div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11.5, color: "var(--muted)" }}>{fmt(pot.allocated || 0).replace("€", "")} / {fmt(target).replace("€", "")} ({Math.round(pct)}%)</div>
              <div style={{ height: 8, borderRadius: 4, background: "#20242F", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: color, transition: "width 0.4s" }} />
              </div>
              {isAssignMode && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button onClick={() => handleAssign(pot.id, -250)} disabled={(pot.allocated || 0) < 250} style={stepperStyle((pot.allocated || 0) < 250)}><Minus size={13} /></button>
                  <button onClick={() => handleAssign(pot.id, 250)} disabled={unassignedSavings < 250} style={stepperStyle(unassignedSavings < 250)}><Plus size={13} /></button>
                </div>
              )}
            </div>
          );
        })}

        <div
          onClick={!isAdding ? () => { setIsAdding(true); setDraftPot({ name: "Nieuw Doel", target: 1000, saved: 0 }); } : undefined}
          style={{ border: "1px dashed var(--border)", borderRadius: 14, background: "transparent", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: isAdding ? "default" : "pointer", minHeight: 140, color: "var(--muted)" }}
        >
          {!isAdding ? (
            <>
              <Plus size={22} strokeWidth={1.5} />
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>Nieuw potje</div>
            </>
          ) : (
            <div style={{ width: "100%", padding: 16, display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }} onClick={e => e.stopPropagation()}>
              <input type="text" value={draftPot.name} onChange={e => setDraftPot(p => ({ ...p, name: e.target.value }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} placeholder="Naam" />
              <NumberInput value={draftPot.target} onChange={v => setDraftPot(p => ({ ...p, target: v }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} placeholder="Doelbedrag" />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setSavings(s => ({ ...s, pots: [...(s.pots || []), { id: Date.now().toString(), ...draftPot }] })); setIsAdding(false); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 0", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}><Check size={11} />Opslaan</button>
                <button onClick={() => setIsAdding(false)} style={{ display: "flex", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer" }}><X size={12} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
