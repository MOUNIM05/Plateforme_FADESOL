import { BarChart3, CalendarDays, Kanban, LayoutList, Plus } from "lucide-react";
import EmptyState from "./EmptyState";
import ModuleOverview from "./ModuleOverview";
import TaskBoardPreview from "./TaskBoardPreview";

const views = [
  { label: "List", icon: LayoutList },
  { label: "Board", icon: Kanban },
  { label: "Calendar", icon: CalendarDays },
  { label: "Dashboard", icon: BarChart3 },
];

function MainWorkspace({ selectedService, selectedModule, showCreateNotice, onCreateClick }) {
  const showBoard = !selectedModule && selectedService.id === "all";
  const title = selectedModule
    ? selectedModule.name
    : "Fadesol Power Solutions Workspace";
  const subtitle = selectedModule
    ? "Module fonctionnel Fadesol TaskFlow"
    : selectedService.name;

  return (
    <main className="tf-main-workspace">
      <section className="tf-workspace-header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </section>

      <nav className="tf-view-tabs">
        {views.map((view, index) => {
          const Icon = view.icon;

          return (
            <button
              type="button"
              key={view.label}
              className={index === 1 && showBoard ? "is-active" : ""}
            >
              <Icon size={16} />
              {view.label}
            </button>
          );
        })}
        <button type="button">
          <Plus size={16} />
          View
        </button>
      </nav>

      {showCreateNotice && (
        <div className="tf-create-notice">
          Liste prête à être créée. Cette action sera connectée au module Tasks dans le prochain sprint.
        </div>
      )}

      <div className="tf-workspace-body">
        <section className="tf-workspace-primary">
          {showBoard ? (
            <TaskBoardPreview />
          ) : selectedModule ? (
            <ModuleOverview module={selectedModule} />
          ) : (
            <EmptyState selectedService={selectedService} onCreateClick={onCreateClick} />
          )}
        </section>

      </div>
    </main>
  );
}

export default MainWorkspace;
