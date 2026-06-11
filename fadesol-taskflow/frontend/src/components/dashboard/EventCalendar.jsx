import { useEffect, useMemo, useState } from "react";
import { getProjects } from "../../services/projectService";
import { getTasks } from "../../services/taskService";

function toDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function formatDay(value) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" })
    .format(new Date(value))
    .toUpperCase();
}

function formatTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "09:00";
  }

  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  return hasTime
    ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date)
    : "09:00";
}

function EventCalendar() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([getTasks(), getProjects()])
      .then(([taskResult, projectResult]) => {
        if (!isMounted) return;

        setTasks(taskResult.status === "fulfilled" && Array.isArray(taskResult.value) ? taskResult.value : []);
        setProjects(projectResult.status === "fulfilled" && Array.isArray(projectResult.value) ? projectResult.value : []);

        if (taskResult.status === "rejected" && projectResult.status === "rejected") {
          setError("Calendrier temporairement indisponible.");
        } else {
          setError("");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const days = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const events = [
      ...tasks
        .filter((task) => task.due_date || task.date_limite)
        .map((task) => ({
          date: task.due_date || task.date_limite,
          title: task.title || task.titre,
          place: "Deadline tâche",
        })),
      ...projects
        .filter((project) => project.date_limite)
        .map((project) => ({
          date: project.date_limite,
          title: project.titre,
          place: "Deadline projet",
        })),
    ]
      .filter((event) => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 8);

    const grouped = events.reduce((accumulator, event) => {
      const key = toDateKey(event.date);
      if (!accumulator[key]) {
        accumulator[key] = {
          date: key,
          events: [],
        };
      }
      accumulator[key].events.push(event);
      return accumulator;
    }, {});

    return Object.values(grouped).slice(0, 4);
  }, [tasks, projects]);

  return (
    <section className="dashboard-card calendar-card">
      <div className="card-header">
        <div>
          <h2>Calendrier des événements</h2>
          <p>{loading ? "Chargement..." : "Rendez-vous et échéances à venir"}</p>
        </div>
      </div>

      <div className="event-days">
        {error && <p className="loading-line compact">{error}</p>}
        {!error && days.length === 0 && <p className="loading-line compact">Aucun événement à venir.</p>}
        {!error && days.map((day) => (
          <article key={day.date}>
            <h3>{formatDay(day.date)}</h3>
            {day.events.map((event) => (
              <div className="event-row" key={`${day.date}-${event.title}-${event.place}`}>
                <time>{formatTime(event.date)}</time>
                <div>
                  <strong>{event.title}</strong>
                  <span>{event.place}</span>
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
