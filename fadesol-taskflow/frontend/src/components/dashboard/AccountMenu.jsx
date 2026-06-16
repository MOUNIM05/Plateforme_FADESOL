import { LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInitials, getRoleLabel, useAuth } from "../../context/AuthContext";
import { API_BASE_URL } from "../../services/api";

function getDisplayName(user) {
  return (
    [user?.prenom || user?.first_name, user?.nom || user?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "Utilisateur"
  );
}

function resolvePhotoUrl(photoUrl) {
  if (!photoUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(photoUrl)) {
    return photoUrl;
  }

  const origin = API_BASE_URL.replace(/\/api\/?$/, "");
  return `${origin}${photoUrl.startsWith("/") ? photoUrl : `/${photoUrl}`}`;
}

function AccountMenu({ currentUser, compact = false }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const menuRef = useRef(null);
  const photoUrl = resolvePhotoUrl(currentUser?.photo_url);

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  function openProfile() {
    setOpen(false);
    navigate("/profile");
  }

  function handleLogout() {
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={`account-menu ${compact ? "is-compact" : ""}`} ref={menuRef}>
      <button
        type="button"
        className="account-menu__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="account-menu__avatar">
          {photoUrl && !imageFailed ? (
            <img src={photoUrl} alt={getDisplayName(currentUser)} onError={() => setImageFailed(true)} />
          ) : (
            getInitials(currentUser)
          )}
        </span>
        {!compact && (
          <span className="account-menu__identity">
            <strong>{getDisplayName(currentUser)}</strong>
            <small>{getRoleLabel(currentUser?.role)}</small>
          </span>
        )}
      </button>

      {open && (
        <div className="account-menu__dropdown" role="menu">
          <button type="button" onClick={openProfile} role="menuitem">
            <UserRound size={16} />
            Mon profil
          </button>
          <button type="button" onClick={handleLogout} role="menuitem">
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
