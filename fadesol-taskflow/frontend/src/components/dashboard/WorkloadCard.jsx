const workload = [
  ["Surcharge", 3, "#ef4444"],
  ["Optimale", 18, "#16a34a"],
  ["Sous-charge", 6, "#2563eb"],
];

function WorkloadCard() {
  return (
    <section className="dashboard-card workload-card">
      <div className="card-header">
        <div>
          <h2>Charge de travail globale</h2>
          <p>Capacité moyenne des équipes</p>
        </div>
      </div>

      <div className="workload-gauge">
        <div className="gauge-ring">
          <div>
            <strong>68%</strong>
            <span>Charge moyenne</span>
          </div>
        </div>
      </div>

      <div className="workload-legend">
        {workload.map(([label, count, color]) => (
          <div key={label}>
            <span><i style={{ background: color }} /> {label}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export default WorkloadCard;
