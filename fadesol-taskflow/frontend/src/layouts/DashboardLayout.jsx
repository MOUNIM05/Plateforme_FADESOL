import { cloneElement, isValidElement, useState } from "react";
import MainSidebar from "../components/dashboard/MainSidebar";
import "../styles/dashboard.css";

function DashboardLayout({ children, currentUser, onLogout }) {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className={`dashboard-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
    >
      <MainSidebar
        activeItem={activeItem}
        currentUser={currentUser}
        collapsed={sidebarCollapsed}
        onSelect={setActiveItem}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
        onLogout={onLogout}
      />
      <main className="dashboard-main">
        {isValidElement(children)
          ? cloneElement(children, { activeItem, onLogout })
          : children}
      </main>
    </div>
  );
}

export default DashboardLayout;
