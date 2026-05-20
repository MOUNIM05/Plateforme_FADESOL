const priorities = [
  ["Urgente", "18", "8%", "#ef4444"],
  ["Haute", "42", "19%", "#f97316"],
  ["Moyenne", "98", "45%", "#2563eb"],
  ["Basse", "62", "28%", "#16a34a"],
];

function PriorityDistribution() {
  return (
    <section className="dashboard-card">
      <div className="card-header">
        <div>
          <h2>Répartition des tâches par priorité</h2>
          <p>Total 220 Tâches</p>
        </div>
      </div>

      <div className="donut-layout">
        <div className="donut-chart priority-donut">
          <div>
            <strong>220</strong>
            <span>Tâches</span>
          </div>
        </div>
        <div className="legend-list">
          {priorities.map(([label, count, percent, color]) => (
            <div key={label}>
              <span><i style={{ background: color }} /> {label}</span>
              <strong>{count} <small>({percent})</small></strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PriorityDistribution;
