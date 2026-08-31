import { useMemo, useEffect } from "react";
import { X } from "lucide-react";
import { fmt, fD, mN } from '../utils/formatters.js';
import { CALENDAR_MONTH_KEYS } from '../utils/constants.js';
import Pie from '../components/Pie.jsx';

export default function CatDetailModal({ catId, cats, catStats, totalExp, expanded, year, months, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  const cat = cats.find(c => c.id === catId);
  if (!cat) return null;
  const stat = catStats[cat.id];
  if (!stat) return null;
  const shades = ["CC", "AA", "88", "66", "44"];
  const subData = cat.subs.filter(s => stat.subs[s.id] > 0).map((s, idx) => ({ name: s.name, value: stat.subs[s.id], color: cat.color + shades[idx % shades.length] })).sort((a, b) => b.value - a.value);
  // Excluded subs are absent from `stat`, so listing their transactions here
  // made the table sum higher than the total and the pie above it.
  const excludedSubs = new Set((cat.subs || []).filter(s => s.excluded).map(s => s.id));
  let catTxs = expanded.filter(t => t.date.startsWith(year) && t.categoryId === cat.id && t.amount < 0 && !excludedSubs.has(t.subCategoryId));
  if (months.length) catTxs = catTxs.filter(t => months.includes(t.date.slice(5, 7)));
  catTxs.sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--card)", borderRadius: 16, padding: 20, maxWidth: 600, width: "95%", maxHeight: "85vh", overflow: "auto", border: "1px solid var(--border)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 400, fontFamily: "var(--font-display)", color: cat.color }}>{cat.name}</h3>
          <button onClick={onClose} style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--muted)", cursor: "pointer" }}><X size={14} /></button>
        </div>
        <Pie data={subData} size={170} legendTotal={totalExp} />
        <div style={{ marginTop: 14, maxHeight: 250, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "4px 5px", textAlign: "left", fontSize: 9, color: "var(--text)", opacity: 0.5 }}>Datum</th>
              <th style={{ padding: "4px 5px", textAlign: "right", fontSize: 9, color: "var(--text)", opacity: 0.5 }}>Bedrag</th>
              <th style={{ padding: "4px 5px", textAlign: "left", fontSize: 9, color: "var(--text)", opacity: 0.5 }}>Tegenpartij</th>
              <th style={{ padding: "4px 5px", textAlign: "left", fontSize: 9, color: "var(--text)", opacity: 0.5 }}>Sub</th>
            </tr></thead>
            <tbody>{catTxs.slice(0, 50).map((tx, i) => {
              const sub = cat.subs.find(s => s.id === tx.subCategoryId);
              return (<tr key={i} style={{ borderBottom: "1px solid var(--bg)" }}>
                <td style={{ padding: "3px 5px", fontFamily: "'DM Mono',monospace", fontSize: 9, color: "var(--text)" }}>{fD(tx.date)}</td>
                <td style={{ padding: "3px 5px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 9, color: "var(--red)" }}>{fmt(tx.amount)}</td>
                <td style={{ padding: "3px 5px", color: "var(--text)" }}>{tx.counterparty}</td>
                <td style={{ padding: "3px 5px", fontSize: 9, opacity: 0.5, color: "var(--text)" }}>{sub ? sub.name : ""}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
