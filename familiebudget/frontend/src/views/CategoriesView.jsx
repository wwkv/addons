import { Plus, PieChart, Pencil, Archive, ArchiveRestore, Trash2, ChevronUp, ChevronDown, Receipt, Wallet, ArrowLeftRight, Package } from "lucide-react";
import { TYPE_ORDER } from '../utils/constants.js';
import { useTextPrompt } from '../components/TextPrompt.jsx';

const TYPE_META = {
  uitgaven: { label: "Uitgaven", icon: Receipt },
  inkomsten: { label: "Inkomsten", icon: Wallet },
  transfers: { label: "Transfers", icon: ArrowLeftRight },
  overige: { label: "Overige", icon: Package },
};

const iconBtn = { padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", display: "inline-flex", alignItems: "center" };
const dangerBtn = { ...iconBtn, border: "1px solid var(--danger)", color: "var(--danger)" };

export default function CategoriesView({ cats, txs, setCats, setTxs, setCatDetail }) {
  /* window.prompt() does not exist in Electron, so every one of these was a
     dead button in the desktop app — silently, with no error. */
  const { ask, promptEl } = useTextPrompt();

  const renameCat = async (cat) => {
    const n = await ask({ title: "Categorie hernoemen", label: "Naam", defaultValue: cat.name });
    if (!n) return;
    setCats(p => p.map(c => c.id === cat.id ? { ...c, name: n.trim() } : c));
  };

  const archiveCat = (cat) => {
    setCats(p => p.map(c => c.id === cat.id ? { ...c, archived: !c.archived } : c));
  };

  const deleteCat = (cat) => {
    const txCount = txs.filter(t => t.categoryId === cat.id).length;
    const msg = txCount > 0
      ? `Categorie "${cat.name}" verwijderen? ${txCount} transactie(s) worden ongecategoriseerd.`
      : `Categorie "${cat.name}" verwijderen?`;
    if (!window.confirm(msg)) return;
    setTxs(p => p.map(t => t.categoryId === cat.id ? { ...t, categoryId: null, subCategoryId: null, splits: null } : t));
    setCats(p => p.filter(c => c.id !== cat.id));
  };

  const renameSub = async (cat, sub) => {
    const n = await ask({ title: "Subcategorie hernoemen", label: "Naam", defaultValue: sub.name });
    if (!n) return;
    setCats(p => p.map(c => c.id === cat.id ? { ...c, subs: c.subs.map(s => s.id === sub.id ? { ...s, name: n.trim() } : s) } : c));
  };

  const archiveSub = (cat, sub) => {
    setCats(p => p.map(c => c.id === cat.id ? { ...c, subs: c.subs.map(s => s.id === sub.id ? { ...s, archived: !s.archived } : s) } : c));
  };

  const deleteSub = (cat, sub) => {
    const txCount = txs.filter(t => t.subCategoryId === sub.id).length;
    const msg = txCount > 0
      ? `Subcategorie "${sub.name}" verwijderen? ${txCount} transactie(s) worden ongecategoriseerd.`
      : `Subcategorie "${sub.name}" verwijderen?`;
    if (!window.confirm(msg)) return;
    setTxs(p => p.map(t => t.subCategoryId === sub.id ? { ...t, categoryId: null, subCategoryId: null, splits: null } : t));
    setCats(p => p.map(c => c.id === cat.id ? { ...c, subs: c.subs.filter(s => s.id !== sub.id) } : c));
  };

  return (
    <div>
      {promptEl}
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, color: "var(--text)", margin: "0 0 16px" }}>Categorieën</h1>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 14 }}>
        <button onClick={async () => { const n = await ask({ title: "Nieuwe categorie", label: "Naam", placeholder: "bv. Huisdieren" }); if (!n) return; const id = n.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 20) + "_" + Date.now().toString(36).slice(-3); setCats(p => [...p, { id, name: n, type: "uitgaven", color: "#6B7B8D", subs: [] }]); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}><Plus size={12} />Nieuwe categorie</button>
      </div>

      {TYPE_ORDER.map(type => {
        const typeCats = cats.filter(c => c.type === type);
        if (!typeCats.length) return null;
        const meta = TYPE_META[type] || TYPE_META.overige;
        const TypeIcon = meta.icon;
        return (
          <div key={type} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 7 }}><TypeIcon size={12} />{meta.label}</div>
            <div style={{ display: "grid", gap: 7 }}>
              {typeCats.map((cat, ci) => {
                const isSystemCat = cat.id === "nog_te_verwerken";
                return (
                <div key={cat.id} style={{ background: "var(--card)", borderRadius: 11, padding: "10px 12px", borderLeft: `3px solid ${cat.color}`, border: "1px solid var(--border)", opacity: cat.archived ? 0.5 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="color" value={cat.color} onChange={e => setCats(p => p.map(c => c.id === cat.id ? { ...c, color: e.target.value } : c))} style={{ width: 16, height: 16, border: "none", cursor: "pointer", background: "transparent" }} />
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{cat.name}</span>
                      {cat.archived && <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 4, background: "var(--border)", color: "var(--muted)" }}>Gearchiveerd</span>}
                      <span style={{ fontSize: 9, opacity: 0.4 }}>{cat.subs.length} · {txs.filter(t => t.categoryId === cat.id).length}tx</span>
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {ci > 0 && <button onClick={() => setCats(p => { const a = [...p]; const idx = a.findIndex(c => c.id === cat.id); if (idx > 0) { [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; } return a; })} style={iconBtn} title="Omhoog"><ChevronUp size={11} /></button>}
                      {ci < typeCats.length - 1 && <button onClick={() => setCats(p => { const a = [...p]; const idx = a.findIndex(c => c.id === cat.id); if (idx < a.length - 1) { [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; } return a; })} style={iconBtn} title="Omlaag"><ChevronDown size={11} /></button>}
                      <button onClick={async () => { const n = await ask({ title: "Nieuwe subcategorie", label: "Naam", placeholder: "bv. Dierenarts" }); if (!n) return; const id = n.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 20) + "_" + Date.now().toString(36).slice(-3); const catId = cat.id; setCats(p => p.map(c => c.id === catId ? { ...c, subs: [...(c.subs || []), { id, name: n.trim(), label: "variabel", type: "variabel", necessity: "nodig", excluded: c.type === "transfers" }] } : c)); }} style={{ ...iconBtn, gap: 3, fontSize: 9, fontWeight: 600 }} title="Subcategorie toevoegen"><Plus size={10} />Sub</button>
                      <button onClick={() => setCatDetail(cat.id)} style={iconBtn} title="Details"><PieChart size={11} /></button>
                      {!isSystemCat && <>
                        <button onClick={() => renameCat(cat)} title="Hernoemen" style={iconBtn}><Pencil size={11} /></button>
                        <button onClick={() => archiveCat(cat)} title={cat.archived ? "Herstellen" : "Archiveren"} style={iconBtn}>{cat.archived ? <ArchiveRestore size={11} /> : <Archive size={11} />}</button>
                        <button onClick={() => deleteCat(cat)} title="Verwijderen" style={dangerBtn}><Trash2 size={11} /></button>
                      </>}
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 3, marginLeft: 22 }}>
                    {cat.subs.map(sub => {
                      const txCount = txs.filter(t => t.subCategoryId === sub.id).length;
                      const upd = (field, val) => setCats(p => p.map(c => c.id === cat.id ? { ...c, subs: c.subs.map(s => s.id === sub.id ? { ...s, [field]: val, label: field === "necessity" ? (val === "luxe" ? "luxe" : (s.type || "variabel")) : (field === "type" ? (s.necessity === "luxe" ? "luxe" : val) : s.label) } : s) } : c));
                      return (
                        <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", borderRadius: 7, background: cat.color + "08", border: `1px solid ${cat.color}15`, opacity: sub.archived ? 0.5 : 1 }}>
                          <span style={{ fontSize: 10.5, flex: 1 }}>{sub.name}</span>
                          {sub.archived && <span style={{ fontSize: 7, padding: "1px 4px", borderRadius: 3, background: "var(--border)", color: "var(--muted)" }}>Gearchiveerd</span>}
                          <select value={sub.type || "variabel"} onChange={e => upd("type", e.target.value)} style={{ fontSize: 8, padding: "1px 4px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer" }} title="Type">
                            <option value="vast">Vast</option>
                            <option value="variabel">Variabel</option>
                          </select>
                          <select value={sub.necessity || "nodig"} onChange={e => upd("necessity", e.target.value)} style={{ fontSize: 8, padding: "1px 4px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer" }} title="Noodzaak">
                            <option value="nodig">Nodig</option>
                            <option value="luxe">Luxe</option>
                          </select>
                          <span style={{ fontSize: 8, opacity: 0.4, fontFamily: "'DM Mono',monospace" }}>{txCount}</span>
                          {!isSystemCat && <>
                            <button onClick={() => renameSub(cat, sub)} title="Hernoemen" style={{ ...iconBtn, padding: "2px 5px" }}><Pencil size={9} /></button>
                            <button onClick={() => archiveSub(cat, sub)} title={sub.archived ? "Herstellen" : "Archiveren"} style={{ ...iconBtn, padding: "2px 5px" }}>{sub.archived ? <ArchiveRestore size={9} /> : <Archive size={9} />}</button>
                            <button onClick={() => deleteSub(cat, sub)} title="Verwijderen" style={{ ...dangerBtn, padding: "2px 5px" }}><Trash2 size={9} /></button>
                          </>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );})}
            </div>
          </div>
        );
      })}
    </div>
  );
}
