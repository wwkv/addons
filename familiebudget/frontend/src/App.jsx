import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { List, Clock, X, ChevronDown, ChevronUp, ChevronRight, Settings, Bot, Brain, Database, Upload, Download, Trash2, AlertTriangle, MessageSquare, Tag, Lock, Scale, Rocket, User, Check, CheckCircle2, Link2, Ban, Lightbulb, Plus, Minus, Sun, Moon, LayoutGrid, Wallet, PiggyBank, Search, RefreshCw, Sparkles } from "lucide-react";

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
import ProcessingFlow from './modals/ProcessingFlow.jsx';
import OnboardingFlow from './modals/OnboardingFlow.jsx';
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
  const [settings, setSettings] = useState({ autoLevel: "normaal", darkMode: true, zoom: 100, bufferMultiplier: 5, householdAdults: 2, householdKids: 0 });
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [months, setMonths] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fCats, setFCats] = useState([]);
  const [sort, setSort] = useState({ field: "date", dir: "desc" });
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(new Set());
  const lastClickedIndexRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [splitTx, setSplitTx] = useState(null);
  // const [askTx, setAskTx] = useState(null); // AskAI - disabled
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("regels");
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
      // Fallback: client-side export — also fetch budgets so they are included
      let _budgets = {};
      try { const br = await fetch('api/state/budgets'); const bd = await br.json(); _budgets = bd.value || {}; } catch (_) {}
      const data = { txs, cats, rules, settings, pending, blacklist, savings, _budgets };
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
    try { await fetch('api/state/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: {} }) }); } catch (_) {}
    setShowDeleteConfirm(false);
    setSettingsTab("regels");
    setShowSettings(false);
  };

  const handleImportBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!window.confirm("Weet je zeker dat je deze backup wilt importeren? Dit overschrijft AL je huidige data (transacties, categorieën, patronen, spaarpotjes, budgetten en instellingen).")) {
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
        setToast(`${updates.length} transacties opnieuw gecategoriseerd`);
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
    if (!catId || !subId) return;
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
      setToast(`Patroon geforceerd: "${k}"`);
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
      if (!parsed.length) {
        const raw = ev.target.result;
        const isPPReconciliation = /BALANCE_RECONCILIATION_REPORT/i.test(raw) || /^"?RH"?,/.test(raw.trim());
        setImportErr(isPPReconciliation
          ? "Geen transacties gevonden.\n\nDit is een PayPal 'Balance Reconciliation Report' — dat bestand bevat nooit transacties, ongeacht de gekozen periode.\n\nGa in plaats daarvan naar PayPal → Activiteit ('Activity') → Alle transacties/rapport downloaden, en exporteer die CSV."
          : "Geen transacties gevonden.\n\nOndersteunde bestanden: Crelan CSV-export, of de PayPal 'Activiteit downloaden' CSV (niet een 'Balance Reconciliation Report').");
        return;
      }
      const dupKey = (t) => `${t.date}_${t.amount}_${(t.counterparty || "").toLowerCase().trim()}`;
      const existingByKey = new Map(txs.map(t => [dupKey(t), t]));
      const withCats = parsed.map(tx => {
        const existingMatch = existingByKey.get(dupKey(tx));
        if (existingMatch) {
          if (tx.source === "paypal" && !existingMatch.paypalMerged) {
            return { ...tx, _d: true, _v: "dupe_backfill", _isDuplicate: true, _backfillId: existingMatch.id };
          }
          return { ...tx, _d: true, _v: "dupe", _isDuplicate: true };
        }
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
          // Crelan match found but no category — try autoCat using the PayPal merchant name
          const m = autoCat(tx);
          if (!m) return { ...base, _d: false, _v: "crelan_match" };
          if (m.flag) return { ...base, _d: false, _v: m.flag };
          if (m.confidence === "suggestion") return { ...base, _d: false, _v: "suggestion", _sc: m.categoryId, _ss: m.subCategoryId };
          return { ...base, categoryId: m.categoryId, subCategoryId: m.subCategoryId, _d: false, _v: m.confidence };
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
    const backfillOnly = preview.filter(t => t._backfillId);
    setTxs(prev => {
      let next = [...prev];
      for (const row of matchedPayPal) {
        const existing = next.find(t => t.id === row._matchedId);
        if (existing) {
          next = next.map(t =>
            t.id === row._matchedId
              ? { ...t, counterparty: row.counterparty, description: row.description ?? t.description, categoryId: row.categoryId ?? t.categoryId, subCategoryId: row.subCategoryId ?? t.subCategoryId, splits: null, paypalMerged: true }
              : t
          );
        }
      }
      for (const row of backfillOnly) {
        next = next.map(t => t.id === row._backfillId && !t.paypalMerged ? { ...t, paypalMerged: true } : t);
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
    if (months.length) f = f.filter(t => months.includes(t.date.slice(5, 7)));
    if (startDate) f = f.filter(t => t.date >= startDate);
    if (endDate) f = f.filter(t => t.date <= endDate);
    if (fCats.length) f = f.filter(t => (fCats.includes("_none") && !t.categoryId) || fCats.includes(t.categoryId));
    if (search) { const s = search.toLowerCase(); f = f.filter(t => t.counterparty.toLowerCase().includes(s) || t.description.toLowerCase().includes(s) || (t.comment || "").toLowerCase().includes(s) || (t.paypalMerged && "paypal".includes(s))); }
    const { field, dir } = sort;
    const tagOrder = (t) => { const { sub } = resolveCatSub(cats, t.categoryId, t.subCategoryId); const ty = sub ? (sub.type || "variabel") : "zzz"; const ne = sub ? (sub.necessity || "nodig") : "zzz"; return `${ty === "vast" ? "0" : ty === "variabel" ? "1" : "2"}-${ne === "nodig" ? "0" : ne === "luxe" ? "1" : "2"}`; };
    f.sort((a, b) => { let c = 0; if (field === "date") c = a.date.localeCompare(b.date); else if (field === "amount") c = a.amount - b.amount; else if (field === "counterparty") c = a.counterparty.localeCompare(b.counterparty); else if (field === "category") c = (a.categoryId || "zzz").localeCompare(b.categoryId || "zzz"); else if (field === "tags") c = tagOrder(a).localeCompare(tagOrder(b)); return dir === "asc" ? c : -c; });
    return f;
  }, [txs, year, months, startDate, endDate, fCats, search, sort, cats]);

  const sortFilterKey = JSON.stringify([sort.field, sort.dir, fCats, months, search, year, startDate, endDate]);
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
    if (months.length) et = et.filter(t => months.includes(t.date.slice(5, 7)));
    const s = {};
    for (const c of cats) { if (c.type === "inkomsten") continue; const ct = et.filter(t => t.categoryId === c.id); const tot = ct.reduce((a, t) => a + Math.abs(t.amount), 0); const subs = {}; for (const sub of c.subs) subs[sub.id] = ct.filter(t => t.subCategoryId === sub.id).reduce((a, t) => a + Math.abs(t.amount), 0); s[c.id] = { total: tot, subs, count: ct.length }; }
    s._uncat = { total: et.filter(t => !t.categoryId).reduce((a, t) => a + Math.abs(t.amount), 0), count: et.filter(t => !t.categoryId).length };
    return s;
  }, [expanded, cats, year, months]);

  /* Fixed vs Variable: aggregate ONLY by subcategory.type — Vast, Variabel, Onbekend */
  const typeStats = useMemo(() => {
    let et = expanded.filter(t => t.date.startsWith(year) && t.amount < 0);
    if (months.length) et = et.filter(t => months.includes(t.date.slice(5, 7)));
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
  }, [expanded, cats, year, months]);

  /* Necessity vs Luxury: aggregate ONLY by subcategory.necessity — Nodig, Luxe, Onbekend */
  const necessityStats = useMemo(() => {
    let et = expanded.filter(t => t.date.startsWith(year) && t.amount < 0);
    if (months.length) et = et.filter(t => months.includes(t.date.slice(5, 7)));
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
  }, [expanded, cats, year, months]);

  const totalExp = cats.filter(c => c.type !== "inkomsten" && catStats[c.id]).reduce((s, c) => s + catStats[c.id].total, 0);
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
  if (!loaded) return <div className="loading-screen"><div style={{ textAlign: "center" }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--accent-20)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}><PiggyBank size={22} strokeWidth={1.8} /></div><span style={{ fontSize: 13, opacity: 0.6 }}>Laden...</span></div></div>;

  if (!settings.onboardingComplete && txs.length === 0) {
    return <OnboardingFlow settings={settings} setSettings={setSettings} cats={cats} setCats={setCats} />;
  }

  return (
    <div className="app-shell" style={{ zoom: (settings.zoom || 100) / 100 }}>
      <div className="app-body">

        {/* ─── ICON RAIL ─── */}
        <nav className="app-rail">
          <div className="rail-logo" />
          {[
            { id: "dashboard", label: "Overzicht", icon: <LayoutGrid size={19} /> },
            { id: "budget", label: "Budget", icon: <Wallet size={19} />, desktopOnly: true },
            { id: "transactions", label: "Transacties", icon: <List size={19} /> },
            { id: "categories", label: "Categorieën", icon: <Tag size={19} /> },
            { id: "patterns", label: "Patronen", icon: <Brain size={19} />, desktopOnly: true },
            { id: "savings", label: "Sparen", icon: <PiggyBank size={19} /> },
          ].map(tab => (
            <button key={tab.id} title={tab.label} onClick={() => setView(tab.id)} className={`rail-btn${view === tab.id ? " active" : ""}${tab.desktopOnly ? " mobile-hide" : ""}`}>
              {tab.icon}
              {tab.id === "savings" && unassignedSavings > 0 && <span className="rail-dot" />}
            </button>
          ))}
          <div className="rail-spacer" />
          <button title="Instellingen" onClick={() => setShowSettings(true)} className="rail-btn mobile-settings"><Settings size={18} /></button>
        </nav>

        {uncatN > 0 && <button title="Snel categoriseren" onClick={() => setTinderMode(true)} className="mobile-fab"><Sparkles size={22} /></button>}

        <div className="app-content">
          {/* ─── HEADER ─── */}
          <header className="app-header">
            <div style={{ flex: "0 0 auto", display: "flex", gap: 3, alignItems: "center" }}>
              <input type="file" ref={fRef} onChange={handleSmartImport} accept=".csv,.json,.txt" style={{ display: "none" }} />
              <button onClick={() => fRef.current && fRef.current.click()} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 7, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600 }}><Upload size={11} />Importeer</button>
              {uncatN > 0 && <button onClick={() => setTinderMode(true)} style={{ padding: "4px 9px", borderRadius: 7, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>Sorteer ({uncatN})</button>}
            </div>
            <div style={{ flex: "0 0 auto", display: "flex", gap: 3, alignItems: "center" }}>
              <select value={year} onChange={e => setYear(e.target.value)} style={{ padding: "3px 5px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 10 }}><option value="">Alle jaren</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
              <button onClick={() => setSettings(s => ({ ...s, darkMode: !s.darkMode }))} style={{ display: "flex", padding: "4px 7px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer" }}>{settings.darkMode ? <Sun size={13} /> : <Moon size={13} />}</button>
              <button className="zoom-controls" onClick={() => setSettings(s => ({ ...s, zoom: Math.min((s.zoom || 100) + 25, 150) }))} style={{ padding: "4px 5px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>A+</button>
              <button className="zoom-controls" onClick={() => setSettings(s => ({ ...s, zoom: Math.max((s.zoom || 100) - 25, 75) }))} style={{ padding: "4px 5px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>A−</button>
            </div>
          </header>

      {/* Toast notification */}
      {toast && (
        <div style={{ position: "fixed", top: 52, left: "50%", transform: "translateX(-50%)", zIndex: 400, background: "var(--primary)", color: "#fff", padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", animation: "none", pointerEvents: "none" }}>
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
            { label: `Toon alle transacties: "${contextMenu.tx.counterparty.trim().slice(0, 22)}"`, icon: <Search size={12} />, onClick: () => { setView("transactions"); setSearch(contextMenu.tx.counterparty.trim()); setMonths([]); setFCats([]); setStartDate(""); setEndDate(""); setYear(""); setContextMenu(null); } },
            { label: "Copy Category", disabled: !contextMenu.tx.categoryId, onClick: () => setCatClipboard({ categoryId: contextMenu.tx.categoryId, subCategoryId: contextMenu.tx.subCategoryId }) },
            { label: "Paste Category", disabled: !catClipboard?.categoryId, onClick: () => { const targetIds = sel.size > 0 ? [...sel] : [contextMenu.tx.id]; bulkAssign(catClipboard.categoryId, catClipboard.subCategoryId, targetIds); } },
            { label: "Verwijder categorie" + (sel.size > 1 ? "s" : ""), icon: <Ban size={12} />, disabled: sel.size <= 1 && !contextMenu.tx.categoryId, onClick: () => {
              const targetIds = sel.size > 0 ? sel : new Set([contextMenu.tx.id]);
              setTxs(p => p.map(t => targetIds.has(t.id) ? { ...t, categoryId: null, subCategoryId: null, splits: null } : t));
              setContextMenu(null);
            } },
            { label: "Aan blacklist toevoegen", onClick: () => {
              const cp = contextMenu.tx.counterparty.trim();
              if (!blacklist.some(b => b.trim().toLowerCase() === cp.toLowerCase())) {
                setBlacklist(p => [...p, cp]);
                const k = cp.toLowerCase().slice(0, 30);
                setRules(r => { const n = { ...r }; delete n[k]; return n; });
                setPending(p => { const n = { ...p }; delete n[k]; return n; });
                setToast(`"${cp}" aan blacklist toegevoegd`);
                setTimeout(() => setToast(null), 2500);
              }
            } },
            { label: "Verwijder transactie" + (sel.size > 1 ? "s" : ""), icon: <Trash2 size={12} />, onClick: () => {
              if (!window.confirm("Weet je zeker dat je deze transactie(s) wilt verwijderen?")) return;
              const targetIds = sel.size > 0 ? sel : new Set([contextMenu.tx.id]);
              setTxs(p => p.filter(t => !targetIds.has(t.id)));
              setSel(new Set());
              setContextMenu(null);
            } },
            ...(sel.size > 1 && sel.has(contextMenu.tx.id) ? [
              { label: "Samenvoegen (Bedragen optellen)", icon: <Link2 size={12} />, onClick: () => {
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
              { label: "Samenvoegen (Behoud dit bedrag)", icon: <Link2 size={12} />, onClick: () => {
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
      {tinderMode && <ProcessingFlow
        txs={txs} cats={cats} autoCat={autoCat} catUsage={catUsage} blacklist={blacklist}
        onAddToBlacklist={(cp) => { if (!blacklist.some(b => b.trim().toLowerCase() === cp.trim().toLowerCase())) setBlacklist(p => [...p, cp.trim()]); }}
        assign={assign}
        bulkAssign={bulkAssign}
        onSkip={(id) => setTxs(p => p.map(t => t.id === id ? { ...t, categoryId: null, subCategoryId: null, splits: null } : t))}
        onUndo={(id) => setTxs(p => p.map(t => t.id === id ? { ...t, categoryId: null, subCategoryId: null } : t))}
        unassignedSavings={unassignedSavings}
        onClose={() => setTinderMode(false)}
        onGoToSavings={() => { setTinderMode(false); setView("savings"); }}
      />}
      {splitTx && <SplitModal tx={splitTx} cats={cats} onSave={splits => { setTxs(p => p.map(t => t.id === splitTx.id ? { ...t, splits, categoryId: splits[0].categoryId, subCategoryId: splits[0].subCategoryId } : t)); setSplitTx(null); }} onClose={() => setSplitTx(null)} />}
      {/* AskAI disabled {askTx && <AskAI tx={askTx} cats={cats} onAccept={(c, s) => { assign(askTx.id, c, s, false); setAskTx(null); }} onClose={() => setAskTx(null)} />} */}
      {catDetail && <CatDetailModal catId={catDetail} cats={cats} catStats={catStats} totalExp={totalExp} expanded={expanded} year={year} months={months} onClose={() => setCatDetail(null)} />}

      {/* Recalc loading overlay */}
      {recalcState.running && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 16, padding: 26, maxWidth: 320, width: "90%", border: "1px solid var(--border)", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--accent-20)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}><RefreshCw size={20} strokeWidth={1.8} /></div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 400, color: "var(--text)", marginBottom: 4 }}>Heranalyse...</div>
            <div style={{ fontSize: 11, opacity: 0.6, color: "var(--text)", marginBottom: 16 }}>Past patronen toe op ongecategoriseerde transacties</div>
            <button onClick={() => { recalcCancelRef.current = true; }} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 12 }}>Annuleren</button>
          </div>
        </div>
      )}

      {/* Settings */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 16, padding: 20, maxWidth: 520, width: "90%", border: "1px solid var(--border)", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 400, fontFamily: "var(--font-display)", color: "var(--text)", flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}><Settings size={18} strokeWidth={1.8} />Instellingen</h3>

            {/* Tab bar */}
            <div style={{ display: "flex", gap: 2, background: "var(--bg)", borderRadius: 9, padding: 3, border: "1px solid var(--border)", marginBottom: 16, flexShrink: 0 }}>
              {[{ id: "profiel", l: "Profiel", icon: <User size={12} /> }, { id: "regels", l: "Regels", icon: <Bot size={12} /> }, { id: "patronen", l: "Patronen", icon: <Brain size={12} /> }, { id: "data", l: "Data", icon: <Database size={12} /> }].map(t => (
                <button key={t.id} onClick={() => { setSettingsTab(t.id); setShowExcludeAddPicker(false); setShowDeleteConfirm(false); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 8px", borderRadius: 7, border: "none", background: settingsTab === t.id ? "var(--accent-20)" : "transparent", color: settingsTab === t.id ? "var(--accent)" : "var(--muted)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{t.icon}{t.l}</button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ overflow: "auto", flex: 1 }}>

              {settingsTab === "profiel" && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>Huishouden</label>
                    <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 10px" }}>Gebruikt om je budget te vergelijken met gezinnen van vergelijkbare samenstelling.</p>
                    {[
                      { key: "householdAdults", l: "Aantal volwassenen", d: "Inclusief jezelf", min: 1 },
                      { key: "householdKids", l: "Aantal kinderen", d: "Voor budgetvergelijking", min: 0 },
                    ].map(f => (
                      <div key={f.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", marginBottom: 8 }}>
                        <div><div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{f.l}</div><div style={{ fontSize: 10, opacity: 0.5, color: "var(--text)" }}>{f.d}</div></div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button onClick={() => setSettings(s => ({ ...s, [f.key]: Math.max(f.min, (s[f.key] ?? f.min) - 1) }))} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Minus size={12} /></button>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, width: 16, textAlign: "center" }}>{settings[f.key] ?? f.min}</span>
                          <button onClick={() => setSettings(s => ({ ...s, [f.key]: (s[f.key] ?? f.min) + 1 }))} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setSettingsTab("regels"); setShowSettings(false); setView("categories"); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Categorieën beheren<ChevronRight size={14} /></button>
                </div>
              )}

              {settingsTab === "regels" && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>Auto-categorisatie</label>
                    {[{ v: "voorzichtig", l: "Voorzichtig", icon: <Lock size={12} />, d: "Enkel 100% zekere" }, { v: "normaal", l: "Normaal", icon: <Scale size={12} />, d: "Zeker + waarschijnlijk" }, { v: "ambitieus", l: "Ambitieus", icon: <Rocket size={12} />, d: "Alles incl. mededeling" }].map(o => (
                      <label key={o.v} style={{ display: "flex", gap: 8, alignItems: "center", padding: "7px 10px", borderRadius: 8, border: settings.autoLevel === o.v ? "1px solid var(--accent)" : "1px solid var(--border)", background: settings.autoLevel === o.v ? "var(--accent-10)" : "transparent", cursor: "pointer", marginBottom: 4 }}>
                        <input type="radio" checked={settings.autoLevel === o.v} onChange={() => setSettings(s => ({ ...s, autoLevel: o.v }))} style={{ accentColor: "var(--accent)" }} />
                        <span style={{ color: "var(--accent)", display: "flex" }}>{o.icon}</span>
                        <div><div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{o.l}</div><div style={{ fontSize: 9, opacity: 0.5, color: "var(--text)" }}>{o.d}</div></div>
                      </label>
                    ))}
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>Spaarbuffer Maanden</label>
                    <input type="number" min={3} max={10} value={settings.bufferMultiplier ?? 5} onChange={e => setSettings(s => ({ ...s, bufferMultiplier: Number(e.target.value) || 5 }))} style={{ padding: "6px 8px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 11, width: 80 }} />
                    <div style={{ fontSize: 9, opacity: 0.4, color: "var(--text)", marginTop: 4 }}>Aantal maanden nodig-uitgaven voor spaarbuffer doel</div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>Uitgesloten subcategorieën</label>
                    <div style={{ fontSize: 10, opacity: 0.5, color: "var(--text)", marginBottom: 8 }}>Deze subcategorieën tellen niet mee in het totaal.</div>
                    <div style={{ position: "relative", background: "var(--bg)", borderRadius: 6, padding: 8, paddingRight: 36, border: "1px solid var(--border)", minHeight: 44 }}>
                      <button type="button" onClick={() => setShowExcludeAddPicker(!showExcludeAddPicker)} style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: 5, border: "1px dashed var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 14, fontWeight: 300, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }} title="Subcategorie toevoegen">+</button>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        {cats.flatMap(c => c.subs.filter(s => s.excluded).map(s => ({ cat: c, sub: s }))).map(({ cat, sub }) => (
                          <span key={sub.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 5, background: cat.color + "20", border: `1px solid ${cat.color}40`, fontSize: 10, color: "var(--text)" }}>
                            {cat.name} › {sub.name}
                            <button type="button" onClick={() => setCats(p => p.map(cat2 => cat2.id === cat.id ? { ...cat2, subs: cat2.subs.map(s2 => s2.id === sub.id ? { ...s2, excluded: false } : s2) } : cat2))} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--muted)", display: "flex", lineHeight: 1 }} aria-label="Verwijderen"><X size={11} /></button>
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
                </div>
              )}

              {settingsTab === "patronen" && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>Patroon drempels</label>
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
                  <div style={{ padding: 12, background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}><Brain size={13} strokeWidth={1.8} />{Object.keys(rules).length} patronen · {Object.keys(pending).length} in afwachting</div>
                    <div style={{ fontSize: 10, opacity: 0.5, color: "var(--text)", marginBottom: 10 }}>Geleerde patronen worden gebruikt voor automatische categorisatie.</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setSettingsTab("regels"); setShowSettings(false); setView("patterns"); }} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--accent)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Beheer patronen →</button>
                      <button onClick={() => { if (confirm("Alle patronen wissen?")) setRules({}); }} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--danger)", background: "transparent", color: "var(--danger)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Wis alle patronen</button>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === "data" && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>Backup</label>
                    <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>Maak een veilige kopie van alles: transacties, categorieën, patronen (bevestigd en in afwachting), geblokkeerde tegenpartijen, budgetten, spaarpotjes en instellingen (incl. huishouden).</p>
                    <button onClick={handleExportBackup} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}><Download size={13} />Exporteer data</button>
                  </div>
                  <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--danger)", display: "block", marginBottom: 6 }}>Gevarenzone</label>
                    <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>Verwijder alle data permanent. Er wordt eerst automatisch een backup geëxporteerd.</p>
                    {!showDeleteConfirm
                      ? <button onClick={() => setShowDeleteConfirm(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid var(--danger)", background: "transparent", color: "var(--danger)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}><Trash2 size={13} />Verwijder alle data</button>
                      : (
                        <div style={{ padding: 14, borderRadius: 10, border: "1px solid var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)" }}>
                          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "var(--danger)", display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={13} />Ben je zeker?</p>
                          <p style={{ margin: "0 0 12px", fontSize: 11, color: "var(--text)", opacity: 0.8 }}>Alle transacties, budgetten, categorieën, patronen en spaardoelen worden gewist.</p>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={handleDeleteAllData} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "var(--danger)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Ja, verwijder alles</button>
                            <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 11 }}>Annuleer</button>
                          </div>
                        </div>
                      )
                    }
                  </div>
                </div>
              )}

            </div>

            <button onClick={() => { setShowExcludeAddPicker(false); setSettingsTab("regels"); setShowSettings(false); }} style={{ marginTop: 16, padding: "9px 14px", borderRadius: 9, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, width: "100%", flexShrink: 0 }}>Sluiten</button>
          </div>
        </div>
      )}

      {importErr && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 16, padding: 20, maxWidth: 400, width: "90%", border: "1px solid var(--border)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--accent-20)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}><AlertTriangle size={19} strokeWidth={1.8} /></div>
            <p style={{ fontSize: 12, color: "var(--text)", margin: "0 0 12px", whiteSpace: "pre-line" }}>{importErr}</p>
            <button onClick={() => setImportErr(null)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>OK</button>
          </div>
        </div>
      )}

      {/* Import Preview */}
      {importing && preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 16, padding: 20, maxWidth: 860, width: "95%", maxHeight: "88vh", overflow: "auto", border: "1px solid var(--border)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 400, fontFamily: "var(--font-display)", color: "var(--text)" }}>{preview[0]?.source === "paypal" ? "PayPal import" : "Crelan import"}</h2>
            <p style={{ margin: "0 0 12px", fontSize: 11, opacity: 0.6, color: "var(--text)" }}>{preview.length} tx · {preview.filter(t => t._d).length} dupl · {preview.filter(t => t.categoryId).length} gecat · {preview.filter(t => !t.categoryId && !t._d).length} te doen{preview.some(t => t._backfillId) ? ` · ${preview.filter(t => t._backfillId).length} te markeren als PayPal` : ""}</p>
            <div style={{ maxHeight: 420, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                <thead><tr style={{ position: "sticky", top: 0, zIndex: 3 }}>
                  {[{ f: "date", l: "Datum" }, { f: "amount", l: "Bedrag" }, { f: "counterparty", l: "Tegenpartij" }, { f: "category", l: "Categorie" }, { f: "status", l: "" }].map(col => (
                    <th key={col.f} onClick={() => { if (importSort.field === col.f) setImportSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" })); else setImportSort({ field: col.f, dir: "asc" }); }} style={{ padding: "5px 5px", textAlign: "left", fontSize: 9, fontWeight: 600, cursor: "pointer", userSelect: "none", color: "var(--text)", background: "var(--card)", borderBottom: "2px solid var(--border)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>{col.l} {importSort.field === col.f && (importSort.dir === "asc" ? <ChevronUp size={9} /> : <ChevronDown size={9} />)}</span>
                    </th>
                  ))}
                </tr></thead>
                <tbody>{sortedPreview.map(tx => {
                  const isDupe = tx._d;
                  const isBackfill = tx._v === "dupe_backfill";
                  const isPayPalIgnored = tx.source === "paypal" && !tx._matchedId && !isDupe;
                  const hideCatPicker = isDupe || isPayPalIgnored;
                  const cat = cats.find(c => c.id === (tx.categoryId || tx._sc));
                  const sub = cat ? cat.subs.find(s => s.id === (tx.subCategoryId || tx._ss)) : null;
                  return (
                    <tr key={tx.id} style={{ borderBottom: "1px solid var(--bg)", opacity: isBackfill ? 0.85 : isDupe ? 0.2 : isPayPalIgnored ? 0.5 : 1 }}>
                      <td style={{ padding: "3px 5px", fontFamily: "'DM Mono',monospace", fontSize: 9 }}>{fD(tx.date)}</td>
                      <td style={{ padding: "3px 5px", fontFamily: "'DM Mono',monospace", fontSize: 9, color: tx.amount > 0 ? "var(--green)" : "var(--red)" }}>{fmt(tx.amount)}</td>
                      <td style={{ padding: "3px 5px", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {tx.counterparty}
                        {tx._v === "multi" && <span style={{ fontSize: 7, marginLeft: 2, padding: "0 3px", borderRadius: 2, background: "var(--accent-30)", color: "var(--accent)" }}>multi</span>}
                        {tx._v === "person" && <span style={{ fontSize: 7, marginLeft: 2, padding: "0 3px", borderRadius: 2, background: "#7B6B8D30", color: "#7B6B8D" }}>persoon</span>}
                      </td>
                      <td style={{ padding: "3px 5px" }}>{!hideCatPicker && (
                        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                          {tx._v === "suggestion" && !tx.categoryId && <button onClick={() => setCatPrev(tx.id, tx._sc, tx._ss)} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "1px 5px", borderRadius: 4, border: `1px dashed ${cat ? cat.color : "var(--muted)"}`, background: "transparent", color: "var(--accent)", cursor: "pointer", fontSize: 8 }}><Lightbulb size={8} />{sub ? sub.name : "?"}?</button>}
                          <CatPicker tx={tx} cats={cats} catUsage={catUsage} onSelect={(c, s) => setCatPrev(tx.id, c, s)} compact />
                        </div>
                      )}</td>
                      <td style={{ padding: "3px", textAlign: "center", fontSize: 9 }}>
                        {isBackfill ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 999, background: "var(--accent-20)", color: "var(--accent)", fontSize: 8, fontWeight: 700 }}><Tag size={9} />Markeer als PayPal</span>
                        ) : tx._isDuplicate ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 999, background: "var(--border)", color: "var(--muted)", fontSize: 8, fontWeight: 700 }}><Ban size={9} />Duplicaat</span>
                        ) : tx.source === "paypal" ? (
                          tx._matchedId && tx.categoryId ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 999, background: "var(--accent-20)", color: "var(--accent)", fontSize: 8, fontWeight: 700 }}><CheckCircle2 size={9} />Al verwerkt</span>
                          ) : tx._matchedId ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 999, background: "var(--accent-20)", color: "var(--accent)", fontSize: 8, fontWeight: 700 }}><Link2 size={9} />Crelan match</span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 999, background: "var(--border)", color: "var(--muted)", fontSize: 8, fontWeight: 700 }}><Clock size={9} />Genegeerd</span>
                          )
                        ) : tx.categoryId ? (
                          <Check size={11} style={{ color: "var(--green)" }} />
                        ) : (
                          <span style={{ color: "var(--muted)" }}>?</span>
                        )}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button onClick={() => { setImporting(false); setPreview(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 11 }}>Annuleer</button>
              <button onClick={confirmImport} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 8, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}><Check size={13} />Importeer {preview.filter(t => !t._d && !(t.source === "paypal" && !t._matchedId)).length}{preview.some(t => t._backfillId) ? ` (+${preview.filter(t => t._backfillId).length} markeren)` : ""}</button>
            </div>
          </div>
        </div>
      )}

      {/* Comment */}
      {editComment && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--card)", borderRadius: 16, padding: 18, maxWidth: 380, width: "90%", border: "1px solid var(--border)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 400, fontFamily: "var(--font-display)", color: "var(--text)", display: "flex", alignItems: "center", gap: 7 }}><MessageSquare size={15} strokeWidth={1.8} />Opmerking</h3>
            <p style={{ margin: "0 0 6px", fontSize: 10, opacity: 0.5, color: "var(--text)" }}>{editComment.counterparty} · {fmt(editComment.amount)}</p>
            <textarea value={editComment.comment || ""} onChange={e => setEditComment({ ...editComment, comment: e.target.value })} rows={2} placeholder="Notitie..." style={{ width: "100%", padding: "7px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", fontSize: 11, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditComment(null)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 11 }}>Annuleer</button>
              <button onClick={() => { setTxs(p => p.map(t => t.id === editComment.id ? { ...t, comment: editComment.comment } : t)); setEditComment(null); }} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 13px", borderRadius: 7, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}><Check size={12} />Opslaan</button>
            </div>
          </div>
        </div>
      )}

      <main className="app-main">

        {/* ═══ DASHBOARD ═══ */}
        {view === "dashboard" && (
          <DashboardView
            txs={txs} expanded={expanded} year={year} months={months} cats={cats}
            catStats={catStats} typeStats={typeStats}
            necessityStats={necessityStats} totalExp={totalExp} mStats={mStats}
            uncatN={uncatN} fRef={fRef}
            setFCats={setFCats} setView={setView} setMonths={setMonths} setCatDetail={setCatDetail}
          />
        )}

        {/* ═══ BUDGET ═══ */}
        {view === "budget" && <BudgetTab cats={cats} />}
        {view === "savings" && <SavingsTab txs={txs} expanded={expanded} cats={cats} savings={savings} setSavings={setSavings} year={year} settings={settings} unassignedSavings={unassignedSavings} />}


        {/* ═══ TRANSACTIONS ═══ */}
        {view === "transactions" && (
          <TransactionsView
            displayed={displayed} months={months} fCats={fCats} cats={cats}
            sel={sel} sort={sort} search={search} startDate={startDate} endDate={endDate}
            settings={settings} catUsage={catUsage}
            setMonths={setMonths} setFCats={setFCats} setStartDate={setStartDate}
            setEndDate={setEndDate} setSearch={setSearch} setSort={setSort} setSel={setSel}
            setSplitTx={setSplitTx} setEditComment={setEditComment} setContextMenu={setContextMenu}
            assign={assign} bulkAssign={bulkAssign} handleRowClick={handleRowClick}
            searchInputRef={searchInputRef}
          />
        )}

        {/* ═══ CATEGORIES ═══ */}
        {view === "categories" && (
          <CategoriesView cats={cats} txs={txs} setCats={setCats} setTxs={setTxs} setCatDetail={setCatDetail} />
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
      </div>
    </div>
  );
}
