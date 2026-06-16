function normalizeItems(items = []) {
  return Array.isArray(items)
    ? items
        .map((item) => ({
          label: item.label || item.name || item.full_name || "Non renseigné",
          value: Number(item.value ?? item.total_tasks ?? 0),
          completed: Number(item.completed ?? item.completed_tasks ?? 0),
        }))
    : [];
}

function ChartCard({ title, subtitle, items, kind = "bar" }) {
  const normalizedItems = normalizeItems(items);
  const maxValue = Math.max(...normalizedItems.map((item) => item.value), 1);

  return (
    <article className="dashboard-card analytics-chart-card">
      <div className="card-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      {normalizedItems.length === 0 ? (
        <p className="loading-line compact">Aucune donnée disponible pour le moment.</p>
      ) : (
        <div className={`analytics-chart analytics-chart--${kind}`}>
          {normalizedItems.map((item) => {
            const width = item.value > 0 ? Math.max(6, Math.round((item.value / maxValue) * 100)) : 0;

            return (
              <div className="analytics-chart-row" key={item.label}>
                <span>{item.label}</span>
                <div className="analytics-chart-track">
                  <i style={{ width: `${width}%` }} />
                </div>
                <strong>{item.value}</strong>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function DashboardCharts({ analytics }) {
  return (
    <section className="analytics-charts-grid" aria-label="Graphes dashboard">
      <ChartCard
        title="Tâches par statut"
        subtitle="Répartition opérationnelle des tâches"
        items={analytics?.tasks_by_status}
      />
      <ChartCard
        title="Tâches par service"
        subtitle="Volume de tâches par service"
        items={analytics?.tasks_by_service}
      />
      <ChartCard
        title="Charge par membre"
        subtitle="Nombre de tâches affectées"
        items={analytics?.workload_by_member}
      />
      <ChartCard
        title="Tâches par priorité"
        subtitle="Priorités de traitement"
        items={analytics?.tasks_by_priority}
      />
    </section>
  );
}

export default DashboardCharts;
