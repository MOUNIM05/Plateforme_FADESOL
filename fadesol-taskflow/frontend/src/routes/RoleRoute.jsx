// Route de garde : controle les roles et permissions avant d'afficher un module.
import { Navigate, Outlet } from "react-router-dom";
import { normalizeRole } from "../context/AuthContext";
import AccessDenied from "../pages/AccessDenied";
import { useAuth } from "../context/AuthContext";

function RoleRoute({ allowedPermissions = [], allowedRoles = [] }) {
  // Les pages peuvent etre autorisees par role, par permission, ou par les deux.
  const { currentUser, hasAnyPermission, loading, token } = useAuth();

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
  // Le controle reste souple pour supporter les permissions fines configurees par l'Admin.
  const hasAllowedRole = normalizedAllowedRoles.includes(currentRole);
  const hasAllowedPermission = allowedPermissions.length > 0 && hasAnyPermission(allowedPermissions);

  if (!hasAllowedRole && !hasAllowedPermission) {
    return <AccessDenied />;
  }

  return <Outlet />;
}

export default RoleRoute;
