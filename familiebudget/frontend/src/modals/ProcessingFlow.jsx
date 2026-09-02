import { useState, useMemo, useEffect } from "react";
import { X, ArrowLeft, ChevronRight, Sparkles, List, Search, CheckCircle2 } from "lucide-react";
import { fmt } from '../utils/formatters.js';
import CatPicker from '../components/CatPicker.jsx';
import { parseCounterparty, parseEvidence } from '../utils/counterparty.js';

import TinderMode from './TinderMode.jsx';

/* Cleaned merchant name for a group heading, preferring the description's
   merchant prefix when the counterparty column is padded or truncated. */
function groupTitle(g) {
  const t = g.txs[0];
  if (!t) return g.key;
  const cp = parseCounterparty(t.counterparty);
  const e = parseEvidence(t);
  return e.merchantPrefix && e.merchantPrefix.length > cp.name.length ? e.merchantPrefix : (cp.name || g.key);
}

/* "Antwerpen · 3 dagen · 09:55-14:36" — enough context to bulk-assign a group
   without opening it. Returns "" when the bank gave us nothing. */
function groupCues(g) {
  const evs = g.txs.map(parseEvidence);
  const places = [...new Set(evs.map(e => e.place).filter(Boolean))];
  const times = [...new Set(evs.map(e => e.time).filter(Boolean))].sort();
  // Purchase dates, not tx.date — the bank books card payments 1-6 days late,
  // so one afternoon's shopping can otherwise read as "3 dagen".
  const days = [...new Set(evs.map(e => e.date).filter(Boolean))];
  const bits = [];
  if (places.length === 1) bits.push(places[0]);
  else if (places.length > 1) bits.push(`${places[0]} +${places.length - 1}`);
  if (days.length > 1) bits.push(`${days.length} dagen`);
  if (times.length === 1) bits.push(times[0]);
  else if (times.length > 1) bits.push(`${times[0]}-${times[times.length - 1]}`);
  return bits.join(' \u00b7 ');
}

/*
 * The categorization "funnel": Voortgang (progress overview) → Batch (fast
 * bulk-apply for recurring counterparties) → Diepgang (one-by-one review,
 * reusing TinderMode for the genuinely ambiguous leftovers) → Klaar
 * (completion + handoff into Sparen). Grouping/bulk-assign logic is not
 * reimplemented here — it reuses the same counterparty grouping TinderMode
 * already does, and the same `bulkAssign` used by manual multi-select.
 */
