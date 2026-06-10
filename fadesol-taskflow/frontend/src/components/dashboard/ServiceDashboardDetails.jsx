import { AlertCircle, CheckCircle2, Clock3, UsersRound, Workflow } from "lucide-react";

function ServiceDashboardDetails({ service, loading }) {
  if (!service) {
    return null;
  }

  const members = Array.isArray(service.members) ? service.members : [];

  return (
    <section className="dashboard-card service-detail-card">
      <div className="card-header">
        <div>
          <h2>{service.service_name}</h2>
          <p>{loading ? "Chargement des détails..." : "Membres, tâches et avancement du service"}</p>
        </div>
        <span className="status-badge">
          {service.progress ?? 0}%
        </span>
      </div>

      <div className="service-detail-stats">
        <div><Workflow size={16} /><span>Total tâches</span><strong>{service.total_tasks ?? 0}</strong></div>
        <div><Clock3 size={16} /><span>En cours</span><strong>{service.tasks_in_progress ?? 0}</strong></div>
        <div><CheckCircle2 size={16} /><span>Terminées</span><strong>{service.tasks_completed ?? 0}</strong></div>
        <div><AlertCircle size={16} /><span>En retard</span><strong>{service.tasks_late ?? 0}</strong></div>
      </div>

      <div className="progress-bar service-detail-progress" aria-label={`Progression ${service.progress ?? 0}%`}>
        <i style={{ width: `${service.progress ?? 0}%` }} />
      </div>

      <div className="card-header service-members-header">
        <div>
          <h2>Membres du service</h2>
          <p>{members.length} membre(s)</p>
        </div>
        <UsersRound size={18} />
      </div>

      {members.length === 0 ? (
        <p className="loading-line compact">Aucun membre affecté.</p>
      ) : (
        <div className="service-members-list">
          {members.map((member) => (
            <div key={`${member.id}-${member.email}`}>
              <span>{member.full_name}</span>
              <small>{member.email}</small>
              <mark>{member.role}</mark>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ServiceDashboardDetails;
