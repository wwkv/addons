import { useState, useRef, useEffect } from "react";
import { safeEvalMath } from '../utils/helpers.js';
import { fmt } from '../utils/formatters.js';

export default function MonthBarCell({ value, ghostValue = 0, maxScale = 2000, onChange, barColor, onStreamRight }) {
  const [localValue, setLocalValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const displayVal = Number(value) || 0;

  const getParsedValue = () => {
    const parsed = safeEvalMath(localValue || String(displayVal));
    return Math.max(0, parsed);
  };

  const commit = () => {
    const final = getParsedValue();
    onChange(final);
    setLocalValue("");
    setFocused(false);
  };

  const handleFocus = () => {
    setFocused(true);
    setLocalValue(displayVal !== 0 ? String(displayVal) : "");
  };

  const handleBlur = () => {
    commit();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape") {
      setLocalValue("");
      setFocused(false);
    }
  };

  const handleStreamRight = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const v = getParsedValue();
    onStreamRight?.(v);
    setLocalValue("");
    setFocused(false);
  };

  const showStreamBtn = onStreamRight && (isHovered || focused);

  return (
    <div
      style={{ position: "relative", width: "100%", minWidth: 28, paddingBottom: "8px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <input
        type="text"
        value={focused ? localValue : (displayVal !== 0 ? "€" + displayVal.toLocaleString("nl-BE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "")}
        placeholder={focused ? "" : "0"}
        onChange={(e) => focused && setLocalValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          background: "transparent",
          border: focused ? "1px solid var(--accent)" : "none",
          outline: "none",
          textAlign: "center",
          fontFamily: "'DM Mono',monospace",
          fontSize: 10,
          color: "var(--text)",
          padding: "2px 4px",
          paddingRight: showStreamBtn ? 18 : 4,
          boxSizing: "border-box",
        }}
      />
      {showStreamBtn && (
        <button
          type="button"
          onClick={handleStreamRight}
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: "absolute",
            right: 2,
            top: "50%",
            transform: "translateY(-50%)",
            padding: 0,
            width: 14,
            height: 14,
            border: "none",
            background: "transparent",
            color: "var(--muted)",
            opacity: 0.7,
            fontSize: 9,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Stream naar rechts"
        >
          ➔
        </button>
      )}
      <div style={{ position: "absolute", bottom: "2px", left: "10%", width: `${Math.min(80, (Math.max(0, Number(value)) / Math.max(maxScale, 1)) * 80)}%`, height: "3px", borderRadius: "9999px", background: barColor || "var(--accent)", opacity: 0.5, transition: "width 0.3s ease-in-out", pointerEvents: "none" }} />
    </div>
  );
}
