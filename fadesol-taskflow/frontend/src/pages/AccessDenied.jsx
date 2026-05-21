import { AlertTriangle, ArrowLeft, ShieldX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getRoleLabel, useAuth } from "../context/AuthContext";

function AccessDenied() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  return (
    <section className="access-denied dashboard-page">
      <div className="board-toolbar">
        <div>
          <h2>Accès refusé</h2>
          <p>
            Votre rôle {getRoleLabel(currentUser?.role)} ne permet pas d'ouvrir cette
            section.
          </p>
        </div>
        <button type="button" className="secondary-action" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={17} />
          Retour dashboard
        </button>
      </div>

      <article className="workspace-panel empty-state-panel">
        <div className="empty-state-icon">
          <ShieldX size={34} />
        </div>
        <h3>Permission nécessaire</h3>
        <p>
          Cette page est protégée pour garder les données internes Fadesol séparées selon
          les responsabilités de chaque utilisateur.
        </p>
        <span className="status-badge">
          <AlertTriangle size={14} />
          RBAC actif
        </span>
      </article>
    </section>
  );
}

export default AccessDenied;
