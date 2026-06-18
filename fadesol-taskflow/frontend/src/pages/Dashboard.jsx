// Aiguille vers le dashboard adapte au role de l'utilisateur connecte.
import AdminDashboard from "./AdminDashboard";
import EmployeeDashboard from "./EmployeeDashboard";
import ManagerDashboard from "./ManagerDashboard";
import { ROLES, normalizeRole, useAuth } from "../context/AuthContext";

function Dashboard() {
  // Admin, Manager et Employee ont chacun une vue d'accueil differente.
  const { currentUser } = useAuth();
  const role = normalizeRole(currentUser?.role);

  if (role === ROLES.MANAGER) {
    return <ManagerDashboard currentUser={currentUser} />;
  }

  if (role === ROLES.EMPLOYEE) {
    return <EmployeeDashboard currentUser={currentUser} />;
  }

  return <AdminDashboard currentUser={currentUser} />;
}

export default Dashboard;
