import { parseEuropeanAmount } from './formatters.js';

export function parseCSV(text) {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const hdr = lines[0];
  const sep = hdr.includes("\t") ? "\t" : hdr.includes(";") ? ";" : ",";
  const parseLine = (line) => {
    const result = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQ = !inQ;
      else if (ch === sep && !inQ) { result.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    result.push(cur.trim());
    return result;
  };
  const h = parseLine(hdr).map(x => x.toLowerCase().replace(/['"]/g, ""));
  const isPayPal = h.includes("naam") || h.includes("name") || h.includes("bruto");
  const di = h.findIndex(x => x.includes("datum"));
  const ai = isPayPal
    ? h.findIndex(x => x.includes("bruto") || x.includes("gross"))
    : h.findIndex(x => x.includes("bedrag"));
  const ci = isPayPal
    ? h.findIndex(x => x.includes("naam") || x.includes("name"))
    : h.findIndex(x => x.includes("tegenpartij") && !x.includes("rekening") && !x.includes("adres"));
  const ti = h.findIndex(x => x.includes("type"));
  const mi = isPayPal
    ? h.findIndex(x => x.includes("itemtitel") || x.includes("item title") || x === "type")
    : h.findIndex(x => x.includes("mededeling"));
  if (di === -1 || ai === -1) return [];
  const txs = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length < 2) continue;
    const typeVal = (ti >= 0 ? cols[ti] : "").trim();
    const counterpartyVal = (ci >= 0 ? cols[ci] : "").trim();
    if (isPayPal) {
      if (typeVal === "Bankstorting naar PP-rekening") continue;
      if (!counterpartyVal) continue;
    }
    const dp = (cols[di] || "").match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (!dp) continue;
    const amt = isPayPal ? parseEuropeanAmount(cols[ai] ?? "") : parseFloat((cols[ai] || "0").replace(",", "."));
    if (isNaN(amt)) continue;
    txs.push({
      id: `tx_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      date: `${dp[3]}-${dp[2].padStart(2, "0")}-${dp[1].padStart(2, "0")}`,
      amount: amt,
      counterparty: counterpartyVal,
      type: typeVal,
      description: (mi >= 0 ? cols[mi] : "").trim(),
      categoryId: null, subCategoryId: null, splits: null, comment: "",
      source: isPayPal ? "paypal" : "crelan",
    });
  }
  return txs;
}
