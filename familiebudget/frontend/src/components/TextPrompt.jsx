import { useState, useCallback, useRef, useEffect } from "react";
import { Check, X } from "lucide-react";

/*
 * A replacement for window.prompt().
 *
 * Electron does not implement prompt() — Chromium removed it from embedders,
 * so it returns undefined and logs "prompt() is and will not be supported".
 * Every call site guarded with `if (!name) return;`, which meant the buttons
 * did nothing at all in the desktop app: no error, no dialog, no clue. Adding
 * and renaming categories and subcategories were all silently dead, and only
 * the browser build worked.
 *
 * Promise-based so call sites stay a one-line change (`const n = await ask(…)`)
 * and so PatternsView can still chain several questions in a row.
 *
 * Usage:
 *   const { ask, promptEl } = useTextPrompt();
 *   const name = await ask({ title: "Nieuwe categorie", label: "Naam" });
 *   ...
 *   return (<>{promptEl}<div>…</div></>);
 */
export function useTextPrompt() {
  const [req, setReq] = useState(null);
  const [value, setValue] = useState("");
  const resolver = useRef(null);
  const inputRef = useRef(null);

  const ask = useCallback((opts = {}) => new Promise((resolve) => {
    resolver.current = resolve;
    setValue(opts.defaultValue || "");
    setReq({ title: "Naam", label: "", placeholder: "", ...opts });
  }), []);

  /* Always settle the promise. An unresolved await would leave the caller
     hanging forever on a cancel, which is a worse bug than the one this
     component replaces. */
  const close = useCallback((result) => {
    setReq(null);
    setValue("");
    const r = resolver.current;
    resolver.current = null;
    if (r) r(result);
  }, []);

  useEffect(() => {
    if (!req) return;
    // Focus and select, so a rename can be typed straight over the old name —
    // the one genuinely useful behaviour window.prompt had.
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, [req]);

  const submit = () => {
    const v = value.trim();
    close(v ? v : null);
  };

  const promptEl = req ? (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(null); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div style={{ background: "var(--card)", borderRadius: 16, padding: 20, width: 380, maxWidth: "95%", border: "1px solid var(--border)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 400, fontFamily: "var(--font-display)", color: "var(--text)" }}>{req.title}</h2>
        {req.label && (
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>{req.label}</div>
        )}
        <input
          ref={inputRef}
          value={value}
          placeholder={req.placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); submit(); }
            if (e.key === "Escape") { e.preventDefault(); close(null); }
          }}
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 13, outline: "none" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button onClick={() => close(null)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 12 }}>
            <X size={13} />Annuleer
          </button>
          <button onClick={submit} disabled={!value.trim()} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--on-accent)", cursor: value.trim() ? "pointer" : "default", opacity: value.trim() ? 1 : 0.5, fontSize: 12, fontWeight: 600 }}>
            <Check size={14} />OK
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { ask, promptEl };
}

export default useTextPrompt;
