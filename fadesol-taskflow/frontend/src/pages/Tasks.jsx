import { useEffect, useMemo, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import { assignTask, createTask, getTasks, updateTaskStatus } from "../services/taskService";
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
  const [formData, setFormData] = useState(emptyTaskForm);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigningTaskId, setAssigningTaskId] = useState("");
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState("");
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

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, []);

  const recentTasks = useMemo(() => tasks.slice(0, 8), [tasks]);

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
              <span>Affectee a</span>
              <span>Échéance</span>
              <span>Affecter a</span>
            </div>

            {recentTasks.map((task) => (
              <div className="table-row" key={task.id}>
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
                <span>{task.assigned_to ? getAssignedUserName(task.assigned_to) : "Non affectee"}</span>
                <span>{task.due_date || "Aucune"}</span>
                <span>
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
                </span>
              </div>
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
