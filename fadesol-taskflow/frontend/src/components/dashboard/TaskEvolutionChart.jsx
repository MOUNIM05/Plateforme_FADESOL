const chartData = [
  { label: "Sem 1", created: 42, done: 31 },
  { label: "Sem 2", created: 55, done: 38 },
  { label: "Sem 3", created: 48, done: 44 },
  { label: "Sem 4", created: 66, done: 52 },
  { label: "Sem 5", created: 58, done: 61 },
  { label: "Sem 6", created: 72, done: 63 },
  { label: "Sem 7", created: 61, done: 70 },
];

function TaskEvolutionChart() {
  return (
    <section className="ft-card ft-chart-card">
      <div className="ft-card-header">
        <div>
          <h2>Évolution des tâches</h2>
          <p>Suivi hebdomadaire des tâches créées et terminées</p>
        </div>
        <div className="ft-chart-legend">
          <span><i className="is-blue" /> Tâches créées</span>
          <span><i className="is-green" /> Tâches terminées</span>
        </div>
      </div>

      <div className="ft-chart-grid">
        {[80, 60, 40, 20, 0].map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>

      <div className="ft-bar-chart">
        {chartData.map((item) => (
          <div key={item.label} className="ft-bar-group">
            <div className="ft-bars">
              <i className="is-blue" style={{ height: `${item.created}%` }} />
              <i className="is-green" style={{ height: `${item.done}%` }} />
            </div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TaskEvolutionChart;
