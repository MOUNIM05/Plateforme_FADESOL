function KpiCard({ icon: Icon, label, value, trend, tone = "green", sparkline = [] }) {
  const points = sparkline.length ? sparkline : [10, 24, 18, 34, 28, 44, 38];

  return (
    <article className="kpi-card">
      <div className={`kpi-card__icon is-${tone}`}>
        <Icon size={22} />
      </div>
      <div className="kpi-card__copy">
        <p>{label}</p>
        <strong>{value}</strong>
        <span className={`kpi-card__trend is-${trend.startsWith("-") ? "red" : tone}`}>
          {trend}
        </span>
      </div>
      <div className="kpi-card__sparkline" aria-hidden="true">
        {points.map((point, index) => (
          <i key={`${point}-${index}`} style={{ height: `${point}%` }} />
        ))}
      </div>
    </article>
  );
}

export default KpiCard;
