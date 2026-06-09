import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, ROLES, useAuth } from "./context/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";
import AccessDenied from "./pages/AccessDenied";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Messages from "./pages/Messages";
import ModulePage from "./pages/ModulePage";
import Profile from "./pages/Profile";
import Projects from "./pages/Projects";
import Users from "./pages/Users";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";

const moduleCards = {
  services: [
    { title: "Services actifs", meta: "Admin / Manager", text: "Vue d'ensemble des services Fadesol. La gestion complète sera reliée à l'API services." },
    { title: "Responsables", text: "Les managers pourront suivre les membres et la charge de leur service." },
  ],
  projects: [
    { title: "Portefeuille projets", meta: "Bientôt API", text: "Liste, statuts et priorités des projets Fadesol à connecter au service projets." },
    { title: "Suivi opérationnel", text: "Prévu pour afficher délais, avancement et tâches liées." },
  ],
  tasks: [
    { title: "Tâches", meta: "Tous rôles", text: "Les employés verront leurs propres tâches, les managers celles de leur service." },
    { title: "Priorités", text: "Les statuts et deadlines seront synchronisés avec l'API tâches." },
  ],
  messages: [
    { title: "Messagerie interne", meta: "Tous rôles", text: "Espace de communication à brancher sur le message_service." },
    { title: "Notifications", text: "Les alertes utiles par rôle seront affichées ici." },
  ],
  clickup: [
    { title: "Synchronisation ClickUp", meta: "Admin", text: "Configuration, historique et relance des synchronisations ClickUp." },
    { title: "Dernier état", text: "Les métriques seront alimentées par le clickup_service." },
  ],
  reporting: [
    { title: "Reporting", meta: "Admin / Manager", text: "Tableaux d'analyse globale pour Admin et vue limitée pour Manager." },
    { title: "Exports", text: "Les exports PFE pourront être ajoutés après les endpoints statistiques." },
  ],
  settings: [
    { title: "Paramètres système", meta: "Admin", text: "Configuration globale réservée aux Administrateurs." },
    { title: "Sécurité", text: "Gestion future des politiques et préférences de la plateforme." },
  ],
};

function AuthRedirect() {
  const { isAuthenticated, loading } = useAuth();

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

  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]} />}>
            <Route path="/users" element={<Users />} />
            <Route
              path="/services"
              element={<ModulePage type="services" title="Services" description="Organisation des services Fadesol." cards={moduleCards.services} />}
            />
            <Route
              path="/projects"
              element={<Projects />}
            />
            <Route
              path="/reporting"
              element={<ModulePage type="reporting" title="Reporting" description="Indicateurs et analyses par rôle." cards={moduleCards.reporting} />}
            />
          </Route>
          <Route
            path="/tasks"
            element={<ModulePage type="tasks" title="Tâches" description="Suivi des tâches selon votre périmètre." cards={moduleCards.tasks} />}
          />
          <Route
            path="/messages"
            element={<Messages />}
          />
          <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route
              path="/clickup"
              element={<ModulePage type="clickup" title="ClickUp Sync" description="Configuration et supervision de la synchronisation ClickUp." cards={moduleCards.clickup} />}
            />
            <Route
              path="/settings"
              element={<ModulePage type="settings" title="Paramètres" description="Paramètres globaux de la plateforme." cards={moduleCards.settings} />}
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
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
