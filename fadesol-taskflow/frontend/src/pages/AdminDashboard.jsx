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
import ClickUpIntegrationCard from "../components/dashboard/ClickUpIntegrationCard";
import EventCalendar from "../components/dashboard/EventCalendar";
import KpiCard from "../components/dashboard/KpiCard";
import PriorityDistribution from "../components/dashboard/PriorityDistribution";
import RealtimeActivity from "../components/dashboard/RealtimeActivity";
import ServiceActivity from "../components/dashboard/ServiceActivity";
import ServiceDistribution from "../components/dashboard/ServiceDistribution";
import TaskEvolutionChart from "../components/dashboard/TaskEvolutionChart";
import UrgentTasks from "../components/dashboard/UrgentTasks";
import WorkloadCard from "../components/dashboard/WorkloadCard";
import { getInitials } from "../context/AuthContext";

const kpis = [
  {
    label: "Total Projets",
    value: "18",
    trend: "+12% ce mois",
    icon: FolderKanban,
    tone: "green",
    sparkline: [24, 34, 28, 46, 42, 58, 64],
  },
  {
    label: "Tâches Actives",
    value: "124",
    trend: "+8% ce mois",
    icon: Workflow,
    tone: "blue",
    sparkline: [30, 44, 38, 54, 50, 66, 60],
  },
  {
    label: "Tâches Terminées",
    value: "87",
    trend: "+15% ce mois",
    icon: CheckCircle2,
    tone: "purple",
    sparkline: [22, 28, 44, 40, 62, 56, 72],
  },
  {
    label: "Tâches en Retard",
    value: "9",
    trend: "-3% ce mois",
    icon: Clock3,
    tone: "red",
    sparkline: [58, 52, 44, 48, 34, 30, 26],
  },
  {
    label: "Services Actifs",
    value: "6",
    trend: "Stable",
    icon: Building2,
    tone: "orange",
    sparkline: [44, 44, 46, 44, 46, 44, 46],
  },
];

function AdminDashboard({ currentUser }) {
  const displayName = currentUser?.prenom || currentUser?.first_name || currentUser?.email || "Admin";

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

      <section className="kpi-grid" aria-label="Indicateurs clés">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

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
