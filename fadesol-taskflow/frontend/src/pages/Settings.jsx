import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Clock3,
  Database,
  KeyRound,
  RefreshCw,
  Save,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  ToggleLeft,
  UsersRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  getPermissionCatalog,
  getUserPermissions,
  getUsers,
  updateUserPermissions,
} from "../services/userService";
import { DATA_EVENTS, dispatchDataChanged } from "../utils/dataEvents";

const storageKey = "fadesol_platform_settings";

const defaultSettings = {
  platformName: "Fadesol TaskFlow",
  workspaceName: "Workspace interne",
  supportEmail: "admin@fadesol.com",
  language: "fr",
  timezone: "Africa/Casablanca",
  sessionDuration: 120,
  requireStrongPassword: true,
  autoLogout: true,
  allowManagerExports: false,
  emailNotifications: true,
  taskDelayAlerts: true,
  maintenanceMode: false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function SettingSwitch({ checked, label, name, onChange }) {
  return (
    <label className="settings-switch">
      <span>
        <ToggleLeft size={18} />
        {label}
      </span>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
      />
    </label>
  );
}

function Settings() {
  const { currentUser, hasPermission, refreshCurrentUser } = useAuth();
  const [settings, setSettings] = useState(loadSettings);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState({});
  const [permissionSearch, setPermissionSearch] = useState("");
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const canManagePermissions = hasPermission("settings.permissions.manage");

  const activeSecurityRules = useMemo(() => {
    return [
      settings.requireStrongPassword,
      settings.autoLogout,
      settings.sessionDuration <= 120,
    ].filter(Boolean).length;
  }, [settings]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setMessage("");
    setError("");
  }

  function handleNumberChange(event) {
    const { name, value } = event.target;

    setSettings((current) => ({
      ...current,
      [name]: Number(value),
    }));
    setMessage("");
    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    localStorage.setItem(storageKey, JSON.stringify(settings));
    setMessage("Paramètres enregistrés.");
    setError("");
  }

  function resetSettings() {
    setSettings(defaultSettings);
    localStorage.setItem(storageKey, JSON.stringify(defaultSettings));
    setMessage("Paramètres réinitialisés.");
    setError("");
  }

  useEffect(() => {
    if (!canManagePermissions) {
      return;
    }

    async function loadPermissionManagement() {
      setPermissionsLoading(true);
      setError("");

      try {
        const [usersData, catalogData] = await Promise.all([getUsers(), getPermissionCatalog()]);
        const loadedUsers = Array.isArray(usersData) ? usersData : [];

        setUsers(loadedUsers);
        setPermissionCatalog(Array.isArray(catalogData) ? catalogData : []);
        setSelectedUserId((current) => current || String(loadedUsers[0]?.id || ""));
      } catch (loadError) {
        console.error("Load permissions management error:", loadError);
        setError("Impossible de charger la gestion des permissions.");
      } finally {
        setPermissionsLoading(false);
      }
    }

    loadPermissionManagement();
  }, [canManagePermissions]);

  useEffect(() => {
    if (!selectedUserId || !canManagePermissions) {
      return;
    }

    async function loadSelectedPermissions() {
      setPermissionsLoading(true);
      setError("");

      try {
        const data = await getUserPermissions(selectedUserId);
        setSelectedPermissions(data.permissions || {});
      } catch (loadError) {
        console.error("Load user permissions error:", loadError);
        setError("Impossible de charger les permissions de cet utilisateur.");
      } finally {
        setPermissionsLoading(false);
      }
    }

    loadSelectedPermissions();
  }, [canManagePermissions, selectedUserId]);

  const filteredUsers = useMemo(() => {
    const search = permissionSearch.trim().toLowerCase();

    if (!search) {
      return users;
    }

    return users.filter((user) =>
      [
        user.prenom,
        user.nom,
        user.first_name,
        user.last_name,
        user.email,
        user.role,
        user.service,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [permissionSearch, users]);

  const selectedUser = useMemo(
    () => users.find((user) => String(user.id) === String(selectedUserId)) || null,
    [selectedUserId, users]
  );

  function getUserName(user) {
    return [user?.prenom || user?.first_name, user?.nom || user?.last_name].filter(Boolean).join(" ") || user?.email || "Utilisateur";
  }

  function togglePermission(permissionKey) {
    setSelectedPermissions((current) => ({
      ...current,
      [permissionKey]: !current[permissionKey],
    }));
    setMessage("");
    setError("");
  }

  async function savePermissions() {
    if (!selectedUserId) {
      return;
    }

    setSavingPermissions(true);
    setMessage("");
    setError("");

    try {
      const data = await updateUserPermissions(selectedUserId, selectedPermissions);
      setSelectedPermissions(data.permissions || {});
      setMessage("Permissions mises à jour avec succès.");
      dispatchDataChanged(DATA_EVENTS.PERMISSIONS_CHANGED);

      if (Number(selectedUserId) === Number(currentUser?.user_id || currentUser?.id)) {
        await refreshCurrentUser();
      }
    } catch (saveError) {
      console.error("Save permissions error:", saveError);
      setError("Impossible d'enregistrer les permissions.");
    } finally {
      setSavingPermissions(false);
    }
  }

  return (
    <div className="dashboard-page settings-page">
      <div className="board-toolbar">
        <div>
          <h2>Paramètres système</h2>
          <p>Configuration globale réservée à l'administration.</p>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="secondary-action" onClick={resetSettings}>
            <RefreshCw size={17} />
            Réinitialiser
          </button>
        </div>
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}

      <section className="settings-summary-grid" aria-label="Résumé paramètres">
        <article className="workspace-panel settings-summary-card">
          <SettingsIcon size={20} />
          <span>Plateforme</span>
          <strong>{settings.platformName}</strong>
        </article>
        <article className="workspace-panel settings-summary-card">
          <ShieldCheck size={20} />
          <span>Sécurité</span>
          <strong>{activeSecurityRules}/3</strong>
        </article>
        <article className="workspace-panel settings-summary-card">
          <Bell size={20} />
          <span>Notifications</span>
          <strong>{settings.emailNotifications || settings.taskDelayAlerts ? "Actives" : "Off"}</strong>
        </article>
        <article className="workspace-panel settings-summary-card">
          <Database size={20} />
          <span>Mode</span>
          <strong>{settings.maintenanceMode ? "Maintenance" : "Production"}</strong>
        </article>
      </section>

      <form className="settings-layout" onSubmit={handleSubmit}>
        <section className="workspace-panel settings-panel">
          <div className="panel-title">
            <h3>Général</h3>
            <span>Workspace</span>
          </div>

          <div className="settings-form-grid">
            <label>
              Nom plateforme
              <input name="platformName" value={settings.platformName} onChange={handleChange} />
            </label>
            <label>
              Espace
              <input name="workspaceName" value={settings.workspaceName} onChange={handleChange} />
            </label>
            <label>
              Email support
              <input name="supportEmail" type="email" value={settings.supportEmail} onChange={handleChange} />
            </label>
            <label>
              Langue
              <select name="language" value={settings.language} onChange={handleChange}>
                <option value="fr">Français</option>
                <option value="ar">Arabe</option>
                <option value="en">Anglais</option>
              </select>
            </label>
            <label>
              Fuseau horaire
              <select name="timezone" value={settings.timezone} onChange={handleChange}>
                <option value="Africa/Casablanca">Africa/Casablanca</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
          </div>
        </section>

        <section className="workspace-panel settings-panel">
          <div className="panel-title">
            <h3>Sécurité</h3>
            <span>Admin</span>
          </div>

          <div className="settings-form-grid">
            <label>
              Durée session
              <div className="settings-input-with-unit">
                <Clock3 size={16} />
                <input
                  name="sessionDuration"
                  type="number"
                  min="15"
                  max="480"
                  value={settings.sessionDuration}
                  onChange={handleNumberChange}
                />
                <span>min</span>
              </div>
            </label>
          </div>

          <div className="settings-switch-list">
            <SettingSwitch
              name="requireStrongPassword"
              label="Mot de passe fort"
              checked={settings.requireStrongPassword}
              onChange={handleChange}
            />
            <SettingSwitch
              name="autoLogout"
              label="Déconnexion automatique"
              checked={settings.autoLogout}
              onChange={handleChange}
            />
            <SettingSwitch
              name="allowManagerExports"
              label="Exports Manager"
              checked={settings.allowManagerExports}
              onChange={handleChange}
            />
          </div>
        </section>

        <section className="workspace-panel settings-panel">
          <div className="panel-title">
            <h3>Notifications</h3>
            <span>Alertes</span>
          </div>

          <div className="settings-switch-list">
            <SettingSwitch
              name="emailNotifications"
              label="Notifications email"
              checked={settings.emailNotifications}
              onChange={handleChange}
            />
            <SettingSwitch
              name="taskDelayAlerts"
              label="Alertes tâches en retard"
              checked={settings.taskDelayAlerts}
              onChange={handleChange}
            />
            <SettingSwitch
              name="maintenanceMode"
              label="Mode maintenance"
              checked={settings.maintenanceMode}
              onChange={handleChange}
            />
          </div>
        </section>

        {canManagePermissions && (
          <section className="workspace-panel settings-panel permissions-panel">
            <div className="panel-title">
              <h3>Gestion des permissions</h3>
              <span>{permissionsLoading ? "Chargement..." : "Administrateur"}</span>
            </div>

            <div className="permissions-management">
              <aside className="permissions-users-list">
                <label className="permissions-search">
                  <Search size={16} />
                  <input
                    value={permissionSearch}
                    onChange={(event) => setPermissionSearch(event.target.value)}
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
                      <small>{user.role}{user.service ? ` - ${user.service}` : ""}</small>
                    </button>
                  ))}
                  {!filteredUsers.length && <p>Aucun utilisateur trouvé.</p>}
                </div>
              </aside>

              <section className="permissions-editor">
                {selectedUser ? (
                  <>
                    <header>
                      <div>
                        <h4>{getUserName(selectedUser)}</h4>
                        <span>{selectedUser.email} - {selectedUser.role}</span>
                      </div>
                      <button type="button" className="primary-action" onClick={savePermissions} disabled={savingPermissions}>
                        <Save size={17} />
                        {savingPermissions ? "Enregistrement..." : "Enregistrer les permissions"}
                      </button>
                    </header>

                    <div className="permissions-groups">
                      {permissionCatalog.map((group) => (
                        <article key={group.module}>
                          <h5>{group.module}</h5>
                          {group.permissions.map((permission) => (
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
                  </>
                ) : (
                  <p className="helper-text">Sélectionnez un utilisateur pour gérer ses permissions.</p>
                )}
              </section>
            </div>
          </section>
        )}

        <section className="workspace-panel settings-save-panel">
          <div>
            <h3>Enregistrement</h3>
            <p>Les paramètres sont conservés pour cette session navigateur.</p>
          </div>
          <button type="submit" className="primary-action">
            <Save size={17} />
            Enregistrer
          </button>
        </section>

        <section className="workspace-panel settings-health-panel">
          <div><CheckCircle2 size={16} /><span>API Gateway</span><strong>Actif</strong></div>
          <div><UsersRound size={16} /><span>Rôles</span><strong>3</strong></div>
          <div><KeyRound size={16} /><span>JWT</span><strong>HS256</strong></div>
        </section>
      </form>
    </div>
  );
}

export default Settings;
