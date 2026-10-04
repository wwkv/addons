/* Formatting helpers */
export const fmt = (n) => {
  const f = Math.abs(n).toLocaleString("nl-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `\u2212\u20AC${f}` : `\u20AC${f}`;
};
/* Whole euros, same sign convention as fmt (real U+2212 minus, not a hyphen).
   For dense grids where two decimals do not fit — the budget table's 56px
   month columns. It exists so those screens stop rolling their own formatter
   and getting "€-500" where the rest of the app shows "−€500". */
export const fmt0 = (n) => {
  const f = Math.round(Math.abs(n || 0)).toLocaleString("nl-BE", { maximumFractionDigits: 0 });
  return n < 0 ? `−€${f}` : `€${f}`;
};
export const fD = (d) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };
export const mN = (m) => ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"][parseInt(m) - 1] || m;


export function parseEuropeanAmount(raw) {
  if (raw == null || String(raw).trim() === "") return NaN;
  const s = String(raw).trim().replace(/\./g, "").replace(",", ".");
  return parseFloat(s);
}