export default function ProcessingFlow({ txs, cats, autoCat, catUsage, blacklist, calEvents, onAddToBlacklist, assign, bulkAssign, onSkip, onUndo, unassignedSavings, onClose, onGoToSavings }) {
  const [stage, setStage] = useState("voortgang");
  const [groupBy, setGroupBy] = useState("counterparty");

  const isBlacklisted = (cp) => (blacklist || []).some(b => b.trim().toLowerCase() === (cp || "").trim().toLowerCase());

  const groups = useMemo(() => {
    const uncat = txs.filter(t => !t.categoryId && !t.splits);
    const byKey = {};
    for (const t of uncat) {
      const cp = t.counterparty.trim();
      if (groupBy === "counterparty" && isBlacklisted(cp)) {
        byKey["__singleton_" + t.id] = { key: cp, txs: [t] };
        continue;
      }
      const k = groupBy === "date" ? t.date : groupBy === "amount" ? String(Math.abs(t.amount)) : cp;
      if (!byKey[k]) byKey[k] = { key: k, txs: [] };
      byKey[k].txs.push(t);
    }
    return Object.values(byKey).sort((a, b) => b.txs.length - a.txs.length);
  }, [txs, blacklist, groupBy]);

  const bigGroups = groups.filter(g => g.txs.length >= 2);
  const singleGroups = groups.filter(g => g.txs.length === 1);
  const total = txs.length;
  const doneCount = txs.filter(t => t.categoryId || t.splits).length;
  const batchTxCount = bigGroups.reduce((s, g) => s + g.txs.length, 0);
  const deepTxCount = singleGroups.length;
  const allDone = groups.length === 0;

  // Snapshot the split once on mount so the Klaar screen can report an
  // honest "X automatisch / Y snel gesorteerd / Z dieper bekeken" even
  // though those buckets empty out as the user works through them.
  const [initialStats] = useState(() => ({ auto: doneCount, batch: batchTxCount, deep: deepTxCount, total }));

  useEffect(() => {
    if (stage === "batch" && bigGroups.length === 0 && groups.length > 0) setStage("diepgang");
  }, [stage, bigGroups.length, groups.length]);
  useEffect(() => {
    if ((stage === "batch" || stage === "diepgang") && allDone) setStage("klaar");
  }, [stage, allDone]);

  if (stage === "diepgang") {
    return (
      <TinderMode
        txs={txs} cats={cats} autoCat={autoCat} catUsage={catUsage} blacklist={blacklist} calEvents={calEvents}
        onAddToBlacklist={onAddToBlacklist}
        onAssign={(id, c, s) => assign(id, c, s, false)}
        onSkip={onSkip}
        onUndo={onUndo}
        onClose={() => setStage("klaar")}
      />
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--card)", borderRadius: 18, border: "1px solid var(--border)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", width: "100%", maxWidth: 860, maxHeight: "88vh", overflow: "auto", display: "flex", flexDirection: "column" }}>

        {stage === "voortgang" && (
          <Voortgang total={total} doneCount={doneCount} bigGroups={bigGroups} singleGroups={singleGroups} batchTxCount={batchTxCount} deepTxCount={deepTxCount} allDone={allDone} onClose={onClose} onStartBatch={() => setStage("batch")} onStartDeep={() => setStage("diepgang")} />
        )}

        {stage === "batch" && (
          <Batch bigGroups={bigGroups} cats={cats} catUsage={catUsage} groupBy={groupBy} setGroupBy={setGroupBy} bulkAssign={bulkAssign} onBack={() => setStage("voortgang")} onNext={() => setStage(singleGroups.length > 0 ? "diepgang" : "klaar")} hasDeep={singleGroups.length > 0} />
        )}

        {stage === "klaar" && (
          <Klaar initialStats={initialStats} allDone={allDone} remaining={groups.length} unassignedSavings={unassignedSavings} onClose={onClose} onResume={() => setStage("voortgang")} onGoToSavings={onGoToSavings} />
        )}
      </div>
    </div>
  );
}

function Header({ title, onBack, onClose, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onBack && <button onClick={onBack} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ArrowLeft size={14} /></button>}
        <div>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 400, fontFamily: "var(--font-display)", color: "var(--text)" }}>{title}</h2>
          {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} /></button>
    </div>
  );
}

function Voortgang({ total, doneCount, bigGroups, singleGroups, batchTxCount, deepTxCount, allDone, onClose, onStartBatch, onStartDeep }) {
  const pct = (n) => total > 0 ? (n / total) * 100 : 0;
  return (
    <>
      <Header title="Transacties verwerken" onClose={onClose} />
      <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Voortgang</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 36, color: "var(--text)", marginTop: 4 }}>{doneCount} <span style={{ fontSize: 18, color: "var(--muted)" }}>van {total} verwerkt</span></div>
          <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 12 }}>
            <div style={{ width: `${pct(doneCount)}%`, background: "var(--cat-1)" }} />
            <div style={{ width: `${pct(batchTxCount)}%`, background: "var(--cat-2)" }} />
            <div style={{ width: `${pct(deepTxCount)}%`, background: "var(--cat-4)" }} />
          </div>
        </div>

        {allDone ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--muted)", fontSize: 13 }}>Alles is al verwerkt.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <StageCard icon={<Sparkles size={17} />} color="var(--cat-1)" title="Automatisch verwerkt" desc="Op basis van geleerde patronen." count={doneCount} done />
            <StageCard icon={<List size={17} />} color="var(--cat-2)" title="Snel sorteren" desc="Gegroepeerd op tegenpartij, datum of bedrag." count={batchTxCount} disabled={bigGroups.length === 0} onStart={onStartBatch} />
            <StageCard icon={<Search size={17} />} color="var(--cat-4)" title="Dieper bekijken" desc="Onduidelijke transacties, één voor één." count={deepTxCount} disabled={singleGroups.length === 0} onStart={onStartDeep} />
          </div>
        )}
      </div>
    </>
  );
}

