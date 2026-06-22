// Page personnelle des taches affectees a l'utilisateur connecte.
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CalendarDays, ClipboardList, Eye, Filter, Paperclip, UserRound, X } from "lucide-react";
import { getTask, getTaskAttachments, getSubtasksByTask, getTasks, updateTask, updateTaskStatus } from "../services/taskService";

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

const progressOptions = [0, 25, 50, 75, 100];

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

function normalizeProgressStatus(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function clampProgress(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function getProgressFromStatus(status, existingProgress = 0) {
  const normalized = normalizeProgressStatus(status);

  if (["nouveau", "afaire"].includes(normalized)) {
    return 0;
  }

  if (normalized.includes("encours")) {
    return 50;
  }

  if (normalized.includes("bloqu")) {
    return 25;
  }

  if (normalized.startsWith("termin") || normalized === "done") {
    return 100;
  }

  if (normalized.startsWith("annul")) {
    return clampProgress(existingProgress);
  }

  return clampProgress(existingProgress);
}

function getUserIdentityValues(user) {
  return [
    user?.id,
    user?.uuid,
    user?.user_id,
    user?.utilisateur_id,
    user?.email,
  ].filter((value) => value !== undefined && value !== null && value !== "");
}

function hasTaskSubtasks(task, subtasks = []) {
  const taskSubtasks = task?.subtasks || task?.sous_taches || task?.sousTasks || subtasks || [];

  return Array.isArray(taskSubtasks) && taskSubtasks.length > 0;
}

function getTaskProgressInfo(task, subtasks = []) {
  const taskSubtasks = task?.subtasks || task?.sous_taches || task?.sousTasks || subtasks || [];

  if (Array.isArray(taskSubtasks) && taskSubtasks.length > 0) {
    const completed = taskSubtasks.filter((subtask) => getProgressFromStatus(subtask.status || subtask.statut) === 100).length;

    return {
      total_subtasks: taskSubtasks.length,
      completed_subtasks: completed,
      progression: Math.round((completed / taskSubtasks.length) * 100),
    };
  }

  const storedProgress = task?.progression ?? task?.progress;

  return {
    total_subtasks: 0,
    completed_subtasks: 0,
    progression:
      storedProgress !== undefined && storedProgress !== null && storedProgress !== ""
        ? clampProgress(storedProgress)
        : getProgressFromStatus(task?.status || task?.statut, 0),
  };
}

function MyTasks() {
  // Vue employee/individuelle : les donnees sont filtrees avec assigned_to=me.
  const { currentUser, hasPermission } = useAuth();
  const canUpdateTasks = hasPermission("tasks.update");
  const currentUserIds = useMemo(() => getUserIdentityValues(currentUser).map(String), [currentUser]);

  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState("");
  const [updatingProgressTaskId, setUpdatingProgressTaskId] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedSubtasks, setSelectedSubtasks] = useState([]);
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filters = useMemo(
    // Filtres envoyes au backend pour ne recuperer que les taches utiles.
    () => ({
      assigned_to: "me",
      status: statusFilter,
      priority: priorityFilter,
    }),
    [priorityFilter, statusFilter]
  );

  const [searchParams] = useSearchParams();

  function isAssignedToCurrentUser(task) {
    const assigneeValues = [
      task?.assigned_to,
      task?.assigned_user_id,
      task?.assignee_id,
      task?.user_id,
      task?.responsable_id,
    ].filter((value) => value !== undefined && value !== null && value !== "");

    return assigneeValues.some((value) => currentUserIds.includes(String(value)));
  }

  function canEditTaskProgress(task, subtasks = []) {
    return (canUpdateTasks || isAssignedToCurrentUser(task)) && !hasTaskSubtasks(task, subtasks);
  }

  useEffect(() => {
    // Si taskId est present dans l'URL, ouvre la modale apres chargement.
    const taskId = searchParams.get("taskId");

    if (!taskId || loading) {
      return;
    }

    const found = tasks.find((t) => String(t.id) === String(taskId));

    if (found) {
      openTaskDetails(found);
      return;
    }

    setError("Tache introuvable ou non autorisee.");
  }, [searchParams, tasks, loading]);

  useEffect(() => {
    // Recharge les taches personnelles quand les filtres changent.
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
    // Permet a l'utilisateur autorise de mettre a jour rapidement le statut.
    setError("");
    setMessage("");
    setUpdatingStatusTaskId(taskId);

    try {
      const currentTask = tasks.find((task) => task.id === taskId);
      let updatedTask = await updateTaskStatus(taskId, status);
      const nextProgress = getProgressFromStatus(status, currentTask?.progression ?? currentTask?.progress ?? 0);

      if (currentTask && !hasTaskSubtasks(currentTask)) {
        const progressUpdate = await updateTask(taskId, { progression: nextProgress });
        updatedTask = { ...updatedTask, ...progressUpdate, progression: nextProgress };
      }

      setTasks((current) =>
        current
          .map((task) => (task.id === taskId ? { ...task, ...updatedTask, status, progression: nextProgress } : task))
          .filter((task) => !statusFilter || task.status === statusFilter)
      );
      setSelectedTask((current) => (current?.id === taskId ? { ...current, ...updatedTask, status, progression: nextProgress } : current));
      setMessage("Statut mis a jour avec succes.");
    } catch (err) {
      console.error("Update task status error:", err);
      setError(err.response?.data?.detail || "Impossible de modifier le statut de la tache.");
    } finally {
      setUpdatingStatusTaskId("");
    }
  }

  async function handleTaskProgressChange(task, value) {
    if (!canEditTaskProgress(task)) {
      setError("Vous ne pouvez modifier que la progression de vos taches sans sous-taches.");
      return;
    }

    const nextProgress = clampProgress(value);
    setError("");
    setMessage("");
    setUpdatingProgressTaskId(task.id);

    try {
      const updatedTask = await updateTask(task.id, { progression: nextProgress });
      const mergedTask = { ...task, ...updatedTask, progression: nextProgress };

      setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, ...mergedTask } : item)));
      setSelectedTask((current) => (current?.id === task.id ? { ...current, ...mergedTask } : current));
      setMessage("Progression de la tache mise a jour.");
    } catch (err) {
      console.error("Update task progress error:", err);
      setError(err.response?.data?.detail || "Impossible de modifier la progression de la tache.");
    } finally {
      setUpdatingProgressTaskId("");
    }
  }

  async function openTaskDetails(task) {
    // Charge le detail, les sous-taches et les pieces jointes en parallele.
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
          {tasks.map((task) => {
            const taskProgress = getTaskProgressInfo(task);

            return (
            <article className="my-task-card" key={task.id}>
              <div>
                <h3>{task.title}</h3>
                <p>{task.description || "Aucune description."}</p>
                <div className="my-task-progress">
                  <span>Progression</span>
                  <strong>{taskProgress.progression}%</strong>
                  <i>
                    <b style={{ width: `${taskProgress.progression}%` }} />
                  </i>
                  {canEditTaskProgress(task) && (
                    <label className="progress-editor">
                      <span>Modifier</span>
                      <select
                        value={taskProgress.progression}
                        onChange={(event) => handleTaskProgressChange(task, event.target.value)}
                        disabled={updatingProgressTaskId === task.id}
                      >
                        {progressOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}%
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
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
            );
          })}

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
              <h4>Progression</h4>
              <div className="project-progress project-progress--details">
                <div>
                  <span>Avancement</span>
                  <strong>{getTaskProgressInfo(selectedTask, selectedSubtasks).progression}%</strong>
                </div>
                <div className="progress-bar" aria-label={`Progression ${getTaskProgressInfo(selectedTask, selectedSubtasks).progression}%`}>
                  <i style={{ width: `${getTaskProgressInfo(selectedTask, selectedSubtasks).progression}%` }} />
                </div>
                {canEditTaskProgress(selectedTask, selectedSubtasks) && (
                  <label className="progress-editor progress-editor--details">
                    <span>Modifier</span>
                    <select
                      value={getTaskProgressInfo(selectedTask, selectedSubtasks).progression}
                      onChange={(event) => handleTaskProgressChange(selectedTask, event.target.value)}
                      disabled={updatingProgressTaskId === selectedTask.id}
                    >
                      {progressOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}%
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            </section>

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
