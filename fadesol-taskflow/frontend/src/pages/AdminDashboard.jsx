import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Settings,
  UsersRound,
  Workflow,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ClickUpIntegrationCard from "../components/dashboard/ClickUpIntegrationCard";
import EventCalendar from "../components/dashboard/EventCalendar";
import KpiCard from "../components/dashboard/KpiCard";
import MembersWorkload from "../components/dashboard/MembersWorkload";
import PriorityDistribution from "../components/dashboard/PriorityDistribution";
import RealtimeActivity from "../components/dashboard/RealtimeActivity";
import ServiceActivity from "../components/dashboard/ServiceActivity";
import ServiceDistribution from "../components/dashboard/ServiceDistribution";
import ServicesOverview from "../components/dashboard/ServicesOverview";
import TaskEvolutionChart from "../components/dashboard/TaskEvolutionChart";
import UrgentTasks from "../components/dashboard/UrgentTasks";
import WorkloadCard from "../components/dashboard/WorkloadCard";
import { getInitials } from "../context/AuthContext";
import { getDashboardStatistics } from "../services/dashboardService";

const fallbackStatistics = {
  total_projects: 18,
  tasks_in_progress: 124,
  tasks_completed: 87,
  tasks_late: 9,
  active_services: 6,
};

const kpiDefinitions = [
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
    label: "Services Actifs",
    statKey: "active_services",
    trend: "Stable",
    icon: Building2,
    tone: "orange",
    sparkline: [44, 44, 46, 44, 46, 44, 46],
  },
];

function AdminDashboard({ currentUser }) {
  const displayName = currentUser?.prenom || currentUser?.first_name || currentUser?.email || "Admin";
  const [statistics, setStatistics] = useState(fallbackStatistics);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [statisticsWarning, setStatisticsWarning] = useState("");

  useEffect(() => {
    let isMounted = true;

    setStatisticsLoading(true);
    setStatisticsWarning("");

    getDashboardStatistics()
      .then((data) => {
        if (isMounted) {
          setStatistics({ ...fallbackStatistics, ...data });
        }
      })
      .catch((error) => {
        console.error("Dashboard statistics error:", error);
        if (isMounted) {
          setStatistics(fallbackStatistics);
          setStatisticsWarning("Statistiques temporairement indisponibles.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setStatisticsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const kpis = useMemo(() => {
    return kpiDefinitions.map((kpi) => ({
      ...kpi,
      value: statisticsLoading ? "..." : String(statistics[kpi.statKey] ?? 0),
    }));
  }, [statistics, statisticsLoading]);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Bonjour, {displayName}</h1>
          <p>Voici un aperçu complet de l'activité de votre organisation.</p>
        </div>

        <div className="dashboard-header__actions">
          <button type="button" className="date-selector">
            <CalendarDays size={18} />
            <span>Vue organisation</span>
          </button>
          <button type="button" className="icon-button" aria-label="Paramètres">
            <Settings size={19} />
          </button>
          <button type="button" className="icon-button notification-button" aria-label="Notifications">
            <Bell size={19} />
            <b>8</b>
          </button>
          <div className="header-avatar" aria-label={displayName}>
            <UsersRound size={16} />
            <span>{getInitials(currentUser)}</span>
          </div>
        </div>
      </header>

      {statisticsWarning && <p className="notice warning">{statisticsWarning}</p>}

      <section className="kpi-grid" aria-label="Indicateurs clés">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <ServicesOverview />
      <MembersWorkload />

      <section className="dashboard-grid" aria-label="Tableau de bord analytique">
        <TaskEvolutionChart />
        <PriorityDistribution />
        <RealtimeActivity />
        <ServiceDistribution />
        <ServiceActivity />
        <UrgentTasks />
        <ClickUpIntegrationCard />
        <WorkloadCard />
        <EventCalendar />
      </section>
    </div>
  );
}

export default AdminDashboard;
