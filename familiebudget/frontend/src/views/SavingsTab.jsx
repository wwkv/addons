import { useState, useMemo } from "react";
import { fmt, fD } from '../utils/formatters.js';
import { isSubExcluded } from '../utils/helpers.js';

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
  const { bufferTarget, avgMonthlyNodig } = (() => {
    const data = expanded ?? txs;
    const yearExpenses = data.filter(t =>
      t.date.startsWith(year.toString()) &&
      Number(t.amount) < 0
    );
    const nodigTxs = yearExpenses.filter(t => {
      const cat = cats.find(c => c.id === t.categoryId);
      const sub = cat ? cat.subs.find(ss => ss.id === t.subCategoryId) : null;
      if (!cat || !sub || sub.excluded || cat.id === "sparen") return false;
      const necessity = sub.necessity || "nodig";
      return necessity !== "luxe";
    });
    const uniqueMonths = new Set(nodigTxs.map(t => t.date.substring(0, 7)));
    const totalNodigSpend = Math.abs(
      nodigTxs.reduce((sum, t) => sum + Number(t.amount), 0)
    );
    const activeMonthsCount = uniqueMonths.size > 0 ? uniqueMonths.size : 1;
    const avgMonthlyNodigVal = totalNodigSpend / activeMonthsCount;
    const mult = settings?.bufferMultiplier || 5;
    const rawBuffer = avgMonthlyNodigVal * mult;
    const bufferTargetVal = Math.ceil(rawBuffer / 500) * 500;
    return { bufferTarget: bufferTargetVal, avgMonthlyNodig: avgMonthlyNodigVal };
  })();

  const savingsWindowTxs = knownDate
    ? txs.filter(tx => tx.categoryId === "sparen" && tx.date >= startOfYear && tx.date <= knownDate)
    : [];
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

  const updatePot = (id, patch) => {
    setSavings(s => ({
      ...s,
      pots: s.pots.map(p => p.id === id ? { ...p, ...patch } : p),
    }));
  };
  const removePot = (id) => {
    setSavings(s => ({ ...s, pots: s.pots.filter(p => p.id !== id) }));
  };
  const handleAssign = (potId, amount) => {
    setSavings(prev => ({
      ...prev,
      pots: (prev.pots || []).map(p => {
        if (p.id !== potId) return p;
        const currentSaved = Number(p.saved) || 0;
        const newSaved = Math.max(0, currentSaved + amount);
        return { ...p, saved: newSaved };
      })
    }));
  };
  const movePot = (index, direction) => {
    setSavings(prev => {
      const newPots = [...(prev.pots || [])];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newPots.length) return prev;
      [newPots[index], newPots[targetIndex]] = [newPots[targetIndex], newPots[index]];
      return { ...prev, pots: newPots };
    });
  };
  const inputStyle = { padding: "6px 8px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 11 };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", marginBottom: 16, border: "1px solid var(--border)", borderRadius: 6, background: "var(--card-40)", fontSize: 11, color: "var(--text)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "var(--muted)" }}>Startsaldo (1 Jan):</span>
          <span style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(jan1Balance)}</span>
          <span style={{ color: "var(--muted)" }}>|</span>
          <span style={{ color: "var(--muted)" }}>Gespaard dit jaar:</span>
          <span style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(totalSavedThisYear)}</span>
          <span style={{ color: "var(--muted)" }}>|</span>
          <span style={{ color: "var(--muted)" }}>Actueel Saldo:</span>
          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, color: "var(--green)" }}>{fmt(liveTotal)}</span>
        </div>
        <button onClick={() => setShowSetup(true)} style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 10, flexShrink: 0 }}>⚙️ Saldo Instellen</button>
      </div>
      {showSetup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 18, maxWidth: 320, width: "90%", border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Saldo instellen</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, marginBottom: 4, color: "var(--muted)" }}>Bekend saldo</label>
              <input type="number" value={savings.knownBalance || 0} onChange={e => setSavings(s => ({ ...s, knownBalance: Number(e.target.value) || 0 }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, marginBottom: 4, color: "var(--muted)" }}>Datum van bekend saldo</label>
              <input type="date" value={knownDate} onChange={e => setSavings(s => ({ ...s, knownDate: e.target.value || "" }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
            </div>
            <button onClick={() => setShowSetup(false)} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#4A7C59", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Opslaan</button>
          </div>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255, 255, 255, 0.05)", padding: "16px 24px", borderRadius: "12px", marginBottom: "24px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 18, color: "var(--text)", marginBottom: 4 }}>Te verdelen: €{(unassignedSavings || 0).toLocaleString("nl-NL")}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Beschikbare blokken: {blocksAvailable}× €250 | Restant (blijft staan): €{remainder}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {Array.from({ length: Math.min(blocksAvailable, 10) }).map((_, i) => (
            <div key={i} style={{ width: 16, height: 16, background: "#4ade80", borderRadius: 4 }} />
          ))}
          {blocksAvailable > 10 && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 4 }}>+{blocksAvailable - 10}</span>}
        </div>
        <button
          onClick={() => setIsAssignMode(!isAssignMode)}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: isAssignMode ? "#4A7C59" : "rgba(0,0,0,0.3)",
            color: "#fff",
            cursor: unassignedSavings >= 250 || isAssignMode ? "pointer" : "not-allowed",
            fontSize: 12,
            fontWeight: 600,
            opacity: unassignedSavings >= 250 || isAssignMode ? 1 : 0.5
          }}
          disabled={!isAssignMode && unassignedSavings < 250}
        >
          {isAssignMode ? "Klaar met verdelen" : "Verdeel Geld"}
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "nowrap", gap: "20px", overflowX: "auto", paddingBottom: "24px", marginTop: "32px", WebkitOverflowScrolling: "touch" }}>
        {/* Permanent Spaarbuffer card */}
        <div style={{ background: "var(--card)", border: "2px solid #4ade80", boxShadow: "0 4px 20px rgba(74, 222, 128, 0.15)", borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: "272px", flexShrink: 0, overflow: "visible" }}>
          <h3 style={{ margin: "28px 0 16px 0", fontSize: 14, fontWeight: 600, color: "var(--text)", textAlign: "center" }}>Spaarbuffer</h3>
          <div style={{ width: "80px", height: "200px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "12px", overflow: "hidden", display: "flex", alignItems: "flex-end", margin: "20px 0" }}>
            <div style={{ width: "100%", height: `${bufferTarget > 0 ? Math.min((bufferAllocated / bufferTarget) * 100, 100) : 0}%`, background: "#4ade80", transition: "height 0.5s ease" }} />
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "16px" }}>
            €{bufferAllocated.toLocaleString("nl-NL")} ({Math.round((bufferAllocated / bufferTarget) * 100 || 0)}%)
          </div>
          <div style={{ width: "100%", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "8px" }}>
            <div style={{ fontWeight: "600", fontSize: "15px", marginBottom: "4px", color: "var(--text)" }}>€{bufferTarget.toLocaleString("nl-NL")}</div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>Gebaseerd op {settings?.bufferMultiplier || 5}× gem. vaste lasten</div>
          </div>
        </div>
        {potsWithAllocation.map((pot, index) => {
          const target = pot.target || 0;
          const pct = target > 0 ? Math.min((pot.allocated / target) * 100, 100) : 0;
          const isEditing = editingPotId === pot.id;

          if (isEditing) {
            return (
              <div key={pot.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", minWidth: "180px", flexShrink: 0 }}>
                <input type="text" value={pot.name} onChange={e => updatePot(pot.id, { name: e.target.value })} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", marginBottom: 12 }} placeholder="Naam" />
                <input type="number" value={pot.target ?? ""} onChange={e => updatePot(pot.id, { target: Number(e.target.value) || 0 })} style={{ ...inputStyle, width: "100%", marginBottom: 8 }} placeholder="Doelbedrag" />
                <input type="number" value={pot.saved ?? ""} onChange={e => updatePot(pot.id, { saved: Number(e.target.value) || 0 })} style={{ ...inputStyle, width: "100%", marginBottom: 12 }} placeholder="Opgespaard" title="Manueel toegewezen bedrag" />
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button onClick={() => setEditingPotId(null)} style={{ padding: "6px 14px", borderRadius: 5, border: "none", background: "#4A7C59", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Klaar</button>
                  <button onClick={() => { if (!window.confirm("Weet je zeker dat je dit potje wilt verwijderen?")) return; removePot(pot.id); setEditingPotId(null); }} style={{ padding: "6px 14px", borderRadius: 5, border: "1px solid #C06E52", background: "transparent", color: "#C06E52", cursor: "pointer", fontSize: 11 }}>Verwijderen</button>
                </div>
              </div>
            );
          }

          return (
            <div key={pot.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", minWidth: "180px", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "4px" }}>
                {index > 0 && (
                  <button onClick={() => movePot(index, -1)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", borderRadius: "4px", cursor: "pointer", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
                )}
                {index < (savings.pots || []).length - 1 && (
                  <button onClick={() => movePot(index, 1)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", borderRadius: "4px", cursor: "pointer", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
                )}
              </div>
              {!isAssignMode && <button onClick={() => setEditingPotId(pot.id)} style={{ position: "absolute", top: "12px", right: "12px", background: "transparent", border: "none", cursor: "pointer", fontSize: 14, color: "var(--muted)", padding: 4 }} title="Bewerken">⚙️</button>}
              <h3 style={{ margin: "28px 0 16px 0", fontSize: 14, fontWeight: 600, color: "var(--text)", textAlign: "center" }}>{pot.name || "Potje"}</h3>
              <div style={{ width: "80px", height: "200px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "12px", overflow: "hidden", display: "flex", alignItems: "flex-end", margin: "20px 0" }}>
                <div style={{ width: "100%", height: `${pct}%`, background: "#4ade80", transition: "height 0.5s ease" }} />
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "16px" }}>
                €{(pot.allocated || 0).toLocaleString("nl-NL")} ({Math.round(((pot.allocated || 0) / (pot.target || 1)) * 100)}%)
              </div>
              {isAssignMode && (
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: "16px", gap: "8px" }}>
                  <button
                    onClick={() => handleAssign(pot.id, -250)}
                    disabled={(pot.allocated || 0) < 250}
                    style={{ flex: 1, padding: "8px 0", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "6px", cursor: (pot.allocated || 0) < 250 ? "not-allowed" : "pointer", opacity: (pot.allocated || 0) < 250 ? 0.3 : 1 }}
                  >
                    - €250
                  </button>
                  <button
                    onClick={() => handleAssign(pot.id, 250)}
                    disabled={unassignedSavings < 250}
                    style={{ flex: 1, padding: "8px 0", background: "rgba(74, 222, 128, 0.1)", color: "#4ade80", border: "1px solid rgba(74, 222, 128, 0.2)", borderRadius: "6px", cursor: unassignedSavings < 250 ? "not-allowed" : "pointer", opacity: unassignedSavings < 250 ? 0.3 : 1 }}
                  >
                    + €250
                  </button>
                </div>
              )}
              <div style={{ width: "100%", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "8px", marginTop: isAssignMode ? "16px" : 0 }}>
                <div style={{ fontWeight: "600", fontSize: "15px", marginBottom: "4px", color: "var(--text)" }}>€{target.toLocaleString("nl-NL")}</div>
              </div>
            </div>
          );
        })}
        <div
          onClick={!isAdding ? () => { setIsAdding(true); setDraftPot({ name: "Nieuw Doel", target: 1000, saved: 0 }); } : undefined}
          style={{
            border: "2px dashed rgba(255, 255, 255, 0.2)",
            borderRadius: "8px",
            background: "transparent",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: isAdding ? "default" : "pointer",
            minHeight: "250px",
            minWidth: "180px",
            flexShrink: 0,
            color: "rgba(255, 255, 255, 0.5)",
            transition: "background 0.2s"
          }}
          onMouseEnter={!isAdding ? (e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)" : undefined}
          onMouseLeave={!isAdding ? (e) => e.currentTarget.style.background = "transparent" : undefined}
        >
          {!isAdding ? (
            <>
              <div style={{ fontSize: "48px", fontWeight: "300", marginBottom: "8px" }}>+</div>
              <div style={{ fontSize: "14px", fontWeight: "500" }}>Nieuw Potje</div>
            </>
          ) : (
            <div style={{ width: "100%", padding: 16, display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch" }} onClick={e => e.stopPropagation()}>
              <input type="text" value={draftPot.name} onChange={e => setDraftPot(p => ({ ...p, name: e.target.value }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} placeholder="Naam" />
              <input type="number" value={draftPot.target ?? ""} onChange={e => setDraftPot(p => ({ ...p, target: Number(e.target.value) || 0 }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} placeholder="Doelbedrag" />
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => { setSavings(s => ({ ...s, pots: [...(s.pots || []), { id: Date.now().toString(), ...draftPot }] })); setIsAdding(false); }} style={{ flex: 1, padding: "6px 12px", borderRadius: 5, border: "none", background: "#4A7C59", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Opslaan</button>
                <button onClick={() => setIsAdding(false)} style={{ flex: 1, padding: "6px 12px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 11 }}>Annuleren</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

