import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CalendarDays, ClipboardList, Eye, Filter, Paperclip, UserRound, X } from "lucide-react";
import { getTask, getTaskAttachments, getSubtasksByTask, getTasks, updateTaskStatus } from "../services/taskService";

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
  const { hasPermission } = useAuth();
  const canUpdateTasks = hasPermission("tasks.update");

  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedSubtasks, setSelectedSubtasks] = useState([]);
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
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

  const [searchParams] = useSearchParams();

  useEffect(() => {
    // If a taskId is present in query params, open the modal for that task after load
    const taskId = searchParams.get("taskId");

    if (taskId && tasks.length) {
      const found = tasks.find((t) => String(t.id) === String(taskId));

      if (found) {
        openTaskDetails(found);
      }
    }
  }, [searchParams, tasks]);

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

  async function openTaskDetails(task) {
    setSelectedTask(task);
    setSelectedSubtasks([]);
    setSelectedAttachments([]);
    setDetailsLoading(true);
    setError("");

    try {
      const [taskResult, subtasksResult, attachmentsResult] = await Promise.allSettled([
        getTask(task.id),
        getSubtasksByTask(task.id),
        getTaskAttachments(task.id),
      ]);

      if (taskResult.status === "fulfilled") {
        setSelectedTask(taskResult.value);
      }

      if (subtasksResult.status === "fulfilled") {
        setSelectedSubtasks(Array.isArray(subtasksResult.value) ? subtasksResult.value : []);
      }

      if (attachmentsResult.status === "fulfilled") {
        setSelectedAttachments(Array.isArray(attachmentsResult.value) ? attachmentsResult.value : []);
      }
    } catch (err) {
      console.error("Load task details error:", err);
      setError("Impossible de charger le détail de la tâche.");
    } finally {
      setDetailsLoading(false);
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
                    {canUpdateTasks ? (
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
                    ) : (
                      <strong>{task.status || "Nouveau"}</strong>
                    )}
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
                <button type="button" className="secondary-action" onClick={() => openTaskDetails(task)}>
                  <Eye size={15} />
                  Voir
                </button>
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

      {selectedTask && (
        <div className="service-modal-backdrop" role="presentation" onMouseDown={() => setSelectedTask(null)}>
          <article className="service-modal task-details-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h3>{selectedTask.title || selectedTask.titre || "Détail tâche"}</h3>
                <p>{selectedTask.description || "Aucune description."}</p>
              </div>
              <button type="button" className="icon-button" aria-label="Fermer" onClick={() => setSelectedTask(null)}>
                <X size={18} />
              </button>
            </header>

            {detailsLoading && <p className="loading-line">Chargement du détail...</p>}

            <dl className="details-list">
              <div><dt>Statut</dt><dd>{getOptionLabel(statusOptions, selectedTask.status)}</dd></div>
              <div><dt>Priorité</dt><dd>{getOptionLabel(priorityOptions, selectedTask.priority)}</dd></div>
              <div><dt>Date limite</dt><dd>{formatDate(selectedTask.due_date)}</dd></div>
              <div><dt>Projet</dt><dd>{selectedTask.project_id || selectedTask.projet_id || "Sans projet"}</dd></div>
            </dl>

            <section className="modal-section">
              <h4>Sous-tâches</h4>
              {selectedSubtasks.length > 0 ? (
                selectedSubtasks.map((subtask) => (
                  <div className="modal-list-row" key={subtask.id}>
                    <strong>{subtask.title || subtask.titre}</strong>
                    <span>{subtask.status || subtask.statut || "Nouveau"}</span>
                  </div>
                ))
              ) : (
                <p className="helper-text">Aucune sous-tâche liée.</p>
              )}
            </section>

            <section className="modal-section">
              <h4>Pièces jointes</h4>
              {selectedAttachments.length > 0 ? (
                selectedAttachments.map((attachment) => (
                  <div className="modal-list-row" key={attachment.id}>
                    <strong><Paperclip size={14} /> {attachment.filename || attachment.nom_fichier || "Pièce jointe"}</strong>
                    <span>{attachment.content_type || attachment.type || ""}</span>
                  </div>
                ))
              ) : (
                <p className="helper-text">Aucune pièce jointe.</p>
              )}
            </section>
          </article>
        </div>
      )}
    </div>
  );
}

export default MyTasks;
