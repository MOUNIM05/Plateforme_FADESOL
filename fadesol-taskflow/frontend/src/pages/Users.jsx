// Page d'administration des utilisateurs : creation, edition, suppression et details.
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Edit3,
  Eye,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { ROLES, getInitials, getRoleLabel, normalizeRole, useAuth } from "../context/AuthContext";
import {
  createUser,
  deleteUser,
  getUserById,
  getUserPermissions,
  getUsers,
  updateUser,
} from "../services/userService";
import { DATA_EVENTS, dispatchDataChanged } from "../utils/dataEvents";

const emptyForm = {
  prenom: "",
  nom: "",
  email: "",
  password: "",
  role: ROLES.EMPLOYEE,
  id_service: "",
  est_actif: true,
};

const roleOptions = [
  { label: "Administrateur", value: ROLES.ADMIN },
  { label: "Manager", value: ROLES.MANAGER },
  { label: "Employé", value: ROLES.EMPLOYEE },
];

const serviceOptions = [
  { label: "Aucun service", value: "" },
  { label: "Commercial", value: "Commercial" },
  { label: "Technique", value: "Technique" },
  { label: "Achat", value: "Achat" },
  { label: "Magasin Stock", value: "MagasinStock" },
  { label: "Comptabilité Management", value: "ComptabiliteManagement" },
  { label: "Direction RH Administration", value: "DirectionRHAdministration" },
];

function normalizePayload(formData, includePassword = true) {
  // Convertit le formulaire React en payload attendu par user_service.
  const payload = {
    prenom: formData.prenom.trim(),
    nom: formData.nom.trim(),
    email: formData.email.trim(),
    role: formData.role,
    id_service: formData.id_service === "" ? null : formData.id_service,
    service: formData.id_service === "" ? null : formData.id_service,
    est_actif: formData.est_actif,
  };

  if (includePassword) {
    payload.password = formData.password;
  }

  return payload;
}

function getUserFullName(user) {
  // Construit un nom affichable, avec fallback sur l'email.
  const name = `${user?.prenom || user?.first_name || ""} ${user?.nom || user?.last_name || ""}`.trim();

  return name || user?.email || "Utilisateur";
}

function getUserService(user) {
  return user?.service_name || user?.service || user?.id_service || user?.service_id || "Non renseigné";
}

function getUserStatus(user) {
  return user?.est_actif ?? user?.is_active ? "Actif" : "Désactivé";
}