function StageCard({ icon, color, title, desc, count, done, disabled, onStart }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 13, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: color + "1F", color, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{title}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", flex: 1 }}>{desc}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>{count} transacties</span>
        {done
          ? <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: "var(--accent-20)", color: "var(--accent)" }}>Klaar</span>
          : <button onClick={onStart} disabled={disabled} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 8, border: disabled ? "1px solid var(--border)" : "none", background: disabled ? "transparent" : "var(--accent)", color: disabled ? "var(--muted)" : "#fff", fontSize: 11, fontWeight: 600, cursor: disabled ? "default" : "pointer" }}>Start<ChevronRight size={12} /></button>}
      </div>
    </div>
  );
}

function Batch({ bigGroups, cats, catUsage, groupBy, setGroupBy, bulkAssign, onBack, onNext, hasDeep }) {
  return (
    <>
      <Header title="Snel sorteren" sub={`${bigGroups.length} groepen over`} onBack={onBack} onClose={onBack} />
      <div style={{ padding: "14px 22px 0" }}>
        <div style={{ display: "flex", gap: 4, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 9, padding: 3, width: "fit-content" }}>
          {[{ v: "counterparty", l: "Tegenpartij" }, { v: "date", l: "Datum" }, { v: "amount", l: "Bedrag" }].map(o => (
            <button key={o.v} onClick={() => setGroupBy(o.v)} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: groupBy === o.v ? "var(--accent-20)" : "transparent", color: groupBy === o.v ? "var(--accent)" : "var(--muted)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{o.l}</button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 8 }}>
        {bigGroups.length === 0 && <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, padding: 20 }}>Geen groepen meer — verder naar dieper bekijken.</div>}
        {bigGroups.map(g => (
          <div key={g.key} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{groupTitle(g)}</div>
                {/* Where and when, so a bulk decision isn't made blind. */}
                {groupCues(g) && (
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{groupCues(g)}</div>
                )}
              </div>
              <span style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 700, color: "var(--muted)", background: "var(--border)", padding: "1px 8px", borderRadius: 999 }}>{g.txs.length}×</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
              <div style={{ flex: 1 }}>
                <CatPicker tx={{ categoryId: null, subCategoryId: null }} cats={cats} catUsage={catUsage} onSelect={(catId, subId) => bulkAssign(catId, subId, g.txs.map(t => t.id))} compact />
              </div>
              <span style={{ fontSize: 10.5, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{fmt(g.txs.reduce((s, t) => s + t.amount, 0))}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onNext} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: "none", background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{hasDeep ? "Volgende: Dieper bekijken" : "Afronden"}<ChevronRight size={13} /></button>
      </div>
    </>
  );
}

function Klaar({ initialStats, allDone, remaining, unassignedSavings, onClose, onResume, onGoToSavings }) {
  return (
    <div style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18 }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--accent-20)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={26} strokeWidth={1.8} /></div>
      <div>
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, color: "var(--text)" }}>{allDone ? "Alles verwerkt" : "Voortgang opgeslagen"}</h2>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
          {allDone ? `${initialStats.total} transacties verwerkt` : `Nog ${remaining} transacties te verwerken`}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: "100%", maxWidth: 480 }}>
        <MiniStat label="Automatisch" value={initialStats.auto} />
        <MiniStat label="Snel gesorteerd" value={initialStats.batch} />
        <MiniStat label="Dieper bekeken" value={initialStats.deep} />
      </div>
      {allDone && unassignedSavings > 0 && (
        <div style={{ width: "100%", maxWidth: 480, background: "var(--bg)", border: "1px solid var(--accent)", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Openstaand bedrag</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--green)", marginTop: 2 }}>{fmt(unassignedSavings)}</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Dit kan je nu verdelen over je spaarpotjes.</div>
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        {!allDone && <button onClick={onResume} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 12.5, cursor: "pointer" }}>Verder gaan</button>}
        <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: 12.5, cursor: "pointer" }}>{allDone && unassignedSavings > 0 ? "Later" : "Sluiten"}</button>
        {allDone && unassignedSavings > 0 && (
          <button onClick={onGoToSavings} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Ga naar Sparen<ChevronRight size={14} /></button>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 11, padding: "11px 8px" }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--text)", marginTop: 3 }}>{value}</div>
    </div>
  );
}
