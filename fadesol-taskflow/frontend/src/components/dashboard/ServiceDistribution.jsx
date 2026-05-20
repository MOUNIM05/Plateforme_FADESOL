const services = [
  ["Technique", "28%", "#16a34a"],
  ["Commercial", "22%", "#2563eb"],
  ["Achat", "15%", "#f97316"],
  ["Magasin / Stock", "14%", "#7c3aed"],
  ["Comptabilité & Management", "12%", "#22c55e"],
  ["Direction / RH", "9%", "#94a3b8"],
];

function ServiceDistribution() {
  return (
    <section className="dashboard-card">
      <div className="card-header">
        <div>
          <h2>Répartition par service</h2>
          <p>Total 6 Services</p>
        </div>
      </div>

      <div className="donut-layout">
        <div className="donut-chart service-donut">
          <div>
            <strong>6</strong>
            <span>Services</span>
          </div>
        </div>
        <div className="legend-list">
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
