import { CheckCircle2, KeyRound, Save, Search, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getPermissionCatalog,
  getUserPermissions,
  getUsers,
  updateUserPermissions,
} from "../services/userService";
import { DATA_EVENTS, dispatchDataChanged } from "../utils/dataEvents";

function getUserName(user) {
  return [user?.prenom || user?.first_name, user?.nom || user?.last_name].filter(Boolean).join(" ") || user?.email || "Utilisateur";
}

function getUserService(user) {
  return user?.service || user?.nom_service || user?.service_name || user?.id_service || user?.service_id || "Non affecté";
}

function countEnabledPermissions(permissions) {
  return Object.values(permissions || {}).filter(Boolean).length;
}

function Permissions() {
  const { currentUser, refreshCurrentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPermissionsPage() {
      setLoading(true);
      setError("");

      try {
        const [usersData, catalogData] = await Promise.all([getUsers(), getPermissionCatalog()]);
        const loadedUsers = Array.isArray(usersData) ? usersData : [];

        if (!isMounted) {
          return;
        }

        setUsers(loadedUsers);
        setPermissionCatalog(Array.isArray(catalogData) ? catalogData : []);
        setSelectedUserId(String(loadedUsers[0]?.id || ""));
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.response?.data?.detail || "Impossible de charger les permissions.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPermissionsPage();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedPermissions({});
      return;
    }

    let isMounted = true;

    async function loadUserPermissions() {
      setLoading(true);
      setError("");

      try {
        const data = await getUserPermissions(selectedUserId);

        if (isMounted) {
          setSelectedPermissions(data.permissions || {});
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.response?.data?.detail || "Impossible de charger les permissions de cet utilisateur.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadUserPermissions();

    return () => {
      isMounted = false;
    };
  }, [selectedUserId]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((user) =>
      [getUserName(user), user.email, user.role, getUserService(user)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [search, users]);

  const selectedUser = useMemo(
    () => users.find((user) => String(user.id) === String(selectedUserId)) || null,
    [selectedUserId, users]
  );

  const totalCatalogPermissions = useMemo(
    () => permissionCatalog.reduce((total, group) => total + (group.permissions?.length || 0), 0),
    [permissionCatalog]
  );

  function togglePermission(permissionKey) {
    setSelectedPermissions((current) => ({
      ...current,
      [permissionKey]: !current[permissionKey],
    }));
    setMessage("");
    setError("");
  }

  async function savePermissions() {
    if (!selectedUserId || saving) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const data = await updateUserPermissions(selectedUserId, selectedPermissions);
      setSelectedPermissions(data.permissions || {});
      setMessage("Permissions enregistrées avec succès.");
      dispatchDataChanged(DATA_EVENTS.PERMISSIONS_CHANGED);

      if (Number(selectedUserId) === Number(currentUser?.user_id || currentUser?.id)) {
        await refreshCurrentUser();
      }
    } catch (saveError) {
      setError(saveError.response?.data?.detail || "Impossible d'enregistrer les permissions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-page permissions-page">
      <div className="board-toolbar">
        <div>
          <h2>Permissions</h2>
          <p>Gestion des droits utilisateurs réservée à l'administration.</p>
        </div>
        <div className="toolbar-actions">
          <button
            type="button"
            className="primary-action"
            onClick={savePermissions}
            disabled={!selectedUserId || saving || loading}
          >
            <Save size={17} />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}

      <section className="settings-summary-grid" aria-label="Résumé permissions">
        <article className="workspace-panel settings-summary-card">
          <UsersRound size={20} />
          <span>Utilisateurs</span>
          <strong>{users.length}</strong>
        </article>
        <article className="workspace-panel settings-summary-card">
          <KeyRound size={20} />
          <span>Permissions</span>
          <strong>{totalCatalogPermissions}</strong>
        </article>
        <article className="workspace-panel settings-summary-card">
          <ShieldCheck size={20} />
          <span>Sélection active</span>
          <strong>{countEnabledPermissions(selectedPermissions)}</strong>
        </article>
        <article className="workspace-panel settings-summary-card">
          <CheckCircle2 size={20} />
          <span>Accès</span>
          <strong>Admin</strong>
        </article>
      </section>

      <section className="workspace-panel permissions-panel">
        <div className="permissions-management">
          <aside className="permissions-users-list">
            <label className="permissions-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un utilisateur..."
              />
            </label>

            <div>
              {filteredUsers.map((user) => (
                <button
                  type="button"
                  key={user.id}
                  className={String(selectedUserId) === String(user.id) ? "is-selected" : ""}
                  onClick={() => setSelectedUserId(String(user.id))}
                >
                  <strong>{getUserName(user)}</strong>
                  <span>{user.email}</span>
                  <small>{user.role}{getUserService(user) ? ` - ${getUserService(user)}` : ""}</small>
                </button>
              ))}

              {!loading && filteredUsers.length === 0 && <p>Aucun utilisateur trouvé.</p>}
              {loading && <p>Chargement...</p>}
            </div>
          </aside>

          <section className="permissions-editor">
            {selectedUser ? (
              <>
                <header>
                  <div>
                    <h4>{getUserName(selectedUser)}</h4>
                    <span>{selectedUser.email} - {selectedUser.role} - {getUserService(selectedUser)}</span>
                  </div>
                  <button type="button" className="primary-action" onClick={savePermissions} disabled={saving || loading}>
                    <Save size={17} />
                    {saving ? "Enregistrement..." : "Enregistrer les permissions"}
                  </button>
                </header>

                <div className="permissions-groups">
                  {permissionCatalog.map((group) => (
                    <article key={group.module}>
                      <h5>{group.module}</h5>
                      {(group.permissions || []).map((permission) => (
                        <label key={permission.key} className="permission-toggle-row">
                          <input
                            type="checkbox"
                            checked={selectedPermissions[permission.key] === true}
                            onChange={() => togglePermission(permission.key)}
                          />
                          <span>
                            <strong>{permission.label}</strong>
                            <small>{permission.key}</small>
                          </span>
                        </label>
                      ))}
                    </article>
                  ))}
                </div>

                {!loading && permissionCatalog.length === 0 && (
                  <p className="helper-text">Aucun module de permissions à afficher.</p>
                )}
              </>
            ) : (
              <p className="helper-text">Sélectionnez un utilisateur pour gérer ses permissions.</p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

export default Permissions;
