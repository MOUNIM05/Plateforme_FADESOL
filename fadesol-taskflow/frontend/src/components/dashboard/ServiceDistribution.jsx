const services = [
  ["Technique", "28%", "#16a34a"],
  ["Commercial", "22%", "#2563eb"],
  ["Achat", "15%", "#f59e0b"],
  ["Magasin / Stock", "14%", "#8b5cf6"],
  ["Comptabilité & Management", "12%", "#06b6d4"],
  ["Direction / RH", "9%", "#ef4444"],
];

function ServiceDistribution() {
  return (
    <section className="ft-card ft-service-distribution">
      <div className="ft-card-header">
        <div>
          <h2>Répartition par service</h2>
          <p>Charge de travail par service interne</p>
        </div>
      </div>

      <div className="ft-donut-wrap">
        <div className="ft-donut" />
        <div className="ft-service-list">
          {services.map(([name, percent, color]) => (
            <div key={name}>
              <span><i style={{ background: color }} /> {name}</span>
              <strong>{percent}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ServiceDistribution;
