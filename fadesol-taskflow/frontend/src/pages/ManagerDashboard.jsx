import {
  Building2,
  CheckCircle2,
  Clock3,
  FolderKanban,
  RefreshCw,
  UsersRound,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import KpiCard from "../components/dashboard/KpiCard";
import MembersWorkload from "../components/dashboard/MembersWorkload";
import NotificationButton from "../components/dashboard/NotificationButton";
import ServicesOverview from "../components/dashboard/ServicesOverview";
import { getDashboardStatistics } from "../services/dashboardService";
import { DATA_EVENTS, subscribeDataEvents } from "../utils/dataEvents";

const fallbackStatistics = {
  total_projects: 18,
  tasks_in_progress: 36,
  tasks_completed: 87,
  tasks_late: 9,
  active_services: 6,
};

const serviceKpiDefinitions = [
  {
    label: "Total Projets",
    statKey: "total_projects",
    trend: "+6 cette semaine",
    icon: FolderKanban,
    tone: "green",
    sparkline: [30, 36, 42, 40, 48, 52, 58],
  },
  {
    label: "Tâches Actives",
    statKey: "tasks_in_progress",
    trend: "+8% ce mois",
    icon: Workflow,
    tone: "blue",
    sparkline: [18, 20, 16, 25, 22, 28, 26],
  },
  {
    label: "Tâches Terminées",
    statKey: "tasks_completed",
    trend: "+15% ce mois",
    icon: CheckCircle2,
    tone: "purple",
    sparkline: [46, 52, 48, 58, 62, 60, 68],
  },
  {
    label: "Tâches en Retard",
    statKey: "tasks_late",
    trend: "-3% ce mois",
    icon: Clock3,
    tone: "red",
    sparkline: [40, 36, 32, 34, 28, 26, 22],
  },
  {
    label: "Services Actifs",
    statKey: "active_services",
    trend: "Stable",
    icon: Building2,
    tone: "orange",
    sparkline: [44, 44, 46, 44, 46, 44, 46],
  },
];

const teamMembers = ["Sara Bennani", "Yassine Karim", "Imane Ghali", "Omar Fadil"];
const urgentTasks = [
  ["Validation devis technique", "Aujourd'hui", "Haute"],
  ["Contrôle avancement chantier", "Demain", "Moyenne"],
  ["Préparation réunion client", "Vendredi", "Haute"],
];

function ManagerDashboard({ currentUser }) {
  const displayName = currentUser?.prenom || currentUser?.first_name || currentUser?.email || "Manager";
  const [statistics, setStatistics] = useState(fallbackStatistics);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [statisticsWarning, setStatisticsWarning] = useState("");

  const loadDashboardStatistics = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setStatisticsLoading(true);
    }
    setStatisticsWarning("");

    try {
      const data = await getDashboardStatistics();
      setStatistics({ ...fallbackStatistics, ...data });
    } catch (error) {
      console.error("Dashboard statistics error:", error);
      setStatistics(fallbackStatistics);
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
    return serviceKpiDefinitions.map((kpi) => ({
      ...kpi,
      value: statisticsLoading ? "..." : String(statistics[kpi.statKey] ?? 0),
    }));
  }, [statistics, statisticsLoading]);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Bonjour, {displayName}</h1>
          <p>Vue opérationnelle de votre service, de l'équipe et des validations.</p>
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
          <button type="button" className="date-selector">
            <FolderKanban size={18} />
            <span>Service courant</span>
          </button>
          <NotificationButton />
        </div>
      </header>

      {statisticsWarning && <p className="notice warning">{statisticsWarning}</p>}

      <section className="kpi-grid manager-kpis" aria-label="Indicateurs manager">
        {serviceKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <ServicesOverview />
      <MembersWorkload />

      <section className="role-dashboard-grid">
        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Tâches par statut</h2>
              <p>Répartition statique en attendant l'API tâches.</p>
            </div>
          </div>
          <div className="status-list">
            {[
              ["À faire", 14, "is-blue"],
              ["En cours", 17, "is-green"],
              ["En validation", 7, "is-orange"],
              ["Bloquées", 4, "is-red"],
            ].map(([label, value, tone]) => (
              <div key={label}>
                <span><i className={tone} />{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Membres du service</h2>
              <p>Charge de travail simplifiée.</p>
            </div>
          </div>
          <div className="member-list">
            {teamMembers.map((member, index) => (
              <div key={member}>
                <span>{member}</span>
                <div className="progress-bar"><i style={{ width: `${58 + index * 8}%` }} /></div>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Urgences service</h2>
              <p>Points à suivre en priorité.</p>
            </div>
          </div>
          <div className="urgent-list">
            {urgentTasks.map(([title, deadline, priority]) => (
              <article key={title}>
                <div>
                  <strong>{title}</strong>
                  <span>{deadline}</span>
                </div>
                <span className={`priority-pill is-${priority.toLowerCase()}`}>{priority}</span>
                <CheckCircle2 size={18} color="#16a34a" />
              </article>
            ))}
          </div>
        </article>

        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Activité récente</h2>
              <p>Suivi des dernières actions du service.</p>
            </div>
          </div>
          <div className="timeline-list">
            <div><Clock3 size={16} /><span>Validation d'une tâche critique il y a 15 min</span></div>
            <div><UsersRound size={16} /><span>Nouvelle affectation à l'équipe technique</span></div>
            <div><Workflow size={16} /><span>Statut projet mis à jour en cours</span></div>
          </div>
        </article>
      </section>
    </div>
  );
}

export default ManagerDashboard;
