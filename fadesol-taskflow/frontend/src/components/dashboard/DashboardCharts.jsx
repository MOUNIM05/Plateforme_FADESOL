// Graphiques analytiques reutilises par les dashboards Admin et Manager.
// Les bar charts restent generiques, tandis que les priorites sont rendues en camembert plein.
import { useState } from "react";

function normalizeItems(items = []) {
  // Harmonise les formats renvoyes par dashboard_service avant rendu SVG.
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

const PRIORITY_COLORS = {
  Basse: "#facc15",
  Moyenne: "#fb923c",
  Haute: "#f43f5e",
  Urgente: "#d946ef",
};

function normalizePriority(priority) {
  // Accepte les libelles francais/anglais et les anciennes variantes de priorite.
  const value = String(priority || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (value.includes("basse") || value.includes("faible") || value.includes("low")) return "Basse";
  if (value.includes("haute") || value.includes("high")) return "Haute";
  if (value.includes("urgente") || value.includes("urgent")) return "Urgente";
  if (value.includes("moyenne") || value.includes("normal") || value.includes("normale")) return "Moyenne";

  return "Moyenne";
}

function buildPriorityPieData(items = []) {
  // Compte les taches par priorite et calcule le pourcentage de chaque part.
  const counts = {
    Basse: 0,
    Moyenne: 0,
    Haute: 0,
    Urgente: 0,
  };

  if (!Array.isArray(items)) {
    return [];
  }

  items.forEach((item) => {
    const priority = normalizePriority(item.priority || item.priorite || item.label || item.name);
    const value = Number(item.value ?? item.total_tasks ?? item.count ?? item.total ?? 1);

    counts[priority] += Number.isFinite(value) ? value : 0;
  });

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

  return Object.entries(counts)
    .map(([name, value]) => ({
      name,
      value,
      percent: total > 0 ? Math.round((value / total) * 100) : 0,
    }))
    .filter((item) => item.value > 0);
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function createPieSlicePath(cx, cy, radius, startAngle, endAngle) {
  // Genere un secteur SVG plein pour eviter d'ajouter une dependance graphique.
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function PriorityPieChart({ items }) {
  // Camembert accessible : title natif SVG, labels externes et tooltip visuel au survol.
  const [hoveredPriority, setHoveredPriority] = useState(null);
  const data = buildPriorityPieData(items);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const cx = 180;
  const cy = 130;
  const radius = 88;
  let startAngle = 0;

  if (data.length === 0 || total <= 0) {
    return <div className="empty-chart-message">Aucune tâche disponible</div>;
  }

  return (
    <div className="priority-pie-wrapper">
      <div className="priority-pie-visual" role="img" aria-label="Répartition des tâches par priorité">
        <svg viewBox="0 0 360 280" className="priority-pie-svg">
          {data.map((item) => {
            const angle = (item.value / total) * 360;
            const endAngle = startAngle + angle;
            const midAngle = startAngle + angle / 2;
            const percentPosition = polarToCartesian(cx, cy, radius * 0.58, midAngle);
            const labelLineStart = polarToCartesian(cx, cy, radius + 4, midAngle);
            const labelLineEnd = polarToCartesian(cx, cy, radius + 22, midAngle);
            const labelPosition = polarToCartesian(cx, cy, radius + 30, midAngle);
            const textAnchor = labelPosition.x > cx ? "start" : "end";
            const color = PRIORITY_COLORS[item.name] || "#94a3b8";
            const segment =
              data.length === 1 ? (
                <circle
                  className="priority-pie-slice"
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={color}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredPriority(item)}
                  onFocus={() => setHoveredPriority(item)}
                  onMouseLeave={() => setHoveredPriority(null)}
                  onBlur={() => setHoveredPriority(null)}
                >
                  <title>{`${item.name} : ${item.value} tâche(s) - ${item.percent}%`}</title>
                </circle>
              ) : (
                <path
                  className="priority-pie-slice"
                  d={createPieSlicePath(cx, cy, radius, startAngle, endAngle)}
                  fill={color}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredPriority(item)}
                  onFocus={() => setHoveredPriority(item)}
                  onMouseLeave={() => setHoveredPriority(null)}
                  onBlur={() => setHoveredPriority(null)}
                >
                  <title>{`${item.name} : ${item.value} tâche(s) - ${item.percent}%`}</title>
                </path>
              );

            startAngle = endAngle;

            return (
              <g key={item.name}>
                {segment}
                {data.length > 1 && (
                  <line
                    className="priority-pie-label-line"
                    x1={labelLineStart.x}
                    y1={labelLineStart.y}
                    x2={labelLineEnd.x}
                    y2={labelLineEnd.y}
                  />
                )}
                <text
                  className="priority-pie-percent"
                  x={data.length === 1 ? cx : percentPosition.x}
                  y={data.length === 1 ? cy + 4 : percentPosition.y + 4}
                  textAnchor="middle"
                >
                  {item.percent}%
                </text>
                <text
                  className="priority-pie-label"
                  x={data.length === 1 ? cx : labelPosition.x}
                  y={data.length === 1 ? cy - radius - 18 : labelPosition.y}
                  textAnchor={data.length === 1 ? "middle" : textAnchor}
                  dominantBaseline="central"
                >
                  {item.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="priority-pie-legend" aria-label="Légende priorités">
        {data.map((item) => (
          <div key={item.name} className="priority-pie-legend-item">
            <i style={{ background: PRIORITY_COLORS[item.name] || "#94a3b8" }} />
            <span
              onMouseEnter={() => setHoveredPriority(item)}
              onFocus={() => setHoveredPriority(item)}
              onMouseLeave={() => setHoveredPriority(null)}
              onBlur={() => setHoveredPriority(null)}
              tabIndex={0}
            >
              {item.name}
            </span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      {hoveredPriority && (
        <div className="priority-pie-tooltip" role="status">
          <strong>{hoveredPriority.name}</strong>
          <span>{hoveredPriority.value} tâche(s) - {hoveredPriority.percent}%</span>
        </div>
      )}
    </div>
  );
}

function AxisBarChart({ items }) {
  // Histogramme horizontal conserve pour les autres repartitions du dashboard.
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

function ChartCard({ title, subtitle, items, type = "bar" }) {
  const normalizedItems = normalizeItems(items);
  const priorityPieData = type === "priority-pie" ? buildPriorityPieData(items) : [];

  return (
    <article className={`dashboard-card analytics-chart-card ${type === "priority-pie" ? "priority-pie-card" : ""}`}>
      <div className="card-header">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      {type === "priority-pie" ? (
        priorityPieData.length === 0 ? (
          <div className="empty-chart-message">Aucune tâche disponible</div>
        ) : (
          <PriorityPieChart items={items} />
        )
      ) : normalizedItems.length === 0 ? (
        <p className="loading-line compact">Aucune donnée disponible pour le moment.</p>
      ) : (
        <AxisBarChart items={normalizedItems} />
      )}
    </article>
  );
}

function DashboardCharts({ analytics }) {
  // Compose dynamiquement les graphiques disponibles selon la reponse analytics.
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
      type: "priority-pie",
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
