import { useEffect, useRef } from "react";
import { MONTH_NAMES } from '../utils/comparison.js';
import { CALENDAR_MONTH_KEYS } from '../utils/constants.js';

/**
 * Month strip for the dashboard. Click a month to scope to it, click again to
 * clear. Shift/⌘-click extends the selection (the underlying `months` filter
 * has always been multi-select — there just was no way to drive it from here).
 * Months with no transactions are dimmed but still selectable.
 */
export default function MonthSelector({ months, setMonths, mStats, year }) {
  const stripRef = useRef(null);
  const activeRef = useRef(null);

  // The strip scrolls on narrow screens, so a selected month can start out
  // off-view — e.g. picking December then switching tabs.
  useEffect(() => {
    if (!activeRef.current || !stripRef.current) return;
    activeRef.current.scrollIntoView({ block: "nearest", inline: "center" });
  }, [months, year]);

  const toggle = (key, e) => {
    const additive = e && (e.shiftKey || e.metaKey || e.ctrlKey);
    if (additive) {
      setMonths(months.includes(key) ? months.filter(m => m !== key) : [...months, key].sort());
    } else {
      setMonths(months.length === 1 && months[0] === key ? [] : [key]);
    }
  };

  const allActive = months.length === 0;

  return (
    <div className="month-strip" ref={stripRef}>
      {/* Says "Heel jaar", not the year itself — the year is chosen in the
          header, and showing it twice made two controls look like one. */}
      <button
        onClick={() => setMonths([])}
        ref={allActive ? activeRef : null}
        style={{
          padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
          whiteSpace: "nowrap",
          border: allActive ? "1px solid var(--accent)" : "1px solid var(--border)",
          background: allActive ? "var(--accent-20)" : "var(--card)",
          color: allActive ? "var(--accent)" : "var(--muted)",
        }}
      >
        Heel jaar
      </button>
      <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />
      {CALENDAR_MONTH_KEYS.map((key, i) => {
        const active = months.includes(key);
        const hasData = mStats && mStats[key] && mStats[key].cnt > 0;
        return (
          <button
            key={key}
            ref={active ? activeRef : null}
            onClick={(e) => toggle(key, e)}
            title={hasData ? undefined : "Geen transacties in deze maand"}
            style={{
              padding: "5px 9px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
              textTransform: "capitalize", minWidth: 40,
              border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
              background: active ? "var(--accent-20)" : "var(--card)",
              color: active ? "var(--accent)" : hasData ? "var(--text)" : "var(--muted)",
              opacity: hasData || active ? 1 : 0.45,
            }}
          >
            {MONTH_NAMES[i]}
          </button>
        );
      })}
    </div>
  );
}
