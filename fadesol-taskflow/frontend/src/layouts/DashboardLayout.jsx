// Layout principal de l'espace connecte : sidebar, contenu et routage interne.
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import MainSidebar from "../components/dashboard/MainSidebar";
import { getDashboardPath, useAuth } from "../context/AuthContext";
import "../styles/dashboard.css";

const itemRoutes = {
  Dashboard: "/dashboard",
  Utilisateurs: "/users",
  Services: "/services",
  Projets: "/projects",
  Taches: "/tasks",
  "Mes taches": "/my-tasks",
  Messagerie: "/messages",
  Permissions: "/permissions",
  Parametres: "/settings",
};

function getActiveItem(pathname) {
  // Determine l'element actif de la sidebar a partir de l'URL courante.
  if (pathname.startsWith("/permissions")) {
    return "Permissions";
  }

  if (pathname.startsWith("/settings")) {
    return "Parametres";
  }

  const match = Object.entries(itemRoutes).find(([, route]) => pathname.startsWith(route));

  return match?.[0] || "Dashboard";
}

function DashboardLayout() {
  // La sidebar reste locale au layout pour conserver son etat entre les pages.
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeItem = getActiveItem(location.pathname);

  function handleSelect(itemLabel) {
    // Convertit un libelle de menu en route React.
    navigate(itemRoutes[itemLabel] || getDashboardPath(currentUser));
  }

  return (
    <div className={`dashboard-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <MainSidebar
        activeItem={activeItem}
        currentUser={currentUser}
        collapsed={sidebarCollapsed}
        onSelect={handleSelect}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
      />
      <main className="dashboard-main">
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
