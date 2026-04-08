import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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
    const br = buttonRef.current.getBoundingClientRect();
    const mr = menuRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - br.bottom;
    const flip = spaceBelow < mr.height + 8;

    setMenuStyle({
      position: "fixed",
      right: Math.max(4, window.innerWidth - br.right),
      ...(flip
        ? { bottom: window.innerHeight - br.top + 4 }
        : { top: br.bottom + 4 }),
      zIndex: 1000,
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: 8,
      width: 560,
      maxHeight: 420,
      overflow: "auto",
      boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
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

  let btnLabel = "＋ Categorie";
  let btnBorder = "2px dashed var(--muted)";
  let btnBg = "transparent";
  if (hasSplits) { btnLabel = "✂️ Gesplitst"; btnBorder = "2px solid var(--accent)"; }
  else if (tx.categoryId && cat) {
    btnLabel = `${cat.name.slice(0, 12)} › ${sub ? sub.name : "?"}`;
    btnBorder = `2px solid ${cat.color}`;
    btnBg = cat.color + "20";
  }

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        style={{ padding: compact ? "3px 7px" : "5px 10px", borderRadius: 6, border: btnBorder, background: btnBg, color: "var(--text)", cursor: "pointer", fontSize: compact ? 10 : 12, whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}
      >
        {btnLabel}
      </button>

      {open && createPortal(
        <div ref={menuRef} style={menuStyle}>
          {/* Favorites */}
          {favs.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "var(--accent)", padding: "2px 4px", textTransform: "uppercase" }}>⭐ Meest gebruikt</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {favs.map(({ cat: fc, sub: fs }) => (
                  <button key={fs.id} onClick={(e) => handleSelect(fc.id, fs.id, e)} style={{ padding: "3px 8px", borderRadius: 4, border: "none", background: fc.color + "25", color: "var(--text)", cursor: "pointer", fontSize: 10 }}>
                    <span style={{ color: fc.color, fontWeight: 600 }}>{fc.name.slice(0, 8)}</span> › {fs.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Parking */}
          <button onClick={(e) => handleSelect("nog_te_verwerken", "te_categoriseren", e)} style={{ display: "block", width: "100%", textAlign: "left", padding: "4px 8px", background: "#88888810", border: "none", color: "var(--muted)", cursor: "pointer", borderRadius: 4, fontSize: 10, fontStyle: "italic", marginBottom: 6 }}>
            📦 Nog te verwerken
          </button>
          {/* 3-column grid */}
          <CatGrid cats={cats} catUsage={catUsage} tx={tx} handleSelect={handleSelect} />
          <div style={{ marginTop: 6, fontSize: 8, opacity: 0.35, color: "var(--text)", textAlign: "center" }}>
            ⌘+klik of ⇧+klik = patroon onthouden
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
