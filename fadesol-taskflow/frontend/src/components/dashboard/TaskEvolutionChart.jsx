const labels = ["29 Avr - 5 Mai", "6 - 12 Mai", "13 - 19 Mai", "20 - 26 Mai", "27 Mai - 3 Juin"];
const created = [55, 72, 106, 78, 84];
const completed = [32, 48, 70, 55, 40];

function toPoints(values) {
  const max = 120;
  return values
    .map((value, index) => {
      const x = 42 + index * 128;
      const y = 205 - (value / max) * 170;
      return `${x},${y}`;
    })
    .join(" ");
}

function TaskEvolutionChart() {
  return (
    <section className="dashboard-card task-evolution-card">
      <div className="card-header">
        <div>
          <h2>Évolution des tâches</h2>
          <p>Suivi hebdomadaire des tâches créées et terminées</p>
        </div>
        <div className="chart-legend">
          <span><i className="is-blue" /> Tâches créées</span>
          <span><i className="is-green" /> Tâches terminées</span>
        </div>
      </div>

      <div className="line-chart">
        <svg viewBox="0 0 600 250" role="img" aria-label="Évolution des tâches">
          <defs>
            <linearGradient id="createdGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="doneGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[40, 80, 120, 160, 200].map((y) => (
            <line key={y} x1="30" x2="570" y1={y} y2={y} className="chart-grid-line" />
          ))}
          <polyline points={`42,205 ${toPoints(created)} 554,205`} className="chart-area is-blue" />
          <polyline points={`42,205 ${toPoints(completed)} 554,205`} className="chart-area is-green" />
          <polyline points={toPoints(created)} className="chart-line is-blue-stroke" />
          <polyline points={toPoints(completed)} className="chart-line is-green-stroke" />
          {created.map((value, index) => (
            <circle key={`created-${value}`} cx={42 + index * 128} cy={205 - (value / 120) * 170} r="5" className="chart-dot is-blue-dot" />
          ))}
          {completed.map((value, index) => (
            <circle key={`completed-${value}`} cx={42 + index * 128} cy={205 - (value / 120) * 170} r="5" className="chart-dot is-green-dot" />
          ))}
        </svg>
        <div className="line-chart__labels">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TaskEvolutionChart;
