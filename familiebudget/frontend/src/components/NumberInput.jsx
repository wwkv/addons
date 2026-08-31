import { useState } from "react";

/*
 * A number field that can actually be emptied.
 *
 * The obvious spelling does not work:
 *
 *   <input type="number"
 *          value={n || 0}
 *          onChange={e => set(Number(e.target.value) || 0)} />
 *
 * Clearing the box yields "", Number("") is 0, `0 || 0` is 0, and the
 * controlled value immediately re-renders as "0" — an undeletable zero the
 * user has to type around. `value={n ?? ""}` does not help either, since
 * `0 ?? ""` is 0, not "".
 *
 * Keeping the raw string in local state while editing lets the box hold "",
 * while the parent still receives a number on every keystroke. On blur the
 * draft is dropped so the field re-syncs with whatever the parent stored.
 *
 * A stored 0 shows as empty on purpose: everywhere this is used, 0 means
 * "not set", and the placeholder says what the field is for.
 */
export default function NumberInput({ value, onChange, ...rest }) {
  const [draft, setDraft] = useState(null);
  const shown = draft ?? (value === 0 || value === null || value === undefined ? "" : String(value));

  return (
    <input
      type="number"
      value={shown}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        const n = Number(raw);
        onChange(raw === "" || !Number.isFinite(n) ? 0 : n);
      }}
      onBlur={() => setDraft(null)}
      {...rest}
    />
  );
}
