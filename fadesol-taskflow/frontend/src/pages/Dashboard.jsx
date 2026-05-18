import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FolderKanban,
  UsersRound,
  Workflow,
} from "lucide-react";
import KpiCard from "../components/dashboard/KpiCard";
import ServiceActivity from "../components/dashboard/ServiceActivity";
import ServiceDistribution from "../components/dashboard/ServiceDistribution";
import TaskEvolutionChart from "../components/dashboard/TaskEvolutionChart";
import UrgentTasks from "../components/dashboard/UrgentTasks";

const kpis = [
  { label: "Total projets", value: "18", trend: "+12%", icon: FolderKanban },
  { label: "Tâches actives", value: "124", trend: "+8%", icon: Workflow },
  { label: "Tâches terminées", value: "87", trend: "+18%", icon: CheckCircle2 },
  { label: "Tâches en retard", value: "9", trend: "-3%", icon: Clock, tone: "red" },
  { label: "Services actifs", value: "6", trend: "+0%", icon: Building2, tone: "blue" },
];

function Dashboard({ currentUser }) {
  return (
    <div className="ft-dashboard-page">
      <header className="ft-dashboard-header">
        <div>
          <span>Fadesol Power Solutions</span>
          <h1>Dashboard</h1>
          <p>Vue globale des projets, tâches, services et synchronisations.</p>
        </div>

        <div className="ft-dashboard-actions">
          <button type="button">
            <CalendarDays size={17} />
            Ce mois
          </button>
          <button type="button" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <div className="ft-header-profile">
            <UsersRound size={17} />
            {currentUser?.role || "Administrateur"}
          </div>
        </div>
      </header>

      <section className="ft-kpi-grid">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <TaskEvolutionChart />

      <section className="ft-bottom-grid">
        <ServiceDistribution />
        <ServiceActivity />
        <UrgentTasks />
      </section>
    </div>
  );
}

export default Dashboard;
