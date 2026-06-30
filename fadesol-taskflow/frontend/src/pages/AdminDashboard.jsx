// Dashboard administrateur : vision globale de la plateforme, KPIs,
// graphiques analytiques, activite temps reel et raccourcis de pilotage.
import {
  Building2,
  CheckCircle2,
  Clock3,
  FolderKanban,
  RefreshCw,
  Settings,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventCalendar from "../components/dashboard/EventCalendar";
import AccountMenu from "../components/dashboard/AccountMenu";
import DashboardCharts from "../components/dashboard/DashboardCharts";
import KpiCard from "../components/dashboard/KpiCard";
import MembersWorkload from "../components/dashboard/MembersWorkload";
import NotificationDropdown from "../components/dashboard/NotificationDropdown";
import RealtimeActivity from "../components/dashboard/RealtimeActivity";
import ServicesOverview from "../components/dashboard/ServicesOverview";
import TaskEvolutionChart from "../components/dashboard/TaskEvolutionChart";
import UrgentTasks from "../components/dashboard/UrgentTasks";
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
  active_users: 0,
};

const kpiDefinitions = [
  {
    label: "Total Taches",
    statKey: "total_tasks",
    trend: "Portefeuille",
    icon: Workflow,
    tone: "green",
    sparkline: [18, 24, 28, 34, 38, 44, 48],
  },
  {
    label: "Total Projets",
    statKey: "total_projects",
    trend: "+12% ce mois",
    icon: FolderKanban,
    tone: "green",
    sparkline: [24, 34, 28, 46, 42, 58, 64],
  },
  {
    label: "Tâches Actives",
    statKey: "tasks_in_progress",
    trend: "+8% ce mois",
    icon: Workflow,
    tone: "blue",
    sparkline: [30, 44, 38, 54, 50, 66, 60],
  },
  {
    label: "Tâches Terminées",
    statKey: "tasks_completed",
    trend: "+15% ce mois",
    icon: CheckCircle2,
    tone: "purple",
    sparkline: [22, 28, 44, 40, 62, 56, 72],
  },
  {
    label: "Tâches en Retard",
    statKey: "tasks_late",
    trend: "-3% ce mois",
    icon: Clock3,
    tone: "red",
    sparkline: [58, 52, 44, 48, 34, 30, 26],
  },
  {
    label: "Taches Bloquees",
    statKey: "tasks_blocked",
    trend: "A debloquer",
    icon: Clock3,
    tone: "red",
    sparkline: [12, 11, 9, 8, 7, 6, 5],
  },
  {
    label: "Services Actifs",
    statKey: "active_services",
    trend: "Stable",
    icon: Building2,
    tone: "orange",
    sparkline: [44, 44, 46, 44, 46, 44, 46],
  },
  {
    label: "Utilisateurs Actifs",
    statKey: "active_users",
    trend: "Comptes actifs",
    icon: Building2,
    tone: "blue",
    sparkline: [36, 38, 40, 42, 44, 46, 48],
  },
];

function AdminDashboard({ currentUser }) {
  const navigate = useNavigate();
  const displayName = currentUser?.prenom || currentUser?.first_name || currentUser?.email || "Admin";
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

  const kpis = useMemo(() => {
    const values = kpiDefinitions.map((k) => Number(statistics[k.statKey] ?? 0));
    const maxVal = Math.max(1, ...values);

    return kpiDefinitions.map((kpi) => {
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
          <p>Voici un aperçu complet de l'activité de votre organisation.</p>
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
          <button type="button" className="icon-button" aria-label="Parametres systeme" onClick={() => navigate("/system-settings")}>
            <Settings size={19} />
          </button>
          <NotificationDropdown />
          <AccountMenu currentUser={currentUser} compact />
        </div>
      </header>

      {statisticsWarning && <p className="notice warning">{statisticsWarning}</p>}

      <DashboardCharts analytics={analytics} />

      <section className="kpi-grid" aria-label="Indicateurs clés">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <section className="workspace-panel global-progress-panel">
        <div className="panel-title">
          <h3>Progression globale</h3>
          <span>{analytics?.global_progress || 0}%</span>
        </div>
        <div className="progress-bar" aria-label={`Progression globale ${analytics?.global_progress || 0}%`}>
          <i style={{ width: `${analytics?.global_progress || 0}%` }} />
        </div>
      </section>

      <ServicesOverview />
      <MembersWorkload />

      <section className="dashboard-grid" aria-label="Tableau de bord analytique">
        <TaskEvolutionChart />
        <RealtimeActivity />
        <UrgentTasks />
        <EventCalendar />
      </section>
    </div>
  );
}

export default AdminDashboard;
