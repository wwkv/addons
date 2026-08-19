import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

export default function MultiSelect({ options, selected, onChange, allLabel, width = 200 }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({ visibility: "hidden" });
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const br = buttonRef.current.getBoundingClientRect();
    const menuW = width;
    const menuH = Math.min(320, 44 + options.length * 25);
    const pad = 8;

    const spaceBelow = window.innerHeight - br.bottom - pad;
    const spaceAbove = br.top - pad;
    let top;
    if (spaceBelow >= menuH || spaceBelow >= spaceAbove) top = br.bottom + pad;
    else top = br.top - menuH - pad;
    top = Math.max(pad, Math.min(top, window.innerHeight - menuH - pad));

    let left = br.left;
    left = Math.max(pad, Math.min(left, window.innerWidth - menuW - pad));

    setMenuStyle({
      position: "fixed", top, left, zIndex: 1000,
      background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8,
      padding: 5, width: menuW, maxHeight: 320, overflow: "auto",
      boxShadow: "0 8px 30px rgba(0,0,0,0.4)", visibility: "visible",
    });
  }, [open, options.length, width]);

  useEffect(() => {
    if (!open) { setMenuStyle({ visibility: "hidden" }); return; }
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) && menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };

  let label = allLabel;
  if (selected.length === 1) {
    const opt = options.find(o => o.value === selected[0]);
    label = opt ? opt.label : allLabel;
  } else if (selected.length > 1) {
    label = `${selected.length} geselecteerd`;
  }

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ padding: "3px 5px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", color: selected.length ? "var(--text)" : "var(--muted)", cursor: "pointer", fontSize: 9, whiteSpace: "nowrap", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", display: "inline-flex", alignItems: "center", gap: 3 }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        <span style={{ fontSize: 7, opacity: 0.6, flexShrink: 0 }}>▾</span>
      </button>

      {open && createPortal(
        <div ref={menuRef} style={menuStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 4px 6px", borderBottom: "1px solid var(--border)", marginBottom: 4 }}>
            <button type="button" onClick={() => onChange(options.map(o => o.value))} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 9, padding: 0 }}>Alles</button>
            <button type="button" onClick={() => onChange([])} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 9, padding: 0 }}>Wissen</button>
          </div>
          {options.map(o => (
            <label
              key={o.value}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 4px", cursor: "pointer", borderRadius: 4, fontSize: 10 }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} style={{ margin: 0, accentColor: "var(--accent)", flexShrink: 0 }} />
              {o.color && <span style={{ width: 7, height: 7, borderRadius: 2, background: o.color, display: "inline-block", flexShrink: 0 }} />}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{o.label}</span>
            </label>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
