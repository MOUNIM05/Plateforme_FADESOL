import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";
import { ROLES, getRoleLabel, normalizeRole, useAuth } from "../context/AuthContext";
import { getServiceDashboard, getServicesOverview } from "../services/dashboardService";
import { createService, deleteService, getServices } from "../services/serviceService";
import { getUsers } from "../services/userService";
import { DATA_EVENTS, dispatchDataChanged, subscribeDataEvents } from "../utils/dataEvents";

const fallbackServices = [
  { service_id: "Commercial", service_name: "Commercial" },
  { service_id: "Technique", service_name: "Technique" },
  { service_id: "Achat", service_name: "Achat" },
  { service_id: "MagasinStock", service_name: "Magasin / Stock" },
  { service_id: "ComptabiliteManagement", service_name: "Comptabilite / Management" },
].map((service) => ({
  ...service,
  is_local_fallback: true,
  total_members: 0,
  total_tasks: 0,
  tasks_in_progress: 0,
  tasks_completed: 0,
  tasks_late: 0,
  tasks_blocked: 0,
  progress: 0,
  members: [],
}));

const initialServiceForm = {
  name: "",
  description: "",
  manager_id: "",
  is_active: true,
};

const hiddenServiceNames = new Set([
  "directionrhadministration",
  "direction-rh-administration",
  "direction / rh / administration",
]);

function isVisibleService(service) {
  const serviceId = String(service.service_id || service.id || "").trim().toLowerCase();
  const serviceName = String(service.service_name || service.name || "").trim().toLowerCase();

  return !hiddenServiceNames.has(serviceId) && !hiddenServiceNames.has(serviceName);
}

