function KpiCard({ icon: Icon, label, value, trend, tone = "green", sparkline = [] }) {
  const points = sparkline.length ? sparkline : [10, 24, 18, 34, 28, 44, 38];

  return (
    <article className="kpi-card">
      <div className="kpi-card__top">
        <div className={`kpi-card__icon is-${tone}`}>
          <Icon size={20} />
        </div>
        <p>{label}</p>
      </div>

      <div className="kpi-card__middle">
        <strong>{value}</strong>
      </div>

      <div className="kpi-card__bottom">
        <span className={`kpi-card__trend is-${trend.startsWith("-") ? "red" : tone}`}>
          {trend}
        </span>
        <div className="kpi-card__sparkline" aria-hidden="true">
          {points.map((point, index) => (
            <i key={`${point}-${index}`} style={{ height: `${point}%` }} />
          ))}
        </div>
      </div>
    </article>
  );
}

export default KpiCard;
