import { fmt } from '../utils/formatters.js';
import DashSection from './DashSection.jsx';

/*
 * Where the money went — two stacked bars on a shared scale.
 *
 * Not a Sankey, deliberately. A Sankey earns its complexity by showing routing
 * between many sources and many destinations; here income is effectively one
 * node, so every ribbon would be a straight vertical band — a stacked bar with
 * extra pixels. Splitting income to force ribbons would assert a
 * source→destination attribution the data does not contain.
 *
 * Both bars are scaled to the same euro-per-pixel, so a month that outspends
 * its income renders visibly longer on the bottom. That comparison is the
 * whole point; drawing each bar to its own 100% would hide exactly what you
 * want to see.
 */
export default function FlowBars({ inc, exp, catStats, cats, uncategorised, savedNet = 0, onPickCategory, onShowUncategorised }) {
  if (inc <= 0 && exp <= 0) return null;

  const spent = cats
    .filter(c => c.type !== "inkomsten" && catStats[c.id] && catStats[c.id].total > 0)
    .map(c => ({ key: c.id, name: c.name, value: catStats[c.id].total, color: c.color }))
    .sort((a, b) => b.value - a.value);

  const top = spent.slice(0, 6);
  const restValue = spent.slice(6).reduce((s, x) => s + x.value, 0);

  const out = [...top];
  if (restValue > 0) out.push({ key: "_rest", name: "Overige categorieën", value: restValue, color: "var(--neutral)" });
  // Mandatory: at this coverage the unknown slice is among the largest, and
  // leaving it out would make the bar claim the money was accounted for.
  if (uncategorised > 0) out.push({ key: "_none", name: "Nog niet ingedeeld", value: uncategorised, unknown: true });

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

  const outTotal = out.reduce((s, x) => s + x.value, 0);
  const surplus = Math.max(0, inc - outTotal);
  if (surplus > 0) out.push({ key: "_left", name: "Overgehouden", value: surplus, color: "var(--green)", faded: true });

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

  return (
    <DashSection title="Waar ging je geld heen">
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div className="stack-bar" style={{ width: `${((inc + deficit) / scale) * 100}%`, height: 16 }}>
          {inSegs.map(s => (
            <div key={s.key} className="stack-seg" style={seg(s)} title={`${s.name} · ${fmt(s.value)}`} />
          ))}
        </div>
        <div className="stack-bar" style={{ width: `${(outTotal / scale) * 100}%`, height: 16 }}>
          {out.map(s => (
            <div
              key={s.key}
              className={`stack-seg${s.unknown ? " stack-seg--unknown" : ""}`}
              style={{ ...seg(s), cursor: (s.unknown || catStats[s.key]) ? "pointer" : "default" }}
              title={`${s.name} · ${fmt(s.value)}`}
              onClick={() => {
                if (s.unknown) onShowUncategorised && onShowUncategorised();
                else if (catStats[s.key]) onPickCategory && onPickCategory(s.key);
              }}
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

      <div className="dash-legend">
        {out.map(s => (
          <div key={s.key} className="dash-legend-row">
            <span
              className={`dash-swatch${s.unknown ? " stack-seg--unknown" : ""}`}
              style={{ background: s.unknown ? undefined : s.color, opacity: s.faded ? 0.45 : 1 }}
            />
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", color: "var(--muted)", flexShrink: 0 }}>{fmt(s.value)}</span>
          </div>
        ))}
      </div>
    </DashSection>
  );
}