function clampProgress(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function normalizeServiceRecord(service) {
  return {
    ...service,
    id: service.id || service.service_id,
    service_id: service.service_id || service.id || service.name,
    service_name: service.service_name || service.name || "Service",
    members: service.members || [],
  };
}

function getMemberName(member) {
  return (
    member.full_name ||
    [member.prenom || member.first_name, member.nom || member.last_name].filter(Boolean).join(" ") ||
    member.email ||
    "Utilisateur"
  );
}

function splitMembers(members = []) {
  return members.reduce(
    (groups, member) => {
      const role = normalizeRole(member.role);

      if (role === ROLES.MANAGER) {
        groups.managers.push(member);
      } else if (role === ROLES.EMPLOYEE) {
        groups.employees.push(member);
      } else {
        groups.others.push(member);
      }

      return groups;
    },
    { managers: [], employees: [], others: [] }
  );
}

function memberKey(member, index) {
  return member.id || member.email || `${getMemberName(member)}-${index}`;
}

function Services() {
  const { hasPermission } = useAuth();
  const canCreateServices = hasPermission("services.create");
  const canDeleteServices = hasPermission("services.delete");
  const [services, setServices] = useState([]);
  const [managerOptions, setManagerOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState(initialServiceForm);
  const [saving, setSaving] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadServices() {
    setLoading(true);
    setWarning("");

    try {
      const [overviewResult, servicesResult, usersResult] = await Promise.allSettled([
        getServicesOverview(),
        getServices(),
        getUsers(),
      ]);
      const overview = overviewResult.status === "fulfilled" ? overviewResult.value : [];
      const registryServices = servicesResult.status === "fulfilled" ? servicesResult.value : [];
      const baseServices = (Array.isArray(overview) && overview.length
        ? overview
        : Array.isArray(registryServices) && registryServices.length
          ? registryServices
          : fallbackServices)
        .map(normalizeServiceRecord)
        .filter(isVisibleService);
      const detailResults = await Promise.allSettled(
        baseServices.map((service) => getServiceDashboard(service.service_id))
      );

      const servicesWithDetails = baseServices.map((service, index) => {
        const detailResult = detailResults[index];

        if (detailResult.status === "fulfilled" && detailResult.value) {
          return normalizeServiceRecord({ ...service, ...detailResult.value });
        }

        return { ...service, members: [] };
      });

      setServices(servicesWithDetails);

      if (usersResult.status === "fulfilled") {
        const users = Array.isArray(usersResult.value) ? usersResult.value : [];
        setManagerOptions(users.filter((user) => normalizeRole(user.role) === ROLES.MANAGER));
      }

      if (!Array.isArray(overview) || overview.length === 0) {
        setWarning("Données services temporairement indisponibles. Affichage local par défaut.");
      }
    } catch (error) {
      console.error("Load services dashboard error:", error);
      setServices(fallbackServices.filter(isVisibleService));
      setWarning("Impossible de charger les services depuis le backend. Affichage local par défaut.");
    } finally {
      setLoading(false);
    }
  }

  function handleServiceFormChange(event) {
    const { checked, name, type, value } = event.target;
    setServiceForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function openCreateModal() {
    setNotice("");
    setWarning("");
    setServiceForm(initialServiceForm);
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (!saving) {
      setIsCreateModalOpen(false);
      setServiceForm(initialServiceForm);
    }
  }

  async function handleCreateService(event) {
    event.preventDefault();
    setNotice("");
    setWarning("");

    if (!serviceForm.name.trim()) {
      setWarning("Le nom du service est obligatoire.");
      return;
    }

    setSaving(true);

    try {
      await createService({
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim() || null,
        manager_id: serviceForm.manager_id || null,
        is_active: serviceForm.is_active,
      });
      setNotice("Service ajouté avec succès.");
      setIsCreateModalOpen(false);
      setServiceForm(initialServiceForm);
      await loadServices();
      dispatchDataChanged(DATA_EVENTS.SERVICES_CHANGED);
    } catch (error) {
      console.error("Create service error:", error);
      setWarning(error.response?.data?.detail || "Impossible d'ajouter le service.");
    } finally {
      setSaving(false);
    }
  }

  function requestDeleteService(service) {
    setNotice("");
    setWarning("");
    setServiceToDelete(service);
  }

  async function handleDeleteService() {
    if (!serviceToDelete) {
      return;
    }

    setDeleting(true);
    setNotice("");
    setWarning("");

    try {
      await deleteService(serviceToDelete.id || serviceToDelete.service_id);
      setNotice("Service supprimé avec succès.");
      setServiceToDelete(null);
      await loadServices();
      dispatchDataChanged(DATA_EVENTS.SERVICES_CHANGED);
    } catch (error) {
      console.error("Delete service error:", error);
      const detail = error.response?.data?.detail || "";
      const blockedMessage = "Ce service ne peut pas être supprimé car il est lié à des utilisateurs, projets ou tâches.";

      setWarning(detail.includes("lie") || error.response?.status === 400 ? blockedMessage : "Impossible de supprimer le service.");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    return subscribeDataEvents(
      [DATA_EVENTS.USERS_CHANGED, DATA_EVENTS.PROJECTS_CHANGED, DATA_EVENTS.TASKS_CHANGED],
      loadServices
    );
  }, []);

  const totals = useMemo(() => {
    return services.reduce(
      (acc, service) => {
        acc.services += 1;
        acc.members += service.total_members || service.members?.length || 0;
        acc.tasks += service.total_tasks || 0;
        acc.completed += service.tasks_completed || 0;
        return acc;
      },
      { services: 0, members: 0, tasks: 0, completed: 0 }
    );
  }, [services]);

  return (
    <div className="dashboard-page services-page">
      <div className="board-toolbar">
        <div>
          <h2>Services</h2>
          <p>Suivi de l'avancement, des managers et des employés par service.</p>
        </div>
        <div className="toolbar-actions">
          {canCreateServices && (
            <button type="button" className="primary-toolbar-action" onClick={openCreateModal}>
              <Plus size={17} />
              Ajouter un service
            </button>
          )}
          <button type="button" className="secondary-action" onClick={loadServices}>
            <RefreshCw size={17} />
            Actualiser
          </button>
        </div>
      </div>

      {notice && <p className="notice success">{notice}</p>}
      {warning && <p className="notice warning">{warning}</p>}

      <section className="services-summary-grid" aria-label="Résumé services">
        <article className="workspace-panel service-summary-card">
          <Building2 size={20} />
          <span>Services</span>
          <strong>{totals.services}</strong>
        </article>
        <article className="workspace-panel service-summary-card">
          <UsersRound size={20} />
          <span>Membres</span>
          <strong>{totals.members}</strong>
        </article>
        <article className="workspace-panel service-summary-card">
          <Workflow size={20} />
          <span>Total tâches</span>
          <strong>{totals.tasks}</strong>
        </article>
        <article className="workspace-panel service-summary-card">
          <CheckCircle2 size={20} />
          <span>Terminées</span>
          <strong>{totals.completed}</strong>
        </article>
      </section>

      {loading && <p className="loading-line">Chargement des services...</p>}

      {!loading && (
        <section className="services-admin-grid" aria-label="Services Fadesol">
          {services.map((service) => {
            const progress = clampProgress(service.progress);
            const members = splitMembers(service.members);

            return (
              <article key={service.service_id} className="workspace-panel service-admin-card">
                <header className="service-admin-card__header">
                  <div>
                    <span className="service-admin-card__eyebrow">Service</span>
                    <h3>{service.service_name}</h3>
                    <p>{service.total_members || service.members?.length || 0} membre(s)</p>
                  </div>
                  <div className="service-admin-card__actions">
                    <strong>{progress}%</strong>
                    {canDeleteServices && !service.is_local_fallback && (
                      <button
                        type="button"
                        className="service-delete-button"
                        onClick={() => requestDeleteService(service)}
                        aria-label={`Supprimer ${service.service_name}`}
                      >
                        <Trash2 size={16} />
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>
                </header>

                <div className="service-admin-progress">
                  <div>
                    <span>Avancement</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="progress-bar" aria-label={`Avancement ${progress}%`}>
                    <i style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="service-admin-stats">
                  <div><Workflow size={15} /><span>Tâches</span><strong>{service.total_tasks || 0}</strong></div>
                  <div><Clock3 size={15} /><span>En cours</span><strong>{service.tasks_in_progress || 0}</strong></div>
                  <div><CheckCircle2 size={15} /><span>Terminées</span><strong>{service.tasks_completed || 0}</strong></div>
                  <div><ShieldCheck size={15} /><span>Bloquées</span><strong>{service.tasks_blocked || 0}</strong></div>
                </div>

                <div className="service-members-columns">
                  <section>
                    <h4>Manager</h4>
                    {members.managers.length ? (
                      members.managers.map((member, index) => (
                        <div key={memberKey(member, index)} className="service-member-chip is-manager">
                          <span>{getMemberName(member)}</span>
                          <small>{member.email}</small>
                        </div>
                      ))
                    ) : (
                      <p>Aucun manager affecté.</p>
                    )}
                  </section>

                  <section>
                    <h4>Employees</h4>
                    {members.employees.length ? (
                      members.employees.map((member, index) => (
                        <div key={memberKey(member, index)} className="service-member-chip">
                          <span>{getMemberName(member)}</span>
                          <small>{member.email}</small>
                        </div>
                      ))
                    ) : (
                      <p>Aucun employé affecté.</p>
                    )}
                  </section>

                  {members.others.length > 0 && (
                    <section>
                      <h4>Autres rôles</h4>
                      {members.others.map((member, index) => (
                        <div key={memberKey(member, index)} className="service-member-chip">
                          <span>{getMemberName(member)}</span>
                          <small>{getRoleLabel(member.role)}</small>
                        </div>
                      ))}
                    </section>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {isCreateModalOpen && (
        <div className="service-modal-backdrop" role="presentation">
          <article className="service-modal" role="dialog" aria-modal="true" aria-labelledby="create-service-title">
            <header>
              <div>
                <h3 id="create-service-title">Ajouter un service</h3>
                <p>Créer un nouveau service Fadesol.</p>
              </div>
              <button type="button" className="service-modal-close" onClick={closeCreateModal} aria-label="Fermer">
                <X size={18} />
              </button>
            </header>

            <form className="service-modal-form" onSubmit={handleCreateService}>
              <label>
                Nom du service
                <input
                  name="name"
                  value={serviceForm.name}
                  onChange={handleServiceFormChange}
                  placeholder="Ex: Support client"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  value={serviceForm.description}
                  onChange={handleServiceFormChange}
                  rows={4}
                  placeholder="Description du service"
                />
              </label>

              <label>
                Responsable / Manager
                <select name="manager_id" value={serviceForm.manager_id} onChange={handleServiceFormChange}>
                  <option value="">Aucun responsable</option>
                  {managerOptions.map((manager) => (
                    <option key={manager.uuid || manager.id} value={manager.uuid || manager.id}>
                      {getMemberName(manager)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="service-status-toggle">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={serviceForm.is_active}
                  onChange={handleServiceFormChange}
                />
                Service actif
              </label>

              <footer>
                <button type="button" className="secondary-action" onClick={closeCreateModal} disabled={saving}>
                  Annuler
                </button>
                <button type="submit" className="primary-action" disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </footer>
            </form>
          </article>
        </div>
      )}

      {serviceToDelete && (
        <div className="service-modal-backdrop" role="presentation">
          <article className="service-modal service-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-service-title">
            <header>
              <div>
                <h3 id="delete-service-title">Supprimer le service</h3>
                <p>{serviceToDelete.service_name}</p>
              </div>
              <button
                type="button"
                className="service-modal-close"
                onClick={() => !deleting && setServiceToDelete(null)}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </header>
            <p className="service-confirm-copy">Voulez-vous vraiment supprimer ce service ?</p>
            <footer>
              <button type="button" className="secondary-action" onClick={() => setServiceToDelete(null)} disabled={deleting}>
                Annuler
              </button>
              <button type="button" className="service-danger-action" onClick={handleDeleteService} disabled={deleting}>
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </footer>
          </article>
        </div>
      )}
    </div>
  );
}

export default Services;
