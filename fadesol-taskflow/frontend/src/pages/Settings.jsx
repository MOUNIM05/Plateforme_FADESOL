// Page Parametres : preferences locales de plateforme et preferences
// utilisateur comme le theme, les notifications et l'affichage compact.
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Clock3,
  Database,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  ToggleLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { applyUserPreferences, loadUserPreferences, saveUserPreferences } from "../utils/userPreferences";
  


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
  // Les parametres plateforme sont locaux au navigateur pour la soutenance/demo.
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function SettingSwitch({ checked, label, name, onChange }) {
  // Controle reutilisable pour les options booleennes des parametres.
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
  const { currentUser } = useAuth();

  const [settings, setSettings] = useState(loadSettings);
  const [preferences, setPreferences] = useState(() => loadUserPreferences(currentUser));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  

  const activeSecurityRules = useMemo(() => {
    // Resume visuel des regles de securite activees dans la configuration locale.
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

  useEffect(() => {
    applyUserPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const accountPreferences = loadUserPreferences(currentUser);
    setPreferences(accountPreferences);
    applyUserPreferences(accountPreferences);
    setMessage("");
  }, [currentUser]);

  function handlePrefChange(event) {
    const { name, value, type, checked } = event.target;

    setPreferences((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setMessage("");
    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    localStorage.setItem(storageKey, JSON.stringify(settings));

    // Sauvegarde des préférences utilisateur (mode d'affichage)
    try {
      const savedPreferences = saveUserPreferences(preferences, currentUser);
      applyUserPreferences(savedPreferences);
      setPreferences(savedPreferences);
    } catch (e) {
      console.error(e);
    }

    setMessage("Paramètres enregistrés.");
    setError("");
  }

  function resetSettings() {
    setSettings(defaultSettings);
    localStorage.setItem(storageKey, JSON.stringify(defaultSettings));
    setMessage("Paramètres réinitialisés.");
    setError("");
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
          <strong>{preferences?.theme === "dark" ? "Sombre" : "Clair"}</strong>
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
              Mode d'affichage
              <select name="theme" value={preferences.theme} onChange={handlePrefChange}>
                <option value="light">Clair</option>
                <option value="dark">Sombre</option>
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

        
      </form>
    </div>
  );
}

export default Settings;
