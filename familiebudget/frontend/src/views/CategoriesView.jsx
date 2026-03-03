import { TYPE_ORDER } from '../utils/constants.js';

export default function CategoriesView({ cats, txs, setCats, setCatDetail }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => { const n = prompt("Naam:"); if (!n) return; const id = n.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 20) + "_" + Date.now().toString(36).slice(-3); setCats(p => [...p, { id, name: n, type: "uitgaven", color: "#6B7B8D", subs: [] }]); }} style={{ padding: "4px 9px", borderRadius: 5, border: "none", background: "#4A7C59", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>+ Categorie</button>
      </div>

      {TYPE_ORDER.map(type => {
        const typeCats = cats.filter(c => c.type === type);
        if (!typeCats.length) return null;
        const typeLabel = type === "uitgaven" ? "💸 Uitgaven" : type === "inkomsten" ? "💰 Inkomsten" : type === "transfers" ? "🔄 Transfers" : "📦 Overige";
        return (
          <div key={type} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{typeLabel}</div>
            <div style={{ display: "grid", gap: 6 }}>
              {typeCats.map((cat, ci) => (
                <div key={cat.id} style={{ background: "var(--card)", borderRadius: 7, padding: 10, borderLeft: `4px solid ${cat.color}`, border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <input type="color" value={cat.color} onChange={e => setCats(p => p.map(c => c.id === cat.id ? { ...c, color: e.target.value } : c))} style={{ width: 16, height: 16, border: "none", cursor: "pointer", background: "transparent" }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{cat.name}</span>
                      <span style={{ fontSize: 8, opacity: 0.3 }}>{cat.subs.length} · {txs.filter(t => t.categoryId === cat.id).length}tx</span>
                    </div>
                    <div style={{ display: "flex", gap: 2 }}>
                      {ci > 0 && <button onClick={() => setCats(p => { const a = [...p]; const idx = a.findIndex(c => c.id === cat.id); if (idx > 0) { [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; } return a; })} style={{ padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 9 }}>↑</button>}
                      {ci < typeCats.length - 1 && <button onClick={() => setCats(p => { const a = [...p]; const idx = a.findIndex(c => c.id === cat.id); if (idx < a.length - 1) { [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; } return a; })} style={{ padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 9 }}>↓</button>}
                      <button onClick={() => { const n = prompt("Naam subcategorie:"); if (!n || !n.trim()) return; const id = n.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 20) + "_" + Date.now().toString(36).slice(-3); const catId = cat.id; setCats(p => p.map(c => c.id === catId ? { ...c, subs: [...(c.subs || []), { id, name: n.trim(), label: "variabel", type: "variabel", necessity: "nodig", excluded: false }] } : c)); }} style={{ padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 9 }}>+ Sub</button>
                      <button onClick={() => setCatDetail(cat.id)} style={{ padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 9 }}>📊</button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 2, marginLeft: 21 }}>
                    {cat.subs.map(sub => {
                      const txCount = txs.filter(t => t.subCategoryId === sub.id).length;
                      const upd = (field, val) => setCats(p => p.map(c => c.id === cat.id ? { ...c, subs: c.subs.map(s => s.id === sub.id ? { ...s, [field]: val, label: field === "necessity" ? (val === "luxe" ? "luxe" : (s.type || "variabel")) : (field === "type" ? (s.necessity === "luxe" ? "luxe" : val) : s.label) } : s) } : c));
                      return (
                        <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 6px", borderRadius: 4, background: cat.color + "08", border: `1px solid ${cat.color}15` }}>
                          <span style={{ fontSize: 10, flex: 1 }}>{sub.name}</span>
                          <select value={sub.type || "variabel"} onChange={e => upd("type", e.target.value)} style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer" }} title="Type">
                            <option value="vast">Vast</option>
                            <option value="variabel">Variabel</option>
                          </select>
                          <select value={sub.necessity || "nodig"} onChange={e => upd("necessity", e.target.value)} style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer" }} title="Noodzaak">
                            <option value="nodig">Nodig</option>
                            <option value="luxe">Luxe</option>
                          </select>
                          <span style={{ fontSize: 8, opacity: 0.3, fontFamily: "'DM Mono',monospace" }}>{txCount}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
