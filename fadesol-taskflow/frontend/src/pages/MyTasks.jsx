import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardList, Filter, UserRound } from "lucide-react";
import { getTasks, updateTaskStatus } from "../services/taskService";

const statusOptions = [
  { label: "Tous les statuts", value: "" },
  { label: "Nouveau", value: "Nouveau" },
  { label: "A faire", value: "AFaire" },
  { label: "En cours", value: "EnCours" },
  { label: "En attente", value: "EnAttente" },
  { label: "Bloque", value: "Bloque" },
  { label: "Validee", value: "Validee" },
  { label: "Termine", value: "Termine" },
  { label: "Annule", value: "Annule" },
];

const priorityOptions = [
  { label: "Toutes les priorites", value: "" },
  { label: "Urgente", value: "Urgente" },
  { label: "Haute", value: "Haute" },
  { label: "Normale", value: "Normale" },
  { label: "Faible", value: "Faible" },
];

function getOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value || "Non defini";
}

function formatDate(value) {
  if (!value) {
    return "Aucune deadline";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filters = useMemo(
    () => ({
      assigned_to: "me",
      status: statusFilter,
      priority: priorityFilter,
    }),
    [priorityFilter, statusFilter]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadMyTasks() {
      setError("");
      setLoading(true);

      try {
        const data = await getTasks(filters);

        if (isMounted) {
          setTasks(data);
        }
      } catch (err) {
        console.error("Load my tasks error:", err);

        if (isMounted) {
          setError(err.response?.data?.detail || "Impossible de charger vos taches.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadMyTasks();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  async function handleStatusChange(taskId, status) {
    setError("");
    setMessage("");
    setUpdatingStatusTaskId(taskId);

    try {
      const updatedTask = await updateTaskStatus(taskId, status);

      setTasks((current) =>
        current
          .map((task) => (task.id === taskId ? updatedTask : task))
          .filter((task) => !statusFilter || task.status === statusFilter)
      );
      setMessage("Statut mis a jour avec succes.");
    } catch (err) {
      console.error("Update task status error:", err);
      setError(err.response?.data?.detail || "Impossible de modifier le statut de la tache.");
    } finally {
      setUpdatingStatusTaskId("");
    }
  }

  return (
    <div className="dashboard-page my-tasks-page">
      <div className="board-toolbar">
        <div>
          <h2>Mes taches</h2>
          <p>Consultez les taches qui vous sont affectees avec leur statut, priorite et deadline.</p>
        </div>
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}

      <section className="workspace-panel">
        <div className="panel-title">
          <h3>Taches affectees</h3>
          <span>{tasks.length} tache(s)</span>
        </div>

        <div className="filters-row my-tasks-filters">
          <label>
            <Filter size={17} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((status) => (
                <option key={status.value || "all"} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <Filter size={17} />
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              {priorityOptions.map((priority) => (
                <option key={priority.value || "all"} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="my-tasks-list">
          {tasks.map((task) => (
            <article className="my-task-card" key={task.id}>
              <div>
                <h3>{task.title}</h3>
                <p>{task.description || "Aucune description."}</p>
              </div>

              <div className="my-task-meta">
                <span>
                  <ClipboardList size={15} />
                  <select
                    className="assignment-select status-select"
                    value={task.status || ""}
                    onChange={(event) => handleStatusChange(task.id, event.target.value)}
                    disabled={updatingStatusTaskId === task.id}
                  >
                    {statusOptions
                      .filter((status) => status.value)
                      .map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                  </select>
                </span>
                <span>
                  <Filter size={15} />
                  {getOptionLabel(priorityOptions, task.priority)}
                </span>
                <span>
                  <CalendarDays size={15} />
                  {formatDate(task.due_date)}
                </span>
                <span>
                  <UserRound size={15} />
                  {task.assigned_to || "Non affectee"}
                </span>
              </div>
            </article>
          ))}

          {!loading && tasks.length === 0 && (
            <div className="empty-table">
              <ClipboardList size={32} />
              <strong>Aucune tache affectee</strong>
              <p>Aucune tache ne correspond aux filtres selectionnes.</p>
            </div>
          )}

          {loading && <p className="loading-line">Chargement de vos taches...</p>}
        </div>
      </section>
    </div>
  );
}

export default MyTasks;
