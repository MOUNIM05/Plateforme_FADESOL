const tasks = [
  {
    title: "Valider structure ClickUp",
    service: "Technique",
    priority: "Urgente",
    due: "Aujourd’hui",
    status: "À faire",
  },
  {
    title: "Préparer rapport conception",
    service: "Direction / RH",
    priority: "Haute",
    due: "Demain",
    status: "En cours",
  },
  {
    title: "Tester synchronisation ClickUp",
    service: "Commercial",
    priority: "Haute",
    due: "20 mai",
    status: "Bloqué",
  },
  {
    title: "Finaliser gestion utilisateurs",
    service: "Comptabilité",
    priority: "Normale",
    due: "22 mai",
    status: "À valider",
  },
];

function UrgentTasks() {
  return (
    <section className="ft-card ft-urgent-tasks">
      <div className="ft-card-header">
        <div>
          <h2>Tâches urgentes</h2>
          <p>Priorités à traiter cette semaine</p>
        </div>
      </div>

      <div className="ft-urgent-list">
        {tasks.map((task) => (
          <article key={task.title}>
            <div>
              <strong>{task.title}</strong>
              <span>{task.service}</span>
            </div>
            <mark>{task.priority}</mark>
            <span>{task.due}</span>
            <em>{task.status}</em>
          </article>
        ))}
      </div>
    </section>
  );
}

export default UrgentTasks;
