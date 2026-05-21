import { KeyRound, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getInitials, getRoleLabel, useAuth } from "../context/AuthContext";
import { getMyUserProfile } from "../services/userService";

function formatDate(value) {
  if (!value) {
    return "Non disponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Profile() {
  const { currentUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const user = profile || currentUser;

  useEffect(() => {
    let isMounted = true;

    getMyUserProfile()
      .then((data) => {
        if (isMounted) {
          setProfile(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProfileError("Profil détaillé non encore créé dans la base utilisateurs.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const fullName =
    [user?.first_name || user?.prenom, user?.last_name || user?.nom]
      .filter(Boolean)
      .join(" ") || "Utilisateur Fadesol";

  return (
    <div className="dashboard-page profile-page">
      <div className="board-toolbar">
        <div>
          <h2>Mon profil</h2>
          <p>Informations du compte connecté et paramètres de sécurité.</p>
        </div>
        <button type="button" className="logout-action" onClick={logout}>
          <LogOut size={17} />
          Déconnexion
        </button>
      </div>

      <section className="profile-grid">
        <article className="workspace-panel profile-card-main">
          <div className="profile-avatar-large">{getInitials(user)}</div>
          <div>
            <h3>{fullName}</h3>
            <p>{user?.email}</p>
          </div>
          <span className="status-badge">
            <ShieldCheck size={14} />
            {getRoleLabel(user?.role)}
          </span>
        </article>

        {profileError && <p className="notice warning profile-notice">{profileError}</p>}

        <article className="workspace-panel info-card">
          <div className="panel-title">
            <h3>Détails du compte</h3>
          </div>
          <dl className="details-list">
            <div>
              <dt>Email</dt>
              <dd>{user?.email || "Non disponible"}</dd>
            </div>
            <div>
              <dt>Rôle</dt>
              <dd>{getRoleLabel(user?.role)}</dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{user?.service || user?.service_id || "Non affecté"}</dd>
            </div>
            <div>
              <dt>Statut</dt>
              <dd>{user?.is_enabled ?? user?.is_active ? "Actif" : "Désactivé"}</dd>
            </div>
            <div>
              <dt>Créé le</dt>
              <dd>{formatDate(user?.created_at)}</dd>
            </div>
          </dl>
        </article>

        <article className="workspace-panel info-card">
          <div className="panel-title">
            <h3>Sécurité</h3>
          </div>
          <div className="profile-actions">
            <button type="button" className="secondary-action">
              <UserRound size={17} />
              Modifier profil
            </button>
            <button type="button" className="secondary-action">
              <KeyRound size={17} />
              Changer mot de passe
            </button>
          </div>
          <p className="helper-text">
            Ces actions sont des placeholders frontend jusqu'à l'ajout des endpoints dédiés.
          </p>
        </article>

        <article className="workspace-panel info-card">
          <div className="panel-title">
            <h3>Activité</h3>
          </div>
          <div className="timeline-list">
            <div><Mail size={16} /><span>Session active sur Fadesol TaskFlow</span></div>
            <div><ShieldCheck size={16} /><span>Permissions appliquées selon le rôle</span></div>
            <div><UserRound size={16} /><span>Profil chargé depuis /auth/me</span></div>
          </div>
        </article>
      </section>
    </div>
  );
}

export default Profile;
