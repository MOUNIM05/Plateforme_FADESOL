// Page de gestion des taches : creation, affectation, sous-taches, pieces jointes et suivi.
import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardList, Edit3, Eye, GitBranch, PlusCircle, Trash2, X } from "lucide-react";
import {
  assignTask,
  assignSubtask,
  createSubtask,
  createTask,
  deleteTask,
  deleteSubtaskAttachment,
  deleteTaskAttachment,
  getTask,
  getSubtaskAttachments,
  getSubtasksByTask,
  getTaskAttachments,
  getTaskProgress,
  getTasks,
  uploadSubtaskAttachment,
  uploadTaskAttachment,
  updateTask,
  updateTaskStatus,
} from "../services/taskService";
import { getProjects } from "../services/projectService";
import {
  getFadesolServiceLabel,
  getFadesolServiceValue,
  getFadesolServices,
} from "../services/serviceFadesolService";
import { getUsers } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import { DATA_EVENTS, dispatchDataChanged, subscribeDataEvents } from "../utils/dataEvents";

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

function normalizeTaskPayload(formData) {
  // Nettoie le formulaire avant envoi pour eviter les chaines vides en base.
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
  // Prepare les donnees d'une sous-tache avant creation dans l'API.
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

function getProjectLabel(project) {
  return project.titre || project.title || project.name || project.nom || project.id;
}

function getServiceLabel(service) {
  return getFadesolServiceLabel(service);
}

function getServiceValue(service) {
  return getFadesolServiceValue(service);
}

function normalizeServiceKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function normalizeProgressStatus(value) {
  return normalizeServiceKey(value);
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
    return Number(existingProgress) || 0;
  }

  return Number(existingProgress) || 0;
}

function serviceMatchesManager(service, managerServiceValue) {
  const managerKey = normalizeServiceKey(managerServiceValue);

  if (!managerKey) {
    return false;
  }

  return [
    service?.id,
    service?.uuid,
    service?.name,
    service?.nom,
    service?.nom_service,
    service?.libelle,
  ].some((value) => normalizeServiceKey(value) === managerKey);
}

