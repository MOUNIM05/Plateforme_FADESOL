// Page Projets : gestion du portefeuille, filtres, affectation et suivi d'avancement.
import { useEffect, useMemo, useState } from "react";
import { Edit3, Eye, FolderKanban, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from "../services/projectService";
import { useAuth } from "../context/AuthContext";
import {
  getFadesolServiceLabel,
  getFadesolServiceValue,
  getFadesolServices,
} from "../services/serviceFadesolService";
import { getUsers } from "../services/userService";
import { DATA_EVENTS, dispatchDataChanged, subscribeDataEvents } from "../utils/dataEvents";

const emptyProject = {
  titre: "",
  description: "",
  service_id: "",
  responsable_id: "",
  priorite: "Normale",
  statut: "Nouveau",
  date_debut: "",
  date_limite: "",
  progression: 0,
};

const priorityOptions = ["Faible", "Normale", "Haute", "Urgente"];
const progressOptions = [0, 25, 50, 75, 100];
const statusOptions = [
  { label: "Nouveau", value: "Nouveau" },
  { label: "En cours", value: "EnCours" },
  { label: "En attente", value: "EnAttente" },
  { label: "Bloqué", value: "Bloque" },
  { label: "Terminé", value: "Termine" },
  { label: "Annulé", value: "Annule" },
];

function getLoadErrorMessage(error, fallback) {
  // Traduit les erreurs API frequentes en messages comprehensibles pour l'utilisateur.
  const status = error?.response?.status;

  if (!error?.response) {
    return "Backend indisponible. Vérifiez que l'API Gateway est démarrée.";
  }

  if (status === 401) {
    return "Session expirée. Déconnectez-vous puis reconnectez-vous.";
  }

  if (status === 403) {
    return "Votre rôle ne permet pas de charger cette ressource.";
  }

  return error?.response?.data?.detail || fallback;
}

function normalizeProjectPayload(formData) {
  // Prepare le formulaire projet avant l'appel API.
  return {
    titre: formData.titre.trim(),
    description: formData.description.trim() || null,
    service_id: formData.service_id,
    responsable_id: formData.responsable_id.trim() || null,
    priorite: formData.priorite,
    statut: formData.statut,
    date_debut: formData.date_debut || null,
    date_limite: formData.date_limite || null,
    progression: Number(formData.progression) || 0,
  };
}

function getServiceName(services, serviceId) {
  const service = services.find((item) => getFadesolServiceValue(item) === String(serviceId));

  return service ? getFadesolServiceLabel(service) : serviceId || "Non affecte";
}

function normalizeServiceKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function getUserServiceValues(user) {
  return [
    user?.id_service,
    user?.service_id,
    user?.service,
    user?.service_name,
    user?.nom_service,
  ].filter((value) => value !== undefined && value !== null && value !== "");
}

function serviceMatchesManager(service, managerServiceValues) {
  const managerKeys = new Set(managerServiceValues.map(normalizeServiceKey));

  return [
    service?.id,
    service?.uuid,
    service?.name,
    service?.nom,
    service?.nom_service,
    service?.libelle,
  ].some((value) => managerKeys.has(normalizeServiceKey(value)));
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

function getStatusLabel(statusValue) {
  return statusOptions.find((status) => status.value === statusValue)?.label || statusValue || "Non défini";
}

function getStatusClass(statusValue) {
  const normalized = String(statusValue || "").toLowerCase();

  if (normalized.includes("termine")) {
    return "is-done";
  }

  if (normalized.includes("cours")) {
    return "is-progress";
  }

  if (normalized.includes("bloque")) {
    return "is-blocked";
  }

  if (normalized.includes("attente")) {
    return "is-waiting";
  }

  return "is-new";
}

function getPriorityClass(priorityValue) {
  return `is-${String(priorityValue || "normale").toLowerCase()}`;
}

function getResponsibleName(users, responsibleId) {
  if (!responsibleId) {
    return "Non assigné";
  }

  const user = users.find((item) => String(item.id) === String(responsibleId));

  if (!user) {
    return responsibleId;
  }

  const fullName = [user.first_name || user.prenom, user.last_name || user.nom]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user.email || responsibleId;
}

function clampProgress(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function getProgressFromProjectStatus(status, existingProgress = 0) {
  const normalized = normalizeServiceKey(status);

  if (["nouveau", "afaire"].includes(normalized)) {
    return 0;
  }

  if (normalized.includes("encours")) {
    return 50;
  }

  if (normalized.includes("bloqu") || normalized.includes("attente")) {
    return 25;
  }

  if (normalized.startsWith("termin") || normalized === "done") {
    return 100;
  }

  if (normalized.startsWith("annul")) {
    return 0;
  }

  return clampProgress(existingProgress);
}

function getProjectProgress(project) {
  const storedProgress = project?.progression ?? project?.progress;

  if (storedProgress !== undefined && storedProgress !== null && storedProgress !== "") {
    return clampProgress(storedProgress);
  }

  return getProgressFromProjectStatus(project?.statut || project?.status, 0);
}

function formatDate(value) {
  if (!value) {
    return "Non définie";
  }

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

function Projects() {
  // Les permissions definissent les actions disponibles sur les projets.
  const { currentUser, hasPermission } = useAuth();
  const isManager = currentUser?.role === "Manager";
  const managerServiceValues = useMemo(() => getUserServiceValues(currentUser), [currentUser]);
  const canCreateProjects = hasPermission("projects.create");
  const canUpdateProjects = hasPermission("projects.update");
  const canDeleteProjects = hasPermission("projects.delete");
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(emptyProject);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProgressProjectId, setSavingProgressProjectId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  async function loadData({ showLoading = true } = {}) {
    // Charge en parallele projets, services et utilisateurs pour alimenter la page.
    if (showLoading) {
      setLoading(true);
    }

    setError("");
    setWarning("");

    const [projectResult, serviceResult, userResult] = await Promise.allSettled([
      getProjects({ service_id: serviceFilter, status: statusFilter }),
      getFadesolServices(),
      getUsers(),
    ]);

    if (projectResult.status === "fulfilled") {
      const projectData = Array.isArray(projectResult.value) ? projectResult.value : [];
      setProjects(projectData);
      setSelectedProject((current) => {
        if (!current) {
          return null;
        }

        return projectData.find((project) => project.id === current.id) || null;
      });
    } else {
      console.error("Load projects error:", projectResult.reason);
      setProjects([]);
      setSelectedProject(null);
      setError(getLoadErrorMessage(projectResult.reason, "Les projets sont temporairement indisponibles."));
    }

    if (serviceResult.status === "fulfilled") {
      const serviceData = Array.isArray(serviceResult.value) ? serviceResult.value : [];
      const visibleServices = isManager
        ? serviceData.filter((service) => serviceMatchesManager(service, managerServiceValues))
        : serviceData;
      setServices(visibleServices);
      setFormData((current) => ({
        ...current,
        service_id: current.service_id || getFadesolServiceValue(visibleServices[0]) || "",
      }));
    } else {
      console.error("Load services error:", serviceResult.reason);
      setServices([]);
      setWarning((current) =>
        [current, getLoadErrorMessage(serviceResult.reason, "Impossible de charger les services.")]
          .filter(Boolean)
          .join(" ")
      );
    }

    if (userResult.status === "fulfilled") {
      const userData = Array.isArray(userResult.value) ? userResult.value : [];
      setUsers(
        isManager
          ? userData.filter((user) => {
              const userServiceKeys = getUserServiceValues(user).map(normalizeServiceKey);
              return managerServiceValues.map(normalizeServiceKey).some((serviceKey) => userServiceKeys.includes(serviceKey));
            })
          : userData
      );
    } else {
      console.error("Load users error:", userResult.reason);
      setUsers([]);
      setWarning((current) =>
        [current, getLoadErrorMessage(userResult.reason, "Impossible de charger les responsables.")]
          .filter(Boolean)
          .join(" ")
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    // Rechargement initial et rechargement quand les filtres serveur changent.
    loadData();
  }, [serviceFilter, statusFilter, isManager, managerServiceValues]);

  useEffect(() => {
    // Les changements de services ou utilisateurs dans d'autres pages rafraichissent les listes.
    return subscribeDataEvents([DATA_EVENTS.SERVICES_CHANGED, DATA_EVENTS.USERS_CHANGED], () => {
      loadData({ showLoading: false });
    });
  }, [serviceFilter, statusFilter, isManager, managerServiceValues]);

  const serviceById = useMemo(() => {
    return services.reduce((acc, service) => {
      acc[getFadesolServiceValue(service)] = getFadesolServiceLabel(service);
      return acc;
    }, {});
  }, [services]);

  const filteredProjects = useMemo(() => {
    // Filtrage local par recherche texte, en complement des filtres envoyes a l'API.
    const query = searchQuery.trim().toLowerCase();
    const managerServiceKeys = managerServiceValues.map(normalizeServiceKey);

    return projects.filter((project) => {
      const serviceName = serviceById[project.service_id] || project.service_id || "";
      const projectServiceKeys = [
        project.service_id,
        project.id_service,
        project.service?.id,
        project.service?.uuid,
        project.service,
        project.nom_service,
        project.service_name,
        serviceName,
      ].map(normalizeServiceKey);

      if (isManager && !managerServiceKeys.some((serviceKey) => projectServiceKeys.includes(serviceKey))) {
        return false;
      }

      const responsibleName = getResponsibleName(users, project.responsable_id);
      const searchable = [
        project.titre,
        project.description,
        serviceName,
        getStatusLabel(project.statut),
        responsibleName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return query === "" || searchable.includes(query);
    });
  }, [isManager, managerServiceValues, projects, searchQuery, serviceById, users]);

  const projectStats = useMemo(() => {
    const normalizeStatus = (status) =>
      String(status || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();

    return {
      total: projects.length,
      inProgress: projects.filter((project) => normalizeStatus(project.statut).includes("encours")).length,
      completed: projects.filter((project) => normalizeStatus(project.statut).startsWith("termin")).length,
      blocked: projects.filter((project) => normalizeStatus(project.statut).includes("bloqu")).length,
    };
  }, [projects]);

  const currentUserIds = useMemo(() => getUserIdentityValues(currentUser).map(String), [currentUser]);

  function canAdjustProjectProgress(project) {
    if (!canUpdateProjects || !project) {
      return false;
    }

    if (["admin", "administrateur"].includes(normalizeServiceKey(currentUser?.role))) {
      return true;
    }

    if (!isManager) {
      return false;
    }

    const projectServiceName = serviceById[project.service_id] || "";
    const projectServiceKeys = [
      project.service_id,
      project.id_service,
      project.service?.id,
      project.service?.uuid,
      project.service,
      project.nom_service,
      project.service_name,
      projectServiceName,
    ].map(normalizeServiceKey);
    const managerServiceKeys = managerServiceValues.map(normalizeServiceKey);
    const sameService = managerServiceKeys.some((serviceKey) => projectServiceKeys.includes(serviceKey));
    const responsibleMatches = currentUserIds.includes(String(project.responsable_id || project.responsable || ""));

    return sameService || responsibleMatches;
  }

  function handleChange(event) {
    // Met a jour le formulaire projet champ par champ.
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetForm() {
    // Revient en mode creation avec un service par defaut si disponible.
    setShowProjectDetails(false);
    setProjectFormOpen(false);
    setEditingProjectId(null);
    setFormData({
      ...emptyProject,
      service_id: getFadesolServiceValue(services[0]) || "",
    });
  }

  function openCreateProject() {
    setShowProjectDetails(false);
    setEditingProjectId(null);
    setFormData({
      ...emptyProject,
      service_id: getFadesolServiceValue(services[0]) || "",
    });
    setProjectFormOpen(true);
    setMessage("");
    setError("");
  }

  function viewProject(project) {
    // Ouvre la modale de consultation d'un projet.
    setSelectedProject(project);
    setShowProjectDetails(true);
    setMessage("");
    setError("");
  }

  function startEdit(project) {
    // Passe en mode edition apres controle de permission.
    if (!canUpdateProjects) {
      setError("Vous n'avez pas l'autorisation de modifier les projets.");
      return;
    }

    setShowProjectDetails(false);
    setEditingProjectId(project.id);
    setProjectFormOpen(true);
    setMessage("");
    setError("");
    setFormData({
      titre: project.titre || "",
      description: project.description || "",
      service_id: project.service_id || "",
      responsable_id: project.responsable_id || "",
      priorite: project.priorite || "Normale",
      statut: project.statut || "Nouveau",
      date_debut: project.date_debut || "",
      date_limite: project.date_limite || "",
      progression: project.progression ?? 0,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if ((editingProjectId && !canUpdateProjects) || (!editingProjectId && !canCreateProjects)) {
      setError("Vous n'avez pas l'autorisation d'enregistrer ce projet.");
      return;
    }

    setSaving(true);

    try {
      if (editingProjectId) {
        const updatedProject = await updateProject(editingProjectId, normalizeProjectPayload(formData));
        setSelectedProject((current) => (current?.id === editingProjectId ? updatedProject : current));
        setShowProjectDetails(false);
        setMessage("Projet modifié avec succès.");
      } else {
        await createProject(normalizeProjectPayload(formData));
        setSelectedProject(null);
        setShowProjectDetails(false);
        setMessage("Projet créé avec succès.");
      }

      resetForm();
      await loadData({ showLoading: false });
      dispatchDataChanged(DATA_EVENTS.PROJECTS_CHANGED);
    } catch (err) {
      console.error("Save project error:", err);
      setError(err.response?.data?.detail || "Erreur pendant l'enregistrement du projet.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(project) {
    if (!canDeleteProjects) {
      setError("Vous n'avez pas l'autorisation de supprimer les projets.");
      return;
    }

    const confirmed = window.confirm(`Confirmer la suppression du projet "${project.titre}" ?`);

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await deleteProject(project.id);
      setSelectedProject((current) => (current?.id === project.id ? null : current));
      setShowProjectDetails(false);
      setMessage("Projet supprimé avec succès.");
      await loadData({ showLoading: false });
      dispatchDataChanged(DATA_EVENTS.PROJECTS_CHANGED);
    } catch (err) {
      console.error("Delete project error:", err);
      setError(err.response?.data?.detail || "Erreur pendant la suppression du projet.");
    }
  }

  async function handleProjectProgressChange(project, value) {
    if (!canAdjustProjectProgress(project)) {
      setError("Vous n'avez pas l'autorisation de modifier la progression de ce projet.");
      return;
    }

    const nextProgress = clampProgress(value);
    setError("");
    setMessage("");
    setSavingProgressProjectId(project.id);

    try {
      const updatedProject = await updateProject(project.id, { progression: nextProgress });
      const mergedProject = { ...project, ...updatedProject, progression: nextProgress };

      setProjects((current) => current.map((item) => (item.id === project.id ? { ...item, ...mergedProject } : item)));
      setSelectedProject((current) => (current?.id === project.id ? { ...current, ...mergedProject } : current));
      setMessage("Progression du projet mise a jour.");
      dispatchDataChanged(DATA_EVENTS.PROJECTS_CHANGED);
    } catch (err) {
      console.error("Update project progress error:", err);
      setError(err.response?.data?.detail || "Impossible de modifier la progression du projet.");
    } finally {
      setSavingProgressProjectId("");
    }
  }

  return (
    <div className="dashboard-page projects-page">
      <div className="board-toolbar">
        <div>
          <h2>Gestion des projets</h2>
          <p>Consultez, filtrez et suivez l'avancement des projets Fadesol.</p>
        </div>
        <div className="toolbar-actions page-actions">
          {canCreateProjects && (
            <button type="button" className="primary-action" onClick={openCreateProject}>
              <Plus size={17} />
              Nouveau projet
            </button>
          )}
          <button type="button" className="secondary-action" onClick={() => loadData()}>
            <RefreshCw size={17} />
            Actualiser
          </button>
        </div>
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}
      {warning && <p className="notice warning">{warning}</p>}

      <section className="users-stats-grid" aria-label="Resume projets">
        <article className="workspace-panel user-stat-card">
          <FolderKanban size={20} />
          <span>Total projets</span>
          <strong>{projectStats.total}</strong>
        </article>
        <article className="workspace-panel user-stat-card">
          <RefreshCw size={20} />
          <span>En cours</span>
          <strong>{projectStats.inProgress}</strong>
        </article>
        <article className="workspace-panel user-stat-card">
          <Edit3 size={20} />
          <span>Termines</span>
          <strong>{projectStats.completed}</strong>
        </article>
        <article className="workspace-panel user-stat-card">
          <X size={20} />
          <span>Bloques</span>
          <strong>{projectStats.blocked}</strong>
        </article>
      </section>

      <section className="management-grid page-stack">
        <div className="user-side-stack page-section-full">
          <section className="workspace-panel user-list-panel list-card-full page-list-card">
            <div className="panel-title">
              <h3>Liste des projets</h3>
              <span>{filteredProjects.length} projet(s)</span>
            </div>

            <div className="project-filters">
              <label className="search-filter">
                <Search size={16} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Rechercher projet, service ou responsable"
                />
              </label>

              <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
                <option value="">Tous les services</option>
                {services.map((service) => (
                  <option key={getFadesolServiceValue(service)} value={getFadesolServiceValue(service)}>
                    {getFadesolServiceLabel(service)}
                  </option>
                ))}
              </select>

              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">Tous les statuts</option>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {loading && <p className="loading-line">Chargement des projets...</p>}

            {!loading && filteredProjects.length === 0 && (
              <div className="empty-table">
                <FolderKanban size={34} />
                <strong>Aucun projet trouvé.</strong>
                <p>Créez un nouveau projet pour commencer le suivi.</p>
              </div>
            )}

            {!loading && filteredProjects.length > 0 && (
              <div className="project-tracking-list">
                {filteredProjects.map((project) => {
                  const progress = getProjectProgress(project);

                  return (
                    <article key={project.id} className="project-tracking-card">
                      <div className="project-card-main">
                        <div className="project-card-icon">
                          <FolderKanban size={20} />
                        </div>
                        <div>
                          <strong>{project.titre}</strong>
                          <p>{project.description || "Aucune description"}</p>
                          <div className="project-card-meta">
                            <span>{serviceById[project.service_id] || project.service_id || "Service non affecté"}</span>
                            <span>{getResponsibleName(users, project.responsable_id)}</span>
                            <time>{formatDate(project.date_creation)}</time>
                          </div>
                        </div>
                      </div>

                      <div className="project-card-status">
                        <mark className={`project-status-badge ${getStatusClass(project.statut)}`}>
                          {getStatusLabel(project.statut)}
                        </mark>
                        <span className={`priority-pill ${getPriorityClass(project.priorite)}`}>
                          {project.priorite || "Normale"}
                        </span>
                      </div>

                      <div className="project-progress">
                        <div>
                          <span>Progression</span>
                          <strong>{progress}%</strong>
                        </div>
                        <div className="progress-bar" aria-label={`Progression ${progress}%`}>
                          <i style={{ width: `${progress}%` }} />
                        </div>
                        {canAdjustProjectProgress(project) && (
                          <label className="progress-editor">
                            <span>Modifier</span>
                            <select
                              value={progress}
                              onChange={(event) => handleProjectProgressChange(project, event.target.value)}
                              disabled={savingProgressProjectId === project.id}
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

                      <span className="row-actions">
                        <button type="button" onClick={() => viewProject(project)}>
                          <Eye size={15} />
                          Voir
                        </button>
                        {canUpdateProjects && (
                          <button type="button" onClick={() => startEdit(project)}>
                            <Edit3 size={15} />
                            Modifier
                          </button>
                        )}
                        {canDeleteProjects && (
                          <button type="button" onClick={() => handleDelete(project)}>
                            <Trash2 size={15} />
                            Supprimer
                          </button>
                        )}
                      </span>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </section>

      {projectFormOpen && (
        <div className="service-modal-backdrop modal-overlay" role="presentation" onMouseDown={resetForm}>
          <form
            className="service-modal modal-card project-form-modal"
            onSubmit={handleSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <div>
                <h3>{editingProjectId ? "Modifier projet" : "Nouveau projet"}</h3>
                <p>{editingProjectId ? "Mettez a jour les informations du projet." : "Renseignez les informations principales du projet."}</p>
              </div>
              <button type="button" className="service-modal-close" onClick={resetForm} aria-label="Fermer">
                <X size={18} />
              </button>
            </header>

            <div className="modal-body service-modal-form">
              <div className="form-grid">
                <label>
                  Titre
                  <input
                    name="titre"
                    value={formData.titre}
                    onChange={handleChange}
                    placeholder="Ex: Installation solaire client"
                    required
                  />
                </label>
                <label>
                  Service
                  <select name="service_id" value={formData.service_id} onChange={handleChange} required>
                    <option value="">Selectionner un service</option>
                    {services.map((service) => (
                      <option key={getFadesolServiceValue(service)} value={getFadesolServiceValue(service)}>
                        {getFadesolServiceLabel(service)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field-wide">
                  Description
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Objectif, contexte et perimetre du projet"
                    rows={5}
                  />
                </label>
                <label>
                  Responsable
                  <select name="responsable_id" value={formData.responsable_id} onChange={handleChange}>
                    <option value="">Non assigne</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {getResponsibleName(users, user.id)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Priorite
                  <select name="priorite" value={formData.priorite} onChange={handleChange}>
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Statut
                  <select name="statut" value={formData.statut} onChange={handleChange}>
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Date debut
                  <input name="date_debut" type="date" value={formData.date_debut} onChange={handleChange} />
                </label>
                <label>
                  Date echeance
                  <input name="date_limite" type="date" value={formData.date_limite} onChange={handleChange} />
                </label>
                <label>
                  Progression
                  <input
                    name="progression"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progression}
                    onChange={handleChange}
                  />
                </label>
              </div>
            </div>

            <footer className="modal-footer form-actions">
              <button type="button" className="secondary-action" onClick={resetForm}>
                Annuler
              </button>
              <button type="submit" className="primary-action" disabled={saving || !services.length}>
                {editingProjectId ? <Edit3 size={17} /> : <Plus size={17} />}
                {saving ? "Enregistrement..." : editingProjectId ? "Modifier projet" : "Creer projet"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {showProjectDetails && selectedProject && (
        <div className="service-modal-backdrop modal-overlay" role="presentation" onMouseDown={() => setShowProjectDetails(false)}>
          <article
            className="service-modal modal-card service-details-modal project-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-details-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <div>
                <h3 id="project-details-title">Details projet</h3>
                <p>ID #{selectedProject.id.slice(0, 8)}</p>
              </div>
              <button type="button" className="service-modal-close" onClick={() => setShowProjectDetails(false)} aria-label="Fermer">
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              <div className="selected-profile-card__head">
                <div className="profile-avatar-large">
                  <FolderKanban size={24} />
                </div>
                <div>
                  <h4>{selectedProject.titre}</h4>
                  <p>{getServiceName(services, selectedProject.service_id)}</p>
                </div>
              </div>

              <dl className="details-list compact">
                <div>
                  <dt>Description</dt>
                  <dd>{selectedProject.description || "Non renseignee"}</dd>
                </div>
                <div>
                  <dt>Statut</dt>
                  <dd>{getStatusLabel(selectedProject.statut)}</dd>
                </div>
                <div>
                  <dt>Priorite</dt>
                  <dd>{selectedProject.priorite}</dd>
                </div>
                <div>
                  <dt>Responsable</dt>
                  <dd>{getResponsibleName(users, selectedProject.responsable_id)}</dd>
                </div>
                <div>
                  <dt>Dates</dt>
                  <dd>{formatDate(selectedProject.date_debut)} {"->"} {formatDate(selectedProject.date_limite)}</dd>
                </div>
                <div>
                  <dt>Progression</dt>
                  <dd>{getProjectProgress(selectedProject)}%</dd>
                </div>
              </dl>

              <div className="project-progress project-progress--details">
                <div>
                  <span>Avancement</span>
                  <strong>{getProjectProgress(selectedProject)}%</strong>
                </div>
                <div className="progress-bar" aria-label={`Progression ${getProjectProgress(selectedProject)}%`}>
                  <i style={{ width: `${getProjectProgress(selectedProject)}%` }} />
                </div>
              </div>
            </div>

            <footer className="modal-footer">
              {canUpdateProjects && (
                <button type="button" className="secondary-action" onClick={() => startEdit(selectedProject)}>
                  <Edit3 size={16} />
                  Modifier
                </button>
              )}
              {canDeleteProjects && (
                <button type="button" className="logout-action" onClick={() => handleDelete(selectedProject)}>
                  <Trash2 size={16} />
                  Supprimer
                </button>
              )}
            </footer>
          </article>
        </div>
      )}
    </div>
  );
}

export default Projects;
