// Route de garde : exige une session valide avant d'afficher l'espace applicatif.
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute() {
  // La route attend la fin du chargement pour eviter une redirection prematuree.
  const { currentUser, loading, token } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="session-loading-screen">
        <div>
          <strong>Fadesol TaskFlow</strong>
          <p>Chargement de votre espace...</p>
        </div>
      </main>
    );
  }

  if (!token || !currentUser) {
    // L'URL d'origine est conservee pour un retour possible apres connexion.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
