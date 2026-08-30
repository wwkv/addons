export default function CatGrid({ cats, catUsage, tx, handleSelect }) {
  const visibleCats = cats
    .filter(c => c.id !== "nog_te_verwerken" && !c.archived)
    .map(c => ({ ...c, subs: c.subs.filter(s => !s.archived) }))
    .filter(c => c.subs.length > 0);
  const nonExp = visibleCats.filter(c => ["inkomsten", "transfers", "overige"].includes(c.type));
  const expCats = visibleCats.filter(c => c.type === "uitgaven");
  const weight = (c) => c.subs.length + 1;
  const col1 = [...nonExp], col2 = [], col3 = [];
  let total1 = col1.reduce((s, c) => s + weight(c), 0), total2 = 0, total3 = 0;
  for (const c of expCats) {
    const w = weight(c);
    if (total1 <= total2 && total1 <= total3) { col1.push(c); total1 += w; }
    else if (total2 <= total3) { col2.push(c); total2 += w; }
    else { col3.push(c); total3 += w; }
  }
  const sortSubs = (c) => [...c.subs].sort((a, b) => ((catUsage || {})[b.id] || 0) - ((catUsage || {})[a.id] || 0));
  const renderCat = (c) => (
    <div key={c.id} style={{ background: c.color + "12", borderRadius: 9, padding: "6px 8px", border: `1px solid ${c.color}30` }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: c.color, textTransform: "uppercase", marginBottom: 4 }}>{c.name}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{sortSubs(c).map(s => <button key={s.id} onClick={(e) => handleSelect(c.id, s.id, e)} style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${c.color}40`, background: tx.subCategoryId === s.id ? c.color + "40" : "transparent", color: "var(--text)", cursor: "pointer", fontSize: 10 }} onMouseEnter={e => e.target.style.background = c.color + "30"} onMouseLeave={e => e.target.style.background = tx.subCategoryId === s.id ? c.color + "40" : "transparent"}>{s.name}</button>)}</div>
    </div>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{col1.map(renderCat)}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{col2.map(renderCat)}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{col3.map(renderCat)}</div>
    </div>
  );
}

