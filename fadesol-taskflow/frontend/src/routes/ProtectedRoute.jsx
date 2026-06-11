import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute() {
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
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
