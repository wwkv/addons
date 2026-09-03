/*
 * Card chrome for a dashboard section. The same six properties were inlined on
 * every card; with several more sections coming, that becomes a lot of places
 * to change a border radius.
 *
 * `sub` is where a coverage note goes — a quiet line under the heading saying
 * how much of the money the section below actually covers.
 */
export default function DashSection({ title, sub, action, children, className = "" }) {
  return (
    <section className={`dash-section ${className}`.trim()}>
      {(title || action) && (
        <div className="dash-head">
          <div style={{ minWidth: 0 }}>
            {title && <div className="dash-h">{title}</div>}
            {sub && <div className="dash-sub">{sub}</div>}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
