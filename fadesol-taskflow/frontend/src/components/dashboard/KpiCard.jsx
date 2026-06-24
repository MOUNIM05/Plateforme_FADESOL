function KpiCard({ icon: Icon, label, value, trend, tone = "green", percentage = null }) {
  const rawValue = value ?? 0;
  const isNumber = typeof rawValue === "number" || (!isNaN(Number(rawValue)) && String(rawValue) !== "...");
  const displayValue = isNumber ? Number(rawValue).toLocaleString() : String(rawValue);

  return (
    <article className={`kpi-card is-${tone}`} role="region" aria-label={`Indicateur ${label}`}>
      <div className="kpi-card-header">
        <div className={`kpi-icon is-${tone}`}>
          <Icon size={20} />
        </div>
        <div className="kpi-title">{label}</div>
        <div className="kpi-value">
          <strong>{displayValue}</strong>
        </div>
      </div>

      <div className="kpi-card-footer">
        {trend ? (
          <span className={`kpi-badge is-${String(trend).startsWith("-") ? "red" : tone}`}>{trend}</span>
        ) : null}
      </div>
    </article>
  );
}

export default KpiCard;
