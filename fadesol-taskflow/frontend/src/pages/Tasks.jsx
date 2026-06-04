import { Fragment, useEffect, useMemo, useState } from "react";
import { ClipboardList, GitBranch, PlusCircle, RefreshCw } from "lucide-react";
import {
  assignTask,
  assignSubtask,
  createSubtask,
  createTask,
  getSubtasksByTask,
  getTaskProgress,
  getTasks,
  updateTaskStatus,
} from "../services/taskService";
import { getFadesolServices } from "../services/serviceFadesolService";
import { getUsers } from "../services/userService";

const emptyTaskForm = {
  title: "",
  description: "",
  project_id: "",
  assigned_to: "",
  service_id: "",
  status: "Nouveau",
  priority: "Normale",
  due_date: "",
};

const emptySubtaskForm = {
  title: "",
  description: "",
  status: "Nouveau",
  priority: "Normale",
  due_date: "",
};

const statusOptions = [
  { label: "Nouveau", value: "Nouveau" },
  { label: "À faire", value: "AFaire" },
  { label: "En cours", value: "EnCours" },
  { label: "En attente", value: "EnAttente" },
  { label: "Validee", value: "Validee" },
  { label: "Annule", value: "Annule" },
  { label: "Bloqué", value: "Bloque" },
  { label: "Terminé", value: "Termine" },
];

const priorityOptions = [
  { label: "Urgente", value: "Urgente" },
  { label: "Haute", value: "Haute" },
  { label: "Normale", value: "Normale" },
  { label: "Faible", value: "Faible" },
];

const fallbackServiceOptions = [
  { label: "Commercial", value: "Commercial" },
  { label: "Technique", value: "Technique" },
  { label: "Achat", value: "Achat" },
  { label: "Magasin Stock", value: "MagasinStock" },
  { label: "Comptabilite Management", value: "ComptabiliteManagement" },
  { label: "Direction RH Administration", value: "DirectionRHAdministration" },
];

function normalizeTaskPayload(formData) {
  return {
    title: formData.title.trim(),
    description: formData.description.trim() || null,
    project_id: formData.project_id.trim() || null,
    assigned_to: formData.assigned_to.trim() || null,
    service_id: formData.service_id.trim() || null,
    status: formData.status,
    priority: formData.priority,
    due_date: formData.due_date || null,
  };
}

function normalizeSubtaskPayload(formData) {
  return {
    title: formData.title.trim(),
    description: formData.description.trim() || null,
    status: formData.status,
    priority: formData.priority,
    due_date: formData.due_date || null,
  };
}

function getOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value;
}