function userMatchesService(user, serviceValue, serviceLabel) {
  const serviceKeys = [serviceValue, serviceLabel].map(normalizeServiceKey).filter(Boolean);

  if (serviceKeys.length === 0) {
    return true;
  }

  return [
    user?.id_service,
    user?.service_id,
    user?.service,
    user?.service_name,
    user?.nom_service,
  ].some((value) => serviceKeys.includes(normalizeServiceKey(value)));
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

function getTaskAssigneeValues(task) {
  return [
    task?.assigned_to,
    task?.assigned_user_id,
    task?.assignee_id,
    task?.assignee_a,
    task?.user_id,
    task?.responsable_id,
  ].filter((value) => value !== undefined && value !== null && value !== "");
}

function getUserDisplayName(user) {
  const fullName = [user.prenom || user.first_name, user.nom || user.last_name].filter(Boolean).join(" ");

  return fullName || user.email || user.uuid;
}

function toDateInputValue(value) {
  return value ? String(value).slice(0, 10) : "";
}

function Tasks() {
  // Les droits du contexte Auth pilotent l'affichage et les actions disponibles.
  const { currentUser, hasPermission } = useAuth();
  const navigate = useNavigate();
  const canCreateTasks = hasPermission("tasks.create");
  const canUpdateTasks = hasPermission("tasks.update");
  const canDeleteTasks = hasPermission("tasks.delete");
  const canManageTaskDetails = canCreateTasks || canUpdateTasks;
  const role = currentUser?.role;
  const isManager = role === "Manager";
  const isEmployee = role === "Employee" || role === "Employe" || role === "EmployÃ©";
  const currentServiceId =
    currentUser?.id_service ||
    currentUser?.service_id ||
    currentUser?.service ||
    currentUser?.service_name ||
    currentUser?.nom_service ||
    "";
  const currentUserIds = useMemo(() => getUserIdentityValues(currentUser).map(String), [currentUser]);
  const [searchParams] = useSearchParams();

  const isAdmin = role === "Admin" || role === "Administrateur";

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState(emptyTaskForm);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetailsLoading, setTaskDetailsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigningTaskId, setAssigningTaskId] = useState("");
  const [updatingStatusTaskId, setUpdatingStatusTaskId] = useState("");
  const [expandedTaskId, setExpandedTaskId] = useState("");
  const [progressByTask, setProgressByTask] = useState({});
  const [subtasksByTask, setSubtasksByTask] = useState({});
  const [attachmentsByTask, setAttachmentsByTask] = useState({});
  const [attachmentsBySubtask, setAttachmentsBySubtask] = useState({});
  const [subtaskForms, setSubtaskForms] = useState({});
  const [subtaskAssignForms, setSubtaskAssignForms] = useState({});
  const [subtaskMembersByService, setSubtaskMembersByService] = useState({});
  const [loadingSubtasksTaskId, setLoadingSubtasksTaskId] = useState("");
  const [savingSubtaskTaskId, setSavingSubtaskTaskId] = useState("");
  const [assigningSubtaskId, setAssigningSubtaskId] = useState("");
  const [uploadingAttachmentKey, setUploadingAttachmentKey] = useState("");
  const [deletingAttachmentId, setDeletingAttachmentId] = useState("");
  const [deletingTaskId, setDeletingTaskId] = useState("");
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [taskServiceFilter, setTaskServiceFilter] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function isTaskAssignedToCurrentUser(task) {
    const assigneeValues = getTaskAssigneeValues(task).map(String);

    return assigneeValues.some((value) => currentUserIds.includes(value));
  }

  async function loadTasks({ showLoading = true } = {}) {
    // Charge les taches selon le role : Employee = ses taches, Manager = son service, Admin = tout.
    setError("");
    if (showLoading) {
      setLoading(true);
    }

    try {
      const filters = {
        ...(isEmployee ? { assigned_to: "me" } : {}),
        ...(isManager && currentServiceId ? { service_id: currentServiceId } : {}),
      };
      const data = await getTasks(filters);
      let taskData = Array.isArray(data) ? data : [];

      if (isManager) {
        taskData = taskData.filter((task) => !isTaskAssignedToCurrentUser(task));
      }

      setTasks(
        [...taskData].sort((firstTask, secondTask) => {
          const firstDate = new Date(firstTask.created_at || firstTask.date_creation || 0).getTime();
          const secondDate = new Date(secondTask.created_at || secondTask.date_creation || 0).getTime();
          return secondDate - firstDate;
        })
      );
    } catch (err) {
      console.error("Load tasks error:", err);
      setError("Impossible de charger les tâches.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  async function loadUsers() {
    // Charge les utilisateurs affectables aux taches.
    setUsersLoading(true);

    try {
      const data = await getUsers(isManager && currentServiceId ? currentServiceId : undefined);
      setUsers(data);
    } catch (err) {
      console.error("Load users error:", err);
      setError("Impossible de charger les utilisateurs.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadProjects() {
    // Charge les projets disponibles pour rattacher une tache.
    setProjectsLoading(true);

    try {
      const data = await getProjects(isManager && currentServiceId ? { service_id: currentServiceId } : {});
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load projects error:", err);
      setError("Impossible de charger les projets.");
    } finally {
      setProjectsLoading(false);
    }
  }

  async function loadServices() {
    // Charge les services, puis limite la liste au service du manager si besoin.
    setServicesLoading(true);

    try {
      const data = await getFadesolServices();
      const serviceData = Array.isArray(data) ? data : [];
      setServices(
        isManager && currentServiceId
          ? serviceData.filter((service) => serviceMatchesManager(service, currentServiceId))
          : serviceData
      );
    } catch (err) {
      console.error("Load services error:", err);
      setError("Impossible de charger les services.");
    } finally {
      setServicesLoading(false);
    }
  }

  useEffect(() => {
    // Les employes utilisent la page dediee "Mes taches".
    if (isEmployee) {
      // Si un taskId est fourni, on conserve le contexte lors de la redirection.
      const taskIdFromUrl = searchParams.get("taskId");
      if (taskIdFromUrl) {
        navigate(`/my-tasks?taskId=${taskIdFromUrl}`, { replace: true });
        return;
      }

      navigate("/my-tasks", { replace: true });
      return;
    }

    loadTasks();
    loadUsers();
    loadProjects();
    loadServices();
  }, [isEmployee, isManager, currentServiceId]);


  useEffect(() => {
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return;
    }

    // Les employes sont deja rediriges vers /my-tasks.
    if (isEmployee) {
      return;
    }

    // Si la tache est deja chargee, on ouvre directement la modale.
    const found = tasks.find((t) => String(t.id) === String(taskId));

    if (found) {
      openTaskDetails(found);
      return;
    }

    // Sinon on charge la tache seule et on verifie le perimetre avant affichage.
    let isMounted = true;

    (async () => {
      setTaskDetailsLoading(true);
      setError("");

      try {
        const taskData = await getTask(taskId);

        if (!isMounted) return;

        if (isManager && isTaskAssignedToCurrentUser(taskData)) {
          navigate(`/my-tasks?taskId=${taskId}`, { replace: true });
        } else if (isAdmin || isManager) {
          setSelectedTask(taskData);
        } else {
          setError("Élément introuvable ou non autorisé.");
        }
      } catch (err) {
        console.error("Load task by id error:", err);
        setError("Élément introuvable ou non autorisé.");
      } finally {
        if (isMounted) setTaskDetailsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [searchParams, tasks, isEmployee, isManager, isAdmin, currentServiceId, currentUserIds, navigate]);

  useEffect(() => {
    return subscribeDataEvents([DATA_EVENTS.PROJECTS_CHANGED], loadProjects);
  }, []);

  useEffect(() => {
    return subscribeDataEvents([DATA_EVENTS.SERVICES_CHANGED], loadServices);
  }, []);

  useEffect(() => {
    return subscribeDataEvents([DATA_EVENTS.USERS_CHANGED], loadUsers);
  }, []);

  const taskStats = useMemo(() => {
    const normalizeStatus = (status) =>
      String(status || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();

    return {
      total: tasks.length,
      todo: tasks.filter((task) => ["nouveau", "afaire"].includes(normalizeStatus(task.status || task.statut))).length,
      inProgress: tasks.filter((task) => normalizeStatus(task.status || task.statut).includes("encours")).length,
      completed: tasks.filter((task) => normalizeStatus(task.status || task.statut).startsWith("termin")).length,
      blocked: tasks.filter((task) => normalizeStatus(task.status || task.statut).includes("bloqu")).length,
    };
  }, [tasks]);

  const recentTasks = useMemo(() => {
    const query = taskSearchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      if (isManager && isTaskAssignedToCurrentUser(task)) {
        return false;
      }

      const searchable = [
        task.title,
        task.titre,
        task.description,
        task.status,
        task.statut,
        task.priority,
        task.priorite,
        task.service_id,
        task.project_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = query === "" || searchable.includes(query);
      const matchesService = taskServiceFilter === "" || String(task.service_id || "") === String(taskServiceFilter);
      const matchesStatus = taskStatusFilter === "" || String(task.status || task.statut || "") === String(taskStatusFilter);
      const matchesPriority = taskPriorityFilter === "" || String(task.priority || task.priorite || "") === String(taskPriorityFilter);

      return matchesSearch && matchesService && matchesStatus && matchesPriority;
    });
  }, [isManager, taskPriorityFilter, taskSearchQuery, taskServiceFilter, taskStatusFilter, tasks, currentUserIds]);

  useEffect(() => {
    // Calcule la progression des taches visibles a partir de leurs sous-taches.
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

  const projectOptions = useMemo(() => {
    return projects
      .map((project) => ({
        label: getProjectLabel(project),
        value: String(project.id || project.project_id || ""),
      }))
      .filter((project) => project.value);
  }, [projects]);

  const serviceOptions = useMemo(() => {
    return services
      .map((service) => ({
        label: getServiceLabel(service),
        value: getServiceValue(service),
      }))
      .filter((service) => service.value);
  }, [services]);

  const projectById = useMemo(() => {
    return projectOptions.reduce((accumulator, project) => {
      accumulator[project.value] = project.label;
      return accumulator;
    }, {});
  }, [projectOptions]);

  const serviceById = useMemo(() => {
    return serviceOptions.reduce((accumulator, service) => {
      accumulator[service.value] = service.label;
      return accumulator;
    }, {});
  }, [serviceOptions]);

  const managerDefaultServiceValue = useMemo(() => {
    if (!isManager || !currentServiceId) {
      return "";
    }

    return (
      serviceOptions.find((service) =>
        [service.value, service.label].some((value) => normalizeServiceKey(value) === normalizeServiceKey(currentServiceId))
      )?.value ||
      getFadesolServiceValue(services.find((service) => serviceMatchesManager(service, currentServiceId))) ||
      String(currentServiceId)
    );
  }, [currentServiceId, isManager, serviceOptions, services]);

  function getDefaultTaskForm() {
    return {
      ...emptyTaskForm,
      service_id: managerDefaultServiceValue,
    };
  }

  const formAssignableUsers = useMemo(() => {
    // La liste d'affectation depend du service selectionne dans le formulaire.
    const serviceId = formData.service_id.trim();
    const serviceName = serviceById[serviceId];

    if (!serviceId) {
      return users;
    }

    return users.filter((user) => userMatchesService(user, serviceId, serviceName));
  }, [formData.service_id, serviceById, users]);

  function getTaskAssignableUsers(task) {
    if (!task.service_id) {
      return users;
    }

    const serviceId = String(task.service_id);
    const serviceName = serviceById[serviceId];

    return users.filter((user) => userMatchesService(user, serviceId, serviceName));
  }

  function getAssignedUserName(userUuid) {
    if (!userUuid) {
      return "Non affectee";
    }

    const user = users.find((candidate) =>
      [candidate.uuid, candidate.id, candidate.user_id, candidate.email].map(String).includes(String(userUuid))
    );

    return user ? getUserDisplayName(user) : userUuid;
  }

  function getProgress(taskId) {
    return progressByTask[taskId] || {
      total_subtasks: 0,
      completed_subtasks: 0,
      progression: 0,
    };
  }

  function getTaskProgressInfo(task) {
    const apiProgress = getProgress(task.id);
    const subtasks =
      task.subtasks ||
      task.sous_taches ||
      task.sousTasks ||
      subtasksByTask[task.id] ||
      [];
    const hasSubtasks = Number(apiProgress.total_subtasks) > 0 || (Array.isArray(subtasks) && subtasks.length > 0);

    if (hasSubtasks) {
      if (Number(apiProgress.total_subtasks) > 0) {
        return apiProgress;
      }

      const completed = subtasks.filter((subtask) => getProgressFromStatus(subtask.status || subtask.statut) === 100).length;

      return {
        total_subtasks: subtasks.length,
        completed_subtasks: completed,
        progression: Math.round((completed / subtasks.length) * 100),
      };
    }

    const existingProgress = task.progression ?? task.progress ?? apiProgress.progression ?? 0;

    return {
      total_subtasks: 0,
      completed_subtasks: 0,
      progression: getProgressFromStatus(task.status || task.statut, existingProgress),
    };
  }

  function formatFileSize(size = 0) {
    if (size < 1024) {
      return `${size} o`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} Ko`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
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

    return subtaskMembersByService[serviceId] || users.filter((user) => {
      const serviceName = serviceById[String(serviceId)];

      return userMatchesService(user, serviceId, serviceName);
    });
  }

  function handleChange(event) {
    // Quand le service change, l'utilisateur affecte est reinitialise pour eviter une incoherence.
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === "service_id" ? { assigned_to: "" } : {}),
    }));
  }

  function resetTaskForm() {
    setEditingTaskId("");
    setTaskFormOpen(false);
    setFormData(getDefaultTaskForm());
    setError("");
  }

  function openCreateTask() {
    setSelectedTask(null);
    setEditingTaskId("");
    setFormData(getDefaultTaskForm());
    setTaskFormOpen(true);
    setMessage("");
    setError("");
  }

  async function openTaskDetails(task) {
    // Recharge le detail depuis l'API afin d'afficher l'etat le plus recent.
    setTaskDetailsLoading(true);
    setSelectedTask(task);
    setError("");

    try {
      const [taskResult, progressResult, subtasksResult] = await Promise.allSettled([
        getTask(task.id),
        getTaskProgress(task.id),
        getSubtasksByTask(task.id),
      ]);

      if (taskResult.status === "fulfilled") {
        setSelectedTask(taskResult.value);
      }

      if (progressResult.status === "fulfilled") {
        setProgressByTask((current) => ({ ...current, [task.id]: progressResult.value }));
      }

      if (subtasksResult.status === "fulfilled") {
        setSubtasksByTask((current) => ({ ...current, [task.id]: Array.isArray(subtasksResult.value) ? subtasksResult.value : [] }));
      }
    } catch (err) {
      console.error("Load task details error:", err);
      setError(err.response?.data?.detail || "Impossible de charger les details de la tache.");
    } finally {
      setTaskDetailsLoading(false);
    }
  }

  function startEditTask(task) {
    // Pre-remplit le formulaire avec les donnees de la tache a modifier.
    if (!canUpdateTasks) {
      setError("Vous n'avez pas l'autorisation de modifier les taches.");
      return;
    }

    setSelectedTask(null);
    setEditingTaskId(task.id);
    setTaskFormOpen(true);
    setFormData({
      title: task.title || task.titre || "",
      description: task.description || "",
      project_id: task.project_id || task.projet_id || "",
      assigned_to: task.assigned_to || task.assignee_a || "",
      service_id: task.service_id || "",
      status: task.status || task.statut || "Nouveau",
      priority: task.priority || task.priorite || "Normale",
      due_date: toDateInputValue(task.due_date || task.date_limite),
    });
    setMessage("");
    setError("");
  }

  async function handleDeleteTask(task) {
    // Suppression protegee par permission et confirmation utilisateur.
    if (!canDeleteTasks) {
      setError("Vous n'avez pas l'autorisation de supprimer les taches.");
      return;
    }

    const confirmed = window.confirm(`Confirmer la suppression de la tache "${task.title || task.titre}" ?`);

    if (!confirmed) {
      return;
    }

    setDeletingTaskId(task.id);
    setMessage("");
    setError("");

    try {
      await deleteTask(task.id);
      setSelectedTask((current) => (current?.id === task.id ? null : current));
      setMessage("Tache supprimee avec succes.");
      await loadTasks({ showLoading: false });
      dispatchDataChanged(DATA_EVENTS.TASKS_CHANGED);
    } catch (err) {
      console.error("Delete task error:", err);
      setError(err.response?.data?.detail || "Erreur pendant la suppression de la tache.");
    } finally {
      setDeletingTaskId("");
    }
  }

  async function handleSubmit(event) {
    // Creation ou mise a jour selon la presence d'un identifiant d'edition.
    event.preventDefault();
    setError("");
    setMessage("");

    if (!editingTaskId && !canCreateTasks) {
      setError("Vous n'avez pas l'autorisation de créer des tâches.");
      return;
    }

    if (editingTaskId && !canUpdateTasks) {
      setError("Vous n'avez pas l'autorisation de modifier les taches.");
      return;
    }

    if (!formData.service_id) {
      setError("Veuillez sélectionner un service.");
      return;
    }

    setSaving(true);

    try {
      const payload = normalizeTaskPayload(formData);

      if (editingTaskId) {
        await updateTask(editingTaskId, payload);
        setMessage("Tache modifiee avec succes.");
      } else {
        await createTask(payload);
        setMessage("Tâche créée avec succès.");
      }

      setEditingTaskId("");
      setTaskFormOpen(false);
      setFormData(getDefaultTaskForm());
      await loadTasks({ showLoading: false });
      dispatchDataChanged(DATA_EVENTS.TASKS_CHANGED);
    } catch (err) {
      console.error("Create task error:", err);
      setError(err.response?.data?.detail || "Erreur pendant la création de la tâche.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignTask(taskId, assignedTo) {
    // Affecte rapidement une tache depuis la ligne du tableau.
    if (!assignedTo) {
      return;
    }

    setError("");
    setMessage("");
    setAssigningTaskId(taskId);

    try {
      const updatedTask = await assignTask(taskId, assignedTo);
      setTasks((current) =>
        current
          .map((task) => (task.id === taskId ? updatedTask : task))
          .filter((task) => !(isManager && isTaskAssignedToCurrentUser(task)))
      );
      setSelectedTask((current) => (current?.id === taskId && isTaskAssignedToCurrentUser(updatedTask) ? null : current));
      setMessage("Tache affectee avec succes.");
      dispatchDataChanged(DATA_EVENTS.TASKS_CHANGED);
    } catch (err) {
      console.error("Assign task error:", err);
      setError(err.response?.data?.detail || "Erreur pendant l'affectation de la tache.");
    } finally {
      setAssigningTaskId("");
    }
  }

  async function handleStatusChange(taskId, status) {
    // Mise a jour rapide du statut sans ouvrir le formulaire complet.
    setError("");
    setMessage("");
    setUpdatingStatusTaskId(taskId);

    try {
      const updatedTask = await updateTaskStatus(taskId, status);
      setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...updatedTask, status } : task)));
      setSelectedTask((current) => (current?.id === taskId ? { ...current, ...updatedTask, status } : current));
      setMessage("Statut mis a jour avec succes.");
      dispatchDataChanged(DATA_EVENTS.TASKS_CHANGED);
    } catch (err) {
      console.error("Update task status error:", err);
      setError(err.response?.data?.detail || "Erreur pendant la mise a jour du statut.");
    } finally {
      setUpdatingStatusTaskId("");
    }
  }

  function handleSubtaskChange(taskId, event) {
    // Stocke un formulaire independant pour chaque tache developpee.
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
    // Charge les sous-taches et leurs pieces jointes pour le panneau ouvert.
    setLoadingSubtasksTaskId(taskId);

    try {
      const data = await getSubtasksByTask(taskId);
      setSubtasksByTask((current) => ({
        ...current,
        [taskId]: data,
      }));
      setSubtaskAssignForms((current) => {
        // Initialise les formulaires d'affectation des sous-taches deja existantes.
        const next = { ...current };

        data.forEach((subtask) => {
          next[subtask.id] = next[subtask.id] || {
            service_id: subtask.service_id || "",
            assigned_to: subtask.assigned_to || "",
          };
        });

        return next;
      });

      const attachmentEntries = await Promise.all(
        data.map(async (subtask) => [subtask.id, await getSubtaskAttachments(taskId, subtask.id)])
      );
      setAttachmentsBySubtask((current) => ({
        ...current,
        ...Object.fromEntries(attachmentEntries),
      }));
    } catch (err) {
      console.error("Load subtasks error:", err);
      setError(err.response?.data?.detail || "Impossible de charger les sous-taches.");
    } finally {
      setLoadingSubtasksTaskId("");
    }
  }

  async function loadTaskAttachments(taskId) {
    // Charge les pieces jointes d'une tache principale.
    try {
      const data = await getTaskAttachments(taskId);
      setAttachmentsByTask((current) => ({
        ...current,
        [taskId]: data,
      }));
    } catch (err) {
      console.error("Load task attachments error:", err);
      setError(err.response?.data?.detail || "Impossible de charger les pieces jointes.");
    }
  }

  async function handleToggleSubtasks(taskId) {
    // Ouvre ou ferme le panneau details : sous-taches + pieces jointes.
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

    await Promise.all([
      attachmentsByTask[taskId] ? Promise.resolve() : loadTaskAttachments(taskId),
      subtasksByTask[taskId] ? Promise.resolve() : loadSubtasks(taskId),
    ]);
  }

  async function handleUploadTaskAttachment(taskId, event) {
    // Upload d'une piece jointe liee directement a la tache.
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setMessage("");
    setUploadingAttachmentKey(`task:${taskId}`);

    try {
      const attachment = await uploadTaskAttachment(taskId, file);
      setAttachmentsByTask((current) => ({
        ...current,
        [taskId]: [...(current[taskId] || []), attachment],
      }));
      setMessage("Piece jointe ajoutee avec succes.");
    } catch (err) {
      console.error("Upload task attachment error:", err);
      setError(err.response?.data?.detail || "Erreur pendant l'ajout de la piece jointe.");
    } finally {
      event.target.value = "";
      setUploadingAttachmentKey("");
    }
  }

  async function handleUploadSubtaskAttachment(taskId, subtaskId, event) {
    // Upload d'une piece jointe rattachee a une sous-tache.
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setMessage("");
    setUploadingAttachmentKey(`subtask:${subtaskId}`);

    try {
      const attachment = await uploadSubtaskAttachment(taskId, subtaskId, file);
      setAttachmentsBySubtask((current) => ({
        ...current,
        [subtaskId]: [...(current[subtaskId] || []), attachment],
      }));
      setMessage("Piece jointe ajoutee avec succes.");
    } catch (err) {
      console.error("Upload subtask attachment error:", err);
      setError(err.response?.data?.detail || "Erreur pendant l'ajout de la piece jointe.");
    } finally {
      event.target.value = "";
      setUploadingAttachmentKey("");
    }
  }

  async function handleDeleteTaskAttachment(taskId, attachmentId) {
    // Supprime une piece jointe de tache et met a jour l'etat local.
    setError("");
    setMessage("");
    setDeletingAttachmentId(attachmentId);

    try {
      await deleteTaskAttachment(taskId, attachmentId);
      setAttachmentsByTask((current) => ({
        ...current,
        [taskId]: (current[taskId] || []).filter((attachment) => attachment.id !== attachmentId),
      }));
      setMessage("Piece jointe supprimee.");
    } catch (err) {
      console.error("Delete task attachment error:", err);
      setError(err.response?.data?.detail || "Erreur pendant la suppression de la piece jointe.");
    } finally {
      setDeletingAttachmentId("");
    }
  }

  async function handleDeleteSubtaskAttachment(taskId, subtaskId, attachmentId) {
    // Supprime une piece jointe de sous-tache.
    setError("");
    setMessage("");
    setDeletingAttachmentId(attachmentId);

    try {
      await deleteSubtaskAttachment(taskId, subtaskId, attachmentId);
      setAttachmentsBySubtask((current) => ({
        ...current,
        [subtaskId]: (current[subtaskId] || []).filter((attachment) => attachment.id !== attachmentId),
      }));
      setMessage("Piece jointe supprimee.");
    } catch (err) {
      console.error("Delete subtask attachment error:", err);
      setError(err.response?.data?.detail || "Erreur pendant la suppression de la piece jointe.");
    } finally {
      setDeletingAttachmentId("");
    }
  }

  async function handleCreateSubtask(event, taskId) {
    // Cree une sous-tache puis recalcule la progression de la tache parente.
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
      await loadTasks({ showLoading: false });
      dispatchDataChanged(DATA_EVENTS.TASKS_CHANGED);
    } catch (err) {
      console.error("Create subtask error:", err);
      setError(err.response?.data?.detail || "Erreur pendant la creation de la sous-tache.");
    } finally {
      setSavingSubtaskTaskId("");
    }
  }

  async function loadMembersForService(serviceId) {
    // Charge a la demande les membres d'un service pour l'affectation de sous-tache.
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
    // Change le service ou le membre affecte a une sous-tache.
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
    // Persiste l'affectation service/utilisateur d'une sous-tache.
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
      dispatchDataChanged(DATA_EVENTS.TASKS_CHANGED);
    } catch (err) {
      console.error("Assign subtask error:", err);
      setError(err.response?.data?.detail || "Erreur pendant l'affectation de la sous-tache.");
    } finally {
      setAssigningSubtaskId("");
    }
  }

  return (
    <div className="dashboard-page tasks-page">
      <div className="board-toolbar">
        <div>
          <h2>{isManager ? "Taches du service" : "Gestion des taches"}</h2>
          <p>Consultez, filtrez et suivez les taches internes de la plateforme.</p>
        </div>
        <div className="toolbar-actions page-actions">
          {canCreateTasks && (
            <button type="button" className="primary-action" onClick={openCreateTask}>
              <PlusCircle size={17} />
              Nouvelle tâche
            </button>
          )}
        </div>
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}

      <section className="task-stats-grid" aria-label="Resume taches">
        <article className="workspace-panel user-stat-card">
          <ClipboardList size={20} />
          <span>Total taches</span>
          <strong>{taskStats.total}</strong>
        </article>
        <article className="workspace-panel user-stat-card">
          <PlusCircle size={20} />
          <span>A faire</span>
          <strong>{taskStats.todo}</strong>
        </article>
        <article className="workspace-panel user-stat-card">
          <GitBranch size={20} />
          <span>En cours</span>
          <strong>{taskStats.inProgress}</strong>
        </article>
        <article className="workspace-panel user-stat-card">
          <Edit3 size={20} />
          <span>Terminees</span>
          <strong>{taskStats.completed}</strong>
        </article>
      </section>

      <section className="management-grid page-stack">
        <section className="workspace-panel user-list-panel list-card-full page-list-card">
          <div className="panel-title">
            <h3>Liste des taches</h3>
            <span>{recentTasks.length} / {tasks.length} tache(s)</span>
          </div>

          <div className="filters-row task-filters">
            <label className="search-filter">
              <ClipboardList size={17} />
              <input
                type="search"
                value={taskSearchQuery}
                onChange={(event) => setTaskSearchQuery(event.target.value)}
                placeholder="Rechercher une tache"
              />
            </label>
            {isAdmin && (
              <select value={taskServiceFilter} onChange={(event) => setTaskServiceFilter(event.target.value)}>
                <option value="">Tous les services</option>
                {serviceOptions.map((service) => (
                  <option key={service.value} value={service.value}>
                    {service.label}
                  </option>
                ))}
              </select>
            )}
            <select value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value)}>
              <option value="">Tous les statuts</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <select value={taskPriorityFilter} onChange={(event) => setTaskPriorityFilter(event.target.value)}>
              <option value="">Toutes les priorites</option>
              {priorityOptions.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>

          <div className="users-table">
            <div className="table-head">
              <span>Titre</span>
              <span>Projet</span>
              <span>Service</span>
              <span>Statut</span>
              <span>Priorité</span>
              <span>Progression</span>
              <span>Échéance</span>
              <span>Affecter a</span>
              <span>Actions</span>
            </div>

            {recentTasks.map((task) => {
              const taskProgress = getTaskProgressInfo(task);

              return (
              <Fragment key={task.id}>
                <div className="table-row">
                  <span>{task.title}</span>
                  <span>{projectById[String(task.project_id || "")] || task.project_id || "Sans projet"}</span>
                  <span>{serviceById[String(task.service_id || "")] || task.service_id || "Aucun"}</span>
                  <span>
                    {canUpdateTasks ? (
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
                    ) : (
                      <strong>{task.status || "Nouveau"}</strong>
                    )}
                  </span>
                  <span>{getOptionLabel(priorityOptions, task.priority)}</span>
                  <span className="task-progress-cell">
                    <strong>{taskProgress.progression}%</strong>
                    <small>
                      {taskProgress.completed_subtasks} / {taskProgress.total_subtasks} sous-taches terminees
                    </small>
                    <i>
                      <b style={{ width: `${taskProgress.progression}%` }} />
                    </i>
                  </span>
                  <span>{task.due_date || "Aucune"}</span>
                  <span className="task-actions-cell">
                    {canUpdateTasks ? (
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
                    ) : (
                      <small>{getAssignedUserName(task.assigned_to)}</small>
                    )}
                  </span>
                  <span className="task-row-actions">
                    <button type="button" onClick={() => openTaskDetails(task)}>
                      <Eye size={15} />
                      Voir
                    </button>
                    {canManageTaskDetails && (
                      <button className="secondary-action compact-action" type="button" onClick={() => handleToggleSubtasks(task.id)}>
                        <PlusCircle size={15} />
                        Sous-tâche
                      </button>
                    )}
                    {canUpdateTasks && (
                      <button type="button" onClick={() => startEditTask(task)}>
                        <Edit3 size={15} />
                        Modifier
                      </button>
                    )}
                    {canDeleteTasks && (
                      <button type="button" onClick={() => handleDeleteTask(task)} disabled={deletingTaskId === task.id}>
                        <Trash2 size={15} />
                        Supprimer
                      </button>
                    )}
                  </span>
                </div>

                {expandedTaskId === task.id && canManageTaskDetails && (
                  <div className="subtask-row">
                    <div className="subtask-panel">
                      <section className="attachments-panel">
                        <div className="subtask-panel-title">
                          <div>
                            <h4>Pieces jointes de la tache</h4>
                            <span>{(attachmentsByTask[task.id] || []).length} fichier(s)</span>
                          </div>
                          <label className="attachment-upload">
                            Ajouter
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                              onChange={(event) => handleUploadTaskAttachment(task.id, event)}
                              disabled={uploadingAttachmentKey === `task:${task.id}`}
                            />
                          </label>
                        </div>
                        <div className="attachment-list">
                          {(attachmentsByTask[task.id] || []).map((attachment) => (
                            <article className="attachment-item" key={attachment.id}>
                              <span>
                                <strong>{attachment.original_filename}</strong>
                                <small>
                                  {attachment.content_type || "Type inconnu"} - {formatFileSize(attachment.size)} -{" "}
                                  {new Date(attachment.created_at).toLocaleDateString()}
                                </small>
                              </span>
                              <button
                                className="secondary-action compact-action"
                                type="button"
                                onClick={() => handleDeleteTaskAttachment(task.id, attachment.id)}
                                disabled={deletingAttachmentId === attachment.id}
                              >
                                Supprimer
                              </button>
                            </article>
                          ))}
                          {(attachmentsByTask[task.id] || []).length === 0 && (
                            <p className="subtask-empty">Aucune piece jointe pour cette tache.</p>
                          )}
                        </div>
                      </section>

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
                              <small>Assignee a : {getAssignedUserName(subtask.assigned_to)}</small>
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
                              <section className="attachments-panel subtask-attachments">
                                <div className="subtask-panel-title">
                                  <div>
                                    <h4>Pieces jointes</h4>
                                    <span>{(attachmentsBySubtask[subtask.id] || []).length} fichier(s)</span>
                                  </div>
                                  <label className="attachment-upload">
                                    Ajouter
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                      onChange={(event) => handleUploadSubtaskAttachment(task.id, subtask.id, event)}
                                      disabled={uploadingAttachmentKey === `subtask:${subtask.id}`}
                                    />
                                  </label>
                                </div>
                                <div className="attachment-list">
                                  {(attachmentsBySubtask[subtask.id] || []).map((attachment) => (
                                    <article className="attachment-item" key={attachment.id}>
                                      <span>
                                        <strong>{attachment.original_filename}</strong>
                                        <small>
                                          {attachment.content_type || "Type inconnu"} - {formatFileSize(attachment.size)} -{" "}
                                          {new Date(attachment.created_at).toLocaleDateString()}
                                        </small>
                                      </span>
                                      <button
                                        className="secondary-action compact-action"
                                        type="button"
                                        onClick={() => handleDeleteSubtaskAttachment(task.id, subtask.id, attachment.id)}
                                        disabled={deletingAttachmentId === attachment.id}
                                      >
                                        Supprimer
                                      </button>
                                    </article>
                                  ))}
                                  {(attachmentsBySubtask[subtask.id] || []).length === 0 && (
                                    <p className="subtask-empty">Aucune piece jointe.</p>
                                  )}
                                </div>
                              </section>
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
              );
            })}

            {!loading && recentTasks.length === 0 && (
              <div className="empty-table">
                <ClipboardList size={32} />
                <strong>Aucune tâche</strong>
                <p>Créez une première tâche avec le bouton Nouvelle tâche.</p>
              </div>
            )}

            {loading && <p className="loading-line">Chargement des tâches...</p>}
          </div>
        </section>
      </section>

      {taskFormOpen && ((editingTaskId && canUpdateTasks) || (!editingTaskId && canCreateTasks)) && (
        <div className="service-modal-backdrop modal-overlay" role="presentation" onMouseDown={resetTaskForm}>
          <form
            className="service-modal modal-card task-form-modal"
            onSubmit={handleSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <div>
                <h3>{editingTaskId ? "Modifier tâche" : "Nouvelle tâche"}</h3>
                <p>{editingTaskId ? "Mettez a jour les informations de la tache." : "Creez une tache et affectez-la au bon service."}</p>
              </div>
              <button type="button" className="service-modal-close" onClick={resetTaskForm} aria-label="Fermer">
                <X size={18} />
              </button>
            </header>

            <div className="modal-body service-modal-form">
              <div className="form-grid">
                <label>
                  Titre
                  <input name="title" value={formData.title} onChange={handleChange} required />
                </label>
                <label>
                  Projet
                  <select
                    name="project_id"
                    value={formData.project_id}
                    onChange={handleChange}
                    disabled={projectsLoading}
                  >
                    <option value="">
                      {projectsLoading ? "Chargement des projets..." : "Aucun projet"}
                    </option>
                    {projectOptions.map((project) => (
                      <option key={project.value} value={project.value}>
                        {project.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Service
                  <select
                    name="service_id"
                    value={formData.service_id}
                    onChange={handleChange}
                    disabled={servicesLoading || serviceOptions.length === 0 || isManager}
                    required
                  >
                    <option value="">
                      {servicesLoading
                        ? "Chargement des services..."
                        : serviceOptions.length
                          ? "Selectionner un service"
                          : "Aucun service disponible"}
                    </option>
                    {serviceOptions.map((service) => (
                      <option key={service.value} value={service.value}>
                        {service.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Assigne a
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
                  Priorite
                  <select name="priority" value={formData.priority} onChange={handleChange}>
                    {priorityOptions.map((priority) => (
                      <option key={priority.value} value={priority.value}>{priority.label}</option>
                    ))}
                  </select>
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
                  Date echeance
                  <input name="due_date" type="date" value={formData.due_date} onChange={handleChange} />
                </label>
                <label className="form-field-wide">
                  Description
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={5} />
                </label>
              </div>
            </div>

            <footer className="modal-footer form-actions">
              <button type="button" className="secondary-action" onClick={resetTaskForm}>
                Annuler
              </button>
              <button className="primary-action" type="submit" disabled={saving}>
                {saving ? "Enregistrement..." : editingTaskId ? "Modifier la tache" : "Creer la tache"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {selectedTask && (
        <div className="service-modal-backdrop modal-overlay" role="presentation" onMouseDown={() => setSelectedTask(null)}>
          <article
            className="service-modal modal-card task-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-details-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <div>
                <h3 id="task-details-title">{selectedTask.title || selectedTask.titre || "Tache"}</h3>
                <p>{taskDetailsLoading ? "Chargement..." : "Details de la tache"}</p>
              </div>
              <button type="button" className="service-modal-close" onClick={() => setSelectedTask(null)} aria-label="Fermer">
                <X size={18} />
              </button>
            </header>

            <dl className="details-list compact modal-body">
              <div>
                <dt>Projet</dt>
                <dd>{projectById[String(selectedTask.project_id || "")] || selectedTask.project_id || "Sans projet"}</dd>
              </div>
              <div>
                <dt>Service</dt>
                <dd>{serviceById[String(selectedTask.service_id || "")] || selectedTask.service_id || "Aucun"}</dd>
              </div>
              <div>
                <dt>Affectee a</dt>
                <dd>{getAssignedUserName(selectedTask.assigned_to)}</dd>
              </div>
              <div>
                <dt>Statut</dt>
                <dd>{getOptionLabel(statusOptions, selectedTask.status || selectedTask.statut)}</dd>
              </div>
              <div>
                <dt>Priorite</dt>
                <dd>{getOptionLabel(priorityOptions, selectedTask.priority || selectedTask.priorite)}</dd>
              </div>
              <div>
                <dt>Echeance</dt>
                <dd>{toDateInputValue(selectedTask.due_date || selectedTask.date_limite) || "Aucune"}</dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{selectedTask.description || "Non renseignee"}</dd>
              </div>
            </dl>

            <section className="modal-body task-details-extra">
              <div className="project-progress project-progress--details">
                <div>
                  <span>Progression</span>
                  <strong>{getTaskProgressInfo(selectedTask).progression}%</strong>
                </div>
                <div className="progress-bar" aria-label={`Progression ${getTaskProgressInfo(selectedTask).progression}%`}>
                  <i style={{ width: `${getTaskProgressInfo(selectedTask).progression}%` }} />
                </div>
              </div>

              <div className="modal-subtasks-list">
                <h4>Sous-taches</h4>
                {(subtasksByTask[selectedTask.id] || []).length > 0 ? (
                  (subtasksByTask[selectedTask.id] || []).map((subtask) => (
                    <article key={subtask.id}>
                      <strong>{subtask.title || subtask.titre}</strong>
                      <span>{getOptionLabel(statusOptions, subtask.status || subtask.statut || "Nouveau")}</span>
                    </article>
                  ))
                ) : (
                  <p className="helper-text">Aucune sous-tache liee.</p>
                )}
              </div>
            </section>

            <footer className="modal-footer">
              {canUpdateTasks && (
                <button type="button" className="secondary-action" onClick={() => startEditTask(selectedTask)}>
                  <Edit3 size={16} />
                  Modifier
                </button>
              )}
              <button type="button" className="secondary-action" onClick={() => setSelectedTask(null)}>
                Fermer
              </button>
            </footer>
          </article>
        </div>
      )}
    </div>
  );
}

export default Tasks;
