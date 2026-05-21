const tasks = [
  ["Valider structure ClickUp", "Technique", "05 Juin", "Urgente"],
  ["Préparer rapport conception", "Comptabilité", "07 Juin", "Haute"],
  ["Tester synchronisation ClickUp", "IT / Intégration", "08 Juin", "Haute"],
  ["Finaliser gestion utilisateurs", "RH", "10 Juin", "Moyenne"],
  ["Réunion suivi projet FADESOL X", "Commercial", "12 Juin", "Moyenne"],
];

function UrgentTasks() {
  return (
    <section className="dashboard-card">
      <div className="card-header">
        <div>
          <h2>Tâches urgentes</h2>
          <p>Priorités à traiter cette semaine</p>
        </div>
      </div>

      <div className="urgent-list">
        {tasks.map(([title, service, date, priority]) => (
          <article key={title}>
            <div>
              <strong>{title}</strong>
              <span>{service}</span>
            </div>
            <time>{date}</time>
            <mark className={`priority-pill is-${priority.toLowerCase()}`}>{priority}</mark>
          </article>
        ))}
      </div>
    </section>
  );
}

export default UrgentTasks;
