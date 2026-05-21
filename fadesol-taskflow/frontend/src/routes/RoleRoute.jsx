import { Navigate, Outlet } from "react-router-dom";
import { normalizeRole } from "../context/AuthContext";
import AccessDenied from "../pages/AccessDenied";
import { useAuth } from "../context/AuthContext";

function RoleRoute({ allowedRoles = [] }) {
  const { currentUser, loading, token } = useAuth();

  if (loading) {
    return (
      <main className="session-loading-screen">
        <div>
          <strong>Fadesol TaskFlow</strong>
          <p>Vérification des permissions...</p>
        </div>
      </main>
    );
  }

  if (!token || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
  const currentRole = normalizeRole(currentUser.role);

  if (!normalizedAllowedRoles.includes(currentRole)) {
    return <AccessDenied />;
  }

  return <Outlet />;
}

export default RoleRoute;
