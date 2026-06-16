import { CalendarDays, CheckCircle2, Clock3, MessageSquareText, RefreshCw, UserRound, Workflow } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AccountMenu from "../components/dashboard/AccountMenu";
import DashboardCharts from "../components/dashboard/DashboardCharts";
import KpiCard from "../components/dashboard/KpiCard";
import NotificationDropdown from "../components/dashboard/NotificationDropdown";
import { getDashboardAnalytics, getDashboardStatistics } from "../services/dashboardService";
import { DATA_EVENTS, subscribeDataEvents } from "../utils/dataEvents";

const fallbackStatistics = {
  total_tasks: 0,
  tasks_in_progress: 0,
  tasks_completed: 0,
  tasks_late: 0,
  tasks_blocked: 0,
};

const employeeKpiDefinitions = [
  {
    label: "Mes taches",
    statKey: "total_tasks",
    trend: "Affectees",
    icon: Workflow,
    tone: "green",
    sparkline: [16, 22, 24, 30, 28, 34, 38],
  },
  {
    label: "En cours",
    statKey: "tasks_in_progress",
    trend: "A suivre",
    icon: Clock3,
    tone: "blue",
    sparkline: [10, 12, 16, 14, 20, 18, 22],
  },
  {
    label: "Bloquees",
    statKey: "tasks_blocked",
    trend: "A debloquer",
    icon: CalendarDays,
    tone: "orange",
    sparkline: [22, 24, 20, 18, 16, 14, 12],
  },
  {
    label: "Terminees",
    statKey: "tasks_completed",
    trend: "Cloturees",
    icon: CheckCircle2,
    tone: "green",
    sparkline: [18, 24, 28, 34, 38, 44, 48],
  },
];

function EmployeeDashboard({ currentUser }) {
  const displayName = currentUser?.prenom || currentUser?.first_name || currentUser?.email || "Employe";
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

  const employeeKpis = useMemo(() => {
    return employeeKpiDefinitions.map((kpi) => ({
      ...kpi,
      value: statisticsLoading ? "..." : String(statistics[kpi.statKey] ?? 0),
    }));
  }, [statistics, statisticsLoading]);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Bonjour, {displayName}</h1>
          <p>Votre espace personnel pour suivre vos taches, messages et echeances.</p>
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

      <section className="kpi-grid manager-kpis" aria-label="Indicateurs employe">
        {employeeKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <DashboardCharts analytics={analytics} />

      <section className="role-dashboard-grid">
        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Mes taches</h2>
              <p>Vue filtree sur les taches autorisees pour votre service.</p>
            </div>
          </div>
          <div className="status-list">
            <div>
              <span><i className="is-blue" />En cours</span>
              <strong>{statistics.tasks_in_progress}</strong>
            </div>
            <div>
              <span><i className="is-green" />Terminees</span>
              <strong>{statistics.tasks_completed}</strong>
            </div>
            <div>
              <span><i className="is-orange" />En retard</span>
              <strong>{statistics.tasks_late}</strong>
            </div>
            <div>
              <span><i className="is-red" />Bloquees</span>
              <strong>{statistics.tasks_blocked}</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Messages</h2>
              <p>Resume des echanges internes.</p>
            </div>
          </div>
          <div className="timeline-list">
            <div><MessageSquareText size={16} /><span>Consultez la messagerie pour les nouveaux echanges.</span></div>
            <div><MessageSquareText size={16} /><span>Les notifications restent liees a votre compte.</span></div>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Profil</h2>
              <p>Acces rapide a vos informations.</p>
            </div>
          </div>
          <div className="profile-shortcut">
            <UserRound size={34} />
            <div>
              <strong>{currentUser?.email}</strong>
              <span>Compte actif</span>
            </div>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Echeances</h2>
              <p>Suivi simplifie des retards.</p>
            </div>
          </div>
          <div className="event-days">
            <article>
              <h3>A surveiller</h3>
              <div className="event-row">
                <time>{statistics.tasks_late}</time>
                <div>
                  <strong>Taches en retard</strong>
                  <span>Priorite de traitement personnelle</span>
                </div>
              </div>
            </article>
          </div>
        </article>
      </section>
    </div>
  );
}

export default EmployeeDashboard;
