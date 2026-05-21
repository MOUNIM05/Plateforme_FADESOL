const activities = [
  ["Cody Fisher", "a complété la tâche “Intégration API ClickUp”", "il y a 2 min"],
  ["Ralph Edwards", "a créé un nouveau projet “Audit Interne Q2”", "il y a 8 min"],
  ["Leslie Alexander", "a commenté sur “Structure base de données”", "il y a 12 min"],
  ["Marina Jade", "a mis à jour la tâche “Synchronisation ClickUp”", "il y a 12 min"],
  ["Jenny Wilson", "a créé une sous-tâche “Tester API ClickUp”", "il y a 25 min"],
];

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

function RealtimeActivity() {
  return (
    <section className="dashboard-card realtime-card">
      <div className="card-header">
        <div>
          <h2>Activité en temps réel</h2>
          <p>Dernières actions de l’organisation</p>
        </div>
      </div>

      <div className="realtime-list">
        {activities.map(([name, action, time]) => (
          <article key={`${name}-${time}`}>
            <div className="activity-avatar">{initials(name)}</div>
            <div>
              <p><strong>{name}</strong> {action}</p>
              <span>{time}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RealtimeActivity;
