const days = [
  {
    date: "28 MAI",
    events: [
      ["09:00", "Réunion d’équipe hebdomadaire", "Salle A"],
      ["11:30", "Suivi projet FADESOL X", "En ligne"],
    ],
  },
  {
    date: "29 MAI",
    events: [
      ["14:00", "Présentation rapport conception", "Salle B"],
      ["16:30", "Point intégration ClickUp", "En ligne"],
    ],
  },
];

function EventCalendar() {
  return (
    <section className="dashboard-card calendar-card">
      <div className="card-header">
        <div>
          <h2>Calendrier des événements</h2>
          <p>Rendez-vous à venir</p>
        </div>
      </div>

      <div className="event-days">
        {days.map((day) => (
          <article key={day.date}>
            <h3>{day.date}</h3>
            {day.events.map(([time, title, place]) => (
              <div className="event-row" key={`${day.date}-${time}`}>
                <time>{time}</time>
                <div>
                  <strong>{title}</strong>
                  <span>{place}</span>
                </div>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

export default EventCalendar;
