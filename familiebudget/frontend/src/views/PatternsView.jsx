import { X, Plus, Hourglass, User, Check, Ban, Brain, ChevronUp, ChevronDown } from "lucide-react";

export default function PatternsView({
  cats, rules, pending, settings, blacklist, patternSearch, pendingSort, rulesSort, filteredRulesEntries,
  patternSearchInputRef,
  setRules, setPending, setBlacklist, setToast, setPatternSearch, setPendingSort, setRulesSort,
}) {
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, color: "var(--text)", margin: "0 0 16px" }}>Patronen</h1>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => { const p = prompt("Patroon (tekst):"); if (!p) return; const catId = prompt("Categorie ID:"); const subId = prompt("Sub ID:"); if (catId && subId) setRules(prev => ({ ...prev, [p.toLowerCase()]: { catId, subId } })); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 10 }}><Plus size={10} />Handmatig</button>
          <button onClick={() => { if (confirm("Alle patronen wissen?")) setRules({}); }} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid var(--danger)", background: "transparent", color: "var(--danger)", cursor: "pointer", fontSize: 10 }}>Wis alles</button>
        </div>
      </div>

      <p style={{ fontSize: 11, opacity: 0.5, marginBottom: 12 }}>
        Patronen worden geleerd na {settings.patternThreshold || 3}× dezelfde categorie ({settings.personThreshold || 6}× voor personen). ⌘+klik of ⇧+klik forceert direct. (Totaal: {Object.keys(rules).length})
      </p>

      {/* Pending Patterns */}
      {Object.keys(pending).length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 7 }}><Hourglass size={12} />In afwachting ({Object.keys(pending).length})</div>
          <div style={{ background: "var(--card)", borderRadius: 11, border: "1px solid var(--accent-30)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse" }}>
              <thead><tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th onClick={() => { if (pendingSort.field === "pattern") setPendingSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" })); else setPendingSort({ field: "pattern", dir: "asc" }); }} style={{ padding: "6px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)", cursor: "pointer", userSelect: "none" }}>Patroon {pendingSort.field === "pattern" ? (pendingSort.dir === "asc" ? <ChevronUp size={9} style={{ display: "inline" }} /> : <ChevronDown size={9} style={{ display: "inline" }} />) : ""}</th>
                <th onClick={() => { if (pendingSort.field === "category") setPendingSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" })); else setPendingSort({ field: "category", dir: "asc" }); }} style={{ padding: "6px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)", cursor: "pointer", userSelect: "none" }}>Categorie {pendingSort.field === "category" ? (pendingSort.dir === "asc" ? <ChevronUp size={9} style={{ display: "inline" }} /> : <ChevronDown size={9} style={{ display: "inline" }} />) : ""}</th>
                <th onClick={() => { if (pendingSort.field === "count") setPendingSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" })); else setPendingSort({ field: "count", dir: "desc" }); }} style={{ padding: "6px 8px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)", cursor: "pointer", userSelect: "none" }}>Voortgang {pendingSort.field === "count" ? (pendingSort.dir === "asc" ? <ChevronUp size={9} style={{ display: "inline" }} /> : <ChevronDown size={9} style={{ display: "inline" }} />) : ""}</th>
                <th style={{ padding: "6px 8px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)", width: 96 }}></th>
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
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>"{p}" {r.person && <User size={9} style={{ opacity: 0.5 }} />}</span>
                    </td>
                    <td style={{ padding: "5px 8px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: cat ? cat.color : "var(--neutral)", display: "inline-block" }} />
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
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "nowrap" }}>
                        <button onClick={() => { setRules(pr => ({ ...pr, [p]: { catId: r.catId, subId: r.subId } })); setPending(pr => { const n = { ...pr }; delete n[p]; return n; }); setToast(`Patroon bevestigd: "${p}"`); setTimeout(() => setToast(null), 2500); }} title="Bevestigen" style={{ display: "flex", padding: "3px 6px", borderRadius: 6, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer" }}><Check size={10} /></button>
                        <button onClick={() => setPending(pr => { const n = { ...pr }; delete n[p]; return n; })} title="Afwijzen" style={{ display: "flex", padding: "3px 6px", borderRadius: 6, border: "none", background: "var(--danger)", color: "#fff", cursor: "pointer" }}><X size={10} /></button>
                        <button onClick={() => { if (!blacklist.includes(p)) setBlacklist(prev => [...prev, p]); setPending(pr => { const n = { ...pr }; delete n[p]; return n; }); setToast(`"${p}" geblokkeerd`); setTimeout(() => setToast(null), 2500); }} style={{ padding: "3px 7px", borderRadius: 6, border: "none", background: "var(--neutral)", color: "#fff", cursor: "pointer", fontSize: 9, fontWeight: 600 }} title="Blokkeren">Blokkeer</button>
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
        <div style={{ textAlign: "center", padding: 44, opacity: 0.4 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}><Brain size={30} strokeWidth={1.5} /></div>
          <p style={{ fontSize: 12 }}>Nog geen patronen. Categoriseer transacties om patronen aan te leren.</p>
        </div>
      ) : (
        <>
          <div style={{ position: "relative", marginBottom: 10, maxWidth: 320 }}>
            <input ref={patternSearchInputRef} placeholder="Zoek in patronen..." value={patternSearch} onChange={e => setPatternSearch(e.target.value)} style={{ padding: "6px 10px", paddingRight: patternSearch ? 28 : 10, borderRadius: 7, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 10, width: "100%", boxSizing: "border-box" }} />
            {patternSearch && (
              <button type="button" onClick={() => { setPatternSearch(""); patternSearchInputRef.current?.focus(); }} onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; }} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 2, cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Zoek wissen">
                <X size={14} strokeWidth={2} />
              </button>
            )}
          </div>
          <div style={{ background: "var(--card)", borderRadius: 11, border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 400, borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th onClick={() => { if (rulesSort.field === "pattern") setRulesSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" })); else setRulesSort({ field: "pattern", dir: "asc" }); }} style={{ padding: "6px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)", cursor: "pointer", userSelect: "none" }}>Patroon {rulesSort.field === "pattern" ? (rulesSort.dir === "asc" ? <ChevronUp size={9} style={{ display: "inline" }} /> : <ChevronDown size={9} style={{ display: "inline" }} />) : ""}</th>
              <th onClick={() => { if (rulesSort.field === "category") setRulesSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" })); else setRulesSort({ field: "category", dir: "asc" }); }} style={{ padding: "6px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "var(--text)", background: "var(--card)", cursor: "pointer", userSelect: "none" }}>Categorie {rulesSort.field === "category" ? (rulesSort.dir === "asc" ? <ChevronUp size={9} style={{ display: "inline" }} /> : <ChevronDown size={9} style={{ display: "inline" }} />) : ""}</th>
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
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: cat ? cat.color : "var(--neutral)", display: "inline-block" }} />
                      {cat ? cat.name : "?"}
                    </span>
                  </td>
                  <td style={{ padding: "5px 8px", fontSize: 10, opacity: 0.7 }}>{sub ? sub.name : "?"}</td>
                  <td style={{ padding: "5px 8px", textAlign: "center" }}>
                    <button onClick={() => setRules(prev => { const n = { ...prev }; delete n[p]; return n; })} style={{ display: "flex", margin: "0 auto", background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 2 }}><X size={13} /></button>
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
        <div style={{ marginTop: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 9 }}><Ban size={13} />Geblokkeerde tegenpartijen</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {blacklist.map((name, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 999, background: "var(--bg)", border: "1px solid var(--border)", fontSize: 10, color: "var(--text)" }}>
                {name}
                <button onClick={() => { setBlacklist(p => p.filter((_, j) => j !== i)); setToast(`"${name}" van blacklist verwijderd`); setTimeout(() => setToast(null), 2500); }} style={{ display: "flex", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, lineHeight: 1 }}><X size={10} /></button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
