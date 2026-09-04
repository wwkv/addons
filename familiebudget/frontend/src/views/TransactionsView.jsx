import { useMemo } from "react";
import { X, MessageSquare, Scissors, ChevronUp, ChevronDown, HelpCircle, Loader } from "lucide-react";
import { fmt, fD, mN } from '../utils/formatters.js';
import { resolveCatSub } from '../utils/helpers.js';
import HoverTip from '../components/HoverTip.jsx';
import CatPicker from '../components/CatPicker.jsx';
import MultiSelect from '../components/MultiSelect.jsx';
import TxTip from '../components/TxTip.jsx';
import { parseCounterparty } from '../utils/counterparty.js';

export default function TransactionsView({
  displayed, months, fCats, cats, sel, sort, search, startDate, endDate, settings, catUsage,
  setMonths, setFCats, setStartDate, setEndDate, setSearch, setSort, setSel,
  setSplitTx, setEditComment, setContextMenu,
  assign, bulkAssign, handleRowClick, searchInputRef, calEvents = [], cardOwners, lookupEnabled, lookupBusy, onLookup,
}) {
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0")).map(m => ({ value: m, label: mN(m) })), []);
  const catOptions = useMemo(() => [{ value: "_none", label: "Ongecategoriseerd" }, ...cats.map(c => ({ value: c.id, label: c.name, color: c.color }))], [cats]);

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <MultiSelect allLabel="Alle maanden" options={monthOptions} selected={months} onChange={setMonths} width={140} />
        <MultiSelect allLabel="Alle cat." options={catOptions} selected={fCats} onChange={setFCats} width={220} />
        <label style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 9, color: "var(--muted)" }}>
          <span style={{ whiteSpace: "nowrap" }}>Van</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: "3px 5px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 9 }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 9, color: "var(--muted)" }}>
          <span style={{ whiteSpace: "nowrap" }}>Tot</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: "3px 5px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 9 }} />
        </label>
        {(startDate || endDate) && (
          <button type="button" onClick={() => { setStartDate(""); setEndDate(""); }} style={{ padding: "3px 6px", borderRadius: 5, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer", fontSize: 9, display: "flex", alignItems: "center", gap: 2 }} title="Datums wissen"><X size={9} />Datums</button>
        )}
        <div style={{ position: "relative", flex: 1, minWidth: 80 }}>
          <input ref={searchInputRef} placeholder="Zoek..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "3px 5px", paddingRight: search ? 24 : 5, borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", fontSize: 9, width: "100%", boxSizing: "border-box" }} />
          {search && (
            <button type="button" onClick={() => { setSearch(""); searchInputRef.current?.focus(); }} onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; }} onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; }} style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 2, cursor: "pointer", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Zoek wissen">
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </div>
        {(search || startDate || endDate) && displayed.length > 0 && (
          <button type="button" onClick={() => setSel(new Set(displayed.map(t => t.id)))} style={{ padding: "3px 7px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer", fontSize: 9, whiteSpace: "nowrap" }}>Selecteer alle resultaten</button>
        )}
        {sel.size > 0 && <><button onClick={() => setSel(new Set())} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 7px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)", cursor: "pointer", fontSize: 9 }}><X size={9} />{sel.size} geselecteerd</button><CatPicker tx={{ categoryId: null, subCategoryId: null, id: "b" }} cats={cats} catUsage={catUsage} onSelect={(c, s) => bulkAssign(c, s)} compact /></>}
        <span style={{ fontSize: 8, opacity: 0.3, marginLeft: "auto" }}>{displayed.length} tx</span>
      </div>

      <div style={{ background: "var(--card)", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div style={{ overflow: "auto", maxHeight: "calc(100vh - 160px)" }}>
          <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse" }}>
            <thead><tr>
              {[{ f: "date", l: "Datum", w: "68px" }, { f: "amount", l: "Bedrag", w: "78px" }, { f: "counterparty", l: "Tegenpartij" }, { f: "category", l: "Categorie", w: "170px" }, { f: "tags", l: "Tags", w: "28px" }].map(col => (
                <th key={col.f} onClick={() => { if (sort.field === col.f) setSort(s => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" })); else setSort({ field: col.f, dir: "desc" }); }} style={{ padding: "6px 5px", textAlign: "left", fontSize: 9, fontWeight: 700, cursor: "pointer", userSelect: "none", width: col.w || "auto", color: "var(--text)", textTransform: "uppercase", letterSpacing: 0.5, background: "var(--card)", position: "sticky", top: 0, zIndex: 4, borderBottom: "2px solid var(--border)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>{col.l} {sort.field === col.f && (sort.dir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}</span>
                </th>
              ))}
              <th style={{ width: lookupEnabled ? 92 : 70, background: "var(--card)", position: "sticky", top: 0, zIndex: 4, borderBottom: "2px solid var(--border)", fontSize: 9, color: "var(--muted)", fontWeight: 600 }}>Acties</th>
            </tr></thead>
            <tbody>{displayed.map((tx, idx) => {
              const hasSp = tx.splits && tx.splits.length > 1;
              return (
                <tr
                    key={tx.id}
                    onClick={e => handleRowClick(e, idx)}
                    onContextMenu={e => {
                      e.preventDefault();
                      const z = (settings.zoom || 100) / 100;
                      const adjustedX = e.clientX / z;
                      const adjustedY = e.clientY / z;
                      const maxX = (window.innerWidth / z) - 220;
                      const maxY = (window.innerHeight / z) - 200;
                      setContextMenu({ x: Math.min(adjustedX, maxX), y: Math.min(adjustedY, maxY), tx });
                    }}
                    style={{ borderBottom: "1px solid var(--bg)", background: sel.has(tx.id) ? "var(--accent-20)" : idx % 2 ? "var(--bg-30)" : "transparent", cursor: "pointer", userSelect: "none" }}
                  >
                  <td style={{ padding: "3px 5px", fontFamily: "'DM Mono',monospace", fontSize: 9, whiteSpace: "nowrap" }}>{fD(tx.date)}</td>
                  <td style={{ padding: "3px 5px", textAlign: "right", fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 600, color: tx.amount > 0 ? "var(--green)" : "var(--red)" }}>{fmt(tx.amount)}</td>
                  <td style={{ padding: "3px 5px", fontSize: 10, maxWidth: 220 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <HoverTip content={<TxTip tx={tx} calEvents={calEvents} cardOwners={cardOwners} />}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{tx.counterparty}</span>
                      </HoverTip>
                      {tx.paypalMerged && <span title="Samengevoegd via PayPal-import" style={{ fontSize: 7, padding: "0 4px", borderRadius: 2, background: "#0070BA30", color: "#0070BA", fontWeight: 700, flexShrink: 0 }}>PP</span>}
                    </div>
                    {tx.comment && <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 8, opacity: 0.7, marginTop: 1, color: "var(--accent)" }}><MessageSquare size={8} />{tx.comment}</div>}
                  </td>
                  <td style={{ padding: "3px 5px" }} onClick={e => e.stopPropagation()}>
                    {hasSp ? (
                      <div style={{ display: "flex", borderRadius: 3, overflow: "hidden", height: 14, cursor: "pointer" }} onClick={() => setSplitTx(tx)}>
                        {tx.splits.map((s, i) => { const c = cats.find(x => x.id === s.categoryId); return <div key={i} style={{ width: `${s.percentage}%`, background: c ? c.color : "#555", fontSize: 6, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{s.percentage}%</div>; })}
                      </div>
                    ) : (
                      <CatPicker tx={tx} cats={cats} catUsage={catUsage} onSelect={(c, s, force) => { if (sel.size > 1 && sel.has(tx.id)) bulkAssign(c, s); else assign(tx.id, c, s, force); }} compact />
                    )}
                  </td>
                  <td style={{ padding: "3px 5px", width: 28 }} onClick={e => e.stopPropagation()}>
                    {(() => { const { sub } = resolveCatSub(cats, tx.categoryId, tx.subCategoryId); if (!sub) return <span style={{ fontSize: 8, color: "var(--muted)" }}>—</span>; const ty = sub.type || "variabel"; const ne = sub.necessity || "nodig"; return (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 1 }} title={`${ty === "vast" ? "Vast" : "Variabel"} · ${ne === "luxe" ? "Luxe" : "Nodig"}`}>
                        <span style={{ width: 5, height: 5, borderRadius: 2.5, background: ty === "vast" ? "var(--type-vast)" : "var(--type-variabel)" }} />
                        <span style={{ width: 5, height: 5, borderRadius: 2.5, background: ne === "luxe" ? "var(--necessity-luxe)" : "var(--neutral)" }} />
                      </span>
                    ); })()}
                  </td>
                  <td style={{ padding: "3px 3px", textAlign: "center", whiteSpace: "nowrap" }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setEditComment({ ...tx })} title="Opmerking" style={{ display: "inline-flex", background: "none", border: "none", color: tx.comment ? "var(--accent)" : "var(--muted)", cursor: "pointer", padding: "1px 2px", opacity: tx.comment ? 1 : 0.5 }}><MessageSquare size={11} /></button>
                    <button onClick={() => setSplitTx(tx)} title="Splitsen" style={{ display: "inline-flex", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: "1px 2px", opacity: 0.5 }}><Scissors size={11} /></button>
                    {/* Merchant lookup. Hidden unless enabled in Settings, and
                        skipped for person-to-person rows — parseCounterparty
                        already knows those are people, not businesses. */}
                    {lookupEnabled && !parseCounterparty(tx.counterparty).p2p && (
                      <button
                        onClick={() => onLookup(tx)}
                        disabled={lookupBusy.has(tx.id)}
                        title={tx.lookup ? tx.lookup.summary : "Zoek op wat voor zaak dit is"}
                        style={{ display: "inline-flex", background: "none", border: "none", color: tx.lookup ? "var(--accent)" : "var(--muted)", cursor: lookupBusy.has(tx.id) ? "default" : "pointer", padding: "1px 2px", opacity: tx.lookup ? 1 : 0.5 }}
                      >
                        {lookupBusy.has(tx.id)
                          ? <Loader size={11} style={{ animation: "spin 1s linear infinite" }} />
                          : <HelpCircle size={11} />}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        {displayed.length === 0 && <div style={{ padding: 28, textAlign: "center", opacity: 0.3, fontSize: 10 }}>Geen transacties</div>}
      </div>
    </div>
  );
}
