export function normalizeSub(sub) {
  const label = sub.label || "variabel";
  return {
    ...sub,
    type: sub.type || (label === "vast" ? "vast" : "variabel"),
    necessity: sub.necessity || (label === "luxe" ? "luxe" : "nodig"),
    excluded: sub.excluded === true,
  };
}

export function isSubExcluded(cats, categoryId, subCategoryId) {
  const { sub } = resolveCatSub(cats, categoryId, subCategoryId);
  return sub ? sub.excluded === true : false;
}

export function normalizeCats(cats) {
  return (cats || []).map(c => ({ ...c, subs: (c.subs || []).map(normalizeSub) }));
}

export function resolveCatSub(cats, rawCatId, rawSubId) {
  if (!rawCatId) return { cat: null, sub: null };
  let cId = rawCatId, sId = rawSubId;
  if (typeof rawCatId === "string" && rawCatId.includes("|")) { const p = rawCatId.split("|"); cId = p[0]; sId = p[1]; }
  if (typeof rawSubId === "string" && rawSubId.includes("|")) { const p = rawSubId.split("|"); sId = p[1] || p[0]; }
  const cat = cats.find(c => c.id === cId);
  if (!cat) { for (const c of cats) { const s = c.subs.find(x => x.id === sId || x.id === rawSubId); if (s) return { cat: c, sub: s }; } return { cat: null, sub: null }; }
  const sub = cat.subs.find(s => s.id === sId) || cat.subs.find(s => s.id === rawSubId);
  return { cat, sub: sub || null };
}

export function getSuggestion(tx, cats, autoCat) {
  const m = autoCat(tx);
  if (m && m.categoryId) {
    const { cat, sub } = resolveCatSub(cats, m.categoryId, m.subCategoryId);
    if (cat && sub) return { catId: cat.id, subId: sub.id, catName: cat.name, subName: sub.name, color: cat.color, src: "auto" };
  }
  return null;
}

export function safeEvalMath(str) {
  const s = str.replace(/,/g, ".");
  if (/[^0-9+\-*/.()\s]/.test(s)) return NaN;
  try { return Function('"use strict"; return (' + s + ")")(); } catch { return NaN; }
}

export function netBalanceColor(amount) {
  if (amount > 0) return "var(--green)";
  if (amount < 0) return "var(--red)";
  return "var(--muted)";
}
