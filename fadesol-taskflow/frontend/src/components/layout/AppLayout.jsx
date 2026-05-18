import { useState } from "react";
import IconSidebar from "./IconSidebar";
import MainWorkspace from "./MainWorkspace";
import Topbar from "./Topbar";
import WorkspaceSidebar from "./WorkspaceSidebar";
import "../../styles/appLayout.css";

const services = [
  {
    id: "all",
    name: "All Tasks",
    initial: "A",
    subtitle: "Vue globale Fadesol",
    color: "purple",
  },
  { id: "commercial", name: "Commercial", initial: "C", color: "red" },
  { id: "technique", name: "Technique", initial: "T", color: "blue" },
  { id: "achat", name: "Achat", initial: "A", color: "violet" },
  { id: "magasin", name: "Magasin / Stock", initial: "M", color: "green" },
  {
    id: "comptabilite",
    name: "Comptabilité & Management",
    initial: "C",
    color: "indigo",
  },
  {
    id: "direction",
    name: "Direction / RH / Administration",
    initial: "D",
    color: "amber",
  },
];

const modules = [
  { id: "dashboard", name: "Dashboard", shortLabel: "Dash" },
  { id: "projects", name: "Projects", shortLabel: "Projets" },
  { id: "tasks", name: "Tasks", shortLabel: "Tâches" },
  { id: "subtasks", name: "Subtasks", shortLabel: "Sous" },
  { id: "users", name: "Users", shortLabel: "Users" },
  { id: "services", name: "Services", shortLabel: "Serv." },
  { id: "messaging", name: "Messaging", shortLabel: "Msg" },
  { id: "clickup", name: "ClickUp Integration", shortLabel: "ClickUp" },
  { id: "reporting", name: "Reporting", shortLabel: "Report" },
  { id: "settings", name: "Settings", shortLabel: "Config" },
];

function AppLayout({ currentUser }) {
  const [selectedService, setSelectedService] = useState(services[0]);
  const [selectedModule, setSelectedModule] = useState(modules[0]);
  const [showCreateNotice, setShowCreateNotice] = useState(false);

  function handleCreateClick() {
    setShowCreateNotice(true);
  }

  function handleSelectService(service) {
    setSelectedService(service);
    setSelectedModule(null);
    setShowCreateNotice(false);
  }

  function handleSelectModule(module) {
    setSelectedModule(module);
    setShowCreateNotice(false);
  }

  return (
    <div className="tf-app-layout">
      <IconSidebar
        modules={modules}
        selectedModule={selectedModule}
        onSelectModule={handleSelectModule}
      />
      <WorkspaceSidebar
        services={services}
        modules={modules}
        selectedService={selectedService}
        selectedModule={selectedModule}
        onSelectService={handleSelectService}
        onSelectModule={handleSelectModule}
        onCreateClick={handleCreateClick}
      />

      <section className="tf-app-shell">
        <Topbar currentUser={currentUser} />
        <MainWorkspace
          selectedService={selectedService}
          selectedModule={selectedModule}
          showCreateNotice={showCreateNotice}
          onCreateClick={handleCreateClick}
        />
      </section>
    </div>
  );
}

export default AppLayout;
