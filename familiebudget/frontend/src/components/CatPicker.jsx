import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Star, Package, Scissors, Plus } from "lucide-react";
import CatGrid from './CatGrid.jsx';

export default function CatPicker({ tx, cats, catUsage, onSelect, compact }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({ visibility: "hidden" });
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const cat = cats.find(c => c.id === tx.categoryId);
  const sub = cat ? cat.subs.find(s => s.id === tx.subCategoryId) : null;
  const hasSplits = tx.splits && tx.splits.length > 1;

  // Recalculate menu position every time it opens
  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !menuRef.current) return;
    const br  = buttonRef.current.getBoundingClientRect();
    const menuW = 560;
    const menuH = 420; // matches maxHeight
    const pad = 8;

    // ── Vertical: open below if room, otherwise above, always clamped ──
    const spaceBelow = window.innerHeight - br.bottom - pad;
    const spaceAbove = br.top - pad;
    let top;
    if (spaceBelow >= menuH || spaceBelow >= spaceAbove) {
      top = br.bottom + pad;
    } else {
      top = br.top - menuH - pad;
    }
    // Clamp so menu never escapes viewport
    top = Math.max(pad, Math.min(top, window.innerHeight - menuH - pad));

    // ── Horizontal: right-align with button, clamped to viewport ──
    let right = window.innerWidth - br.right;
    right = Math.max(pad, Math.min(right, window.innerWidth - menuW - pad));

    setMenuStyle({
      position: "fixed",
      top,
      right,
      zIndex: 1000,
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      padding: 10,
      width: menuW,
      maxHeight: menuH,
      overflow: "auto",
      boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
      visibility: "visible",
    });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) { setMenuStyle({ visibility: "hidden" }); return; }
    const handler = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const favs = useMemo(() => {
    return Object.entries(catUsage || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([subId]) => {
      for (const c of cats) { const s = c.subs.find(x => x.id === subId); if (s) return { cat: c, sub: s }; }
      return null;
    }).filter(Boolean);
  }, [catUsage, cats]);

  const handleSelect = (catId, subId, e) => {
    const forceLearn = e && (e.metaKey || e.shiftKey);
    onSelect(catId, subId, forceLearn);
    setOpen(false);
  };

  let btnLabel = null;
  let btnIcon = <Plus size={compact ? 10 : 12} />;
  let btnBorder = "1px dashed var(--muted)";
  let btnBg = "transparent";
  if (hasSplits) { btnLabel = "Gesplitst"; btnIcon = <Scissors size={compact ? 10 : 12} />; btnBorder = "1px solid var(--accent)"; }
  else if (tx.categoryId && cat) {
    btnLabel = `${cat.name.slice(0, 12)} › ${sub ? sub.name : "?"}`;
    btnIcon = null;
    btnBorder = `1px solid ${cat.color}`;
    btnBg = cat.color + "20";
  }

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: compact ? "3px 7px" : "5px 10px", borderRadius: 7, border: btnBorder, background: btnBg, color: "var(--text)", cursor: "pointer", fontSize: compact ? 10 : 12, whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {btnIcon}{btnLabel || "Categorie"}
      </button>

      {open && createPortal(
        <div ref={menuRef} style={menuStyle}>
          {/* Favorites */}
          {favs.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 700, color: "var(--accent)", padding: "2px 4px", textTransform: "uppercase" }}><Star size={10} fill="currentColor" strokeWidth={0} />Meest gebruikt</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {favs.map(({ cat: fc, sub: fs }) => (
                  <button key={fs.id} onClick={(e) => handleSelect(fc.id, fs.id, e)} style={{ padding: "4px 9px", borderRadius: 999, border: "none", background: fc.color + "25", color: "var(--text)", cursor: "pointer", fontSize: 10.5, fontWeight: 500 }}>
                    <span style={{ color: fc.color, fontWeight: 700 }}>{fc.name.slice(0, 8)}</span> › {fs.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Parking */}
          <button onClick={(e) => handleSelect("nog_te_verwerken", "te_categoriseren", e)} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", padding: "5px 8px", background: "var(--bg)", border: "none", color: "var(--muted)", cursor: "pointer", borderRadius: 7, fontSize: 10.5, fontStyle: "italic", marginBottom: 8 }}>
            <Package size={12} />Nog te verwerken
          </button>
          {/* 3-column grid */}
          <CatGrid cats={cats} catUsage={catUsage} tx={tx} handleSelect={handleSelect} />
          <div style={{ marginTop: 8, fontSize: 9, opacity: 0.4, color: "var(--text)", textAlign: "center" }}>
            ⌘+klik of ⇧+klik = patroon onthouden
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
