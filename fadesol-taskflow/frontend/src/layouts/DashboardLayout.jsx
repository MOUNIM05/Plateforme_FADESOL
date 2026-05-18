import { useState } from "react";
import IconSidebar from "../components/dashboard/IconSidebar";
import MainSidebar from "../components/dashboard/MainSidebar";
import "../styles/dashboard.css";

function DashboardLayout({ children, currentUser, onLogout }) {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className={`ft-dashboard-layout ${darkMode ? "is-dark-preview" : ""} ${
        sidebarCollapsed ? "is-sidebar-collapsed" : ""
      }`}
    >
      <IconSidebar activeItem={activeItem} onSelect={setActiveItem} />
      <MainSidebar
        activeItem={activeItem}
        currentUser={currentUser}
        darkMode={darkMode}
        collapsed={sidebarCollapsed}
        onSelect={setActiveItem}
        onToggleDarkMode={() => setDarkMode((current) => !current)}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
        onLogout={onLogout}
      />
      <main className="ft-dashboard-main">{children}</main>
    </div>
  );
}

export default DashboardLayout;
