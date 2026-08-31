import MonthSelector from '../components/MonthSelector.jsx';
import ComparePanel from '../components/ComparePanel.jsx';

/* Comparison gets its own tab rather than living under the dashboard: it owns
   the same year/month scope the dashboard uses, but it's a "sit down and dig"
   screen, not a glance screen, and it had outgrown the bottom of Overzicht. */
export default function CompareView({ expanded, cats, year, months, setMonths, mStats, years }) {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400, color: "var(--text)", margin: "0 0 14px" }}>Vergelijk</h1>
      <MonthSelector months={months} setMonths={setMonths} mStats={mStats} year={year} />
      <ComparePanel expanded={expanded} cats={cats} year={year} months={months} years={years} />
    </>
  );
}
