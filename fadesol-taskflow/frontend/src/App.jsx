// Definition centrale des routes React et des protections d'acces.
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, ROLES, getDashboardPath, useAuth } from "./context/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";
import AccessDenied from "./pages/AccessDenied";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/LoginPage";
import Messages from "./pages/Messages";
import MyTasks from "./pages/MyTasks";
import Notifications from "./pages/Notifications";
import Permissions from "./pages/Permissions";
import Profile from "./pages/Profile";
import Projects from "./pages/Projects";
import Services from "./pages/Services";
import Tasks from "./pages/Tasks";
import Users from "./pages/Users";
import UserSettings from "./pages/UserSettings";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

function AuthRedirect() {
  // Redirige la racine selon l'etat de session courant.
  const { currentUser, isAuthenticated, loading } = useAuth();

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

  return <Navigate to={isAuthenticated ? getDashboardPath(currentUser) : "/login"} replace />;
}

function AppRoutes() {
  // Les routes sensibles sont encapsulees par ProtectedRoute puis RoleRoute si necessaire.
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route element={<RoleRoute allowedPermissions={["dashboard.view"]} />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
          <Route path="/profile" element={<Profile />} />
          <Route element={<RoleRoute allowedPermissions={["users.view"]} />}>
            <Route path="/users" element={<Users />} />
          </Route>
          <Route element={<RoleRoute allowedPermissions={["services.view"]} />}>
            <Route
              path="/services"
              element={<Services />}
            />
          </Route>
          <Route element={<RoleRoute allowedPermissions={["projects.view"]} />}>
            <Route
              path="/projects"
              element={<Projects />}
            />
          </Route>
          <Route element={<RoleRoute allowedRoles={[ROLES.MANAGER, ROLES.EMPLOYEE]} />}>
            <Route path="/my-tasks" element={<MyTasks />} />
          </Route>
          <Route element={<RoleRoute allowedPermissions={["tasks.view"]} />}>
            <Route path="/tasks" element={<Tasks />} />
          </Route>
          <Route element={<RoleRoute allowedPermissions={["messages.view"]} />}>
            <Route
              path="/messages"
              element={<Messages />}
            />
          </Route>
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<UserSettings />} />
          <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN]} allowedPermissions={["settings.permissions.manage"]} />}>
            <Route
              path="/permissions"
              element={<Permissions />}
            />
          </Route>
          <Route path="/access-denied" element={<AccessDenied />} />
        </Route>
      </Route>
      <Route path="/" element={<AuthRedirect />} />
      <Route path="*" element={<AuthRedirect />} />
    </Routes>
  );
}

function App() {
  // BrowserRouter fournit la navigation, AuthProvider fournit la session a toute l'application.
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
