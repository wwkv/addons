import { useState } from "react";
import { ChevronRight, ChevronDown, X, Layers } from "lucide-react";

/*
 * The learned patterns, as a tree: category › subcategory › merchant › aliases.
 *
 * The flat table this replaces listed one row per canonical key, which made
 * the most interesting thing about the database invisible — that "COLRUYT 1234
 * HALLE", "COLRUYT 0567 NINOVE" and "Colruyt" are one shop. You could not see
 * that a merge had happened, which spellings were folded in, or how much
 * evidence sat behind a pattern.
 *
 * Categories and subcategories open by default, merchants closed: the
 * organisation is the point and should be visible without clicking, while
 * every alias at once would be a wall of bank strings. A search opens the
 * merchants it matched, since the match is often IN an alias and hiding it
 * would leave the hit unexplained.
 */
export default function MerchantTree({ tree, totals, query, onDelete }) {
  const [closedCats, setClosedCats] = useState(() => new Set());
  const [closedSubs, setClosedSubs] = useState(() => new Set());
  const [openMerchants, setOpenMerchants] = useState(() => new Set());

  const toggle = (set, setter, id) => {
    const n = new Set(set);
    n.has(id) ? n.delete(id) : n.add(id);
    setter(n);
  };

  const searching = !!query.trim();
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  if (!tree.length) {
    return (
      <div style={{ textAlign: "center", padding: 32, opacity: 0.45, fontSize: 11.5 }}>
        {searching ? `Geen winkel of schrijfwijze gevonden voor "${query.trim()}".` : "Nog geen patronen."}
      </div>
    );
  }

  return (
    <div>
      {/* The merge, stated outright. Without this the user has no way to know
          the folding happened at all. */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 10, fontSize: 10.5, color: "var(--muted)" }}>
        <Layers size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
        <span>{plural(totals.merchants, "winkel", "winkels")}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{plural(totals.aliases, "schrijfwijze", "schrijfwijzen")}</span>
        {totals.merged > 0 && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ color: "var(--accent)" }}>{totals.merged} samengevoegd</span>
          </>
        )}
        <button
          onClick={() => {
            const allClosed = closedCats.size >= tree.length;
            setClosedCats(allClosed ? new Set() : new Set(tree.map(c => c.id)));
            if (!allClosed) setOpenMerchants(new Set());
          }}
          style={{ marginLeft: "auto", padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 9.5 }}
        >
          {closedCats.size >= tree.length ? "Alles uitvouwen" : "Alles invouwen"}
        </button>
      </div>

      <div style={{ background: "var(--card)", borderRadius: 11, border: "1px solid var(--border)", overflow: "hidden" }}>
        {tree.map((cat, ci) => {
          const catOpen = !closedCats.has(cat.id);
          return (
            <div key={cat.id} style={{ borderTop: ci === 0 ? "none" : "1px solid var(--bg)" }}>
              {/* ── Category ── */}
              <div
                onClick={() => toggle(closedCats, setClosedCats, cat.id)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 11px", cursor: "pointer", background: "var(--bg)" }}
              >
                {catOpen ? <ChevronDown size={12} style={{ opacity: 0.5, flexShrink: 0 }} /> : <ChevronRight size={12} style={{ opacity: 0.5, flexShrink: 0 }} />}
                <span style={{ width: 9, height: 9, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: cat.orphan ? "var(--muted)" : "var(--text)", fontStyle: cat.orphan ? "italic" : "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.name}</span>
                <span style={{ marginLeft: "auto", fontSize: 9.5, color: "var(--muted)", flexShrink: 0, whiteSpace: "nowrap" }}>
                  {cat.merchantCount}
                  {cat.mergedCount > 0 && <span style={{ color: "var(--accent)" }}> · {cat.mergedCount}↯</span>}
                </span>
              </div>

              {catOpen && cat.subs.map(sub => {
                const subId = `${cat.id}/${sub.id}`;
                const subOpen = !closedSubs.has(subId);
                return (
                  <div key={subId}>
                    {/* ── Subcategory ── */}
                    <div
                      onClick={() => toggle(closedSubs, setClosedSubs, subId)}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 11px 6px 26px", cursor: "pointer" }}
                    >
                      {subOpen ? <ChevronDown size={10} style={{ opacity: 0.4, flexShrink: 0 }} /> : <ChevronRight size={10} style={{ opacity: 0.4, flexShrink: 0 }} />}
                      <span style={{ fontSize: 10.5, color: "var(--text)", opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--muted)", flexShrink: 0 }}>{sub.merchantCount}</span>
                    </div>

                    {subOpen && sub.merchants.map(m => {
                      // A search explains itself: the hit is often in an alias.
                      const open = openMerchants.has(m.key) || (searching && m.aliasCount > 0);
                      const expandable = m.aliasCount > 0;
                      return (
                        <div key={m.key}>
                          {/* ── Merchant ── */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px 5px 44px", borderTop: "1px solid var(--bg)" }}>
                            <div
                              onClick={() => expandable && toggle(openMerchants, setOpenMerchants, m.key)}
                              style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0, cursor: expandable ? "pointer" : "default" }}
                            >
                              {expandable
                                ? (open ? <ChevronDown size={10} style={{ opacity: 0.45, flexShrink: 0 }} /> : <ChevronRight size={10} style={{ opacity: 0.45, flexShrink: 0 }} />)
                                : <span style={{ width: 10, flexShrink: 0 }} />}
                              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.key}</span>
                              {m.aliasCount > 1 && (
                                <span style={{ flexShrink: 0, fontSize: 8.5, fontWeight: 600, padding: "1px 5px", borderRadius: 999, background: "var(--accent-20)", color: "var(--accent)", whiteSpace: "nowrap" }}>
                                  {m.aliasCount} schrijfwijzen
                                </span>
                              )}
                              {/* A rule with no transactions behind it is live but
                                  unevidenced — worth saying so rather than showing
                                  a bare "0". */}
                              {m.aliasCount === 0 && (
                                <span style={{ flexShrink: 0, fontSize: 8.5, padding: "1px 5px", borderRadius: 999, background: "var(--bg)", color: "var(--muted)", whiteSpace: "nowrap" }}>
                                  geen transacties
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: 9.5, color: "var(--muted)", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{m.txCount || ""}</span>
                            <button
                              onClick={() => onDelete(m.key)}
                              title={`Patroon "${m.key}" verwijderen`}
                              style={{ display: "flex", background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 2, flexShrink: 0 }}
                            >
                              <X size={12} />
                            </button>
                          </div>

                          {/* ── Aliases ── */}
                          {open && m.aliases.map(a => (
                            <div key={a.raw} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 11px 3px 70px", background: "var(--bg)" }}>
                              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9.5, color: "var(--muted)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.raw}>
                                {a.raw}
                              </span>
                              <span style={{ fontSize: 9, color: "var(--muted)", opacity: 0.7, fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{a.count}×</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
