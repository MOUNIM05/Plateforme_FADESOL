import { Bell, Eye, Moon, Save, Settings as SettingsIcon, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { applyUserPreferences, loadUserPreferences, saveUserPreferences } from "../utils/userPreferences";

function PreferenceSwitch({ checked, description, label, name, onChange }) {
  return (
    <label className="settings-switch preference-switch">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} />
    </label>
  );
}

const languageOptions = [
  { value: "fr", label: "Français" },
  { value: "ar", label: "Arabe" },
  { value: "en", label: "Anglais" },
];

const timezoneOptions = [
  { value: "Africa/Casablanca", label: "Africa/Casablanca" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "UTC", label: "UTC" },
];

function getUserDisplayName(user) {
  return [user?.prenom || user?.first_name, user?.nom || user?.last_name].filter(Boolean).join(" ") || user?.email || "Utilisateur";
}

function UserSettings() {
  const { currentUser } = useAuth();
  const [preferences, setPreferences] = useState(() => loadUserPreferences(currentUser));
  const [message, setMessage] = useState("");

  const activePreferences = useMemo(
    () => Object.values(preferences).filter((value) => value === true).length,
    [preferences]
  );

  useEffect(() => {
    applyUserPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const accountPreferences = loadUserPreferences(currentUser);
    setPreferences(accountPreferences);
    applyUserPreferences(accountPreferences);
    setMessage("");
  }, [currentUser]);

  function handleChange(event) {
    const { name, type, checked, value } = event.target;

    setPreferences((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    const savedPreferences = saveUserPreferences(preferences, currentUser);
    applyUserPreferences(savedPreferences);
    setPreferences(savedPreferences);
    setMessage("Préférences enregistrées.");
  }

  return (
    <div className="dashboard-page settings-page user-settings-page">
      <div className="board-toolbar">
        <div>
          <h2>Paramètres</h2>
          <p>Préférences d'affichage et notifications de votre espace personnel.</p>
        </div>
      </div>

      {message && <p className="notice success">{message}</p>}

      <section className="settings-summary-grid" aria-label="Résumé paramètres personnels">
        <article className="workspace-panel settings-summary-card">
          <SettingsIcon size={20} />
          <span>Préférences actives</span>
          <strong>{activePreferences}</strong>
        </article>
        <article className="workspace-panel settings-summary-card">
          {preferences.theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
          <span>Mode</span>
          <strong>{preferences.theme === "dark" ? "Sombre" : "Clair"}</strong>
        </article>
        <article className="workspace-panel settings-summary-card">
          <Bell size={20} />
          <span>Notifications</span>
          <strong>{preferences.notificationsEnabled ? "Actives" : "Coupées"}</strong>
        </article>
        <article className="workspace-panel settings-summary-card">
          <Eye size={20} />
          <span>Affichage</span>
          <strong>{preferences.compactMode ? "Compact" : "Confort"}</strong>
        </article>
      </section>

      <form className="settings-layout user-settings-layout" onSubmit={handleSubmit}>
        <section className="workspace-panel settings-panel">
          <div className="panel-title">
            <h3>Apparence</h3>
            <span>Interface</span>
          </div>

          <div className="settings-form-grid">
            <label>
              Mode d'affichage
              <select name="theme" value={preferences.theme} onChange={handleChange}>
                <option value="light">Clair</option>
                <option value="dark">Sombre</option>
              </select>
            </label>
            <label>
              Langue
              <select name="language" value={preferences.language} onChange={handleChange}>
                {languageOptions.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Fuseau horaire
              <select name="timezone" value={preferences.timezone} onChange={handleChange}>
                {timezoneOptions.map((timezone) => (
                  <option key={timezone.value} value={timezone.value}>
                    {timezone.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="settings-switch-list">
            <PreferenceSwitch
              name="compactMode"
              label="Mode compact"
              description="Réduit l'espacement des listes et tableaux."
              checked={preferences.compactMode}
              onChange={handleChange}
            />
            <PreferenceSwitch
              name="showAvatars"
              label="Afficher les avatars"
              description="Affiche photos ou initiales dans les zones utilisateur."
              checked={preferences.showAvatars}
              onChange={handleChange}
            />
          </div>
        </section>

        <section className="workspace-panel settings-panel">
          <div className="panel-title">
            <h3>Notifications</h3>
            <span>Compte</span>
          </div>

          <div className="settings-switch-list">
            <PreferenceSwitch
              name="notificationsEnabled"
              label="Notifications activées"
              description="Autorise les notifications dans l'application."
              checked={preferences.notificationsEnabled}
              onChange={handleChange}
            />
            <PreferenceSwitch
              name="messageNotifications"
              label="Messages"
              description="Met en avant les nouveaux messages reçus."
              checked={preferences.messageNotifications}
              onChange={handleChange}
            />
            <PreferenceSwitch
              name="taskNotifications"
              label="Tâches"
              description="Met en avant les tâches affectées à votre compte."
              checked={preferences.taskNotifications}
              onChange={handleChange}
            />
          </div>
        </section>

        <section className="workspace-panel settings-panel">
          <div className="panel-title">
            <h3>Compte</h3>
            <span>Session connectée</span>
          </div>

          <div className="settings-form-grid">
            <label>
              Utilisateur
              <input value={getUserDisplayName(currentUser)} readOnly />
            </label>
            <label>
              Email
              <input value={currentUser?.email || ""} readOnly />
            </label>
          </div>
        </section>

        <section className="workspace-panel settings-save-panel">
          <div>
            <h3>Enregistrement</h3>
            <p>Ces préférences restent séparées de votre profil personnel.</p>
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

export default UserSettings;
