import { useState, useRef } from "react";

export default function HoverTip({ text, children }) {
  const [show, setShow] = useState(false);
  const timer = useRef(null);
  const onEnter = () => { timer.current = setTimeout(() => setShow(true), 800); };
  const onLeave = () => { clearTimeout(timer.current); setShow(false); };
  return (
    <span style={{ position: "relative", cursor: "default" }} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
      {show && <span style={{ position: "absolute", left: 0, top: "100%", zIndex: 50, background: "#333", color: "#eee", padding: "4px 8px", borderRadius: 5, fontSize: 9, whiteSpace: "nowrap", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", boxShadow: "0 4px 12px rgba(0,0,0,0.5)", marginTop: 2, fontStyle: "italic", pointerEvents: "none" }}>{text || "Geen mededeling"}</span>}
    </span>
  );
}
