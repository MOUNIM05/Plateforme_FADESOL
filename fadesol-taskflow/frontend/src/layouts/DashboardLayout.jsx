import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import MainSidebar from "../components/dashboard/MainSidebar";
import { useAuth } from "../context/AuthContext";
import "../styles/dashboard.css";

const itemRoutes = {
  Dashboard: "/dashboard",
  Utilisateurs: "/users",
  Services: "/services",
  Projets: "/projects",
  Tâches: "/tasks",
  "Mes tâches": "/tasks",
  Messagerie: "/messages",
  "ClickUp Sync": "/clickup",
  Reporting: "/reporting",
  Paramètres: "/settings",
  Profile: "/profile",
};

function getActiveItem(pathname) {
  const match = Object.entries(itemRoutes).find(([, route]) => pathname.startsWith(route));

  return match?.[0] || "Dashboard";
}

function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeItem = getActiveItem(location.pathname);

  function handleSelect(itemLabel) {
    navigate(itemRoutes[itemLabel] || "/dashboard");
  }

  return (
    <div className={`dashboard-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <MainSidebar
        activeItem={activeItem}
        currentUser={currentUser}
        collapsed={sidebarCollapsed}
        onSelect={handleSelect}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
        onLogout={logout}
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
