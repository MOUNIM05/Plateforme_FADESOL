import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FolderKanban,
  UsersRound,
  Workflow,
} from "lucide-react";
import KpiCard from "../components/dashboard/KpiCard";

const serviceKpis = [
  {
    label: "Tâches service",
    value: "42",
    trend: "+6 cette semaine",
    icon: Workflow,
    tone: "green",
    sparkline: [30, 36, 42, 40, 48, 52, 58],
  },
  {
    label: "En validation",
    value: "7",
    trend: "À traiter",
    icon: ClipboardCheck,
    tone: "orange",
    sparkline: [18, 20, 16, 25, 22, 28, 26],
  },
  {
    label: "Charge équipe",
    value: "68%",
    trend: "Équilibrée",
    icon: UsersRound,
    tone: "blue",
    sparkline: [46, 52, 48, 58, 62, 60, 68],
  },
  {
    label: "Urgences",
    value: "4",
    trend: "Priorité haute",
    icon: AlertCircle,
    tone: "red",
    sparkline: [40, 36, 32, 34, 28, 26, 22],
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

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Bonjour, {displayName}</h1>
          <p>Vue opérationnelle de votre service, de l'équipe et des validations.</p>
        </div>
        <div className="dashboard-header__actions">
          <button type="button" className="date-selector">
            <FolderKanban size={18} />
            <span>Service courant</span>
          </button>
        </div>
      </header>

      <section className="kpi-grid manager-kpis" aria-label="Indicateurs manager">
        {serviceKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

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
