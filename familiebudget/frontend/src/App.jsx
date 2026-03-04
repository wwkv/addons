import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { List, Clock, X, ChevronDown, ChevronRight } from "lucide-react";

/* Utils */
import { DEFAULT_CATEGORIES, CALENDAR_MONTH_KEYS } from './utils/constants.js';
import { AUTO_RULES, DESC_RULES, AMT_RULES, MULTI } from './utils/rules.js';
import { fmt, fD, mN, isPerson } from './utils/formatters.js';
import { normalizeCats, isSubExcluded, resolveCatSub } from './utils/helpers.js';
import { parseCSV } from './utils/csvParser.js';

/* Components */
import ContextMenu from './components/ContextMenu.jsx';
import CatGrid from './components/CatGrid.jsx';
import CatPicker from './components/CatPicker.jsx';

/* Modals */
import TinderMode from './modals/TinderMode.jsx';
import SplitModal from './modals/SplitModal.jsx';
import CatDetailModal from './modals/CatDetailModal.jsx';

/* Views */
import BudgetTab from './views/BudgetTab.jsx';
import SavingsTab from './views/SavingsTab.jsx';
import DashboardView from './views/DashboardView.jsx';
import TransactionsView from './views/TransactionsView.jsx';
import CategoriesView from './views/CategoriesView.jsx';
import PatternsView from './views/PatternsView.jsx';

