import { X } from "lucide-react";

export default function PatternsView({
  cats, rules, pending, settings, blacklist, patternSearch, pendingSort, rulesSort, filteredRulesEntries,
  patternSearchInputRef,
  setRules, setPending, setBlacklist, setToast, setPatternSearch, setPendingSort, setRulesSort,
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => { const p = prompt("Patroon (tekst):"); if (!p) return; const catId = prompt("Categorie ID:"); const subId = prompt("Sub ID:"); if (catId && subId) setRules(prev => ({ ...prev, [p.toLowerCase()]: { catId, subId } })); }} style={{ padding: "4px 9px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 10 }}>+ Handmatig</button>
          <button onClick={() => { if (confirm("Alle patronen wissen?")) setRules({}); }} style={{ padding: "4px 9px", borderRadius: 5, border: "1px solid #C06E52", background: "transparent", color: "#C06E52", cursor: "pointer", fontSize: 10 }}>Wis alles</button>
        </div>
      </div>

      <p style={{ fontSize: 11, opacity: 0.5, marginBottom: 12 }}>
        Patronen worden geleerd na {settings.patternThreshold || 3}× dezelfde categorie ({settings.personThreshold || 6}× voor personen). ⌘+klik of ⇧+klik forceert direct. (Totaal: {Object.keys(rules).length})
      </p>

      {/* Pending Patterns */}
      {Object.keys(pending).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 6 }}>⏳ In afwachting ({Object.keys(pending).length})</div>
          <div style={{ background: "var(--card)", borderRadius: 7, border: "1px solid var(--accent-30)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse" }}>
              <thead><tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th onClick={() => { if (pendingSort.field === "pattern") setPendingSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" })); else setPendingSort({ field: "pattern", dir: "asc" }); }} style={{ padding: "5px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)", cursor: "pointer", userSelect: "none" }}>Patroon {pendingSort.field === "pattern" ? (pendingSort.dir === "asc" ? "↑" : "↓") : ""}</th>
                <th onClick={() => { if (pendingSort.field === "category") setPendingSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" })); else setPendingSort({ field: "category", dir: "asc" }); }} style={{ padding: "5px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)", cursor: "pointer", userSelect: "none" }}>Categorie {pendingSort.field === "category" ? (pendingSort.dir === "asc" ? "↑" : "↓") : ""}</th>
                <th onClick={() => { if (pendingSort.field === "count") setPendingSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" })); else setPendingSort({ field: "count", dir: "desc" }); }} style={{ padding: "5px 8px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)", cursor: "pointer", userSelect: "none" }}>Voortgang {pendingSort.field === "count" ? (pendingSort.dir === "asc" ? "↑" : "↓") : ""}</th>
                <th style={{ padding: "5px 8px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)", width: 70 }}></th>
              </tr></thead>
              <tbody>{Object.entries(pending).sort((a, b) => {
                let c = 0;
                if (pendingSort.field === "pattern") c = a[0].localeCompare(b[0]);
                else if (pendingSort.field === "count") c = (a[1].count || 1) - (b[1].count || 1);
                else if (pendingSort.field === "category") {
                  const catA = cats.find(x => x.id === a[1].catId)?.name || "";
                  const catB = cats.find(x => x.id === b[1].catId)?.name || "";
                  c = catA.localeCompare(catB);
                }
                return pendingSort.dir === "asc" ? c : -c;
              }).map(([p, r]) => {
                const cat = cats.find(x => x.id === r.catId);
                const sub = cat ? cat.subs.find(x => x.id === r.subId) : null;
                const needed = r.person ? (settings.personThreshold || 6) : (settings.patternThreshold || 3);
                const count = r.count || 1;
                return (
                  <tr key={p} style={{ borderBottom: "1px solid var(--bg)" }}>
                    <td style={{ padding: "5px 8px", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>
                      "{p}" {r.person && <span style={{ fontSize: 8, opacity: 0.4 }}>👤</span>}
                    </td>
                    <td style={{ padding: "5px 8px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: cat ? cat.color : "#888", display: "inline-block" }} />
                        {cat ? cat.name.slice(0, 10) : "?"} › {sub ? sub.name : "?"}
                      </span>
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 50, height: 5, borderRadius: 3, background: "var(--bg)" }}>
                          <div style={{ width: `${(count / needed) * 100}%`, height: "100%", borderRadius: 3, background: "var(--accent)", transition: "width 0.3s" }} />
                        </div>
                        <span style={{ fontSize: 9, opacity: 0.5, fontFamily: "'DM Mono',monospace" }}>{count}/{needed}</span>
                      </div>
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "nowrap" }}>
                        <button onClick={() => { setRules(pr => ({ ...pr, [p]: { catId: r.catId, subId: r.subId } })); setPending(pr => { const n = { ...pr }; delete n[p]; return n; }); setToast(`🧠 Patroon bevestigd: "${p}"`); setTimeout(() => setToast(null), 2500); }} style={{ padding: "2px 6px", borderRadius: 3, border: "none", background: "#4A7C59", color: "#fff", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>✓</button>
                        <button onClick={() => setPending(pr => { const n = { ...pr }; delete n[p]; return n; })} style={{ padding: "2px 6px", borderRadius: 3, border: "none", background: "#C06E52", color: "#fff", cursor: "pointer", fontSize: 9, fontWeight: 600 }}>✕</button>
                        <button onClick={() => { if (!blacklist.includes(p)) setBlacklist(prev => [...prev, p]); setPending(pr => { const n = { ...pr }; delete n[p]; return n; }); setToast(`"${p}" geblokkeerd`); setTimeout(() => setToast(null), 2500); }} style={{ padding: "2px 6px", borderRadius: 3, border: "none", background: "#333", color: "#fff", cursor: "pointer", fontSize: 9, fontWeight: 600 }} title="Blokkeren">Blokkeer</button>
                      </div>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Patterns */}
      {Object.keys(rules).length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, opacity: 0.3 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧠</div>
          <p style={{ fontSize: 12 }}>Nog geen patronen. Categoriseer transacties om patronen aan te leren.</p>
        </div>
      ) : (
        <>
          <div style={{ position: "relative", marginBottom: 10, maxWidth: 320 }}>
            <input ref={patternSearchInputRef} placeholder="Zoek in patronen..." value={patternSearch} onChange={e => setPatternSearch(e.target.value)} style={{ padding: "6px 10px", paddingRight: patternSearch ? 28 : 10, borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 10, width: "100%", boxSizing: "border-box" }} />
            {patternSearch && (
              <button type="button" onClick={() => { setPatternSearch(""); patternSearchInputRef.current?.focus(); }} onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; }} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 2, cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Zoek wissen">
                <X size={14} strokeWidth={2} />
              </button>
            )}
          </div>
          <div style={{ background: "var(--card)", borderRadius: 7, border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 400, borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th onClick={() => { if (rulesSort.field === "pattern") setRulesSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" })); else setRulesSort({ field: "pattern", dir: "asc" }); }} style={{ padding: "6px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)", cursor: "pointer", userSelect: "none" }}>Patroon {rulesSort.field === "pattern" ? (rulesSort.dir === "asc" ? "↑" : "↓") : ""}</th>
              <th onClick={() => { if (rulesSort.field === "category") setRulesSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" })); else setRulesSort({ field: "category", dir: "asc" }); }} style={{ padding: "6px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)", cursor: "pointer", userSelect: "none" }}>Categorie {rulesSort.field === "category" ? (rulesSort.dir === "asc" ? "↑" : "↓") : ""}</th>
              <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)" }}>Subcategorie</th>
              <th style={{ padding: "6px 8px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)", width: 40 }}></th>
            </tr></thead>
            <tbody>{filteredRulesEntries.map(([p, r]) => {
              const cat = cats.find(x => x.id === r.catId);
              const sub = cat ? cat.subs.find(x => x.id === r.subId) : null;
              return (
                <tr key={p} style={{ borderBottom: "1px solid var(--bg)" }}>
                  <td style={{ padding: "5px 8px", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>"{p}"</td>
                  <td style={{ padding: "5px 8px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: cat ? cat.color : "#888", display: "inline-block" }} />
                      {cat ? cat.name : "?"}
                    </span>
                  </td>
                  <td style={{ padding: "5px 8px", fontSize: 10, opacity: 0.7 }}>{sub ? sub.name : "?"}</td>
                  <td style={{ padding: "5px 8px", textAlign: "center" }}>
                    <button onClick={() => setRules(prev => { const n = { ...prev }; delete n[p]; return n; })} style={{ background: "none", border: "none", color: "#C06E52", cursor: "pointer", fontSize: 12, padding: 2 }}>✕</button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
          </div>
        </div>
        </>
      )}

      {/* Blocked counterparties */}
      {blacklist.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 8 }}>🚫 Geblokkeerde Tegenpartijen</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {blacklist.map((name, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 5, background: "var(--bg)", border: "1px solid var(--border)", fontSize: 10, color: "var(--text)" }}>
                {name}
                <button onClick={() => { setBlacklist(p => p.filter((_, j) => j !== i)); setToast(`✓ "${name}" van blacklist verwijderd`); setTimeout(() => setToast(null), 2500); }} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 11, padding: "0 2px", lineHeight: 1 }}>✕</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
