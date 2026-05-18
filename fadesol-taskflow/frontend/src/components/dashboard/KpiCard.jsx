function KpiCard({ icon: Icon, label, value, trend, tone = "green" }) {
  return (
    <article className="ft-kpi-card">
      <div className={`ft-kpi-card__icon is-${tone}`}>
        <Icon size={21} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      <span className={`ft-kpi-card__trend is-${tone}`}>{trend}</span>
    </article>
  );
}

export default KpiCard;
