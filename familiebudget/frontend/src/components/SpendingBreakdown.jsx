import { ChevronRight } from "lucide-react";
import { fmt } from '../utils/formatters.js';
import DashSection from './DashSection.jsx';

/*
 * Where the money went — the balance, then the ranking.
 *
 * These used to be two cards a screen apart: this one drew the two flow bars
 * and then listed its segments in a legend, and "Grootste uitgaven" listed the
 * same categories again as ranked rows. The legend WAS the ranked list, minus
 * the ranking, so one of them had to go. The legend lost: the ranked rows
 * carry the same name/amount pairing, sort by size, and already had the
 * click-through to the category detail.
 *
 * What the bars do that a ranking cannot is the reason they stayed. Both are
 * scaled to the same euro-per-pixel, so a month that outspends its income
 * renders visibly longer on the bottom — an in-vs-out question the list does
 * not answer. Drawing each bar to its own 100% would hide exactly that.
 *
 * Not a Sankey, deliberately. A Sankey earns its complexity by showing routing
 * between many sources and many destinations; here income is effectively one
 * node, so every ribbon would be a straight vertical band — a stacked bar with
 * extra pixels. Splitting income to force ribbons would assert a
 * source→destination attribution the data does not contain.
 */
export default function SpendingBreakdown({ inc, exp, catStats, cats, uncategorised, savedNet = 0, catDelta, onPickCategory, onShowUncategorised }) {
  if (inc <= 0 && exp <= 0) return null;

  const spent = cats
    .filter(c => c.type !== "inkomsten" && catStats[c.id] && catStats[c.id].total > 0)
    .map(c => ({ key: c.id, name: c.name, value: catStats[c.id].total, color: c.color }))
    .sort((a, b) => b.value - a.value);

  /* catStats is NOT a complete partition of `exp`, so the categories above can
     sum to less than what actually left the account. It skips income-typed
     categories outright (`App.jsx`: `if (c.type === "inkomsten") continue`),
     and its `_uncat` bucket only catches transactions with NO category at all.
     A negative amount filed under Inkomsten — repaying received money, a
     salary correction — is therefore in neither, and so is anything on a
     category id that no longer exists.
     Those euros still reduce Netto, so without this the flow bar's
     "Overgehouden" came out HIGHER than the Netto hero above it, with nothing
     accounting for the difference. Book the remainder explicitly instead of
     letting it vanish: outTotal then always equals `exp`, and the surplus
     always equals Netto, whatever odd categorisation exists. */
  const residual = exp - spent.reduce((s, x) => s + x.value, 0) - (uncategorised > 0 ? uncategorised : 0);

  /* The ranked body: a COMPLETE partition of `exp`, sorted by size. Complete
     is the point — "Nog niet ingedeeld" appearing here as a row of its own,
     ranked among the categories it competes with, is what the coverage
     footnote under this heading used to say in words. */
  const listRows = [...spent];
  if (uncategorised > 0) {
    listRows.push({ key: "_none", name: "Nog niet ingedeeld", value: uncategorised, unknown: true });
  }
  if (residual > 0.005) {
    listRows.push({
      key: "_other",
      name: "Overig",
      value: residual,
      color: "var(--neutral)",
      hint: "Uitgaven die onder een inkomsten-categorie of een verwijderde categorie staan",
    });
  }
  listRows.sort((a, b) => b.value - a.value);
  const rankMax = listRows.length ? listRows[0].value : 1;

  /* The bar groups the tail; the list below does not. That is the ordinary
     division of labour between a chart and its table — six segments stay
     readable, twelve would be slivers. */
  const top = listRows.filter(r => !r.unknown && r.key !== "_other").slice(0, 6);
  const bar = [...top];
  const restValue = listRows
    .filter(r => !r.unknown && r.key !== "_other" && !top.includes(r))
    .reduce((s, x) => s + x.value, 0);
  if (restValue > 0) bar.push({ key: "_rest", name: "Overige categorieën", value: restValue, color: "var(--neutral)" });
  // Mandatory: at this coverage the unknown slice is among the largest, and
  // leaving it out would make the bar claim the money was accounted for.
  if (uncategorised > 0) bar.push({ key: "_none", name: "Nog niet ingedeeld", value: uncategorised, unknown: true });
  if (residual > 0.005) bar.push({ key: "_other", name: "Overig", value: residual, color: "var(--neutral)" });

  /* Savings transfers are NOT an outflow segment.
     Moving money to your own savings account is not spending, and counting it
     here reintroduces exactly the distortion the `excluded` setting exists to
     prevent: a €2.000 transfer out with €2.000 back the same month would
     inflate this bar by €2.000 while nothing actually left the household.
     Worse, it was one-sided — the return leg is a positive amount in an
     excluded subcategory, so it is filtered from income and never came back.
     On the real data that manufactured a €3.731 "uit reserves" band out of a
     €2.780 surplus. Net savings is reported below the bars instead, where it
     explains the surplus without being able to distort a total. */

  const outTotal = bar.reduce((s, x) => s + x.value, 0);
  const surplus = Math.max(0, inc - outTotal);
  if (surplus > 0) bar.push({ key: "_left", name: "Overgehouden", value: surplus, color: "var(--green)", faded: true });

  const inSegs = [{ key: "_inc", name: "Inkomsten", value: inc, color: "var(--green)" }];
  // Overspending: top up the income bar from reserves so both bars still
  // balance. Letting the outflow bar run longer than its container would read
  // as a rendering fault rather than as a deficit.
  const deficit = Math.max(0, outTotal - inc);
  if (deficit > 0) inSegs.push({ key: "_res", name: "Uit reserves", value: deficit, color: "var(--red)", faded: true });

  const scale = Math.max(inc + deficit, outTotal, 1);
  const seg = (s) => ({
    flexGrow: s.value,
    background: s.unknown ? undefined : s.color,
    opacity: s.faded ? 0.45 : 1,
  });

  /* Per-row answer to "is this a lot?" — the ranked amount says how big, this
     says how big COMPARED TO USUAL. Null whenever the page shows a whole year
     (App.jsx explains why there is no baseline then), so the column simply
     collapses rather than showing twelve blanks.

     Deliberately not coloured. Red and green mean sign — money in, money out —
     everywhere else in this app, and spending more on Kinderen than usual is
     not a loss. So: an arrow, a percentage, muted like the amount beside it.

     Under 10% is noise at this scale — one extra tank of fuel moves a category
     by that much — and a column of "+3%" trains you to stop reading it. */
  const deltaFor = (r) => {
    if (!catDelta) return null;
    if (r.key === "_other") return null;                 // a residual bucket, not a category
    const d = catDelta.byKey[r.unknown ? "_uncat" : r.key];
    if (!d) return null;
    if (d.pct === null) return { text: "nieuw", title: `Niets uitgegeven in ${catDelta.label.toLowerCase()}` };
    if (Math.abs(d.pct) < 10) return null;
    const up = d.pct > 0;
    return {
      text: `${up ? "\u2191" : "\u2193"}${Math.abs(Math.round(d.pct))}%`,
      title: `${fmt(d.b)} per maand nu, tegenover ${fmt(d.a)} in ${catDelta.label.toLowerCase()}`,
    };
  };

  const clickRow = (r) => {
    if (r.unknown) onShowUncategorised && onShowUncategorised();
    else if (catStats[r.key]) onPickCategory && onPickCategory(r.key);
  };
  const clickable = (r) => r.unknown || !!catStats[r.key];

  return (
    <DashSection title="Waar ging je geld heen">
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div className="stack-bar" style={{ width: `${((inc + deficit) / scale) * 100}%`, height: 16 }}>
          {inSegs.map(s => (
            <div key={s.key} className="stack-seg" style={seg(s)} title={`${s.name} · ${fmt(s.value)}`} />
          ))}
        </div>
        <div className="stack-bar" style={{ width: `${(outTotal / scale) * 100}%`, height: 16 }}>
          {bar.map(s => (
            <div
              key={s.key}
              className={`stack-seg${s.unknown ? " stack-seg--unknown" : ""}`}
              style={{ ...seg(s), cursor: clickable(s) ? "pointer" : "default" }}
              title={`${s.name} · ${fmt(s.value)}${s.hint ? ` — ${s.hint}` : ""}`}
              onClick={() => clickRow(s)}
            />
          ))}
        </div>
      </div>

      {/* A real overspend — spending alone exceeded income. Now that savings
          transfers are out of the bar this only fires when it is actually
          true, so it is worth stating plainly. */}
      {deficit > 0 && (
        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 9, lineHeight: 1.5, background: "var(--bg)", borderRadius: 8, padding: "7px 9px" }}>
          Je gaf <span style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(outTotal)}</span> uit
          tegenover <span style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(inc)}</span> aan inkomsten.
          Het verschil van <strong style={{ color: "var(--text)", fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{fmt(deficit)}</strong> kwam uit geld dat al op de rekening stond.
        </div>
      )}

      {/* What happened to what was kept. Reported, never added to a total —
          `savedNet` counts both directions, so a round-trip nets to zero. */}
      {savedNet !== 0 && (
        <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 9, lineHeight: 1.5, background: "var(--bg)", borderRadius: 8, padding: "7px 9px" }}>
          {savedNet < 0 ? (
            <>Je haalde <strong style={{ color: "var(--text)", fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{fmt(-savedNet)}</strong> van je spaarrekening.</>
          ) : savedNet > surplus ? (
            <>
              Je zette <strong style={{ color: "var(--text)", fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{fmt(savedNet)}</strong> opzij —
              meer dan je overhield, dus <span style={{ fontFamily: "'DM Mono',monospace" }}>{fmt(savedNet - surplus)}</span> daarvan
              kwam uit geld dat al op de rekening stond.
            </>
          ) : (
            <>
              Daarvan ging <strong style={{ color: "var(--text)", fontWeight: 600, fontFamily: "'DM Mono',monospace" }}>{fmt(savedNet)}</strong> naar je spaarrekening;
              <span style={{ fontFamily: "'DM Mono',monospace" }}> {fmt(surplus - savedNet)}</span> bleef op de zichtrekening.
            </>
          )}
        </div>
      )}

      {listRows.length > 0 && (
        <div style={{ marginTop: 13, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 2 }}>
          {listRows.map(r => (
            <div
              key={r.key}
              onClick={() => clickRow(r)}
              className={`rank-row${catDelta ? " rank-row--delta" : ""}`}
              style={{ cursor: clickable(r) ? "pointer" : "default" }}
              title={r.hint || `${r.name} · ${fmt(r.value)}`}
            >
              <div className="rank-name" style={{ color: "var(--text)" }}>{r.name}</div>
              <div className="rank-bar" style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--bg)", overflow: "hidden" }}>
                <div
                  className={r.unknown ? "stack-seg--unknown" : undefined}
                  style={{ width: `${Math.max(2, (r.value / rankMax) * 100)}%`, height: "100%", borderRadius: 4, background: r.unknown ? undefined : r.color }}
                />
              </div>
              <div className="rank-amount" style={{ fontFamily: "'DM Mono',monospace", color: "var(--muted)" }}>{fmt(-r.value)}</div>
              {catDelta && (() => {
                const d = deltaFor(r);
                return <div className="rank-delta" title={d ? d.title : undefined}>{d ? d.text : ""}</div>;
              })()}
              <ChevronRight className="rank-chev" size={11} style={{ opacity: clickable(r) ? 0.3 : 0, flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}
    </DashSection>
  );
}
