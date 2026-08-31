import { MONTH_NAMES } from '../utils/comparison.js';
import { CALENDAR_MONTH_KEYS } from '../utils/constants.js';
import { fmt } from '../utils/formatters.js';

/*
 * Net-per-month trend.
 *
 * Three things the old inline sparkline got wrong:
 *
 * 1. No zero line. For a net figure that crosses zero, a line floating in an
 *    unlabelled box tells you nothing about whether a month was positive.
 * 2. Inconsistent stroke width. The SVG used preserveAspectRatio="none", which
 *    scales X and Y independently — so a diagonal segment's stroke gets
 *    stretched more than a flat one. Fixed with vector-effect="non-scaling-
 *    stroke", which keeps the stroke in screen pixels regardless of transform.
 * 3. Months with no data were plotted as €0, drawing a fake flat line across
 *    the rest of the year. Only months that actually have transactions are
 *    plotted now.
 *
 * The dashed average line and the value callout pinned to the last point are
 * borrowed from AppBlock's trend chart.
 */

const W = 600;
const H = 124;
const PAD_T = 10;
const PAD_B = 20;   // room for month labels
const PAD_R = 4;

export default function NetTrendChart({ mStats, months }) {
  const points = CALENDAR_MONTH_KEYS
    .map((key, i) => ({ key, i, stat: mStats[key] }))
    .filter(p => p.stat && p.stat.cnt > 0)
    .map(p => ({ key: p.key, i: p.i, val: p.stat.inc - p.stat.exp }));

  if (points.length === 0) return null;

  const vals = points.map(p => p.val);
  // Always keep zero inside the range so the zero line is meaningful.
  const rawMax = Math.max(...vals, 0);
  const rawMin = Math.min(...vals, 0);
  const span = (rawMax - rawMin) || 1;
  // Breathing room so the line never touches the edges
  const yMax = rawMax + span * 0.12;
  const yMin = rawMin - span * 0.12;
  const range = (yMax - yMin) || 1;

  const plotH = H - PAD_T - PAD_B;
  const yOf = (v) => PAD_T + (1 - (v - yMin) / range) * plotH;
  const xOf = (idx) => points.length === 1
    ? (W - PAD_R) / 2
    : (idx / (points.length - 1)) * (W - PAD_R);

  const zeroY = yOf(0);
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const avgY = yOf(avg);

  const coords = points.map((p, idx) => ({ ...p, x: xOf(idx), y: yOf(p.val) }));
  const linePts = coords.map(c => `${c.x},${c.y}`).join(" ");

  // Area is filled between the line and the ZERO line (not the bottom of the
  // box), so a month below zero reads as below zero.
  const areaPath = coords.length > 1
    ? `M${coords[0].x},${zeroY} L${coords.map(c => `${c.x},${c.y}`).join(" L")} L${coords[coords.length - 1].x},${zeroY} Z`
    : null;

  const last = coords[coords.length - 1];
  const selected = months.length === 1 ? months[0] : null;

  return (
    <div style={{ position: "relative", marginTop: 10 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
        {/* area between line and zero */}
        {areaPath && <path d={areaPath} fill="var(--accent)" opacity="0.14" />}

        {/* average reference */}
        <line
          x1="0" x2={W - PAD_R} y1={avgY} y2={avgY}
          stroke="var(--muted)" strokeWidth="1" strokeDasharray="5 4"
          opacity="0.5" vectorEffect="non-scaling-stroke"
        />

        {/* zero line — drawn after the average so it sits on top. Uses --muted
            rather than --border: as the reference the whole chart is read
            against it has to stay visible in both themes. */}
        <line
          x1="0" x2={W - PAD_R} y1={zeroY} y2={zeroY}
          stroke="var(--muted)" strokeWidth="1.5" opacity="0.65"
          vectorEffect="non-scaling-stroke"
        />

        {/* the trend itself */}
        <polyline
          points={linePts}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Only the actively-filtered month gets a marker — a dot on every
            point made the line read as cluttered. */}
        {selected && coords.filter(c => c.key === selected).map(c => (
          <circle
            key={c.key}
            cx={c.x} cy={c.y} r={4}
            fill="var(--accent)" stroke="var(--card)" strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Labels live in HTML rather than SVG text: the SVG is stretched
          horizontally, which would distort any text inside it. */}
      {/* Zero on the left, average on the right, so the two reference labels
          can never collide when the lines sit close together. */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, pointerEvents: "none" }}>
        <div className="trend-axis-label" style={{
          position: "absolute", left: 0, top: `${(zeroY / H) * 100}%`,
          transform: "translateY(-50%)", fontWeight: 600, color: "var(--muted)",
          background: "var(--card)", padding: "0 4px 0 0", fontFamily: "var(--font-mono)",
        }}>€0</div>
        <div className="trend-axis-label" style={{
          position: "absolute", right: 0, top: `${(avgY / H) * 100}%`,
          transform: "translateY(-50%)", color: "var(--muted)",
          background: "var(--card)", padding: "0 0 0 5px", whiteSpace: "nowrap",
        }}>gem. {fmt(avg)}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        {coords.map(c => (
          <div key={c.key} style={{
            fontSize: 9, textTransform: "capitalize",
            color: selected === c.key ? "var(--accent)" : "var(--muted)",
            fontWeight: selected === c.key ? 700 : 500,
          }}>{MONTH_NAMES[c.i]}</div>
        ))}
      </div>
    </div>
  );
}
