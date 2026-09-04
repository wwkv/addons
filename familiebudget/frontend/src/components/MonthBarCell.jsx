import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { safeEvalMath } from '../utils/helpers.js';

export default function MonthBarCell({ value, ghostValue = 0, maxScale = 2000, onChange, barColor, onStreamRight }) {
  const [localValue, setLocalValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const displayVal = Number(value) || 0;
  const ghost = Number(ghostValue) || 0;

  /* Both bars share one scale, and the scale has to include the ghost or an
     overspent month draws a grey bar wider than the cell. */
  const scale = Math.max(maxScale, ghost, 1);
  const barWidth = (n) => Math.min(80, (Math.max(0, n) / scale) * 80);

  /* safeEvalMath returns NaN for anything it cannot evaluate, and
     Math.max(0, NaN) is NaN — which JSON.stringify writes to the database as
     `null`. It reads back as 0, so the cell looks fine while the stored array
     is corrupt. Keep the old value instead of writing a hole. */
  const getParsedValue = () => {
    const parsed = safeEvalMath(localValue || String(displayVal));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : displayVal;
  };

  /* `keepEditing` matters more than it looks. Enter used to commit AND clear
     `focused`, but the input keeps DOM focus — so no second focus event ever
     fired, the `focused &&` guard on onChange swallowed every further
     keystroke, and the cell went dead. Typing a value, pressing Enter, spotting
     a typo and retyping did nothing at all, silently. So Enter stays in edit
     mode with the committed value seeded, the way a spreadsheet behaves; only a
     real blur leaves. */
  const commit = (keepEditing = false) => {
    const final = getParsedValue();
    onChange(final);
    if (keepEditing) {
      setLocalValue(String(final));
      setFocused(true);
    } else {
      setLocalValue("");
      setFocused(false);
    }
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
      commit(true);
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
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Stream naar rechts"
        >
          <ArrowRight size={10} />
        </button>
      )}
      {/* What was actually spent here, drawn as a wider track BEHIND the
          budget bar. Where the grey sticks out past the coloured bar you
          overspent that month — readable at 3px without needing a legend. */}
      {ghost > 0 && (
        <div style={{ position: "absolute", bottom: "1px", left: "10%", width: `${barWidth(ghost)}%`, height: "5px", borderRadius: "9999px", background: "var(--muted)", opacity: 0.25, transition: "width 0.3s ease-in-out", pointerEvents: "none" }} />
      )}
      <div style={{ position: "absolute", bottom: "2px", left: "10%", width: `${barWidth(Number(value))}%`, height: "3px", borderRadius: "9999px", background: barColor || "var(--accent)", opacity: 0.5, transition: "width 0.3s ease-in-out", pointerEvents: "none" }} />
    </div>
  );
}