export default function App() {
  const [view, setView] = useState("dashboard");
  const [txs, setTxs] = useState([]);
  const [cats, setCats] = useState(() => normalizeCats(DEFAULT_CATEGORIES));
  const [rules, setRules] = useState({});
  const [settings, setSettings] = useState({ autoLevel: "normaal", darkMode: true, zoom: 100, bufferMultiplier: 5 });
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fCat, setFCat] = useState("");
  const [sort, setSort] = useState({ field: "date", dir: "desc" });
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(new Set());
  const lastClickedIndexRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [splitTx, setSplitTx] = useState(null);
  // const [askTx, setAskTx] = useState(null); // AskAI - disabled
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExcludeAddPicker, setShowExcludeAddPicker] = useState(false);
  const [importErr, setImportErr] = useState(null);
  const [editComment, setEditComment] = useState(null);
  const [tinderMode, setTinderMode] = useState(false);
  const [catDetail, setCatDetail] = useState(null);
  const [importSort, setImportSort] = useState({ field: "date", dir: "asc" });
  const [pending, setPending] = useState({});
  const [toast, setToast] = useState(null);
  const [recalcState, setRecalcState] = useState({ running: false, changed: 0 });
  const [contextMenu, setContextMenu] = useState(null);
  const [catClipboard, setCatClipboard] = useState(null);
  const [blacklist, setBlacklist] = useState([]);
  const [patternSearch, setPatternSearch] = useState("");
  const [pendingSort, setPendingSort] = useState({ field: "count", dir: "desc" });
  const [rulesSort, setRulesSort] = useState({ field: "pattern", dir: "asc" });
  const [savings, setSavings] = useState({ knownBalance: 0, knownDate: new Date().toISOString().split("T")[0], pots: [] });
  const fRef = useRef(null);
  const searchInputRef = useRef(null);
  const patternSearchInputRef = useRef(null);
  const displayedOrderRef = useRef([]);
  const lastSortFilterRef = useRef(null);
  const recalcCancelRef = useRef(false);
  const prevRulesCountRef = useRef(null);

  /* Theme: toggle data-theme attribute for CSS variables */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
  }, [settings.darkMode]);

  const catUsage = useMemo(() => {
    const u = {};
    txs.forEach(t => { if (t.subCategoryId) u[t.subCategoryId] = (u[t.subCategoryId] || 0) + 1; });
    return u;
  }, [txs]);

  /* Persistence — load from backend API */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('api/state/main');
        const d = await r.json();
        if (d && d.value) {
          const p = d.value;
          if (p.txs) setTxs(p.txs);
          if (p.cats) setCats(normalizeCats(p.cats));
          if (p.rules) setRules(p.rules);
          if (p.settings) setSettings(p.settings);
          if (p.pending) setPending(p.pending);
          if (p.blacklist) setBlacklist(p.blacklist);
          if (p.savings) {
            const s = p.savings;
            setSavings({ knownBalance: s.knownBalance ?? s.baseBalance ?? 0, knownDate: s.knownDate ?? s.baseDate ?? new Date().toISOString().split("T")[0], pots: s.pots || [] });
          }
        }
      } catch (e) { /* first load */ }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const save = async () => {
      try { await fetch('api/state/main', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: { txs, cats, rules, settings, pending, blacklist, savings } }) }); } catch (e) { /* ok */ }
    };
    const t = setTimeout(save, 600);
    return () => clearTimeout(t);
  }, [txs, cats, rules, settings, loaded, pending, blacklist, savings]);

  const handleExportBackup = async () => {
    try {
      const r = await fetch('api/backup/export', { method: 'POST' });
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `budget-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback: client-side export
      const data = { txs, cats, rules, settings, pending, blacklist, savings };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `budget-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleDeleteAllData = async () => {
    await handleExportBackup();
    setTxs([]);
    setCats(normalizeCats(DEFAULT_CATEGORIES));
    setRules({});
    setPending({});
    setBlacklist([]);
    setSavings({ knownBalance: 0, knownDate: new Date().toISOString().split("T")[0], pots: [] });
    setShowDeleteConfirm(false);
    setShowSettings(false);
  };

  const handleImportBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!window.confirm("Weet je zeker dat je deze backup wilt importeren? Dit overschrijft AL je huidige data (transacties, potjes, instellingen).")) {
      event.target.value = null;
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        // Send to backend first
        try {
          await fetch('api/backup/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
        } catch (err) {
          console.warn('Backend import failed, applying locally:', err);
        }
        // Then apply to local state
        if (data.txs) setTxs(data.txs);
        if (data.cats) setCats(normalizeCats(data.cats));
        if (data.rules) setRules(data.rules);
        if (data.settings) setSettings(data.settings);
        if (data.pending) setPending(data.pending);
        if (data.blacklist) setBlacklist(data.blacklist);
        if (data.savings) {
          const s = data.savings;
          setSavings({ knownBalance: s.knownBalance ?? s.baseBalance ?? 0, knownDate: s.knownDate ?? s.baseDate ?? new Date().toISOString().split("T")[0], pots: s.pots || [] });
        }
        alert("Backup succesvol geïmporteerd!");
      } catch (err) {
        alert("Fout bij het lezen van het bestand. Is het een geldige JSON backup?");
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const autoCat = useCallback((tx) => {
    if (blacklist.some(b => b.trim().toLowerCase() === tx.counterparty.trim().toLowerCase())) return null;
    const cpText = tx.counterparty.toLowerCase().trim();
    const descText = (tx.description || "").toLowerCase();
    const allText = `${cpText} ${descText}`;

    // 1. Learned rules: STRICTER check (only match counterparty to prevent false positives in descriptions)
    for (const [p, r] of Object.entries(rules)) {
      if (cpText.includes(p.toLowerCase())) {
        return { categoryId: r.catId, subCategoryId: r.subId, confidence: "learned" };
      }
    }

    // 2. Amount rules
    for (const r of AMT_RULES) {
      if (r.p.test(cpText) && Math.abs(tx.amount) === r.a) return { categoryId: r.c, subCategoryId: r.s, confidence: r.v };
    }

    // 3. Settings logic for hardcoded rules
    const minC = settings.autoLevel === "voorzichtig" ? "certain" : settings.autoLevel === "normaal" ? "high" : "medium";
    const order = ["certain", "high", "medium"];
    const mi = order.indexOf(minC);

    // 4. Counterparty rules (AUTO_RULES) - Looks at both cp and desc
    for (const r of AUTO_RULES) {
      if (r.p.test(allText)) {
        const ri = order.indexOf(r.v);
        if (ri <= mi) return { categoryId: r.c, subCategoryId: r.s, confidence: r.v };
        else return { categoryId: r.c, subCategoryId: r.s, confidence: "suggestion" };
      }
    }

    // 5. Description rules (DESC_RULES) - e.g. "frietjes", "kapper", "cadeau"
    for (const r of DESC_RULES) {
      if (r.p.test(descText)) {
        const ri = order.indexOf(r.v);
        if (ri <= mi) return { categoryId: r.c, subCategoryId: r.s, confidence: r.v };
        else return { categoryId: r.c, subCategoryId: r.s, confidence: "suggestion" };
      }
    }

    // 6. Multi-vendor & Person check (MOVED DOWN so they don't block Mededeling/Auto rules)
    for (const p of MULTI) { if (p.test(cpText)) return { flag: "multi" }; }
    if (isPerson(tx.counterparty)) return { flag: "person" };

    return null;
  }, [rules, settings.autoLevel, blacklist]);

  /* Auto-trigger recalculation when a pattern is assigned (rules count increases) */
  useEffect(() => {
    if (!loaded) return;
    const rulesCount = Object.keys(rules).length;
    if (prevRulesCountRef.current === null) {
      prevRulesCountRef.current = rulesCount;
      return;
    }
    if (rulesCount <= prevRulesCountRef.current) return;
    prevRulesCountRef.current = rulesCount;

    recalcCancelRef.current = false;
    setRecalcState({ running: true, changed: 0 });
    const uncat = txs.filter(t => !t.categoryId && !t.splits);
    const updates = [];
    const CHUNK = 200;

    (async () => {
      for (let i = 0; i < uncat.length; i += CHUNK) {
        if (recalcCancelRef.current) break;
        const chunk = uncat.slice(i, i + CHUNK);
        for (const t of chunk) {
          const m = autoCat(t);
          if (m && m.categoryId && m.confidence !== "suggestion") {
            updates.push({ id: t.id, categoryId: m.categoryId, subCategoryId: m.subCategoryId });
          }
        }
        await new Promise(r => setTimeout(r, 0));
      }
      if (updates.length > 0) {
        const updatesMap = new Map(updates.map(u => [u.id, u]));
        setTxs(p => p.map(t => {
          const u = updatesMap.get(t.id);
          return u ? { ...t, categoryId: u.categoryId, subCategoryId: u.subCategoryId } : t;
        }));
        setToast(`🔄 ${updates.length} transacties opnieuw gecategoriseerd`);
        setTimeout(() => setToast(null), 3000);
      }
      setRecalcState({ running: false, changed: updates.length });
    })();

    return () => { recalcCancelRef.current = true; };
  }, [rules, loaded, autoCat]);

  /* Learn pattern — requires N consistent categorizations before creating rule.
     Force-learn (⌘/⇧+click) bypasses and creates immediately. */
  const patThreshold = settings.patternThreshold || 3;
  const personThreshold = settings.personThreshold || 6;

  const applyRuleToMatching = useCallback((patternKey, catId, subId) => {
    setTxs(prev => prev.map(t => {
      const key = t.counterparty.trim().toLowerCase().slice(0, 30);
      if (key === patternKey && !t.categoryId && !(t.splits?.length > 1)) return { ...t, categoryId: catId, subCategoryId: subId };
      return t;
    }));
  }, []);

  const learnRule = useCallback((tx, catId, subId, force, incrementBy = 1) => {
    if (subId === "te_categoriseren" || catId === "nog_te_verwerken") return;
    if (blacklist.some(b => b.trim().toLowerCase() === tx.counterparty.trim().toLowerCase())) return;
    const cp = tx.counterparty.toLowerCase();
    const person = isPerson(tx.counterparty);
    const multi = MULTI.some(p => p.test(cp));
    if (multi && !force) return; // Don't auto-learn multi-vendors
    const k = tx.counterparty.trim().toLowerCase().slice(0, 30);
    if (k.length <= 2) return;
    const needed = person ? personThreshold : patThreshold;

    // --- HANDLE FORCE LEARN ---
    if (force) {
      setRules(p => ({ ...p, [k]: { catId, subId } }));
      setPending(p => { const n = { ...p }; delete n[k]; return n; });
      applyRuleToMatching(k, catId, subId); // FIX: Now applies to history immediately!
      setToast(`🧠 Patroon geforceerd: "${k}"`);
      setTimeout(() => setToast(null), 2500);
      return;
    }

    // --- HANDLE AUTO LEARN ---
    const existing = pending[k];
    let newCount = incrementBy;
    // If categorized exactly the same way, increment. Otherwise, reset count.
    if (existing && existing.catId === catId && existing.subId === subId) {
      newCount = (existing.count ?? 0) + incrementBy;
    }
    if (newCount >= needed) {
      // Threshold reached! Move to rules, remove from pending, apply to history
      setRules(p => ({ ...p, [k]: { catId, subId } }));
      setPending(p => { const n = { ...p }; delete n[k]; return n; });
      applyRuleToMatching(k, catId, subId);
      setToast(`Patroon automatisch bevestigd: "${k}"`);
      setTimeout(() => setToast(null), 2500);
    } else {
      // Threshold not reached, just safely update the pending count
      setPending(p => ({ ...p, [k]: { catId, subId, count: newCount, person } }));
    }
  }, [patThreshold, personThreshold, blacklist, applyRuleToMatching, pending]);

  const handleSmartImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const isJSON = file.name.toLowerCase().endsWith(".json");
    if (isJSON) {
      if (!window.confirm("Je staat op het punt een backup te herstellen. Dit overschrijft AL je huidige data. Weet je het zeker?")) {
        event.target.value = null;
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.txs) setTxs(data.txs);
          if (data.cats) setCats(normalizeCats(data.cats));
          if (data.rules) setRules(data.rules);
          if (data.settings) setSettings(data.settings);
          if (data.pending) setPending(data.pending);
          if (data.blacklist) setBlacklist(data.blacklist);
          if (data.savings) {
            const s = data.savings;
            setSavings({ knownBalance: s.knownBalance ?? s.baseBalance ?? 0, knownDate: s.knownDate ?? s.baseDate ?? new Date().toISOString().split("T")[0], pots: s.pots || [] });
          }
          alert("Backup succesvol geïmporteerd!");
        } catch (err) {
          alert("Fout bij het lezen van het backup bestand.");
        }
      };
      reader.readAsText(file);
    } else {
      handleFile(event);
    }
    event.target.value = null;
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImportErr(null);
    if (/\.xls/i.test(f.name)) { setImportErr("Excel bestand. Exporteer als CSV vanuit Crelan."); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (!parsed.length) { setImportErr("Geen transacties gevonden."); return; }
      const dupKey = (t) => `${t.date}_${t.amount}_${(t.counterparty || "").toLowerCase().trim()}`;
      const existingKeys = new Set(txs.map(dupKey));
      const withCats = parsed.map(tx => {
        const isDupe = existingKeys.has(dupKey(tx));
        if (isDupe) return { ...tx, _d: true, _v: "dupe", _isDuplicate: true };
        let crelanMatch = null;
        if (tx.source === "paypal") {
          const candidates = txs.filter(ex => {
            const cp = (ex.counterparty || "").toLowerCase();
            if (!cp.includes("paypal")) return false;
            if (Math.abs(ex.amount) !== Math.abs(tx.amount)) return false;
            return true;
          });
          const paypalTs = new Date(tx.date).getTime();
          const minTs = paypalTs - 2 * 24 * 60 * 60 * 1000;
          const maxTs = paypalTs + 8 * 24 * 60 * 60 * 1000;
          if (candidates.length === 0) {
            crelanMatch = null;
          } else if (candidates.length === 1) {
            const cTs = new Date(candidates[0].date).getTime();
            crelanMatch = cTs >= minTs && cTs <= maxTs ? candidates[0] : null;
          } else {
            const valid = candidates.filter(c => {
              const cTs = new Date(c.date).getTime();
              return cTs >= paypalTs && cTs <= maxTs;
            });
            crelanMatch = valid.length > 0
              ? valid.sort((a, b) => {
                  const aTs = new Date(a.date).getTime();
                  const bTs = new Date(b.date).getTime();
                  return Math.abs(aTs - paypalTs) - Math.abs(bTs - paypalTs);
                })[0]
              : null;
          }
        }
        if (crelanMatch) {
          const base = { ...tx, _matchedId: crelanMatch.id };
          if (crelanMatch.categoryId) return { ...base, categoryId: crelanMatch.categoryId, subCategoryId: crelanMatch.subCategoryId ?? null, _d: false, _v: "matched" };
          return { ...base, _d: false, _v: "crelan_match" };
        }
        const m = autoCat(tx);
        if (!m) return { ...tx, _d: false, _v: "none" };
        if (m.flag) return { ...tx, _d: false, _v: m.flag };
        if (m.confidence === "suggestion") return { ...tx, _d: false, _v: "suggestion", _sc: m.categoryId, _ss: m.subCategoryId };
        return { ...tx, categoryId: m.categoryId, subCategoryId: m.subCategoryId, _d: false, _v: m.confidence };
      });
      setPreview(withCats);
      setImporting(true);
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  const setCatPrev = (txId, catId, subId) => {
    setPreview(prev => {
      if (!prev) return prev;
      const tx = prev.find(t => t.id === txId);
      if (!tx) return prev;
      const cpK = tx.counterparty.trim().toLowerCase().slice(0, 30);
      return prev.map(t => {
        if (t.id === txId) return { ...t, categoryId: catId, subCategoryId: subId, _v: "manual" };
        if (!t.categoryId && !t._d && t.counterparty.trim().toLowerCase().slice(0, 30) === cpK) return { ...t, categoryId: catId, subCategoryId: subId, _v: "auto_sibling" };
        return t;
      });
    });
    const tx = preview ? preview.find(t => t.id === txId) : null;
    if (tx) learnRule(tx, catId, subId, false);
  };

  const confirmImport = () => {
    if (!preview) return;
    const strip = (t) => {
      const { _d, _v, _sc, _ss, _isDuplicate, _matchedId, ...c } = t;
      return c;
    };
    const matchedPayPal = preview.filter(t => !t._d && t.source === "paypal" && t._matchedId);
    const toInsert = preview.filter(t => !t._d && !(t.source === "paypal" && !t._matchedId) && t.source !== "paypal");
    setTxs(prev => {
      let next = [...prev];
      for (const row of matchedPayPal) {
        const existing = next.find(t => t.id === row._matchedId);
        if (existing) {
          next = next.map(t =>
            t.id === row._matchedId
              ? { ...t, counterparty: row.counterparty, description: row.description ?? t.description, categoryId: row.categoryId ?? t.categoryId, subCategoryId: row.subCategoryId ?? t.subCategoryId, splits: null }
              : t
          );
        }
      }
      return [...next, ...toInsert.map(strip)];
    });
    const affectedDates = [...matchedPayPal.map(r => { const ex = txs.find(t => t.id === r._matchedId); return ex?.date; }).filter(Boolean), ...toInsert.map(t => t.date)];
    if (affectedDates.length > 0) {
      const yCounts = {};
      affectedDates.forEach(d => { const y = d.slice(0, 4); yCounts[y] = (yCounts[y] || 0) + 1; });
      const topYear = Object.entries(yCounts).sort((a, b) => b[1] - a[1])[0][0];
      setYear(topYear);
    }
    setImporting(false);
    setPreview(null);
    setView("transactions");
  };

  const assign = (txId, catId, subId, forceLearn) => {
    setTxs(p => p.map(t => t.id === txId ? { ...t, categoryId: catId, subCategoryId: subId, splits: null } : t));
    const tx = txs.find(t => t.id === txId);
    if (tx) learnRule(tx, catId, subId, forceLearn);
  };

  const bulkAssign = (catId, subId, idsOverride) => {
    const targetIds = idsOverride ?? [...sel];
    const selected = txs.filter(t => targetIds.includes(t.id));
    const byKey = {};
    for (const tx of selected) {
      const k = tx.counterparty.trim().toLowerCase().slice(0, 30);
      if (k.length <= 2) continue;
      if (!byKey[k]) byKey[k] = { tx, count: 0 };
      byKey[k].count++;
    }
    for (const { tx, count } of Object.values(byKey)) {
      learnRule(tx, catId, subId, false, count);
    }
    const targetSet = new Set(targetIds);
    setTxs(p => p.map(tx => {
      if (!targetSet.has(tx.id)) return tx;
      return { ...tx, categoryId: catId, subCategoryId: subId, splits: null };
    }));
    if (!idsOverride) setSel(new Set());
  };

  /* Computed */
  const years = useMemo(() => { const y = new Set(txs.map(t => t.date.slice(0, 4))); if (!y.size) y.add(new Date().getFullYear().toString()); return [...y].sort().reverse(); }, [txs]);

  const filtered = useMemo(() => {
    let f = [...txs];
    if (year) f = f.filter(t => t.date.startsWith(year));
    if (month) f = f.filter(t => t.date.slice(5, 7) === month);
    if (startDate) f = f.filter(t => t.date >= startDate);
    if (endDate) f = f.filter(t => t.date <= endDate);
    if (fCat === "_none") f = f.filter(t => !t.categoryId);
    else if (fCat) f = f.filter(t => t.categoryId === fCat);
    if (search) { const s = search.toLowerCase(); f = f.filter(t => t.counterparty.toLowerCase().includes(s) || t.description.toLowerCase().includes(s) || (t.comment || "").toLowerCase().includes(s)); }
    const { field, dir } = sort;
    const tagOrder = (t) => { const { sub } = resolveCatSub(cats, t.categoryId, t.subCategoryId); const ty = sub ? (sub.type || "variabel") : "zzz"; const ne = sub ? (sub.necessity || "nodig") : "zzz"; return `${ty === "vast" ? "0" : ty === "variabel" ? "1" : "2"}-${ne === "nodig" ? "0" : ne === "luxe" ? "1" : "2"}`; };
    f.sort((a, b) => { let c = 0; if (field === "date") c = a.date.localeCompare(b.date); else if (field === "amount") c = a.amount - b.amount; else if (field === "counterparty") c = a.counterparty.localeCompare(b.counterparty); else if (field === "category") c = (a.categoryId || "zzz").localeCompare(b.categoryId || "zzz"); else if (field === "tags") c = tagOrder(a).localeCompare(tagOrder(b)); return dir === "asc" ? c : -c; });
    return f;
  }, [txs, year, month, startDate, endDate, fCat, search, sort, cats]);

  const sortFilterKey = JSON.stringify([sort.field, sort.dir, fCat, month, search, year, startDate, endDate]);
  if (lastSortFilterRef.current !== sortFilterKey) {
    lastSortFilterRef.current = sortFilterKey;
    displayedOrderRef.current = filtered.map(t => t.id);
  }

  const displayed = useMemo(() => {
    const order = displayedOrderRef.current;
    const filteredMap = new Map(filtered.map(t => [t.id, t]));
    if (order.length === 0) return filtered;
    const seen = new Set();
    const result = [];
    for (const id of order) {
      if (filteredMap.has(id)) {
        result.push(filteredMap.get(id));
        seen.add(id);
      }
    }
    for (const t of filtered) {
      if (!seen.has(t.id)) result.push(t);
    }
    return result;
  }, [filtered]);

  const handleRowClick = useCallback((e, index) => {
    if (e.target.closest('button, input, select, [role="button"]')) return;
    const tx = displayed[index];
    if (!tx) return;
    if (e.shiftKey) {
      const last = lastClickedIndexRef.current;
      const lo = last != null ? Math.min(last, index) : index;
      const hi = last != null ? Math.max(last, index) : index;
      setSel(new Set(displayed.slice(lo, hi + 1).map(t => t.id)));
    } else if (e.metaKey || e.ctrlKey) {
      setSel(p => {
        const n = new Set(p);
        if (n.has(tx.id)) n.delete(tx.id); else n.add(tx.id);
        return n;
      });
      lastClickedIndexRef.current = index;
    } else {
      setSel(new Set([tx.id]));
      lastClickedIndexRef.current = index;
    }
  }, [displayed]);

  const expanded = useMemo(() => {
    const r = [];
    for (const tx of txs) {
      if (tx.splits && tx.splits.length > 1) { for (const s of tx.splits) r.push({ ...tx, amount: tx.amount * s.percentage / 100, categoryId: s.categoryId, subCategoryId: s.subCategoryId }); }
      else r.push(tx);
    }
    return r;
  }, [txs]);

  /** Monthly stats: strict calendar year (selected year only), all 12 months 01…12, no rolling window. */
  const mStats = useMemo(() => {
    const yt = expanded.filter(t => t.date.startsWith(year));
    const s = {};
    for (let i = 0; i < 12; i++) {
      const k = CALENDAR_MONTH_KEYS[i];
      const mt = yt.filter(t => t.date.slice(5, 7) === k);
      const notExcl = t => !isSubExcluded(cats, t.categoryId, t.subCategoryId);
      s[k] = {
        inc: mt.filter(t => t.amount > 0 && notExcl(t)).reduce((a, t) => a + t.amount, 0),
        exp: mt.filter(t => t.amount < 0 && notExcl(t)).reduce((a, t) => a + Math.abs(t.amount), 0),
        cnt: mt.length,
      };
    }
    return s;
  }, [expanded, year, cats]);

  const filteredRulesEntries = useMemo(() => {
    const entries = Object.entries(rules);
    entries.sort((a, b) => {
      let c = 0;
      if (rulesSort.field === "pattern") c = a[0].localeCompare(b[0]);
      else if (rulesSort.field === "category") {
        const catA = cats.find(x => x.id === a[1].catId)?.name || "";
        const catB = cats.find(x => x.id === b[1].catId)?.name || "";
        c = catA.localeCompare(catB);
      }
      return rulesSort.dir === "asc" ? c : -c;
    });
    const q = patternSearch.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(([p, r]) => {
      const cat = cats.find(x => x.id === r.catId);
      const sub = cat ? cat.subs.find(x => x.id === r.subId) : null;
      const catName = cat ? cat.name : "";
      const subName = sub ? sub.name : "";
      const hay = `${p} ${catName} ${subName}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rules, cats, patternSearch, rulesSort]);

  const catStats = useMemo(() => {
    let et = expanded.filter(t => t.date.startsWith(year) && t.amount < 0 && !isSubExcluded(cats, t.categoryId, t.subCategoryId));
    if (month) et = et.filter(t => t.date.slice(5, 7) === month);
    const s = {};
    for (const c of cats) { if (c.type === "inkomsten") continue; const ct = et.filter(t => t.categoryId === c.id); const tot = ct.reduce((a, t) => a + Math.abs(t.amount), 0); const subs = {}; for (const sub of c.subs) subs[sub.id] = ct.filter(t => t.subCategoryId === sub.id).reduce((a, t) => a + Math.abs(t.amount), 0); s[c.id] = { total: tot, subs, count: ct.length }; }
    s._uncat = { total: et.filter(t => !t.categoryId).reduce((a, t) => a + Math.abs(t.amount), 0), count: et.filter(t => !t.categoryId).length };
    return s;
  }, [expanded, cats, year, month]);

  /* Fixed vs Variable: aggregate ONLY by subcategory.type — Vast, Variabel, Onbekend */
  const typeStats = useMemo(() => {
    let et = expanded.filter(t => t.date.startsWith(year) && t.amount < 0);
    if (month) et = et.filter(t => t.date.slice(5, 7) === month);
    const s = { vast: 0, variabel: 0, onbekend: 0 };
    for (const t of et) {
      const cat = cats.find(c => c.id === t.categoryId);
      const sub = cat ? cat.subs.find(ss => ss.id === t.subCategoryId) : null;
      if (!sub) { s.onbekend += Math.abs(t.amount); continue; }
      if (sub.excluded) continue;
      const type = sub.type || "variabel";
      if (type === "vast") s.vast += Math.abs(t.amount);
      else s.variabel += Math.abs(t.amount);
    }
    return s;
  }, [expanded, cats, year, month]);

  /* Necessity vs Luxury: aggregate ONLY by subcategory.necessity — Nodig, Luxe, Onbekend */
  const necessityStats = useMemo(() => {
    let et = expanded.filter(t => t.date.startsWith(year) && t.amount < 0);
    if (month) et = et.filter(t => t.date.slice(5, 7) === month);
    const s = { nodig: 0, luxe: 0, onbekend: 0 };
    for (const t of et) {
      const cat = cats.find(c => c.id === t.categoryId);
      const sub = cat ? cat.subs.find(ss => ss.id === t.subCategoryId) : null;
      if (!sub) { s.onbekend += Math.abs(t.amount); continue; }
      if (sub.excluded) continue;
      const necessity = sub.necessity || "nodig";
      if (necessity === "luxe") s.luxe += Math.abs(t.amount);
      else s.nodig += Math.abs(t.amount);
    }
    return s;
  }, [expanded, cats, year, month]);

  const totalExp = Object.values(catStats).reduce((s, c) => s + c.total, 0);
  const uncatN = useMemo(() => txs.filter(t => t.date.startsWith(year) && !t.categoryId).length, [txs, year]);

  /* Unassigned savings: for Sparen tab notification dot */
  const unassignedSavings = useMemo(() => {
    const startOfYear = `${year}-01-01`;
    const knownDate = savings?.knownDate || "";
    const savingsWindowTxs = knownDate
      ? txs.filter(tx => tx.categoryId === "sparen" && tx.date >= startOfYear && tx.date <= knownDate)
      : [];
    const netChange = savingsWindowTxs.reduce((sum, tx) => sum + (-(tx.amount || 0)), 0);
    const jan1Balance = (savings?.knownBalance || 0) - netChange;
    const yearTxs = txs.filter(tx => tx.categoryId === "sparen" && tx.date >= startOfYear);
    const totalSavedThisYear = yearTxs.reduce((sum, tx) => sum + (-(tx.amount || 0)), 0);
    const liveTotal = jan1Balance + totalSavedThisYear;

    const data = expanded ?? txs;
    const yearExpenses = data.filter(t => t.date.startsWith(year.toString()) && Number(t.amount) < 0);
    const nodigTxs = yearExpenses.filter(t => {
      const cat = cats.find(c => c.id === t.categoryId);
      const sub = cat ? cat.subs.find(ss => ss.id === t.subCategoryId) : null;
      if (!cat || !sub || sub.excluded || cat.id === "sparen") return false;
      const necessity = sub.necessity || "nodig";
      return necessity !== "luxe";
    });
    const uniqueMonths = new Set(nodigTxs.map(t => t.date.substring(0, 7)));
    const totalNodigSpend = Math.abs(nodigTxs.reduce((sum, t) => sum + Number(t.amount), 0));
    const activeMonthsCount = uniqueMonths.size > 0 ? uniqueMonths.size : 1;
    const avgMonthlyNodig = totalNodigSpend / activeMonthsCount;
    const mult = settings?.bufferMultiplier || 5;
    const rawBuffer = avgMonthlyNodig * mult;
    const bufferTarget = Math.ceil(rawBuffer / 500) * 500;

    const bufferAllocated = Math.min(liveTotal, bufferTarget);
    let rollingAvailable = Math.max(0, liveTotal - bufferAllocated);
    for (const pot of (savings?.pots || [])) {
      const intent = Number(pot.saved) || 0;
      const actualAllocated = Math.min(intent, rollingAvailable);
      rollingAvailable -= actualAllocated;
    }
    return rollingAvailable;
  }, [txs, expanded, cats, year, settings, savings]);

  const sortedPreview = useMemo(() => {
    if (!preview) return [];
    const f = [...preview];
    const { field, dir } = importSort;
    f.sort((a, b) => { let c = 0; if (field === "date") c = a.date.localeCompare(b.date); else if (field === "amount") c = a.amount - b.amount; else if (field === "counterparty") c = a.counterparty.localeCompare(b.counterparty); else if (field === "category") c = (a.categoryId || "zzz").localeCompare(b.categoryId || "zzz"); return dir === "asc" ? c : -c; });
    return f;
  }, [preview, importSort]);

  /* Lookup Button */
  if (!loaded) return <div className="loading-screen"><div>💰<br /><span style={{ fontSize: 13, opacity: 0.6 }}>Laden...</span></div></div>;

  return (
    <div className="app-shell" style={{ zoom: (settings.zoom || 100) / 100 }}>

      {/* ─── HEADER ─── */}
      <header className="app-header">
        <div style={{ flex: 1, display: "flex", gap: 3, alignItems: "center", justifyContent: "flex-start", minWidth: 0 }}>
          <input type="file" ref={fRef} onChange={handleSmartImport} accept=".csv,.json,.txt" style={{ display: "none" }} />
          <button onClick={() => fRef.current && fRef.current.click()} style={{ padding: "4px 9px", borderRadius: 5, border: "none", background: "#4A7C59", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Importeer</button>
          {uncatN > 0 && <button onClick={() => setTinderMode(true)} style={{ padding: "4px 9px", borderRadius: 5, border: "none", background: "#B5597B", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Sorteer ({uncatN})</button>}
        </div>
        <nav style={{ display: "flex", gap: 1, background: "var(--card)", borderRadius: 7, padding: 2, border: "1px solid var(--border)", flexShrink: 0 }}>
          {[{ id: "dashboard", l: "📊 Overzicht" }, { id: "budget", l: "💰 Budget" }, { id: "transactions", l: "📋 Transacties" }, { id: "categories", l: "🏷️ Categorieën" }, { id: "patterns", l: "🧠 Patronen" }, { id: "savings", l: "🐖 Sparen" }].map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)} style={{ padding: "4px 9px", borderRadius: 5, border: "none", background: view === tab.id ? "var(--border)" : "transparent", color: view === tab.id ? "var(--text)" : "var(--muted)", cursor: "pointer", fontSize: 10, fontWeight: 500, position: tab.id === "savings" ? "relative" : undefined }}>
              {tab.l}
              {tab.id === "savings" && unassignedSavings > 0 && (
                <div style={{ position: "absolute", top: "4px", right: "4px", width: "10px", height: "10px", backgroundColor: "#4ade80", borderRadius: "50%", boxShadow: "0 0 8px rgba(74, 222, 128, 0.8)" }} />
              )}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1, display: "flex", gap: 3, alignItems: "center", justifyContent: "flex-end", minWidth: 0 }}>
          <select value={year} onChange={e => setYear(e.target.value)} style={{ padding: "3px 5px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 10 }}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
          <button onClick={() => setSettings(s => ({ ...s, darkMode: !s.darkMode }))} style={{ padding: "4px 7px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 10 }}>{settings.darkMode ? "☀️" : "🌙"}</button>
          <button onClick={() => setSettings(s => ({ ...s, zoom: Math.min((s.zoom || 100) + 25, 150) }))} style={{ padding: "4px 5px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>A+</button>
          <button onClick={() => setSettings(s => ({ ...s, zoom: Math.max((s.zoom || 100) - 25, 75) }))} style={{ padding: "4px 5px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>A−</button>
          <button onClick={() => setShowSettings(true)} style={{ padding: "4px 7px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 10 }}>⚙️</button>
        </div>
      </header>

      {/* Toast notification */}
      {toast && (
        <div style={{ position: "fixed", top: 52, left: "50%", transform: "translateX(-50%)", zIndex: 400, background: "#4A7C59", color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.3)", animation: "none", pointerEvents: "none" }}>
          {toast}
        </div>
      )}

      {/* Context menu - portaled to body to avoid zoom/transform breaking position:fixed */}
      {contextMenu && createPortal(
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: "Copy Category", disabled: !contextMenu.tx.categoryId, onClick: () => setCatClipboard({ categoryId: contextMenu.tx.categoryId, subCategoryId: contextMenu.tx.subCategoryId }) },
            { label: "Paste Category", disabled: !catClipboard?.categoryId, onClick: () => { const targetIds = sel.size > 0 ? [...sel] : [contextMenu.tx.id]; bulkAssign(catClipboard.categoryId, catClipboard.subCategoryId, targetIds); } },
            { label: "Aan blacklist toevoegen", onClick: () => {
              const cp = contextMenu.tx.counterparty.trim();
              if (!blacklist.some(b => b.trim().toLowerCase() === cp.toLowerCase())) {
                setBlacklist(p => [...p, cp]);
                const k = cp.toLowerCase().slice(0, 30);
                setRules(r => { const n = { ...r }; delete n[k]; return n; });
                setPending(p => { const n = { ...p }; delete n[k]; return n; });
                setToast(`🚫 "${cp}" aan blacklist toegevoegd`);
                setTimeout(() => setToast(null), 2500);
              }
            } },
            { label: "🗑️ Verwijder transactie" + (sel.size > 1 ? "s" : ""), onClick: () => {
              if (!window.confirm("Weet je zeker dat je deze transactie(s) wilt verwijderen?")) return;
              const targetIds = sel.size > 0 ? sel : new Set([contextMenu.tx.id]);
              setTxs(p => p.filter(t => !targetIds.has(t.id)));
              setSel(new Set());
              setContextMenu(null);
            } },
            ...(sel.size > 1 && sel.has(contextMenu.tx.id) ? [
              { label: "🔗 Samenvoegen (Bedragen optellen)", onClick: () => {
                if (!window.confirm("Weet je zeker dat je deze wilt samenvoegen (bedragen optellen)?")) return;
                const primaryId = contextMenu.tx.id;
                setTxs(p => {
                  const totalAmount = Array.from(sel).reduce((sum, id) => {
                    const t = p.find(x => x.id === id);
                    return sum + (t?.amount || 0);
                  }, 0);
                  const toRemove = new Set(sel);
                  toRemove.delete(primaryId);
                  const filtered = p.filter(t => !toRemove.has(t.id));
                  return filtered.map(t => t.id === primaryId ? { ...t, amount: totalAmount } : t);
                });
                setSel(new Set());
                setContextMenu(null);
              } },
              { label: "🔗 Samenvoegen (Behoud dit bedrag)", onClick: () => {
                if (!window.confirm("Weet je zeker dat je deze wilt samenvoegen (enkel dit bedrag behouden)?")) return;
                const primaryId = contextMenu.tx.id;
                setTxs(p => p.filter(t => t.id === primaryId || !sel.has(t.id)));
                setSel(new Set());
                setContextMenu(null);
              } },
            ] : []),
          ]}
        />,
        document.body
      )}

      {/* ─── MODALS ─── */}
      {tinderMode && <TinderMode txs={txs} cats={cats} autoCat={autoCat} catUsage={catUsage} blacklist={blacklist} onAddToBlacklist={(cp) => { if (!blacklist.some(b => b.trim().toLowerCase() === cp.trim().toLowerCase())) setBlacklist(p => [...p, cp.trim()]); }} onAssign={(id, c, s) => assign(id, c, s, false)} onSkip={(id) => assign(id, "nog_te_verwerken", "te_categoriseren", false)} onUndo={(id) => setTxs(p => p.map(t => t.id === id ? { ...t, categoryId: null, subCategoryId: null } : t))} onClose={() => setTinderMode(false)} />}
      {splitTx && <SplitModal tx={splitTx} cats={cats} onSave={splits => { setTxs(p => p.map(t => t.id === splitTx.id ? { ...t, splits, categoryId: splits[0].categoryId, subCategoryId: splits[0].subCategoryId } : t)); setSplitTx(null); }} onClose={() => setSplitTx(null)} />}
      {/* AskAI disabled {askTx && <AskAI tx={askTx} cats={cats} onAccept={(c, s) => { assign(askTx.id, c, s, false); setAskTx(null); }} onClose={() => setAskTx(null)} />} */}
      {catDetail && <CatDetailModal catId={catDetail} cats={cats} catStats={catStats} expanded={expanded} year={year} month={month} onClose={() => setCatDetail(null)} />}

      {/* Recalc loading overlay */}
      {recalcState.running && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 24, maxWidth: 320, width: "90%", border: "1px solid var(--border)", textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔄</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Heranalyse...</div>
            <div style={{ fontSize: 11, opacity: 0.6, color: "var(--text)", marginBottom: 16 }}>Past patronen toe op ongecategoriseerde transacties</div>
            <button onClick={() => { recalcCancelRef.current = true; }} style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 12 }}>Annuleren</button>
          </div>
        </div>
      )}

      {/* Settings */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 20, maxWidth: 440, width: "90%", border: "1px solid var(--border)", maxHeight: "80vh", overflow: "auto" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>⚙️ Instellingen</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>Auto-categorisatie</label>
              {[{ v: "voorzichtig", l: "🔒 Voorzichtig", d: "Enkel 100% zekere" }, { v: "normaal", l: "⚖️ Normaal", d: "Zeker + waarschijnlijk" }, { v: "ambitieus", l: "🚀 Ambitieus", d: "Alles incl. mededeling" }].map(o => (
                <label key={o.v} style={{ display: "flex", gap: 6, padding: "6px 8px", borderRadius: 5, border: settings.autoLevel === o.v ? "2px solid var(--accent)" : "1px solid var(--border)", cursor: "pointer", marginBottom: 3 }}>
                  <input type="radio" checked={settings.autoLevel === o.v} onChange={() => setSettings(s => ({ ...s, autoLevel: o.v }))} style={{ accentColor: "var(--accent)" }} />
                  <div><div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{o.l}</div><div style={{ fontSize: 9, opacity: 0.5, color: "var(--text)" }}>{o.d}</div></div>
                </label>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>🧠 Patroon drempels</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, opacity: 0.6, color: "var(--text)", marginBottom: 2 }}>Normaal</div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {[2, 3, 4, 5].map(n => <button key={n} onClick={() => setSettings(s => ({ ...s, patternThreshold: n }))} style={{ width: 30, height: 26, borderRadius: 5, border: (settings.patternThreshold || 3) === n ? "2px solid var(--accent)" : "1px solid var(--border)", background: (settings.patternThreshold || 3) === n ? "var(--accent-20)" : "transparent", color: "var(--text)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{n}×</button>)}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, opacity: 0.6, color: "var(--text)", marginBottom: 2 }}>Personen</div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {[3, 4, 6, 8].map(n => <button key={n} onClick={() => setSettings(s => ({ ...s, personThreshold: n }))} style={{ width: 30, height: 26, borderRadius: 5, border: (settings.personThreshold || 6) === n ? "2px solid var(--accent)" : "1px solid var(--border)", background: (settings.personThreshold || 6) === n ? "var(--accent-20)" : "transparent", color: "var(--text)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{n}×</button>)}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 9, opacity: 0.4, color: "var(--text)" }}>Aantal keer dezelfde categorie vóór automatisch patroon</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>Spaarbuffer Maanden</label>
              <input type="number" min={3} max={10} value={settings.bufferMultiplier ?? 5} onChange={e => setSettings(s => ({ ...s, bufferMultiplier: Number(e.target.value) || 5 }))} style={{ padding: "6px 8px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 11, width: 80 }} />
              <div style={{ fontSize: 9, opacity: 0.4, color: "var(--text)", marginTop: 4 }}>Aantal maanden nodig-uitgaven voor spaarbuffer doel</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>🧠 {Object.keys(rules).length} patronen · {Object.keys(pending).length} in afwachting</span>
              <button onClick={() => setView("patterns")} style={{ marginLeft: 6, padding: "2px 8px", borderRadius: 3, border: "1px solid var(--border)", background: "transparent", color: "var(--accent)", cursor: "pointer", fontSize: 9 }}>Beheer →</button>
              <button onClick={() => { if (confirm("Alle patronen wissen?")) setRules({}); }} style={{ marginLeft: 4, padding: "2px 6px", borderRadius: 3, border: "1px solid #C06E52", background: "transparent", color: "#C06E52", cursor: "pointer", fontSize: 9 }}>Wis alles</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>Volgende subcategorieën worden uitgesloten van het totaal:</label>
              <div style={{ position: "relative", background: "var(--bg)", borderRadius: 6, padding: 8, paddingRight: 36, border: "1px solid var(--border)", minHeight: 44 }}>
                <button type="button" onClick={() => setShowExcludeAddPicker(!showExcludeAddPicker)} style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 5, border: "1px dashed var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 14, fontWeight: 300, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }} title="Subcategorie toevoegen">+</button>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  {cats.flatMap(c => c.subs.filter(s => s.excluded).map(s => ({ cat: c, sub: s }))).map(({ cat, sub }) => (
                    <span key={sub.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 5, background: cat.color + "20", border: `1px solid ${cat.color}40`, fontSize: 10, color: "var(--text)" }}>
                      {cat.name} › {sub.name}
                      <button type="button" onClick={() => setCats(p => p.map(cat2 => cat2.id === cat.id ? { ...cat2, subs: cat2.subs.map(s2 => s2.id === sub.id ? { ...s2, excluded: false } : s2) } : cat2))} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--muted)", fontSize: 12, lineHeight: 1 }} aria-label="Verwijderen">✕</button>
                    </span>
                  ))}
                </div>
                {showExcludeAddPicker && (
                  <div style={{ marginTop: 10, padding: 10, background: "var(--card)", borderRadius: 8, border: "1px solid var(--border)", maxHeight: 280, overflow: "auto" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase" }}>Kies subcategorie om uit te sluiten</div>
                    <CatGrid cats={cats} catUsage={catUsage} tx={{ categoryId: null, subCategoryId: null }} handleSelect={(catId, subId) => { setCats(p => p.map(c => c.id === catId ? { ...c, subs: c.subs.map(s => s.id === subId ? { ...s, excluded: true } : s) } : c)); setShowExcludeAddPicker(false); }} />
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>Data &amp; Backup</label>
              <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>Maak een veilige kopie van al je transacties, spaardoelen en instellingen.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={handleExportBackup} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border)", background: "rgba(0,0,0,0.3)", color: "var(--text)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>📤 Exporteer Data</button>
                <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #C06E52", background: "transparent", color: "#C06E52", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>🗑️ Verwijder alle data</button>
              </div>
              {showDeleteConfirm && (
                <div style={{ marginTop: 12, padding: 14, borderRadius: 8, border: "1px solid #C06E52", background: "rgba(192,110,82,0.08)" }}>
                  <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 600, color: "#C06E52" }}>⚠️ Ben je zeker?</p>
                  <p style={{ margin: "0 0 12px", fontSize: 11, color: "var(--text)", opacity: 0.8 }}>Alle transacties, categorieën, patronen en spaardoelen worden gewist. Er wordt eerst automatisch een backup geëxporteerd.</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleDeleteAllData} style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: "#C06E52", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Ja, verwijder alles</button>
                    <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 11 }}>Annuleer</button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => { setShowExcludeAddPicker(false); setShowSettings(false); }} style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: "#4A7C59", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, width: "100%" }}>Sluiten</button>
          </div>
        </div>
      )}

      {importErr && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 20, maxWidth: 400, width: "90%", border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "var(--accent)" }}>⚠️</h3>
            <p style={{ fontSize: 12, color: "var(--text)", margin: "0 0 12px" }}>{importErr}</p>
            <button onClick={() => setImportErr(null)} style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: "#4A7C59", color: "#fff", cursor: "pointer", fontSize: 12 }}>OK</button>
          </div>
        </div>
      )}

      {/* Import Preview */}
      {importing && preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 18, maxWidth: 860, width: "95%", maxHeight: "88vh", overflow: "auto", border: "1px solid var(--border)" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{preview[0]?.source === "paypal" ? "PayPal Import" : "Crelan Import"}</h2>
            <p style={{ margin: "0 0 8px", fontSize: 10, opacity: 0.6, color: "var(--text)" }}>{preview.length} tx · {preview.filter(t => t._d).length} dupl · {preview.filter(t => t.categoryId).length} gecat · {preview.filter(t => !t.categoryId && !t._d).length} te doen</p>
            <div style={{ maxHeight: 420, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                <thead><tr style={{ position: "sticky", top: 0, zIndex: 3 }}>
                  {[{ f: "date", l: "Datum" }, { f: "amount", l: "Bedrag" }, { f: "counterparty", l: "Tegenpartij" }, { f: "category", l: "Categorie" }, { f: "status", l: "" }].map(col => (
                    <th key={col.f} onClick={() => { if (importSort.field === col.f) setImportSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" })); else setImportSort({ field: col.f, dir: "asc" }); }} style={{ padding: "5px 5px", textAlign: "left", fontSize: 9, fontWeight: 600, cursor: "pointer", userSelect: "none", color: "var(--text)", background: "var(--card)", borderBottom: "2px solid var(--border)" }}>
                      {col.l} {importSort.field === col.f ? (importSort.dir === "asc" ? "↑" : "↓") : ""}
                    </th>
                  ))}
                </tr></thead>
                <tbody>{sortedPreview.map(tx => {
                  const isDupe = tx._d;
                  const isPayPalIgnored = tx.source === "paypal" && !tx._matchedId && !isDupe;
                  const hideCatPicker = isDupe || isPayPalIgnored;
                  const cat = cats.find(c => c.id === (tx.categoryId || tx._sc));
                  const sub = cat ? cat.subs.find(s => s.id === (tx.subCategoryId || tx._ss)) : null;
                  return (
                    <tr key={tx.id} style={{ borderBottom: "1px solid var(--bg)", opacity: isDupe ? 0.2 : isPayPalIgnored ? 0.5 : 1 }}>
                      <td style={{ padding: "3px 5px", fontFamily: "'DM Mono',monospace", fontSize: 9 }}>{fD(tx.date)}</td>
                      <td style={{ padding: "3px 5px", fontFamily: "'DM Mono',monospace", fontSize: 9, color: tx.amount > 0 ? "var(--green)" : "var(--red)" }}>{fmt(tx.amount)}</td>
                      <td style={{ padding: "3px 5px", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.counterparty}
                        {tx._v === "multi" && <span style={{ fontSize: 7, marginLeft: 2, padding: "0 3px", borderRadius: 2, background: "var(--accent-30)", color: "var(--accent)" }}>multi</span>}
                        {tx._v === "person" && <span style={{ fontSize: 7, marginLeft: 2, padding: "0 3px", borderRadius: 2, background: "#7B6B8D30", color: "#7B6B8D" }}>persoon</span>}
                      </td>
                      <td style={{ padding: "3px 5px" }}>{!hideCatPicker && (
                        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                          {tx._v === "suggestion" && !tx.categoryId && <button onClick={() => setCatPrev(tx.id, tx._sc, tx._ss)} style={{ padding: "1px 5px", borderRadius: 3, border: `1px dashed ${cat ? cat.color : "#888"}`, background: "transparent", color: "var(--accent)", cursor: "pointer", fontSize: 8 }}>💡 {sub ? sub.name : "?"}?</button>}
                          <CatPicker tx={tx} cats={cats} catUsage={catUsage} onSelect={(c, s) => setCatPrev(tx.id, c, s)} compact />
                        </div>
                      )}</td>
                      <td style={{ padding: "3px", textAlign: "center", fontSize: 9 }}>
                        {tx._isDuplicate ? (
                          <span style={{ padding: "1px 5px", borderRadius: 4, background: "#666", color: "#fff", fontSize: 8 }}>🚫 Duplicaat</span>
                        ) : tx.source === "paypal" ? (
                          tx._matchedId && tx.categoryId ? (
                            <span style={{ padding: "1px 5px", borderRadius: 4, background: "#2D7A32", color: "#fff", fontSize: 8 }}>✅ Al verwerkt</span>
                          ) : tx._matchedId ? (
                            <span style={{ padding: "1px 5px", borderRadius: 4, background: "#2563eb", color: "#fff", fontSize: 8 }}>🔗 Crelan Match</span>
                          ) : (
                            <span style={{ padding: "1px 5px", borderRadius: 4, background: "#c2410c", color: "#fff", fontSize: 8 }}>⏳ Genegeerd</span>
                          )
                        ) : tx.categoryId ? (
                          <span style={{ color: "var(--green)" }}>✓</span>
                        ) : (
                          "?"
                        )}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setImporting(false); setPreview(null); }} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 11 }}>Annuleer</button>
              <button onClick={confirmImport} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#4A7C59", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>✓ Importeer {preview.filter(t => !t._d && !(t.source === "paypal" && !t._matchedId)).length}</button>
            </div>
          </div>
        </div>
      )}

      {/* Comment */}
      {editComment && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 18, maxWidth: 380, width: "90%", border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>💬 Opmerking</h3>
            <p style={{ margin: "0 0 6px", fontSize: 10, opacity: 0.5, color: "var(--text)" }}>{editComment.counterparty} · {fmt(editComment.amount)}</p>
            <textarea value={editComment.comment || ""} onChange={e => setEditComment({ ...editComment, comment: e.target.value })} rows={2} placeholder="Notitie..." style={{ width: "100%", padding: "6px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 11, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditComment(null)} style={{ padding: "5px 10px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 11 }}>Annuleer</button>
              <button onClick={() => { setTxs(p => p.map(t => t.id === editComment.id ? { ...t, comment: editComment.comment } : t)); setEditComment(null); }} style={{ padding: "5px 12px", borderRadius: 5, border: "none", background: "#4A7C59", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Opslaan</button>
            </div>
          </div>
        </div>
      )}

      <main className="app-main">

        {/* ═══ DASHBOARD ═══ */}
        {view === "dashboard" && (
          <DashboardView
            txs={txs} expanded={expanded} year={year} month={month} cats={cats}
            catStats={catStats} typeStats={typeStats}
            necessityStats={necessityStats} totalExp={totalExp} mStats={mStats}
            uncatN={uncatN} fRef={fRef}
            setFCat={setFCat} setView={setView} setMonth={setMonth} setCatDetail={setCatDetail}
          />
        )}

        {/* ═══ BUDGET ═══ */}
        {view === "budget" && <BudgetTab cats={cats} />}
        {view === "savings" && <SavingsTab txs={txs} expanded={expanded} cats={cats} savings={savings} setSavings={setSavings} year={year} settings={settings} unassignedSavings={unassignedSavings} />}


        {/* ═══ TRANSACTIONS ═══ */}
        {view === "transactions" && (
          <TransactionsView
            displayed={displayed} month={month} fCat={fCat} cats={cats}
            sel={sel} sort={sort} search={search} startDate={startDate} endDate={endDate}
            settings={settings} catUsage={catUsage}
            setMonth={setMonth} setFCat={setFCat} setStartDate={setStartDate}
            setEndDate={setEndDate} setSearch={setSearch} setSort={setSort} setSel={setSel}
            setSplitTx={setSplitTx} setEditComment={setEditComment} setContextMenu={setContextMenu}
            assign={assign} bulkAssign={bulkAssign} handleRowClick={handleRowClick}
            searchInputRef={searchInputRef}
          />
        )}

        {/* ═══ CATEGORIES ═══ */}
        {view === "categories" && (
          <CategoriesView cats={cats} txs={txs} setCats={setCats} setCatDetail={setCatDetail} />
        )}

        {/* ═══ PATTERNS ═══ */}
        {view === "patterns" && (
          <PatternsView
            cats={cats} rules={rules} pending={pending} settings={settings}
            blacklist={blacklist} patternSearch={patternSearch} pendingSort={pendingSort}
            rulesSort={rulesSort} filteredRulesEntries={filteredRulesEntries}
            patternSearchInputRef={patternSearchInputRef}
            setRules={setRules} setPending={setPending} setBlacklist={setBlacklist}
            setToast={setToast} setPatternSearch={setPatternSearch}
            setPendingSort={setPendingSort} setRulesSort={setRulesSort}
          />
        )}
      </main>
    </div>
  );
}
