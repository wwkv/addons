import { useState, useMemo, useEffect, useCallback } from "react";
import { Clock, List, Check, Star, Package, PartyPopper, ArrowDown, MapPin, CalendarDays, CreditCard, Smartphone } from "lucide-react";
import { getSuggestion } from '../utils/helpers.js';
import { fmt, fD } from '../utils/formatters.js';
import { parseCounterparty, parseEvidence, evidenceLine } from '../utils/counterparty.js';
import CatPicker from '../components/CatPicker.jsx';
import CatGrid from '../components/CatGrid.jsx';

export default function TinderMode({ txs, cats, autoCat, onAssign, onSkip, onUndo, catUsage, blacklist = [], onAddToBlacklist, onClose}) {
  const isBlacklisted = (cp) => blacklist.some(b => b.trim().toLowerCase() === (cp || "").trim().toLowerCase());

  const groups = useMemo(() => {
    const uncat = txs.filter(t => !t.categoryId && !t.splits);
    const byKey = {};
    for (const t of uncat) {
      const k = t.counterparty.trim();
      if (isBlacklisted(k)) {
        (byKey["__singleton_" + t.id] = { counterparty: k, txs: [t] });
      } else {
        if (!byKey[k]) byKey[k] = { counterparty: k, txs: [] };
        byKey[k].txs.push(t);
      }
    }
    return Object.values(byKey).sort((a, b) => b.txs.length - a.txs.length);
  }, [txs, blacklist]);

  const [showAlts, setShowAlts] = useState(false);
  const [animDir, setAnimDir] = useState(null);
  const [history, setHistory] = useState([]);
  const group = groups[0];
  const tx = group ? group.txs[0] : null;

  useEffect(() => { setShowAlts(false); if (animDir !== "exitDown" && animDir !== "fromBottom" && animDir !== "fromTop") setAnimDir(null); }, [group && group.counterparty]);

  const suggestion = useMemo(() => tx ? getSuggestion(tx, cats, autoCat) : null, [tx, cats, autoCat]);

  /* Recognition evidence for the group under review. The description carries
     the town, time of day, wallet and card — the cues that let you place a
     purchase from memory — and none of it used to reach this screen. */
  const ev = useMemo(() => {
    if (!tx) return { title: "", chips: [], note: null, platform: null };
    const cp = parseCounterparty(tx.counterparty);
    const e = parseEvidence(tx);
    // The description's merchant prefix is often cleaner and less truncated
    // than the counterparty column, so prefer it when it's genuinely longer.
    const title = e.merchantPrefix && e.merchantPrefix.length > cp.name.length
      ? e.merchantPrefix
      : (cp.name || tx.counterparty);

    const places = [...new Set(group.txs.map(t => parseEvidence(t).place).filter(Boolean))];
    const times  = [...new Set(group.txs.map(t => parseEvidence(t).time).filter(Boolean))];

    const chips = [];
    if (places.length === 1) chips.push({ icon: <MapPin size={10} />, text: places[0] });
    else if (places.length > 1) chips.push({ icon: <MapPin size={10} />, text: `${places.slice(0, 2).join(", ")}${places.length > 2 ? ` +${places.length - 2}` : ""}` });
    // Day/time only describe ONE transaction, so a group-level chip would be a
    // lie the moment the group spans days — the per-row lines carry it instead.
    if (group.txs.length === 1) {
      const when = [e.day, e.time].filter(Boolean).join(" ");
      if (when) chips.push({ icon: <CalendarDays size={10} />, text: when });
    } else if (times.length > 1) {
      const sorted = [...times].sort();
      chips.push({ icon: <Clock size={10} />, text: `meestal ${sorted[0]}–${sorted[sorted.length - 1]}` });
    } else if (times.length === 1) {
      chips.push({ icon: <Clock size={10} />, text: times[0] });
    }
    if (tx.type) chips.push({ icon: <CreditCard size={10} />, text: tx.type });
    if (e.wallet) chips.push({ icon: <Smartphone size={10} />, text: e.wallet });
    else if (e.card) chips.push({ icon: <CreditCard size={10} />, text: `••${e.card}` });

    return { title, chips, note: e.note, platform: cp.platform };
  }, [tx, group]);
  const totalTxs = txs.length || 1;
  const catCount = txs.filter(t => t.categoryId || t.splits).length;
  const totalAmount = group ? group.txs.reduce((s, t) => s + t.amount, 0) : 0;
  const EXIT_DURATION = 350;

  const doAssignGroup = (catId, subId) => {
    const txIds = group.txs.map(t => t.id);
    setHistory(h => [...h, { txIds }]);
    setAnimDir("up");
    setTimeout(() => { txIds.forEach(id => onAssign(id, catId, subId)); setAnimDir("fromBottom"); }, EXIT_DURATION);
  };
  const doSkipGroup = () => {
    const txIds = group.txs.map(t => t.id);
    setHistory(h => [...h, { txIds }]);
    setAnimDir("up");
    setTimeout(() => { txIds.forEach(id => onSkip(id)); setAnimDir("fromBottom"); }, EXIT_DURATION);
  };
  const doBlockGroup = () => {
    const txIds = group.txs.map(t => t.id);
    const counterparty = group.counterparty;
    setHistory(h => [...h, { txIds }]);
    setAnimDir("up");
    setTimeout(() => {
      if (onAddToBlacklist) onAddToBlacklist(counterparty);
      txIds.forEach(id => onSkip(id));
      setAnimDir("fromBottom");
    }, EXIT_DURATION);
  };
  const goBack = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setAnimDir("exitDown");
    setTimeout(() => {
      last.txIds.forEach(id => onUndo(id));
      setAnimDir("fromTop");
    }, EXIT_DURATION);
  };

  useEffect(() => {
    if (animDir === "fromBottom" || animDir === "fromTop") {
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimDir(null));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [animDir]);

  const favSubs = useMemo(() => Object.entries(catUsage || {}).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([subId]) => { for (const c of cats) { const s = c.subs.find(x => x.id === subId); if (s) return { cat: c, sub: s }; } return null; }).filter(Boolean), [catUsage, cats]);

  if (!group) return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--accent-20)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><PartyPopper size={26} strokeWidth={1.8} /></div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400, color: "#fff" }}>Alles gecategoriseerd!</div>
      <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Sluiten</button>
    </div>
  );

  const isExiting = animDir === "up" || animDir === "exitDown";
  const isEntering = animDir === "fromBottom" || animDir === "fromTop";
  const cardTf = isExiting ? (animDir === "up" ? "translateY(-100%)" : "translateY(100%)") : isEntering ? (animDir === "fromTop" ? "translateY(-100%)" : "translateY(100%)") : "translateY(0)";
  const cardOpacity = isExiting ? 0 : 1;
  const cardTransition = isEntering ? "none" : "transform 0.35s ease-out, opacity 0.35s ease-out";

  const isGroup = group.txs.length > 1;
  const cardBg = isGroup ? "var(--bg)" : "var(--card)";
  const stackCardBg = isGroup ? "var(--border)" : cardBg;
  const cardShadow = isGroup
    ? "0 8px 24px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.4)"
    : "0 12px 40px rgba(0,0,0,0.3)";
  const stackCount = isGroup ? Math.min(group.txs.length - 1, 3) : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 720, minHeight: "60vh", paddingTop: 48 }}>
        <div className={isGroup ? "tinder-card-stack" : ""} style={{ position: "relative", maxWidth: 720, width: "92%", minHeight: "60vh", transform: cardTf, opacity: cardOpacity, transition: cardTransition }}>
          {isGroup && stackCount > 0 && Array.from({ length: stackCount }, (_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 16,
                background: stackCardBg,
                border: "1px solid var(--border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.5)",
                transform: `translateX(${(i + 1) * 8}px) translateY(-${(i + 1) * 8}px)`,
                zIndex: -(i + 1),
                pointerEvents: "none",
              }}
            />
          ))}
          <div style={{ position: "relative", zIndex: 0, background: cardBg, borderRadius: 16, border: "1px solid var(--border)", boxShadow: cardShadow, padding: 0, minHeight: "60vh", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, color: "#fff", padding: "12px 24px", borderBottom: "1px solid var(--border)", flexShrink: 0, background: "rgba(0,0,0,0.2)", borderRadius: "16px 16px 0 0" }}>
            <button onClick={goBack} disabled={history.length===0} style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, background: "none", border: "1px solid var(--border)", borderRadius: 8, color: history.length>0?"#fff":"#555", cursor: history.length>0?"pointer":"default", padding: "4px 11px", fontSize: 11, opacity: history.length>0?1:0.4 }}><ArrowDown size={11} />Vorige</button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, minWidth: 0 }}>
              <div style={{ flex: 1, maxWidth: 200, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.12)" }}><div style={{ width: `${(catCount/totalTxs)*100}%`, height: 6, borderRadius: 3, background: "var(--accent)", transition: "width 0.3s" }} /></div>
              <span style={{ flexShrink: 0, fontSize: 11, opacity: 0.6 }}>{groups.length} groepen over</span>
            </div>
            <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, background: "none", border: "1px solid var(--border)", borderRadius: 8, color: "#fff", cursor: "pointer", padding: "4px 11px", fontSize: 11 }}>Sluiten</button>
          </div>
        <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
          {/* Clean name first. The raw bank string stays visible underneath —
              "CCV*LINTS ANTWERPEN" is itself a cue, so it must not be hidden
              behind the tidied version. */}
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{ev.title}</div>
          {ev.title !== group.counterparty && (
            <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--muted)", marginBottom: 6, wordBreak: "break-word" }}>
              {group.counterparty}{ev.platform ? ` · via ${ev.platform}` : ""}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono',monospace", color: totalAmount >= 0 ? "var(--green)" : "var(--red)" }}>{fmt(totalAmount)}</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{group.txs.length} transactie{group.txs.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Recognition cues — where and when. Present for about half the
              backlog and never shown here before. */}
          {ev.chips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
              {ev.chips.map((c, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: "var(--accent-10)", border: "1px solid var(--accent-30)", color: "var(--text)", fontSize: 10.5 }}>
                  {c.icon}{c.text}
                </span>
              ))}
            </div>
          )}

          {/* The user's own words, when the bank line isn't a card record. */}
          {ev.note && (
            <div style={{ fontSize: 11, color: "var(--text)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 9px", marginBottom: 8, wordBreak: "break-word" }}>
              <span style={{ color: "var(--muted)" }}>Mededeling: </span>{ev.note}
            </div>
          )}

          <div style={{ fontSize: 10, color: "var(--muted)", maxHeight: 80, overflow: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
            {group.txs.slice(0, 15).map((t) => {
              const line = evidenceLine(t);
              return (
                <span key={t.id}>
                  {fD(t.date)} {fmt(t.amount)}
                  {line ? <span style={{ opacity: 0.7 }}> · {line}</span> : null}
                </span>
              );
            })}
            {group.txs.length > 15 && <span style={{ opacity: 0.6 }}>… +{group.txs.length - 15} meer</span>}
          </div>
        </div>

        {!showAlts ? (
          <>
            {suggestion ? (
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 10, opacity: 0.5, color: "var(--text)", marginBottom: 4 }}>Suggestie</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: suggestion.color+"25", border: `1px solid ${suggestion.color}` }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: suggestion.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{suggestion.catName} › {suggestion.subName}</span>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", marginBottom: 16, padding: 12, borderRadius: 10, background: "var(--bg)", border: "1px dashed var(--border)" }}>
                <div style={{ fontSize: 12, opacity: 0.5, color: "var(--text)" }}>Geen suggestie — kies handmatig of sla over</div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 8 }}>
              <div style={{ textAlign: "center" }}><button onClick={()=>setShowAlts(true)} style={{ width: 56, height: 56, borderRadius: 28, border: "1px solid var(--necessity-luxe)", background: "var(--bg)", color: "var(--necessity-luxe)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><List size={22} strokeWidth={1.8} /></button><div style={{ fontSize: 9, opacity: 0.7, color: "var(--necessity-luxe)", marginTop: 4 }}>Andere</div></div>
              <div style={{ textAlign: "center", alignSelf: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <button onClick={doSkipGroup} style={{ width: 56, height: 56, borderRadius: 28, border: "1px solid var(--muted)", background: "var(--bg)", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", outline: "none" }}><Clock size={22} strokeWidth={1.8} /></button>
                <div style={{ fontSize: 9, opacity: 0.7, color: "var(--muted)" }}>Later</div>
                {onAddToBlacklist && (
                  <button onClick={doBlockGroup} style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid var(--muted)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 10, fontWeight: 500, outline: "none" }}>
                    En blokkeer
                  </button>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <button
                  disabled={!suggestion}
                  onClick={() => suggestion && doAssignGroup(suggestion.catId, suggestion.subId)}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    border: suggestion ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: suggestion ? "var(--accent-20)" : "var(--bg)",
                    color: suggestion ? "var(--accent)" : "var(--muted)",
                    cursor: suggestion ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: suggestion ? 1 : 0.6,
                  }}
                >
                  <Check size={22} strokeWidth={2} />
                </button>
                <div style={{ fontSize: 9, opacity: 0.7, color: suggestion ? "var(--accent)" : "var(--muted)", marginTop: 4 }}>Akkoord</div>
              </div>
            </div>
          </>
        ) : (
          <>
            {favSubs.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", marginBottom: 4 }}><Star size={10} fill="currentColor" strokeWidth={0} />Meest gebruikt</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>{favSubs.map(({ cat: fc, sub: fs }) => <button key={fs.id} onClick={() => { doAssignGroup(fc.id, fs.id); setShowAlts(false); }} style={{ padding: "4px 9px", borderRadius: 999, border: "none", background: fc.color + "25", color: "var(--text)", cursor: "pointer", fontSize: 10.5 }}><span style={{ color: fc.color, fontWeight: 700 }}>{fc.name.slice(0, 8)}</span> › {fs.name}</button>)}</div>
              </div>
            )}
            <button onClick={() => { doAssignGroup("nog_te_verwerken", "te_categoriseren"); setShowAlts(false); }} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", padding: "5px 8px", background: "var(--bg)", border: "none", color: "var(--muted)", cursor: "pointer", borderRadius: 7, fontSize: 10.5, fontStyle: "italic", marginBottom: 8 }}><Package size={12} />Nog te verwerken</button>
            <div style={{ maxHeight: 280, overflow: "auto" }}>
              <CatGrid cats={cats} catUsage={catUsage} tx={tx} handleSelect={(catId, subId) => { doAssignGroup(catId, subId); setShowAlts(false); }} />
            </div>
            <button onClick={() => setShowAlts(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 8, width: "100%", padding: "7px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer", fontSize: 11 }}><ArrowDown size={11} style={{ transform: "rotate(90deg)" }} />Terug</button>
          </>
        )}
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}
