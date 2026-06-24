function normalizeItems(items = []) {
  return Array.isArray(items)
    ? items.map((item) => ({
        label: item.label || item.name || item.full_name || "Non renseigné",
        value: Number(item.value ?? item.total_tasks ?? 0),
      }))
    : [];
}

function truncateLabel(label, maxLength = 16) {
  const value = String(label || "Non renseigné");

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function AxisBarChart({ items }) {
  const data = normalizeItems(items).slice(0, 10);
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const width = 520;
  const height = Math.max(240, data.length * 48 + 80);
  const left = 140;
  const right = 28;
  const top = 24;
  const bottom = 48;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const band = data.length ? chartHeight / data.length : chartHeight;
  const barHeight = Math.max(12, band * 0.6);
  const ticks = [0, Math.ceil(maxValue / 2), maxValue];

  return (
    <div className="axis-bar-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Histogramme - répartition des catégories">
        <line className="axis-line" x1={left} y1={top} x2={left} y2={height - bottom} />
        <line className="axis-line" x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} />

        {ticks.map((tick) => {
          const x = left + (tick / maxValue) * chartWidth;

          return (
            <g key={tick}>
              <line className="axis-grid-line" x1={x} y1={top} x2={x} y2={height - bottom} />
              <text className="axis-tick-label" x={x} y={height - 18} textAnchor="middle">
                {tick}
              </text>
            </g>
          );
        })}

        {data.map((item, index) => {
          const y = top + index * band + (band - barHeight) / 2;
          const barWidth = Math.round((item.value / maxValue) * chartWidth);
          const valueXInside = left + Math.max(8, barWidth - 36);
          const valueXOutside = left + barWidth + 8;
          const showInside = barWidth > 44;

          return (
            <g key={item.label}>
              <text className="axis-category-label" x={left - 12} y={y + barHeight / 2 + 4} textAnchor="end">
                {truncateLabel(item.label, 20)}
                <title>{item.label}</title>
              </text>

              <rect
                className="axis-bar"
                x={left}
                y={y}
                width={Math.max(4, barWidth)}
                height={barHeight}
                rx="6"
              />

              <text
                className={`axis-value-label ${showInside ? "inside" : "outside"}`}
                x={showInside ? valueXInside : valueXOutside}
                y={y + barHeight / 2 + 4}
                textAnchor={showInside ? "end" : "start"}
              >
                {String(item.value)}
              </text>
            </g>
          );
        })}

        <text className="axis-name axis-name-x" x={left + chartWidth / 2} y={height - 6} textAnchor="middle">
          Nombre de tâches
        </text>
      </svg>
    </div>
  );
}

function ChartCard({ title, subtitle, items }) {
  const normalizedItems = normalizeItems(items);

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
        <AxisBarChart items={normalizedItems} />
      )}
    </article>
  );
}

function DashboardCharts({ analytics }) {
  const chartDefinitions = [
    {
      title: "Tâches par statut",
      subtitle: "Statuts sur l’axe Y, volume sur l’axe X",
      items: analytics?.tasks_by_status,
    },
    {
      title: "Tâches par service",
      subtitle: "Services sur l’axe Y, volume sur l’axe X",
      items: analytics?.tasks_by_service,
    },
    {
      title: "Charge par membre",
      subtitle: "Membres sur l’axe Y, tâches affectées sur l’axe X",
      items: analytics?.workload_by_member,
    },
  ];

  // Ajoute Tâches par priorité si présent dans l'analytics
  if (analytics?.tasks_by_priority) {
    chartDefinitions.push({
      title: "Tâches par priorité",
      subtitle: "Répartition par niveau de priorité",
      items: analytics.tasks_by_priority,
    });
  }

  return (
    <section className="analytics-charts-grid dashboard-priority-charts" aria-label="Graphes statistiques du dashboard">
      {chartDefinitions.map((chart) => (
        <ChartCard key={chart.title} {...chart} />
      ))}
    </section>
  );
}

export default DashboardCharts;
