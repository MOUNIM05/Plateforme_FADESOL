import { CalendarDays, CheckCircle2, Clock3, MessageSquareText, UserRound, Workflow } from "lucide-react";
import KpiCard from "../components/dashboard/KpiCard";

const employeeKpis = [
  {
    label: "Mes tâches",
    value: "12",
    trend: "5 prioritaires",
    icon: Workflow,
    tone: "green",
    sparkline: [16, 22, 24, 30, 28, 34, 38],
  },
  {
    label: "Aujourd'hui",
    value: "4",
    trend: "Planifiées",
    icon: CalendarDays,
    tone: "blue",
    sparkline: [10, 12, 16, 14, 20, 18, 22],
  },
  {
    label: "En attente",
    value: "6",
    trend: "À reprendre",
    icon: Clock3,
    tone: "orange",
    sparkline: [22, 24, 20, 18, 16, 14, 12],
  },
  {
    label: "Terminées",
    value: "18",
    trend: "+3 cette semaine",
    icon: CheckCircle2,
    tone: "green",
    sparkline: [18, 24, 28, 34, 38, 44, 48],
  },
];

function EmployeeDashboard({ currentUser }) {
  const displayName = currentUser?.prenom || currentUser?.first_name || currentUser?.email || "Employé";

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Bonjour, {displayName}</h1>
          <p>Votre espace personnel pour suivre vos tâches, messages et échéances.</p>
        </div>
      </header>

      <section className="kpi-grid manager-kpis" aria-label="Indicateurs employé">
        {employeeKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <section className="role-dashboard-grid">
        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Mes tâches du jour</h2>
              <p>Liste de travail personnelle.</p>
            </div>
          </div>
          <div className="task-list-compact">
            {["Préparer les documents projet", "Mettre à jour le statut ClickUp", "Répondre au message manager"].map((task) => (
              <div key={task}>
                <span className="status-badge"><Clock3 size={14} />En cours</span>
                <strong>{task}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Messages</h2>
              <p>Résumé des échanges internes.</p>
            </div>
          </div>
          <div className="timeline-list">
            <div><MessageSquareText size={16} /><span>2 messages non lus de votre manager</span></div>
            <div><MessageSquareText size={16} /><span>1 notification projet à consulter</span></div>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Profil</h2>
              <p>Accès rapide à vos informations.</p>
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
              <h2>Échéances</h2>
              <p>Calendrier simplifié.</p>
            </div>
          </div>
          <div className="event-days">
            <article>
              <h3>Cette semaine</h3>
              <div className="event-row">
                <time>Jeu</time>
                <div>
                  <strong>Livraison tâche projet</strong>
                  <span>Deadline personnelle</span>
                </div>
              </div>
              <div className="event-row">
                <time>Ven</time>
                <div>
                  <strong>Point équipe</strong>
                  <span>Suivi des blocages</span>
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
