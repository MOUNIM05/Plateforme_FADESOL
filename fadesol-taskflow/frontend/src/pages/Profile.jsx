// Page Profil : informations du compte connecte, photo de profil et actions personnelles.
import { Camera, KeyRound, LogOut, Mail, Settings, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../services/api";
import { ROLES, getInitials, getRoleLabel, normalizeRole, useAuth } from "../context/AuthContext";
import { getMyUserProfile, uploadMyPhoto } from "../services/userService";

function formatDate(value) {
  if (!value) {
    return "Non renseigne";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Non renseigne";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getFullName(user) {
  return (
    [user?.prenom || user?.first_name, user?.nom || user?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "Utilisateur Fadesol"
  );
}

function resolvePhotoUrl(photoUrl) {
  // Convertit le chemin photo renvoye par l'API en URL exploitable par le navigateur.
  if (!photoUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(photoUrl)) {
    return photoUrl;
  }

  const origin = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${origin}${photoUrl.startsWith("/") ? photoUrl : `/${photoUrl}`}`;
}

function Profile() {
  // Le profil detaille complete les donnees deja presentes dans AuthContext.
  const { currentUser, logout, refreshCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const user = profile || currentUser;
  const role = normalizeRole(user?.role);
  const isAdmin = role === ROLES.ADMIN;
  const photoUrl = resolvePhotoUrl(user?.photo_url);

  useEffect(() => {
    // Recharge le profil metier courant depuis user_service.
    let isMounted = true;

    getMyUserProfile()
      .then((data) => {
        if (isMounted) {
          setProfile(data);
          setProfileError("");
        }
      })
      .catch((error) => {
        if (isMounted) {
          setProfileError(currentUser ? "" : error.response?.data?.detail || "Impossible de charger le profil utilisateur.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const accountRows = useMemo(
    // Lignes affichees dans la section details du compte.
    () => [
      ["Email", user?.email || "Non renseigne"],
      ["Role", getRoleLabel(user?.role)],
      ["Service", user?.service || user?.id_service || user?.service_id || "Non affecte"],
      ["Statut", user?.is_enabled ?? user?.est_actif ?? user?.is_active ? "Actif" : "Desactive"],
      ["Cree le", formatDate(user?.created_at || user?.date_creation)],
      ["Mis a jour le", formatDate(user?.updated_at || user?.date_modification)],
    ],
    [user]
  );

  async function handlePhotoChange(event) {
    // Controle l'upload photo via user_service puis rafraichit le contexte global.
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setMessage("");
    setProfileError("");

    try {
      const updatedProfile = await uploadMyPhoto(file);

      // Le backend renvoie normalement le profil complet mis a jour.
      setProfile(updatedProfile);

      // Met a jour le cache AuthContext et localStorage pour synchroniser toute l'interface.
      try {
        await refreshCurrentUser();
      } catch (e) {
        // Fallback : si le refresh echoue, on fusionne le profil retourne localement.
        const stored = JSON.parse(localStorage.getItem("current_user") || localStorage.getItem("user") || "null");

        if (stored) {
          const merged = { ...stored, ...updatedProfile };
          localStorage.setItem("current_user", JSON.stringify(merged));
          localStorage.setItem("user", JSON.stringify(merged));
        }
      }

      setMessage("Photo de profil mise a jour.");
    } catch (error) {
      setProfileError(error.response?.data?.detail || "Impossible de mettre a jour la photo.");
    } finally {
      event.target.value = "";
      setUploading(false);
    }
  }

  function handleLogout() {
    // Ferme la session puis renvoie vers la page de connexion.
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="dashboard-page profile-page">
      <div className="board-toolbar">
        <div>
          <h2>Parametres du compte</h2>
          <p>Profil personnel et informations du compte connecte.</p>
        </div>
        <button type="button" className="logout-action" onClick={handleLogout}>
          <LogOut size={17} />
          Déconnexion
        </button>
      </div>

      {message && <p className="notice success">{message}</p>}
      {profileError && <p className="notice error">{profileError}</p>}

      <section className="profile-grid">
        <article className="workspace-panel profile-card-main">
          <div className="profile-avatar-large profile-photo-frame">
            {photoUrl ? <img src={photoUrl} alt={getFullName(user)} /> : getInitials(user)}
          </div>
          <div>
            <h3>{getFullName(user)}</h3>
            <p>{user?.email || "Non renseigne"}</p>
          </div>
          <span className="status-badge">
            <ShieldCheck size={14} />
            {getRoleLabel(user?.role)}
          </span>
        </article>

        <article className="workspace-panel info-card">
          <div className="panel-title">
            <h3>Photo de profil</h3>
            <span>{uploading ? "Envoi..." : "JPG, JPEG, PNG"}</span>
          </div>
          <label className="photo-upload-action">
            <Camera size={17} />
            {uploading ? "Chargement..." : "Changer photo"}
            <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={handlePhotoChange} disabled={uploading} />
          </label>
        </article>

        <article className="workspace-panel info-card">
          <div className="panel-title">
            <h3>Details du compte</h3>
          </div>
          <dl className="details-list">
            {accountRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </article>

        {isAdmin && (
          <article className="workspace-panel info-card">
            <div className="panel-title">
              <h3>Actions administrateur</h3>
              <span>Gestion globale</span>
            </div>
            <div className="profile-actions">
              <button type="button" className="secondary-action" onClick={() => navigate("/users")}>
                <UsersRound size={17} />
                Gerer utilisateurs
              </button>
              <button type="button" className="secondary-action" onClick={() => navigate("/system-settings")}>
                <Settings size={17} />
                Parametres systeme
              </button>
            </div>
          </article>
        )}

        <article className="workspace-panel info-card">
          <div className="panel-title">
            <h3>Securite</h3>
          </div>
          <div className="timeline-list">
            <div><Mail size={16} /><span>Session active sur Fadesol TaskFlow</span></div>
            <div><ShieldCheck size={16} /><span>Permissions appliquees selon votre role</span></div>
            <div><UserRound size={16} /><span>Profil charge depuis le service utilisateurs</span></div>
            {isAdmin && <div><KeyRound size={16} /><span>Modification des acces via la gestion utilisateurs</span></div>}
          </div>
        </article>
      </section>
    </div>
  );
}

export default Profile;
