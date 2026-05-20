import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import IconSidebar from "../components/dashboard/IconSidebar";
import MainSidebar from "../components/dashboard/MainSidebar";
import "../styles/dashboard.css";

const itemRoutes = {
  Dashboard: "/",
  Utilisateurs: "/users",
};

function getActiveItem(pathname) {
  if (pathname.startsWith("/users")) {
    return "Utilisateurs";
  }

  return "Dashboard";
}

function DashboardLayout({ children, currentUser, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeItem = getActiveItem(location.pathname);

  function handleSelect(itemLabel) {
    const route = itemRoutes[itemLabel];

    if (route) {
      navigate(route);
    }
  }

  return (
    <div
      className={`ft-dashboard-layout ${darkMode ? "is-dark-preview" : ""} ${
        sidebarCollapsed ? "is-sidebar-collapsed" : ""
      }`}
    >
      <IconSidebar activeItem={activeItem} onSelect={handleSelect} />
      <MainSidebar
        activeItem={activeItem}
        currentUser={currentUser}
        darkMode={darkMode}
        collapsed={sidebarCollapsed}
        onSelect={handleSelect}
        onToggleDarkMode={() => setDarkMode((current) => !current)}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
        onLogout={onLogout}
      />
      <main className="ft-dashboard-main">{children}</main>
    </div>
  );
}

export default DashboardLayout;