function getUserDisplayName(user) {
  const fullName = [user.prenom || user.first_name, user.nom || user.last_name].filter(Boolean).join(" ");

  return fullName || user.email || user.uuid;
}

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState(emptyTaskForm);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigningTaskId, setAssigningTaskId] = useState("");
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState("");
  const [progressByTask, setProgressByTask] = useState({});
  const [subtasksByTask, setSubtasksByTask] = useState({});
  const [subtaskForms, setSubtaskForms] = useState({});
  const [subtaskAssignForms, setSubtaskAssignForms] = useState({});
  const [subtaskMembersByService, setSubtaskMembersByService] = useState({});
  const [loadingSubtasksTaskId, setLoadingSubtasksTaskId] = useState("");
  const [savingSubtaskTaskId, setSavingSubtaskTaskId] = useState("");
  const [assigningSubtaskId, setAssigningSubtaskId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [clickupMessage, setClickupMessage] = useState("");

  async function loadTasks() {
    setError("");
    setLoading(true);

    try {
      const data = await getTasks();
      setTasks(data);
    } catch (err) {
      console.error("Load tasks error:", err);
      setError("Impossible de charger les tâches.");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    setUsersLoading(true);

    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Load users error:", err);
      setError("Impossible de charger les utilisateurs.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadServices() {
    setServicesLoading(true);

    try {
      const data = await getFadesolServices();
      setServices(data);
    } catch (err) {
      console.error("Load services error:", err);
      setError("Impossible de charger les services.");
    } finally {
      setServicesLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
    loadUsers();
    loadServices();
  }, []);

  const recentTasks = useMemo(() => tasks.slice(0, 8), [tasks]);

  useEffect(() => {
    let isMounted = true;

    async function loadTaskProgressions() {
      if (recentTasks.length === 0) {
        return;
      }

      try {
        const progressEntries = await Promise.all(
          recentTasks.map(async (task) => [task.id, await getTaskProgress(task.id)])
        );

        if (isMounted) {
          setProgressByTask((current) => ({
            ...current,
            ...Object.fromEntries(progressEntries),
          }));
        }
      } catch (err) {
        console.error("Load task progress error:", err);
      }
    }

    loadTaskProgressions();

    return () => {
      isMounted = false;
    };
  }, [recentTasks]);

  const serviceOptions = useMemo(() => {
    const loadedServices = services
      .map((service) => ({
        label: service.nom || service.name || service.id,
        value: service.nom || service.name || service.id,
      }))
      .filter((service) => service.value);

    return loadedServices.length ? loadedServices : fallbackServiceOptions;
  }, [services]);

  const formAssignableUsers = useMemo(() => {
    const serviceId = formData.service_id.trim();

    if (!serviceId) {
      return users;
    }

    return users.filter((user) => (user.id_service || user.service_id) === serviceId);
  }, [formData.service_id, users]);

  function getTaskAssignableUsers(task) {
    if (!task.service_id) {
      return users;
    }

    return users.filter((user) => (user.id_service || user.service_id) === task.service_id);
  }

  function getAssignedUserName(userUuid) {
    const user = users.find((candidate) => candidate.uuid === userUuid);

    return user ? getUserDisplayName(user) : userUuid;
  }

  function getProgress(taskId) {
    return progressByTask[taskId] || {
      total_subtasks: 0,
      completed_subtasks: 0,
      progression: 0,
    };
  }

  function getSubtaskAssignForm(subtask) {
    return subtaskAssignForms[subtask.id] || {
      service_id: subtask.service_id || "",
      assigned_to: subtask.assigned_to || "",
    };
  }

  function getUsersForService(serviceId) {
    if (!serviceId) {
      return users;
    }

    return subtaskMembersByService[serviceId] || users.filter(
      (user) => (user.id_service || user.service_id || user.service) === serviceId
    );
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === "service_id" ? { assigned_to: "" } : {}),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const createdTask = await createTask(normalizeTaskPayload(formData));
      setTasks((current) => [createdTask, ...current]);
      setFormData(emptyTaskForm);
      setMessage("Tâche créée avec succès.");
    } catch (err) {
      console.error("Create task error:", err);
      setError(err.response?.data?.detail || "Erreur pendant la création de la tâche.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignTask(taskId, assignedTo) {
    if (!assignedTo) {
      return;
    }

    setError("");
    setMessage("");
    setAssigningTaskId(taskId);

    try {
      const updatedTask = await assignTask(taskId, assignedTo);
      setTasks((current) => current.map((task) => (task.id === taskId ? updatedTask : task)));
      setMessage("Tache affectee avec succes.");
    } catch (err) {
      console.error("Assign task error:", err);
      setError(err.response?.data?.detail || "Erreur pendant l'affectation de la tache.");
    } finally {
      setAssigningTaskId("");
    }
  }

  async function handleStatusChange(taskId, status) {
    setError("");
    setMessage("");
    setUpdatingStatusTaskId(taskId);

    try {
      const updatedTask = await updateTaskStatus(taskId, status);
      setTasks((current) => current.map((task) => (task.id === taskId ? updatedTask : task)));
      setMessage("Statut mis a jour avec succes.");
    } catch (err) {
      console.error("Update task status error:", err);
      setError(err.response?.data?.detail || "Erreur pendant la mise a jour du statut.");
    } finally {
      setUpdatingStatusTaskId("");
    }
  }

  function handleSubtaskChange(taskId, event) {
    const { name, value } = event.target;

    setSubtaskForms((current) => ({
      ...current,
      [taskId]: {
        ...(current[taskId] || emptySubtaskForm),
        [name]: value,
      },
    }));
  }

  async function loadSubtasks(taskId) {
    setLoadingSubtasksTaskId(taskId);

    try {
      const data = await getSubtasksByTask(taskId);
      setSubtasksByTask((current) => ({
        ...current,
        [taskId]: data,
      }));
      setSubtaskAssignForms((current) => {
        const next = { ...current };

        data.forEach((subtask) => {
          next[subtask.id] = next[subtask.id] || {
            service_id: subtask.service_id || "",
            assigned_to: subtask.assigned_to || "",
          };
        });

        return next;
      });
    } catch (err) {
      console.error("Load subtasks error:", err);
      setError(err.response?.data?.detail || "Impossible de charger les sous-taches.");
    } finally {
      setLoadingSubtasksTaskId("");
    }
  }

  async function handleToggleSubtasks(taskId) {
    setError("");
    setMessage("");

    if (expandedTaskId === taskId) {
      setExpandedTaskId("");
      return;
    }

    setExpandedTaskId(taskId);
    setSubtaskForms((current) => ({
      ...current,
      [taskId]: current[taskId] || emptySubtaskForm,
    }));

    if (!subtasksByTask[taskId]) {
      await loadSubtasks(taskId);
    }
  }

  async function handleCreateSubtask(event, taskId) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingSubtaskTaskId(taskId);

    try {
      const form = subtaskForms[taskId] || emptySubtaskForm;
      const createdSubtask = await createSubtask(taskId, normalizeSubtaskPayload(form));
      const progress = await getTaskProgress(taskId);
      setSubtasksByTask((current) => ({
        ...current,
        [taskId]: [...(current[taskId] || []), createdSubtask],
      }));
      setProgressByTask((current) => ({
        ...current,
        [taskId]: progress,
      }));
      setSubtaskAssignForms((current) => ({
        ...current,
        [createdSubtask.id]: {
          service_id: createdSubtask.service_id || "",
          assigned_to: createdSubtask.assigned_to || "",
        },
      }));
      setSubtaskForms((current) => ({
        ...current,
        [taskId]: emptySubtaskForm,
      }));
      setMessage("Sous-tache creee avec succes.");
    } catch (err) {
      console.error("Create subtask error:", err);
      setError(err.response?.data?.detail || "Erreur pendant la creation de la sous-tache.");
    } finally {
      setSavingSubtaskTaskId("");
    }
  }

  async function loadMembersForService(serviceId) {
    if (!serviceId || subtaskMembersByService[serviceId]) {
      return;
    }

    try {
      const data = await getUsers(serviceId);
      setSubtaskMembersByService((current) => ({
        ...current,
        [serviceId]: data,
      }));
    } catch (err) {
      console.error("Load service members error:", err);
      setError("Impossible de charger les membres du service.");
    }
  }

  async function handleSubtaskAssignChange(subtask, event) {
    const { name, value } = event.target;

    setSubtaskAssignForms((current) => ({
      ...current,
      [subtask.id]: {
        ...getSubtaskAssignForm(subtask),
        [name]: value,
        ...(name === "service_id" ? { assigned_to: "" } : {}),
      },
    }));

    if (name === "service_id") {
      await loadMembersForService(value);
    }
  }

  async function handleAssignSubtask(taskId, subtask) {
    const form = getSubtaskAssignForm(subtask);
    setError("");
    setMessage("");
    setAssigningSubtaskId(subtask.id);

    try {
      const updatedSubtask = await assignSubtask(taskId, subtask.id, {
        service_id: form.service_id || null,
        assigned_to: form.assigned_to || null,
      });
      setSubtasksByTask((current) => ({
        ...current,
        [taskId]: (current[taskId] || []).map((candidate) =>
          candidate.id === updatedSubtask.id ? updatedSubtask : candidate
        ),
      }));
      setSubtaskAssignForms((current) => ({
        ...current,
        [updatedSubtask.id]: {
          service_id: updatedSubtask.service_id || "",
          assigned_to: updatedSubtask.assigned_to || "",
        },
      }));
      setMessage("Sous-tache affectee avec succes.");
    } catch (err) {
      console.error("Assign subtask error:", err);
      setError(err.response?.data?.detail || "Erreur pendant l'affectation de la sous-tache.");
    } finally {
      setAssigningSubtaskId("");
    }
  }

  function handleClickupPlaceholder() {
    setClickupMessage("La synchronisation ClickUp sera activée prochainement.");
  }

  return (
    <div className="dashboard-page tasks-page">
      <div className="board-toolbar">
        <div>
          <h2>Création des tâches</h2>
          <p>Créer une tâche manuellement et préparer la future synchronisation ClickUp.</p>
        </div>
        <button className="sync-button" type="button" onClick={handleClickupPlaceholder}>
          <RefreshCw size={18} />
          Synchroniser depuis ClickUp
        </button>
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}
      {clickupMessage && <p className="notice">{clickupMessage}</p>}

      <section className="management-grid">
        <form className="workspace-panel user-form" onSubmit={handleSubmit}>
          <div className="panel-title">
            <h3>Nouvelle tâche</h3>
            <span>Source locale</span>
          </div>

          <div className="form-grid">
            <label>
              Titre
              <input name="title" value={formData.title} onChange={handleChange} required />
            </label>
            <label>
              Projet ID
              <input name="project_id" value={formData.project_id} onChange={handleChange} placeholder="UUID projet" />
            </label>
            <label>
              Assignée à
              <select name="assigned_to" value={formData.assigned_to} onChange={handleChange} disabled={usersLoading}>
                <option value="">Non affectee</option>
                {formAssignableUsers.map((user) => (
                  <option key={user.uuid} value={user.uuid}>
                    {getUserDisplayName(user)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Service ID
              <input name="service_id" value={formData.service_id} onChange={handleChange} placeholder="UUID service" />
            </label>
            <label>
              Statut
              <select name="status" value={formData.status} onChange={handleChange}>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </label>
            <label>
              Priorité
              <select name="priority" value={formData.priority} onChange={handleChange}>
                {priorityOptions.map((priority) => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
            </label>
            <label>
              Échéance
              <input name="due_date" type="date" value={formData.due_date} onChange={handleChange} />
            </label>
          </div>

          <label>
            Description
            <textarea name="description" value={formData.description} onChange={handleChange} rows={5} />
          </label>

          <button className="primary-action" type="submit" disabled={saving}>
            {saving ? "Création..." : "Créer la tâche"}
          </button>
        </form>

        <section className="workspace-panel user-list-panel">
          <div className="panel-title">
            <h3>Tâches récentes</h3>
            <span>{tasks.length} tâche(s)</span>
          </div>

          <div className="users-table">
            <div className="table-head">
              <span>Titre</span>
              <span>Statut</span>
              <span>Priorité</span>
              <span>Progression</span>
              <span>Échéance</span>
              <span>Affecter a</span>
            </div>

            {recentTasks.map((task) => (
              <Fragment key={task.id}>
                <div className="table-row">
                  <span>{task.title}</span>
                  <span>
                    <select
                      className="assignment-select status-select"
                      value={task.status || ""}
                      onChange={(event) => handleStatusChange(task.id, event.target.value)}
                      disabled={updatingStatusTaskId === task.id}
                    >
                      {statusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span>{getOptionLabel(priorityOptions, task.priority)}</span>
                  <span className="task-progress-cell">
                    <strong>{getProgress(task.id).progression}%</strong>
                    <small>
                      {getProgress(task.id).completed_subtasks} / {getProgress(task.id).total_subtasks} sous-taches terminees
                    </small>
                    <i>
                      <b style={{ width: `${getProgress(task.id).progression}%` }} />
                    </i>
                  </span>
                  <span>{task.due_date || "Aucune"}</span>
                  <span className="task-actions-cell">
                    <select
                      className="assignment-select"
                      value={task.assigned_to || ""}
                      onChange={(event) => handleAssignTask(task.id, event.target.value)}
                      disabled={assigningTaskId === task.id || usersLoading}
                    >
                      <option value="">Choisir</option>
                      {getTaskAssignableUsers(task).map((user) => (
                        <option key={user.uuid} value={user.uuid}>
                          {getUserDisplayName(user)}
                        </option>
                      ))}
                    </select>
                    <button className="secondary-action compact-action" type="button" onClick={() => handleToggleSubtasks(task.id)}>
                      <PlusCircle size={15} />
                      Sous-tache
                    </button>
                  </span>
                </div>

                {expandedTaskId === task.id && (
                  <div className="subtask-row">
                    <div className="subtask-panel">
                      <div className="subtask-list">
                        <div className="subtask-panel-title">
                          <div>
                            <h4>Sous-taches</h4>
                            <span>{(subtasksByTask[task.id] || []).length} element(s)</span>
                          </div>
                          {loadingSubtasksTaskId === task.id && <small>Chargement...</small>}
                        </div>

                        {(subtasksByTask[task.id] || []).map((subtask) => (
                          <article className="subtask-item" key={subtask.id}>
                            <GitBranch size={16} />
                            <div>
                              <strong>{subtask.title}</strong>
                              <span>
                                {getOptionLabel(statusOptions, subtask.status)} - {getOptionLabel(priorityOptions, subtask.priority)}
                                {subtask.due_date ? ` - ${subtask.due_date}` : ""}
                              </span>
                              <div className="subtask-assignment-controls">
                                <label>
                                  Service
                                  <select
                                    value={getSubtaskAssignForm(subtask).service_id}
                                    name="service_id"
                                    onChange={(event) => handleSubtaskAssignChange(subtask, event)}
                                    disabled={servicesLoading}
                                  >
                                    <option value="">Aucun service</option>
                                    {serviceOptions.map((service) => (
                                      <option key={service.value} value={service.value}>
                                        {service.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  Affecter a
                                  <select
                                    value={getSubtaskAssignForm(subtask).assigned_to}
                                    name="assigned_to"
                                    onChange={(event) => handleSubtaskAssignChange(subtask, event)}
                                  >
                                    <option value="">Non affectee</option>
                                    {getUsersForService(getSubtaskAssignForm(subtask).service_id).map((user) => (
                                      <option key={user.uuid} value={user.uuid}>
                                        {getUserDisplayName(user)}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <button
                                  className="secondary-action compact-action"
                                  type="button"
                                  onClick={() => handleAssignSubtask(task.id, subtask)}
                                  disabled={assigningSubtaskId === subtask.id}
                                >
                                  {assigningSubtaskId === subtask.id ? "Affectation..." : "Affecter"}
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}

                        {!loadingSubtasksTaskId && (subtasksByTask[task.id] || []).length === 0 && (
                          <p className="subtask-empty">Aucune sous-tache pour cette tache.</p>
                        )}
                      </div>

                      <form className="subtask-form" onSubmit={(event) => handleCreateSubtask(event, task.id)}>
                        <label>
                          Titre
                          <input
                            name="title"
                            value={(subtaskForms[task.id] || emptySubtaskForm).title}
                            onChange={(event) => handleSubtaskChange(task.id, event)}
                            required
                          />
                        </label>
                        <label>
                          Statut
                          <select
                            name="status"
                            value={(subtaskForms[task.id] || emptySubtaskForm).status}
                            onChange={(event) => handleSubtaskChange(task.id, event)}
                          >
                            {statusOptions.map((status) => (
                              <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Priorite
                          <select
                            name="priority"
                            value={(subtaskForms[task.id] || emptySubtaskForm).priority}
                            onChange={(event) => handleSubtaskChange(task.id, event)}
                          >
                            {priorityOptions.map((priority) => (
                              <option key={priority.value} value={priority.value}>{priority.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Date limite
                          <input
                            name="due_date"
                            type="date"
                            value={(subtaskForms[task.id] || emptySubtaskForm).due_date}
                            onChange={(event) => handleSubtaskChange(task.id, event)}
                          />
                        </label>
                        <label className="subtask-description-field">
                          Description
                          <textarea
                            name="description"
                            value={(subtaskForms[task.id] || emptySubtaskForm).description}
                            onChange={(event) => handleSubtaskChange(task.id, event)}
                            rows={3}
                          />
                        </label>
                        <button className="primary-action" type="submit" disabled={savingSubtaskTaskId === task.id}>
                          {savingSubtaskTaskId === task.id ? "Creation..." : "Ajouter la sous-tache"}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </Fragment>
            ))}

            {!loading && recentTasks.length === 0 && (
              <div className="empty-table">
                <ClipboardList size={32} />
                <strong>Aucune tâche</strong>
                <p>Créez une première tâche depuis le formulaire.</p>
              </div>
            )}

            {loading && <p className="loading-line">Chargement des tâches...</p>}
          </div>
        </section>
      </section>
    </div>
  );
}

export default Tasks;
