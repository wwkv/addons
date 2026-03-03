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
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox="0 0 200 200" style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.15))" }}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="none"><title>{s.name}: {fmt(-s.value)} ({s.pct}%)</title></path>)}
        <circle cx={cx} cy={cy} r="1.5" fill="var(--bg)" />
      </svg>
      <div style={{ display: "grid", gap: 3, fontSize: 11 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 10, background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 100 }}>{s.name}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", opacity: 0.5, minWidth: 30, textAlign: "right" }}>{s.pct}%</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 600, minWidth: 70, textAlign: "right" }}>{fmt(-s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
