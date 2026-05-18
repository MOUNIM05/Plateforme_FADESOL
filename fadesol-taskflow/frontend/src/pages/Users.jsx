import { useEffect, useMemo, useState } from "react";
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
  role: "Employé",
  service_id: "",
  is_active: true,
};

const roles = ["Administrateur", "Manager", "Employé"];

function normalizePayload(formData, includePassword = true) {
  const payload = {
    first_name: formData.first_name.trim(),
    last_name: formData.last_name.trim(),
    email: formData.email.trim(),
    role: formData.role,
    service_id: formData.service_id === "" ? null : Number(formData.service_id),
    is_active: formData.is_active,
  };

  if (includePassword) {
    payload.password = formData.password;
  }

  return payload;
}

function Users({ currentUser, onLogout }) {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadUsers() {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const data = await getUsers();
      setUsers(data);
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
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter === "" || user.role === roleFilter;
      const matchesService =
        serviceFilter === "" ||
        String(user.service_id ?? "") === String(serviceFilter);

      return matchesRole && matchesService;
    });
  }, [users, roleFilter, serviceFilter]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function startEdit(user) {
    setEditingUserId(user.id);
    setMessage("");
    setError("");
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: "",
      role: user.role,
      service_id: user.service_id ?? "",
      is_active: user.is_active,
    });
  }

  function resetForm() {
    setEditingUserId(null);
    setFormData(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      if (editingUserId) {
        await updateUser(editingUserId, normalizePayload(formData, false));
        setMessage("Utilisateur modifié avec succès.");
      } else {
        await createUser(normalizePayload(formData, true));
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
              ? `Connecté : ${currentUser.email}`
              : "Gestion des comptes internes"}
          </p>
        </div>
        <div className="toolbar-actions">
          <button onClick={loadUsers} className="secondary-action" type="button">
            Actualiser
          </button>
          <button onClick={onLogout} className="logout-action" type="button">
            Déconnexion
          </button>
        </div>
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}

      <section className="management-grid">
        <form onSubmit={handleSubmit} className="workspace-panel user-form">
          <div className="panel-title">
            <h3>{editingUserId ? "Modifier utilisateur" : "Créer utilisateur"}</h3>
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
                <input name="password" type="password" value={formData.password} onChange={handleChange} required />
              </label>
            )}
            <label>
              Rôle
              <select name="role" value={formData.role} onChange={handleChange}>
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>
            <label>
              Service
              <select name="service_id" value={formData.service_id} onChange={handleChange}>
                <option value="">Aucun service</option>
                <option value="1">Service 1</option>
                <option value="2">Service 2</option>
                <option value="3">Service 3</option>
              </select>
            </label>
          </div>

          <label className="toggle-line">
            <input name="is_active" type="checkbox" checked={formData.is_active} onChange={handleChange} />
            Compte actif
          </label>

          <button type="submit" className="primary-action">
            {editingUserId ? "Modifier" : "Créer"}
          </button>
        </form>

        <section className="workspace-panel user-list-panel">
          <div className="panel-title">
            <h3>Liste des utilisateurs</h3>
            <span>{filteredUsers.length} affiché(s)</span>
          </div>

          <div className="filters-row">
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="">Tous les rôles</option>
              {roles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
              <option value="">Tous les services</option>
              <option value="1">Service 1</option>
              <option value="2">Service 2</option>
              <option value="3">Service 3</option>
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
                <span>{user.first_name} {user.last_name}</span>
                <span>{user.email}</span>
                <span><mark>{user.role}</mark></span>
                <span>{user.service_id ?? "Aucun"}</span>
                <span className="row-actions">
                  <button type="button" onClick={() => startEdit(user)}>Modifier</button>
                  <button type="button" onClick={() => handleDelete(user.id)}>Supprimer</button>
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
    </div>
  );
}

export default Users;
