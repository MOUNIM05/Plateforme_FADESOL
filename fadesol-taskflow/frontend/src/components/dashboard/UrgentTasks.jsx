import { useEffect, useMemo, useState } from "react";
import { getServices } from "../../services/serviceService";
import { getTasks } from "../../services/taskService";

const priorityRank = {
  Urgente: 1,
  Haute: 2,
  Normale: 3,
  Moyenne: 3,
  Faible: 4,
};

function priorityClass(priority) {
  const normalized = String(priority || "Normale")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized === "normale") return "moyenne";
  return normalized;
}

function formatDate(value) {
  if (!value) {
    return "Non définie";
  }

  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(value));
}

function UrgentTasks() {
  const [tasks, setTasks] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([getTasks(), getServices()])
      .then(([taskResult, serviceResult]) => {
        if (!isMounted) return;

        if (taskResult.status === "fulfilled") {
          setTasks(Array.isArray(taskResult.value) ? taskResult.value : []);
          setError("");
        } else {
          setTasks([]);
          setError("Tâches urgentes temporairement indisponibles.");
        }

        setServices(serviceResult.status === "fulfilled" && Array.isArray(serviceResult.value) ? serviceResult.value : []);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const serviceById = useMemo(() => {
    return services.reduce((accumulator, service) => {
      accumulator[String(service.id)] = service.name;
      return accumulator;
    }, {});
  }, [services]);

  const urgentTasks = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    return tasks
      .filter((task) => {
        const priority = task.priority || task.priorite || "Normale";
        const dueDate = task.due_date || task.date_limite;
        const due = dueDate ? new Date(dueDate) : null;

        return priorityRank[priority] <= 2 || (due && due >= now && due <= nextWeek);
      })
      .sort((a, b) => {
        const rankA = priorityRank[a.priority || a.priorite] || 9;
        const rankB = priorityRank[b.priority || b.priorite] || 9;
        const dateA = new Date(a.due_date || a.date_limite || "2999-12-31");
        const dateB = new Date(b.due_date || b.date_limite || "2999-12-31");

        return rankA - rankB || dateA - dateB;
      })
      .slice(0, 5);
  }, [tasks]);

  return (
    <section className="dashboard-card">
      <div className="card-header">
        <div>
          <h2>Tâches urgentes</h2>
          <p>{loading ? "Chargement..." : "Priorités à traiter cette semaine"}</p>
        </div>
      </div>

      <div className="urgent-list">
        {error && <p className="loading-line compact">{error}</p>}
        {!error && urgentTasks.length === 0 && <p className="loading-line compact">Aucune tâche urgente.</p>}
        {!error && urgentTasks.map((task) => {
          const priority = task.priority || task.priorite || "Normale";

          return (
            <article key={task.id}>
              <div>
                <strong>{task.title || task.titre}</strong>
                <span>{serviceById[String(task.service_id)] || task.service_id || "Service non affecté"}</span>
              </div>
              <time>{formatDate(task.due_date || task.date_limite)}</time>
              <mark className={`priority-pill is-${priorityClass(priority)}`}>{priority === "Normale" ? "Moyenne" : priority}</mark>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default UrgentTasks;
