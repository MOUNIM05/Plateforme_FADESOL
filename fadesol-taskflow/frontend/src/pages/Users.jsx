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
} from "lucide-react";
import { ROLES, getInitials, getRoleLabel, normalizeRole, useAuth } from "../context/AuthContext";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "../services/userService";

const emptyForm = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  role: ROLES.EMPLOYEE,
  service_id: "",
  is_active: true,
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
  const payload = {
    first_name: formData.first_name.trim(),
    last_name: formData.last_name.trim(),
    email: formData.email.trim(),
    role: formData.role,
    service_id: formData.service_id === "" ? null : formData.service_id,
    service: formData.service_id === "" ? null : formData.service_id,
    is_active: formData.is_active,
  };

  if (includePassword) {
    payload.password = formData.password;
  }

  return payload;
}

function Users() {
  const { currentUser, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const canManageUsers = normalizeRole(currentUser?.role) === ROLES.ADMIN;

  async function loadUsers({ showLoading = true } = {}) {
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
    return users.filter((user) => {
      const fullName = `${user.first_name || user.prenom || ""} ${user.last_name || user.nom || ""}`;
      const searchable = `${fullName} ${user.email || ""}`.toLowerCase();
      const matchesSearch = searchable.includes(searchQuery.trim().toLowerCase());
      const matchesRole = roleFilter === "" || normalizeRole(user.role) === roleFilter;
      const matchesService =
        serviceFilter === "" ||
        String(user.service_id ?? "") === String(serviceFilter);

      return matchesSearch && matchesRole && matchesService;
    });
  }, [users, roleFilter, serviceFilter, searchQuery]);

  const userStats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((user) => normalizeRole(user.role) === ROLES.ADMIN).length,
      managers: users.filter((user) => normalizeRole(user.role) === ROLES.MANAGER).length,
      employees: users.filter((user) => normalizeRole(user.role) === ROLES.EMPLOYEE).length,
    };
  }, [users]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startEdit(user) {
    setSelectedUser(user);
    setEditingUserId(user.id);
    setMessage("");
    setError("");
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: "",
      role: user.role,
      service_id: user.service || user.service_id || "",
      is_active: user.is_active,
    });
  }

  function resetForm() {
    setEditingUserId(null);
    setFormData(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canManageUsers) {
      setError("Accès refusé : seul l'Administrateur peut modifier les utilisateurs.");
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
    if (!canManageUsers) {
      setError("Accès refusé : seul l'Administrateur peut supprimer un utilisateur.");
      return;
    }

    const confirmed = window.confirm(
      "Confirmer la suppression de cet utilisateur ? Ne supprimez pas le compte Admin principal."
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await deleteUser(userId);
      setSelectedUser((current) => (current?.id === userId ? null : current));
      setMessage("Utilisateur supprimé avec succès.");
      await loadUsers();
    } catch (err) {
      console.error("Delete user error:", err);

      if (err.response?.status === 403) {
        setError("Accès refusé : seul l'Administrateur peut supprimer un utilisateur.");
      } else if (err.response?.status === 404) {
        setError("Utilisateur introuvable.");
      } else {
        setError("Erreur pendant la suppression.");
      }
    }
  }

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
          Mode lecture seule : les Managers peuvent consulter la liste si le backend l'autorise.
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
        {canManageUsers && (
        <form onSubmit={handleSubmit} className="workspace-panel user-form">
          <div className="panel-title">
            <h3>{editingUserId ? "Modifier le profil" : "Ajouter utilisateur"}</h3>
            {editingUserId && <button type="button" onClick={resetForm}>Annuler</button>}
          </div>

          <div className="form-grid">
            <label>
              Prénom
              <input name="first_name" value={formData.first_name} onChange={handleChange} required />
            </label>
            <label>
              Nom
              <input name="last_name" value={formData.last_name} onChange={handleChange} required />
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
              <select name="service_id" value={formData.service_id} onChange={handleChange}>
                {serviceOptions.map((service) => (
                  <option key={service.value || "none"} value={service.value}>
                    {service.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="toggle-line">
            <input name="is_active" type="checkbox" checked={formData.is_active} onChange={handleChange} />
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
                  <h4>{selectedUser.first_name || selectedUser.prenom} {selectedUser.last_name || selectedUser.nom}</h4>
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
                  <dd>{selectedUser.service || selectedUser.service_id || "Non affecté"}</dd>
                </div>
                <div>
                  <dt>Statut</dt>
                  <dd>{selectedUser.is_active ? "Actif" : "Désactivé"}</dd>
                </div>
              </dl>

              {canManageUsers && (
                <div className="profile-card-actions">
                  <button type="button" className="secondary-action" onClick={() => startEdit(selectedUser)}>
                    <Edit3 size={16} />
                    Modifier
                  </button>
                  <button type="button" className="logout-action" onClick={() => handleDelete(selectedUser.id)}>
                    <Trash2 size={16} />
                    Supprimer
                  </button>
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
              {canManageUsers && <span>Actions</span>}
            </div>

            {filteredUsers.map((user) => (
              <div className="table-row" key={user.id}>
                <span>{user.first_name || user.prenom} {user.last_name || user.nom}</span>
                <span>{user.email}</span>
                <span><mark>{getRoleLabel(user.role)}</mark></span>
                <span>{user.service || user.service_id || "Aucun"}</span>
                {canManageUsers && (
                  <span className="row-actions">
                    <button type="button" onClick={() => setSelectedUser(user)}>
                      <Eye size={15} />
                      Voir
                    </button>
                    <button type="button" onClick={() => startEdit(user)}>
                      <Edit3 size={15} />
                      Modifier
                    </button>
                    <button type="button" onClick={() => handleDelete(user.id)}>
                      <Trash2 size={15} />
                      Supprimer
                    </button>
                  </span>
                )}
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
    </div>
  );
}

export default Users;
