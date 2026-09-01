import { useState, useMemo } from "react";
import { Check, X, RefreshCw } from "lucide-react";
import { fmt, fD } from '../utils/formatters.js';

/*
 * Review-before-write for "Heranalyseer alles" (Settings › Regels). Nothing
 * from computeCandidates() is written until the user hits Toepassen, and
 * even then only the checked rows — every row shows WHY it matched, so this
 * is the answer to "is the lexicon applied in silence": no, this screen is
 * the approval step.
 */
export default function ReanalyzePreview({ items, cats, onApply, onClose }) {
  const [checked, setChecked] = useState(() => new Set(items.map(i => i.id)));

  const rows = useMemo(() => {
    return items.map(it => {
      const cat = cats.find(c => c.id === it.categoryId);
      const sub = cat ? cat.subs.find(s => s.id === it.subCategoryId) : null;
      return { ...it, catName: cat ? cat.name : it.categoryId, subName: sub ? sub.name : it.subCategoryId, catColor: cat ? cat.color : "var(--neutral)" };
    }).sort((a, b) => (a.catName + a.subName).localeCompare(b.catName + b.subName));
  }, [items, cats]);

  const toggle = (id) => setChecked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allChecked = checked.size === rows.length;
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(rows.map(r => r.id)));

  const CONF_LABEL = { learned: "Patroon", certain: "Zeker", high: "Waarschijnlijk", medium: "Mogelijk" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, padding: 20, maxWidth: 860, width: "95%", maxHeight: "88vh", overflow: "hidden", border: "1px solid var(--border)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 400, fontFamily: "var(--font-display)", color: "var(--text)", flexShrink: 0 }}>Voorgestelde categorieën</h2>
        <p style={{ margin: "0 0 12px", fontSize: 11, opacity: 0.6, color: "var(--text)", flexShrink: 0 }}>
          {rows.length} transacties — controleer en vink uit wat niet klopt. Er wordt niets opgeslagen tot je op Toepassen klikt.
        </p>

        <div style={{ flex: 1, overflow: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, zIndex: 1, background: "var(--card)" }}>
                <th style={{ padding: "6px 8px", width: 26 }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ accentColor: "var(--accent)", cursor: "pointer" }} />
                </th>
                <th style={{ padding: "6px 5px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", borderBottom: "2px solid var(--border)" }}>Datum</th>
                <th style={{ padding: "6px 5px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", borderBottom: "2px solid var(--border)" }}>Bedrag</th>
                <th style={{ padding: "6px 5px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", borderBottom: "2px solid var(--border)" }}>Tegenpartij</th>
                <th style={{ padding: "6px 5px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", borderBottom: "2px solid var(--border)" }}>Categorie</th>
                <th style={{ padding: "6px 5px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", borderBottom: "2px solid var(--border)" }}>Waarom</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ opacity: checked.has(r.id) ? 1 : 0.4, borderBottom: "1px solid var(--bg)" }}>
                  <td style={{ padding: "5px 8px" }}>
                    <input type="checkbox" checked={checked.has(r.id)} onChange={() => toggle(r.id)} style={{ accentColor: "var(--accent)", cursor: "pointer" }} />
                  </td>
                  <td style={{ padding: "5px", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", color: "var(--text)" }}>{fD(r.tx.date)}</td>
                  <td style={{ padding: "5px", fontFamily: "var(--font-mono)", textAlign: "right", whiteSpace: "nowrap", color: r.tx.amount < 0 ? "var(--red)" : "var(--green)" }}>{fmt(r.tx.amount)}</td>
                  <td style={{ padding: "5px", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }} title={r.tx.counterparty}>{r.tx.counterparty}</td>
                  <td style={{ padding: "5px", whiteSpace: "nowrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 999, background: r.catColor + "20", border: `1px solid ${r.catColor}40`, color: "var(--text)", fontSize: 9.5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: r.catColor, flexShrink: 0 }} />
                      {r.catName} › {r.subName}
                    </span>
                  </td>
                  <td style={{ padding: "5px", color: "var(--muted)", fontSize: 9.5 }}>
                    {r.reason || CONF_LABEL[r.confidence] || ""}
                    {CONF_LABEL[r.confidence] && r.reason && <span style={{ opacity: 0.6 }}> · {CONF_LABEL[r.confidence]}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{checked.size} van {rows.length} geselecteerd</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}><X size={13} />Annuleer</button>
            <button
              onClick={() => onApply(rows.filter(r => checked.has(r.id)))}
              disabled={checked.size === 0}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", cursor: checked.size === 0 ? "default" : "pointer", fontSize: 12, fontWeight: 600, opacity: checked.size === 0 ? 0.5 : 1 }}
            ><Check size={13} />Toepassen ({checked.size})</button>
          </div>
        </div>
      </div>
    </div>
  );
}
