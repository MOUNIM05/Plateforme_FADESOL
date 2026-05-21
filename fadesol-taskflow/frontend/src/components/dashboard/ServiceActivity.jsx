const services = [
  { name: "Technique", tasks: 36, progress: 72 },
  { name: "Commercial", tasks: 28, progress: 56 },
  { name: "Achat", tasks: 18, progress: 45 },
  { name: "Magasin / Stock", tasks: 16, progress: 40 },
  { name: "Comptabilité & Management", tasks: 12, progress: 38 },
  { name: "Direction / RH", tasks: 8, progress: 30 },
];

function ServiceActivity() {
  return (
    <section className="dashboard-card">
      <div className="card-header">
        <div>
          <h2>Activité des services</h2>
          <p>Service, tâches actives et progression</p>
        </div>
      </div>

      <div className="service-table">
        <div className="service-table__head">
          <span>Service</span>
          <span>Tâches actives</span>
          <span>Progression</span>
        </div>
        {services.map((service) => (
          <div className="service-table__row" key={service.name}>
            <strong>{service.name}</strong>
            <span>{service.tasks}</span>
            <div>
              <div className="progress-bar">
                <i style={{ width: `${service.progress}%` }} />
              </div>
              <em>{service.progress}%</em>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ServiceActivity;
