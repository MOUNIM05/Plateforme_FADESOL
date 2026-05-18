const activities = [
  { name: "Technique", progress: 82, late: 2, members: 12 },
  { name: "Commercial", progress: 68, late: 1, members: 8 },
  { name: "Achat", progress: 54, late: 3, members: 5 },
  { name: "Magasin / Stock", progress: 49, late: 1, members: 7 },
  { name: "Comptabilité & Management", progress: 61, late: 2, members: 6 },
  { name: "Direction / RH", progress: 38, late: 0, members: 4 },
];

function ServiceActivity() {
  return (
    <section className="ft-card ft-service-activity">
      <div className="ft-card-header">
        <div>
          <h2>Activité par service</h2>
          <p>Progression, membres et retards</p>
        </div>
      </div>

      <div className="ft-activity-list">
        {activities.map((service) => (
          <article key={service.name}>
            <div className="ft-activity-row">
              <strong>{service.name}</strong>
              <span>{service.members} membres</span>
            </div>
            <div className="ft-progress">
              <i style={{ width: `${service.progress}%` }} />
            </div>
            <div className="ft-activity-meta">
              <span>{service.progress}% progression</span>
              <mark>{service.late} retard</mark>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ServiceActivity;
