import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

/*
 * Hover card. `content` takes a node for structured tooltips; `text` remains
 * for plain strings.
 *
 * Portaled to body, like ContextMenu: the transaction cell it lives in is
 * width-capped with overflow hidden, which clipped an absolutely-positioned
 * tooltip down to a sliver. Position is measured from the trigger at open
 * time — getBoundingClientRect reports viewport coordinates, so this stays
 * correct under the app's zoom transform — and it flips above the row or
 * shifts left when it would otherwise run off screen.
 */
export default function HoverTip({ text, content, children }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const timer = useRef(null);

  const open = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const W = 320, MARGIN = 8;
    const left = Math.min(r.left, window.innerWidth - W - MARGIN);
    const below = r.bottom + 4;
    // Flip above when there isn't room underneath.
    const flip = below + 180 > window.innerHeight && r.top > 190;
    setPos({ left: Math.max(MARGIN, left), top: flip ? undefined : below, bottom: flip ? window.innerHeight - r.top + 4 : undefined });
  }, []);

  const onEnter = () => { timer.current = setTimeout(open, 450); };
  const onLeave = () => { clearTimeout(timer.current); setPos(null); };
  const body = content ?? text ?? "Geen mededeling";

  return (
    <span ref={ref} style={{ position: "relative", cursor: "default" }} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
      {pos && createPortal(
        <div style={{
          position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, zIndex: 500,
          background: "var(--card)", color: "var(--text)",
          border: "1px solid var(--border)", borderRadius: 9,
          padding: "9px 11px", minWidth: 210, maxWidth: 320,
          boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          fontSize: 10, lineHeight: 1.5, textAlign: "left", pointerEvents: "none",
        }}>{body}</div>,
        document.body
      )}
    </span>
  );
}

/* Small caps section heading inside a hover card. */
export function TipLabel({ children }) {
  return (
    <span style={{ display: "block", fontSize: 8, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--muted)", opacity: 0.75, marginBottom: 3 }}>
      {children}
    </span>
  );
}
