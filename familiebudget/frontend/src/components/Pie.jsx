import { fmt } from '../utils/formatters.js';

export default function Pie({ data, size = 190 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const r = 80, cx = 100, cy = 100;
  let cum = -Math.PI / 2;
  const slices = data.filter(d => d.value > 0).map(d => {
    const angle = (d.value / total) * Math.PI * 2;
    const start = cum;
    cum += angle;
    const x1 = Math.cos(start) * r + cx, y1 = Math.sin(start) * r + cy;
    const x2 = Math.cos(start + angle) * r + cx, y2 = Math.sin(start + angle) * r + cy;
    const mid = start + angle / 2;
    return { ...d, path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${angle > Math.PI ? 1 : 0},1 ${x2},${y2} Z`, pct: ((d.value / total) * 100).toFixed(0), mid };
  });
  return (
    <div style={{ display: "flex", flexDirection: size <= 140 ? "column" : "row", gap: size <= 140 ? 8 : 12, alignItems: size <= 140 ? "flex-start" : "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox="0 0 200 200" style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.15))", flexShrink: 0 }}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="none"><title>{s.name}: {fmt(-s.value)} ({s.pct}%)</title></path>)}
        <circle cx={cx} cy={cy} r="1.5" fill="var(--bg)" />
      </svg>
      <div style={{ display: "grid", gap: 3, fontSize: size <= 140 ? 10 : 11, minWidth: 0, width: size <= 140 ? "100%" : undefined, flex: size <= 140 ? undefined : 1, overflow: "hidden" }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, width: "100%", minWidth: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: 8, background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", opacity: 0.5, flexShrink: 0 }}>{s.pct}%</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, flexShrink: 0 }}>{fmt(-s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