function formatUserDate(value) {
  if (!value) {
    return "Non renseigné";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Non renseigné";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getFieldValue(...values) {
  const value = values.find((item) => item !== undefined && item !== null && item !== "");

  return value ?? "Non renseigné";
}

function Users() {
  // Les permissions fines pilotent le mode lecture seule ou administration complete.
  const { currentUser, hasPermission, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState(null);
  const [detailsPermissions, setDetailsPermissions] = useState({});
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const canCreateUsers = hasPermission("users.create");
  const canUpdateUsers = hasPermission("users.update");
  const canDeleteUsers = hasPermission("users.delete");
  const canViewUserPermissions = hasPermission("settings.permissions.manage");
  const canManageUsers = canCreateUsers || canUpdateUsers || canDeleteUsers;

  async function loadUsers({ showLoading = true } = {}) {
    // Recharge la liste des utilisateurs et selectionne un profil par defaut.
    setError("");
    setMessage("");
    if (showLoading) {
      setLoading(true);
    }

    try {
      const data = await getUsers();
      setUsers(data);
      setSelectedUser((current) => current || data[0] || null);
    } catch (err) {
      console.error("Load users error:", err);

      if (err.response?.status === 403) {
        setError("Accès refusé : votre rôle ne permet pas de consulter les utilisateurs.");
      } else if (err.response?.status === 401) {
        setError("Non authentifié : veuillez vous connecter.");
      } else {
        setError("Impossible de charger les utilisateurs.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Chargement initial de la liste au montage de la page.
    let isMounted = true;

    getUsers()
      .then((data) => {
        if (isMounted) {
          setUsers(data);
          setSelectedUser(data[0] || null);
        }
      })
      .catch((err) => {
        console.error("Load users error:", err);

        if (!isMounted) {
          return;
        }

        if (err.response?.status === 403) {
          setError("Accès refusé : votre rôle ne permet pas de consulter les utilisateurs.");
        } else if (err.response?.status === 401) {
          setError("Non authentifié : veuillez vous connecter.");
        } else {
          setError("Impossible de charger les utilisateurs.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    // Applique les filtres de recherche, role et service sans modifier la liste source.
    return users.filter((user) => {
      const fullName = `${user.prenom || user.first_name || ""} ${user.nom || user.last_name || ""}`;
      const searchable = `${fullName} ${user.email || ""}`.toLowerCase();
      const matchesSearch = searchable.includes(searchQuery.trim().toLowerCase());
      const matchesRole = roleFilter === "" || normalizeRole(user.role) === roleFilter;
      const matchesService =
        serviceFilter === "" ||
        String(user.id_service ?? user.service_id ?? "") === String(serviceFilter);

      return matchesSearch && matchesRole && matchesService;
    });
  }, [users, roleFilter, serviceFilter, searchQuery]);

  const userStats = useMemo(() => {
    // Calcule les compteurs affiches en haut de page.
    return {
      total: users.length,
      admins: users.filter((user) => normalizeRole(user.role) === ROLES.ADMIN).length,
      managers: users.filter((user) => normalizeRole(user.role) === ROLES.MANAGER).length,
      employees: users.filter((user) => normalizeRole(user.role) === ROLES.EMPLOYEE).length,
    };
  }, [users]);

  function handleChange(event) {
    // Met a jour le formulaire utilisateur, y compris le toggle actif/inactif.
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startEdit(user) {
    // Pre-remplit le formulaire avec le profil selectionne.
    setSelectedUser(user);
    setEditingUserId(user.id);
    setMessage("");
    setError("");
    setFormData({
      prenom: user.prenom || user.first_name || "",
      nom: user.nom || user.last_name || "",
      email: user.email,
      password: "",
      role: user.role,
      id_service: user.service || user.id_service || user.service_id || "",
      est_actif: user.est_actif ?? user.is_active ?? true,
    });
  }

  function resetForm() {
    setEditingUserId(null);
    setFormData(emptyForm);
  }

  async function openUserDetails(user) {
    // Ouvre la modale et charge en parallele les details et permissions.
    setSelectedUser(user);
    setDetailsUser(user);
    setDetailsPermissions({});
    setDetailsError("");
    setDetailsOpen(true);
    setDetailsLoading(true);

    const requests = [
      getUserById(user.id),
      canViewUserPermissions ? getUserPermissions(user.id) : Promise.resolve({ permissions: {} }),
    ];

    const [userResult, permissionsResult] = await Promise.allSettled(requests);

    if (userResult.status === "fulfilled") {
      setDetailsUser(userResult.value);
    } else {
      setDetailsUser(user);
      setDetailsError("Impossible de charger les détails de l’utilisateur.");
    }

    if (permissionsResult.status === "fulfilled") {
      setDetailsPermissions(permissionsResult.value?.permissions || {});
    } else {
      setDetailsPermissions({});
    }

    setDetailsLoading(false);
  }

  function closeUserDetails() {
    setDetailsOpen(false);
    setDetailsError("");
  }

  function editDetailsUser() {
    // Bascule depuis la modale vers le formulaire d'edition.
    if (!detailsUser || !canUpdateUsers) {
      return;
    }

    startEdit(detailsUser);
    closeUserDetails();
  }

  async function deleteDetailsUser() {
    // Supprime depuis la modale puis la ferme si l'operation reussit.
    if (!detailsUser || !canDeleteUsers) {
      return;
    }

    const deleted = await handleDelete(detailsUser.id);

    if (deleted) {
      closeUserDetails();
    }
  }

  async function handleSubmit(event) {
    // Cree ou modifie un utilisateur selon le mode du formulaire.
    event.preventDefault();

    if ((editingUserId && !canUpdateUsers) || (!editingUserId && !canCreateUsers)) {
      setError("Accès refusé : vous n'avez pas l'autorisation de modifier les utilisateurs.");
      return;
    }

    setError("");
    setMessage("");

    try {
      if (editingUserId) {
        const updatedUser = await updateUser(editingUserId, normalizePayload(formData, false));
        setSelectedUser(updatedUser);
        setMessage("Utilisateur modifié avec succès.");
      } else {
        const createdUser = await createUser(normalizePayload(formData, true));
        setSelectedUser(createdUser);
        setMessage("Utilisateur créé avec succès.");
      }

      resetForm();
      await loadUsers();
      dispatchDataChanged(DATA_EVENTS.USERS_CHANGED);
    } catch (err) {
      console.error("Save user error:", err);

      if (err.response?.status === 403) {
        setError("Accès refusé : seul l'Administrateur peut effectuer cette action.");
      } else {
        setError(err.response?.data?.detail || "Erreur pendant l'enregistrement.");
      }
    }
  }

  async function handleDelete(userId) {
    // Suppression protegee par permission et confirmation explicite.
    if (!canDeleteUsers) {
      setError("Accès refusé : vous n'avez pas l'autorisation de supprimer un utilisateur.");
      return false;
    }

    const confirmed = window.confirm(
      "Confirmer la suppression de cet utilisateur ? Ne supprimez pas le compte Admin principal."
    );

    if (!confirmed) {
      return false;
    }

    setError("");
    setMessage("");

    try {
      await deleteUser(userId);
      setSelectedUser((current) => (current?.id === userId ? null : current));
      setMessage("Utilisateur supprimé avec succès.");
      await loadUsers();
      dispatchDataChanged(DATA_EVENTS.USERS_CHANGED);
      return true;
    } catch (err) {
      console.error("Delete user error:", err);

      if (err.response?.status === 403) {
        setError("Accès refusé : seul l'Administrateur peut supprimer un utilisateur.");
      } else if (err.response?.status === 404) {
        setError("Utilisateur introuvable.");
      } else {
        setError("Erreur pendant la suppression.");
      }

      return false;
    }
  }

  const permissionEntries = Object.entries(detailsPermissions);
  // Nombre de permissions actives affiche dans la modale de details.
  const allowedPermissionsCount = permissionEntries.filter(([, allowed]) => allowed).length;

  return (
    <div className="users-view">
      <div className="board-toolbar">
        <div>
          <h2>Gestion des utilisateurs</h2>
          <p>
            {currentUser
              ? `${getRoleLabel(currentUser.role)} connecté : ${currentUser.email}`
              : "Gestion des comptes internes"}
          </p>
        </div>
        <div className="toolbar-actions">
          <button onClick={loadUsers} className="secondary-action" type="button">
            Actualiser
          </button>
          <button onClick={logout} className="logout-action" type="button">
            Déconnexion
          </button>
        </div>
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}
      {!canManageUsers && (
        <p className="notice warning">
          Mode lecture seule : vous pouvez consulter les utilisateurs, mais pas les modifier.
        </p>
      )}

      <section className="users-stats-grid" aria-label="Résumé utilisateurs">
        <article className="workspace-panel user-stat-card">
          <UsersRound size={20} />
          <span>Total utilisateurs</span>
          <strong>{userStats.total}</strong>
        </article>
        <article className="workspace-panel user-stat-card">
          <ShieldCheck size={20} />
          <span>Admins</span>
          <strong>{userStats.admins}</strong>
        </article>
        <article className="workspace-panel user-stat-card">
          <Edit3 size={20} />
          <span>Managers</span>
          <strong>{userStats.managers}</strong>
        </article>
        <article className="workspace-panel user-stat-card">
          <CheckCircle2 size={20} />
          <span>Employés</span>
          <strong>{userStats.employees}</strong>
        </article>
      </section>

      <section className="management-grid">
        <div className="user-side-stack">
        {(canCreateUsers || (editingUserId && canUpdateUsers)) && (
        <form onSubmit={handleSubmit} className="workspace-panel user-form">
          <div className="panel-title">
            <h3>{editingUserId ? "Modifier le profil" : "Ajouter utilisateur"}</h3>
            {editingUserId && <button type="button" onClick={resetForm}>Annuler</button>}
          </div>

          <div className="form-grid">
            <label>
              Prénom
              <input name="prenom" value={formData.prenom} onChange={handleChange} required />
            </label>
            <label>
              Nom
              <input name="nom" value={formData.nom} onChange={handleChange} required />
            </label>
            <label>
              Email
              <input name="email" type="email" value={formData.email} onChange={handleChange} required />
            </label>
            {!editingUserId && (
              <label>
                Mot de passe
                <input
                  name="password"
                  type="password"
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 caractères"
                  required
                />
              </label>
            )}
            <label>
              Rôle
              <select name="role" value={formData.role} onChange={handleChange}>
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </label>
            <label>
              Service
              <select name="id_service" value={formData.id_service} onChange={handleChange}>
                {serviceOptions.map((service) => (
                  <option key={service.value || "none"} value={service.value}>
                    {service.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="toggle-line">
            <input name="est_actif" type="checkbox" checked={formData.est_actif} onChange={handleChange} />
            Compte actif
          </label>

          <button type="submit" className="primary-action">
            {editingUserId ? <Edit3 size={17} /> : <Plus size={17} />}
            {editingUserId ? "Modifier profil" : "Créer utilisateur"}
          </button>
        </form>
        )}

        <section className="workspace-panel selected-profile-card">
          <div className="panel-title">
            <h3>Profil sélectionné</h3>
            {selectedUser && <span>ID #{selectedUser.id}</span>}
          </div>

          {selectedUser ? (
            <>
              <div className="selected-profile-card__head">
                <div className="profile-avatar-large">{getInitials(selectedUser)}</div>
                <div>
                  <h4>{selectedUser.prenom || selectedUser.first_name} {selectedUser.nom || selectedUser.last_name}</h4>
                  <p>{selectedUser.email}</p>
                </div>
              </div>

              <dl className="details-list compact">
                <div>
                  <dt>Rôle</dt>
                  <dd>{getRoleLabel(selectedUser.role)}</dd>
                </div>
                <div>
                  <dt>Service</dt>
                  <dd>{selectedUser.service || selectedUser.id_service || selectedUser.service_id || "Non affecté"}</dd>
                </div>
                <div>
                  <dt>Statut</dt>
                  <dd>{selectedUser.est_actif ?? selectedUser.is_active ? "Actif" : "Désactivé"}</dd>
                </div>
              </dl>

              {canManageUsers && (
                <div className="profile-card-actions">
                  {canUpdateUsers && (
                    <button type="button" className="secondary-action" onClick={() => startEdit(selectedUser)}>
                      <Edit3 size={16} />
                      Modifier
                    </button>
                  )}
                  {canDeleteUsers && (
                    <button type="button" className="logout-action" onClick={() => handleDelete(selectedUser.id)}>
                      <Trash2 size={16} />
                      Supprimer
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="helper-text">Sélectionnez un utilisateur pour voir son profil ici.</p>
          )}
        </section>
        </div>

        <section className="workspace-panel user-list-panel">
          <div className="panel-title">
            <h3>Liste des utilisateurs</h3>
            <span>{filteredUsers.length} affiché(s)</span>
          </div>

          <div className="filters-row">
            <label className="search-filter">
              <Search size={17} />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher nom ou email"
              />
            </label>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">Tous les rôles</option>
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
              <option value="">Tous les services</option>
              {serviceOptions
                .filter((service) => service.value)
                .map((service) => (
                  <option key={service.value} value={service.value}>
                    {service.label}
                  </option>
                ))}
            </select>
          </div>

          <div className="users-table">
            <div className="table-head">
              <span>Nom</span>
              <span>Email</span>
              <span>Rôle</span>
              <span>Service</span>
              <span>Actions</span>
            </div>

            {filteredUsers.map((user) => (
              <div className="table-row" key={user.id}>
                <span>{user.prenom || user.first_name} {user.nom || user.last_name}</span>
                <span>{user.email}</span>
                <span><mark>{getRoleLabel(user.role)}</mark></span>
                <span>{user.service || user.id_service || user.service_id || "Aucun"}</span>
                <span className="row-actions">
                  <button type="button" onClick={() => openUserDetails(user)}>
                    <Eye size={15} />
                    Voir
                  </button>
                  {canUpdateUsers && (
                    <button type="button" onClick={() => startEdit(user)}>
                      <Edit3 size={15} />
                      Modifier
                    </button>
                  )}
                  {canDeleteUsers && (
                    <button type="button" onClick={() => handleDelete(user.id)}>
                      <Trash2 size={15} />
                      Supprimer
                    </button>
                  )}
                </span>
              </div>
            ))}

            {!loading && filteredUsers.length === 0 && (
              <div className="empty-table">
                <div className="empty-illustration small">
                  <span />
                  <span />
                  <span />
                </div>
                <strong>This Folder is empty</strong>
                <p>Aucun utilisateur trouvé pour ces filtres.</p>
              </div>
            )}

            {loading && <p className="loading-line">Chargement des utilisateurs...</p>}
          </div>
        </section>
      </section>

      {detailsOpen && (
        <div
          className="user-details-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeUserDetails();
            }
          }}
        >
          <article className="user-details-modal" role="dialog" aria-modal="true">
            <header className="user-details-modal__header">
              <div className="user-details-modal__identity">
                <div className="profile-avatar-large">
                  {detailsUser ? getInitials(detailsUser) : "?"}
                </div>
                <div>
                  <p>Détails utilisateur</p>
                  <h3>{detailsUser ? getUserFullName(detailsUser) : "Utilisateur"}</h3>
                  <span>{detailsUser?.email || "Non renseigné"}</span>
                </div>
              </div>
              <button
                type="button"
                className="user-details-modal__close"
                aria-label="Fermer"
                onClick={closeUserDetails}
              >
                <X size={18} />
              </button>
            </header>

            {detailsLoading ? (
              <p className="loading-line">Chargement des détails utilisateur...</p>
            ) : (
              <>
                {detailsError && <p className="notice error">{detailsError}</p>}

                <section className="user-details-modal__section">
                  <h4>Informations principales</h4>
                  <dl className="user-details-grid">
                    <div>
                      <dt>Nom complet</dt>
                      <dd>{getUserFullName(detailsUser)}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{getFieldValue(detailsUser?.email)}</dd>
                    </div>
                    <div>
                      <dt>Rôle</dt>
                      <dd>{detailsUser ? getRoleLabel(detailsUser.role) : "Non renseigné"}</dd>
                    </div>
                    <div>
                      <dt>Service</dt>
                      <dd>{getUserService(detailsUser)}</dd>
                    </div>
                    <div>
                      <dt>Statut</dt>
                      <dd>{detailsUser ? getUserStatus(detailsUser) : "Non renseigné"}</dd>
                    </div>
                    <div>
                      <dt>Téléphone</dt>
                      <dd>{getFieldValue(detailsUser?.phone, detailsUser?.telephone, detailsUser?.tel)}</dd>
                    </div>
                    <div>
                      <dt>Créé le</dt>
                      <dd>{formatUserDate(detailsUser?.created_at || detailsUser?.date_creation)}</dd>
                    </div>
                    <div>
                      <dt>Mis à jour le</dt>
                      <dd>{formatUserDate(detailsUser?.updated_at || detailsUser?.date_modification)}</dd>
                    </div>
                  </dl>
                </section>

                <section className="user-details-modal__section">
                  <h4>Informations complémentaires</h4>
                  <dl className="user-details-grid">
                    <div>
                      <dt>Permissions actives</dt>
                      <dd>
                        {permissionEntries.length > 0
                          ? `${allowedPermissionsCount}/${permissionEntries.length}`
                          : "Non renseigné"}
                      </dd>
                    </div>
                    <div>
                      <dt>Projets assignés</dt>
                      <dd>{getFieldValue(detailsUser?.projects_count, detailsUser?.assigned_projects_count)}</dd>
                    </div>
                    <div>
                      <dt>Tâches assignées</dt>
                      <dd>{getFieldValue(detailsUser?.tasks_count, detailsUser?.assigned_tasks_count)}</dd>
                    </div>
                    <div>
                      <dt>Dernière activité</dt>
                      <dd>{formatUserDate(detailsUser?.last_activity_at || detailsUser?.last_login_at)}</dd>
                    </div>
                  </dl>

                  {permissionEntries.length > 0 && (
                    <div className="user-permission-summary">
                      {permissionEntries
                        .filter(([, allowed]) => allowed)
                        .slice(0, 8)
                        .map(([permission]) => (
                          <span key={permission}>{permission}</span>
                        ))}
                    </div>
                  )}
                </section>
              </>
            )}

            <footer className="user-details-modal__footer">
              <button type="button" className="secondary-action" onClick={closeUserDetails}>
                Fermer
              </button>
              {canUpdateUsers && (
                <button type="button" className="secondary-action" onClick={editDetailsUser}>
                  <Edit3 size={16} />
                  Modifier
                </button>
              )}
              {canDeleteUsers && (
                <button type="button" className="logout-action" onClick={deleteDetailsUser}>
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

export default Users;
