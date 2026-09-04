import { useState } from "react";
import { Plus, Minus, ChevronLeft, ChevronRight, Check, Home, Baby, ShoppingCart, HeartPulse, UtensilsCrossed, Gamepad2, User, ShoppingBag, Landmark, Hammer, Car } from "lucide-react";

const CAT_ICONS = {
  wonen: Home, kinderen: Baby, boodschappen: ShoppingCart, gezondheid: HeartPulse,
  eten_uit: UtensilsCrossed, ontspanning: Gamepad2, persoonlijk: User, aankopen: ShoppingBag,
  vervoer: Car, financieel: Landmark, projecten: Hammer,
};
const STARTER_BUDGET_CATS = ["wonen", "boodschappen", "vervoer"];
const CAT_COLOR_VARS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)", "var(--cat-5)"];

export default function OnboardingFlow({ settings, setSettings, cats, setCats }) {
  const [step, setStep] = useState(0);
  const [excluded, setExcluded] = useState(() => new Set());
  const [starterAmounts, setStarterAmounts] = useState(() => {
    const init = {};
    STARTER_BUDGET_CATS.forEach(id => { init[id] = ""; });
    return init;
  });
  const [saving, setSaving] = useState(false);

  const expenseCats = cats.filter(c => c.type === "uitgaven" && c.id !== "nog_te_verwerken");

  const setField = (key, delta, min) => setSettings(s => ({ ...s, [key]: Math.max(min, (s[key] ?? min) + delta) }));

  const toggleCat = (id) => setExcluded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const finish = async () => {
    setSaving(true);
    if (excluded.size > 0) {
      setCats(prev => prev.map(c => excluded.has(c.id) ? { ...c, archived: true } : c));
    }
    const hasStarterValues = Object.values(starterAmounts).some(v => Number(v) > 0);
    if (hasStarterValues) {
      try {
        const year = new Date().getFullYear().toString();
        const r = await fetch('api/state/budgets');
        const d = await r.json();
        const existing = d?.value || {};
        const yearData = existing[year] || { income: {}, expense: {} };
        STARTER_BUDGET_CATS.forEach(catId => {
          const amt = Number(starterAmounts[catId]);
          if (!amt) return;
          const cat = cats.find(c => c.id === catId);
          const sub = cat?.subs?.[0];
          if (!sub) return;
          yearData.expense[sub.id] = Array(12).fill(amt);
        });
        existing[year] = yearData;
        await fetch('api/state/budgets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: existing }) });
      } catch (e) { /* ok, starter budget is best-effort */ }
    }
    setSettings(s => ({ ...s, onboardingComplete: true }));
    setSaving(false);
  };

  const skipAll = () => setSettings(s => ({ ...s, onboardingComplete: true }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 500, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", fontFamily: "var(--font-body)", color: "var(--text)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 640 }}>
        <div style={{ width: 24, height: 24, borderRadius: 7, background: "var(--accent)" }} />
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i <= step ? "var(--accent)" : "var(--border)" }} />)}
        </div>
      </div>

      {step === 0 && (
        <div style={{ width: "100%", maxWidth: 520, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 400, margin: 0 }}>Welkom bij Squirrel</h1>
          <p style={{ fontSize: 13.5, color: "var(--muted)", margin: 0, maxWidth: 380, lineHeight: 1.5 }}>Laten we je huishouden instellen — dit duurt ongeveer 2 minuten.</p>
          {[
            { key: "householdAdults", l: "Aantal volwassenen", s: "Inclusief jezelf", min: 1 },
            { key: "householdKids", l: "Aantal kinderen", s: "Voor budgetvergelijking met vergelijkbare gezinnen", min: 0 },
          ].map(f => (
            <div key={f.key} style={{ width: "100%", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.l}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{f.s}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setField(f.key, -1, f.min)} style={stepBtn}><Minus size={13} /></button>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, width: 20, textAlign: "center" }}>{settings[f.key] ?? f.min}</span>
                <button onClick={() => setField(f.key, 1, f.min)} style={stepBtn}><Plus size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 1 && (
        <div style={{ width: "100%", maxWidth: 600, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 400, margin: 0 }}>Kies je categorieën</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, maxWidth: 420, lineHeight: 1.5 }}>We stellen een standaardset voor — vink uit wat niet van toepassing is. Je kan dit altijd later aanpassen.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, width: "100%" }}>
            {expenseCats.map((cat, i) => {
              const Icon = CAT_ICONS[cat.id] || ShoppingBag;
              const isOn = !excluded.has(cat.id);
              const color = CAT_COLOR_VARS[i % CAT_COLOR_VARS.length];
              return (
                <div key={cat.id} onClick={() => toggleCat(cat.id)} style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 8px", borderRadius: 14, border: `1px solid ${isOn ? "var(--accent)" : "var(--border)"}`, background: isOn ? "var(--accent-10)" : "var(--card)", opacity: isOn ? 1 : 0.55 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: isOn ? color + "1F" : "var(--bg)", color: isOn ? color : "var(--muted)" }}><Icon size={18} strokeWidth={1.8} /></div>
                  <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>{cat.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ width: "100%", maxWidth: 520, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 400, margin: 0 }}>Startbudget <span style={{ color: "var(--muted)", fontFamily: "var(--font-body)", fontSize: 16 }}>(optioneel)</span></h1>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, maxWidth: 400, lineHeight: 1.5 }}>Een eerste inschatting per categorie. Je kan dit altijd later aanpassen in Budget of Instellingen.</p>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
            {STARTER_BUDGET_CATS.map((catId, i) => {
              const cat = cats.find(c => c.id === catId);
              if (!cat) return null;
              return (
                <div key={catId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 13, padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: 600 }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", background: CAT_COLOR_VARS[i % CAT_COLOR_VARS.length] }} />
                    {cat.name}
                  </div>
                  <input
                    value={starterAmounts[catId]}
                    onChange={e => setStarterAmounts(a => ({ ...a, [catId]: e.target.value.replace(/[^0-9]/g, "") }))}
                    placeholder="0"
                    style={{ fontFamily: "var(--font-mono)", fontSize: 13, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 7, padding: "7px 11px", width: 90, textAlign: "right", color: "var(--text)" }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: step === 1 ? 600 : 520, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {step === 0 ? (
          <button onClick={skipAll} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, cursor: "pointer" }}>Overslaan</button>
        ) : (
          <button onClick={() => setStep(s => s - 1)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, cursor: "pointer" }}><ChevronLeft size={13} />Terug</button>
        )}
        {step < 2 ? (
          <button onClick={() => setStep(s => s + 1)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 20px", borderRadius: 11, background: "var(--accent)", color: "var(--on-accent)", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>Volgende<ChevronRight size={14} /></button>
        ) : (
          <button onClick={finish} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 26px", borderRadius: 12, background: "var(--accent)", color: "var(--on-accent)", fontSize: 14, fontWeight: 700, border: "none", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>Start met Squirrel<Check size={16} /></button>
        )}
      </div>
      {step === 2 && (
        <button onClick={skipAll} style={{ marginTop: 10, background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer" }}>Sla dit over — ik vul dit later in</button>
      )}
    </div>
  );
}

const stepBtn = { width: 32, height: 32, borderRadius: 9, background: "var(--bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text)", cursor: "pointer" };
