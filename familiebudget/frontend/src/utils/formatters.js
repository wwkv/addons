/* Formatting helpers */
export const fmt = (n) => {
  const f = Math.abs(n).toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `\u2212\u20AC${f}` : `\u20AC${f}`;
};
export const fD = (d) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
export const mN = (m) => ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"][parseInt(m) - 1] || m;

export function isPerson(n) {
  const parts = n.trim().split(/\s+/);
  if (parts.length < 2 || parts.length > 4) return false;
  const allCaps = parts.every(x => /^[A-Z][a-z]+$/.test(x) || /^[A-Z]+$/.test(x));
  const noBiz = !/\b(bv|nv|vzw|bvba|srl|shop|store|market)\b/i.test(n);
  return allCaps && noBiz;
}

export function parseEuropeanAmount(raw) {
  if (raw == null || String(raw).trim() === "") return NaN;
  const s = String(raw).trim().replace(/\./g, "").replace(",", ".");
  return parseFloat(s);
}
