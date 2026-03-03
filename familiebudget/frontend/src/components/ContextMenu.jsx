import { useEffect, useRef } from "react";

export default function ContextMenu({ x, y, items, onClose}) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return (
    <div
      ref={ref}
      style={{
        position: "fixed", left: x, top: y, zIndex: 1000,
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        padding: "4px 0", minWidth: 160,
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.onClick?.(); onClose(); }}
          disabled={item.disabled}
          style={{
            display: "block", width: "100%", padding: "6px 12px",
            border: "none", background: "transparent",
            color: item.disabled ? "var(--muted)" : "var(--text)",
            cursor: item.disabled ? "default" : "pointer",
            fontSize: 11, textAlign: "left",
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
