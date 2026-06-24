import { Building2, CheckCircle2, Clock3, FolderKanban, RefreshCw, Workflow } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AccountMenu from "../components/dashboard/AccountMenu";
import DashboardCharts from "../components/dashboard/DashboardCharts";
import KpiCard from "../components/dashboard/KpiCard";
import MembersWorkload from "../components/dashboard/MembersWorkload";
import NotificationDropdown from "../components/dashboard/NotificationDropdown";
import ServicesOverview from "../components/dashboard/ServicesOverview";
import { getDashboardAnalytics, getDashboardStatistics } from "../services/dashboardService";
import { DATA_EVENTS, subscribeDataEvents } from "../utils/dataEvents";

const fallbackStatistics = {
  total_tasks: 0,
  total_projects: 0,
  tasks_in_progress: 0,
  tasks_completed: 0,
  tasks_late: 0,
  tasks_blocked: 0,
  active_services: 0,
};

const serviceKpiDefinitions = [
  { label: "Total taches", statKey: "total_tasks", trend: "Service", icon: Workflow, tone: "green", sparkline: [16, 22, 24, 30, 28, 34, 38] },
  { label: "Projets actifs", statKey: "active_projects", trend: "Service", icon: FolderKanban, tone: "green", sparkline: [30, 36, 42, 40, 48, 52, 58] },
  { label: "Taches actives", statKey: "tasks_in_progress", trend: "A suivre", icon: Workflow, tone: "blue", sparkline: [18, 20, 16, 25, 22, 28, 26] },
  { label: "Terminees", statKey: "tasks_completed", trend: "Cloturees", icon: CheckCircle2, tone: "purple", sparkline: [46, 52, 48, 58, 62, 60, 68] },
  { label: "En retard", statKey: "tasks_late", trend: "Priorite", icon: Clock3, tone: "red", sparkline: [40, 36, 32, 34, 28, 26, 22] },
  { label: "Bloquees", statKey: "tasks_blocked", trend: "A debloquer", icon: Clock3, tone: "red", sparkline: [12, 10, 9, 8, 6, 5, 4] },
  { label: "Services actifs", statKey: "active_services", trend: "Perimetre", icon: Building2, tone: "orange", sparkline: [44, 44, 46, 44, 46, 44, 46] },
];

function ManagerDashboard({ currentUser }) {
  const displayName = currentUser?.prenom || currentUser?.first_name || currentUser?.email || "Manager";
  const [statistics, setStatistics] = useState(fallbackStatistics);
  const [analytics, setAnalytics] = useState(null);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [statisticsWarning, setStatisticsWarning] = useState("");

  const loadDashboardStatistics = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setStatisticsLoading(true);
    }
    setStatisticsWarning("");

    try {
      const data = await getDashboardStatistics();
      const analyticsData = await getDashboardAnalytics();
      setStatistics({ ...fallbackStatistics, ...data, ...(analyticsData.kpis || {}) });
      setAnalytics(analyticsData);
    } catch (error) {
      console.error("Dashboard statistics error:", error);
      setStatistics(fallbackStatistics);
      setAnalytics(null);
      setStatisticsWarning("Statistiques temporairement indisponibles.");
    } finally {
      if (showLoading) {
        setStatisticsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboardStatistics();
  }, [loadDashboardStatistics]);

  useEffect(() => {
    return subscribeDataEvents([DATA_EVENTS.DATA_CHANGED], () => {
      loadDashboardStatistics({ showLoading: false });
    });
  }, [loadDashboardStatistics]);

  const serviceKpis = useMemo(() => {
    const values = serviceKpiDefinitions.map((k) => Number(statistics[k.statKey] ?? 0));
    const maxVal = Math.max(1, ...values);

    return serviceKpiDefinitions.map((kpi) => {
      const raw = statistics[kpi.statKey] ?? 0;
      const numeric = statisticsLoading ? "..." : Number(raw);
      const pct = statisticsLoading ? 0 : Math.round((Number(raw) / maxVal) * 100);

      return {
        ...kpi,
        value: numeric,
        percentage: pct,
      };
    });
  }, [statistics, statisticsLoading]);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Bonjour, {displayName}</h1>
          <p>Vue operationnelle de votre service, de l'equipe et des validations.</p>
        </div>
        <div className="dashboard-header__actions">
          <button
            type="button"
            className="date-selector"
            onClick={() => loadDashboardStatistics()}
            disabled={statisticsLoading}
          >
            <RefreshCw size={18} />
            <span>{statisticsLoading ? "Actualisation..." : "Actualiser"}</span>
          </button>
          <NotificationDropdown />
          <AccountMenu currentUser={currentUser} compact />
        </div>
      </header>

      {statisticsWarning && <p className="notice warning">{statisticsWarning}</p>}

      <DashboardCharts analytics={analytics} />

      <section className="kpi-grid manager-kpis" aria-label="Indicateurs manager">
        {serviceKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <section className="workspace-panel global-progress-panel">
        <div className="panel-title">
          <h3>Progression service</h3>
          <span>{analytics?.global_progress || 0}%</span>
        </div>
        <div className="progress-bar" aria-label={`Progression service ${analytics?.global_progress || 0}%`}>
          <i style={{ width: `${analytics?.global_progress || 0}%` }} />
        </div>
      </section>

      <ServicesOverview />
      <MembersWorkload />
    </div>
  );
}

export default ManagerDashboard;
