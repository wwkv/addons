import { useState } from "react";
import { fmt } from '../utils/formatters.js';
import { resolveCatSub } from '../utils/helpers.js';
import CatPicker from '../components/CatPicker.jsx';

export default function SplitModal({ tx, cats, onSave, onClose}) {
  const [splits, setSplits] = useState([
    { categoryId: tx.categoryId, subCategoryId: tx.subCategoryId, percentage: 50 },
    { categoryId: null, subCategoryId: null, percentage: 50 },
  ]);
  const total = Math.abs(tx.amount);
  const neg = tx.amount < 0;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--card)", borderRadius: 12, padding: 24, maxWidth: 540, width: "90%", border: "1px solid var(--border)" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "var(--text)" }}>✂️ Transactie Splitsen</h3>
        <p style={{ margin: "0 0 14px", fontSize: 12, opacity: 0.5, color: "var(--text)" }}>{tx.counterparty} · {fD(tx.date)} · {fmt(tx.amount)}</p>
        <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 30, marginBottom: 14 }}>
          {splits.map((s, i) => {
            const cat = cats.find(x => x.id === s.categoryId);
            const amt = neg ? -(total * s.percentage / 100) : total * s.percentage / 100;
            return <div key={i} style={{ width: `${s.percentage}%`, background: cat ? cat.color : "#555", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff", transition: "width 0.2s", borderRight: i < splits.length - 1 ? "2px solid var(--bg)" : "none" }}>{fmt(amt)}</div>;
          })}
        </div>
        {splits.length === 2 && (
          <div style={{ marginBottom: 14, padding: "0 4px" }}>
            <input type="range" min={5} max={95} value={splits[0].percentage} onChange={e => { const v = parseInt(e.target.value); setSplits([{ ...splits[0], percentage: v }, { ...splits[1], percentage: 100 - v }]); }} style={{ width: "100%", accentColor: "#C4956A" }} />
          </div>
        )}
        <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
          {splits.map((s, i) => {
            const cat = cats.find(x => x.id === s.categoryId);
            return (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", padding: "6px 8px", background: "var(--bg-80)", borderRadius: 6, borderLeft: `3px solid ${cat ? cat.color : "#555"}` }}>
                <span style={{ fontSize: 10, opacity: 0.5, color: "var(--text)", minWidth: 28 }}>{s.percentage}%</span>
                <select value={s.categoryId ? `${s.categoryId}|${s.subCategoryId}` : ""} onChange={e => { const [ci, si] = e.target.value.split("|"); const n = [...splits]; n[i] = { ...n[i], categoryId: ci || null, subCategoryId: si || null }; setSplits(n); }} style={{ flex: 1, padding: "4px 6px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 11 }}>
                  <option value="">Kies categorie...</option>
                  {cats.map(cc => cc.subs.map(ss => <option key={`${cc.id}|${ss.id}`} value={`${cc.id}|${ss.id}`}>{cc.name} › {ss.name}</option>))}
                </select>
                {splits.length > 2 && <button onClick={() => { const n = splits.filter((_, j) => j !== i); n[0].percentage += s.percentage; setSplits(n); }} style={{ background: "none", border: "none", color: "#C06E52", cursor: "pointer", fontSize: 13 }}>✕</button>}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <button onClick={() => { if (splits.length >= 4) return; const eq = Math.floor(100 / (splits.length + 1)); const n = splits.map(s => ({ ...s, percentage: eq })); n.push({ categoryId: null, subCategoryId: null, percentage: 100 - eq * splits.length }); setSplits(n); }} disabled={splits.length >= 4} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: splits.length >= 4 ? "var(--muted)" : "var(--text)", cursor: splits.length >= 4 ? "default" : "pointer", fontSize: 11 }}>+ Deel</button>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 12 }}>Annuleer</button>
            <button onClick={() => { const tp = splits.reduce((a, x) => a + x.percentage, 0); onSave(splits.map(s => ({ ...s, percentage: Math.round(s.percentage / tp * 100) }))); }} disabled={splits.some(s => !s.categoryId)} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: splits.some(s => !s.categoryId) ? "#444" : "#4A7C59", color: "#fff", cursor: splits.some(s => !s.categoryId) ? "default" : "pointer", fontSize: 12, fontWeight: 600 }}>✓ Opslaan</button>
          </div>
        </div>
      </div>
    </div>
  );
}
