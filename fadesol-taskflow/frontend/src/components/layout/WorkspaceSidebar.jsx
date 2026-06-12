import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  FolderKanban,
  Gauge,
  GitBranch,
  KanbanSquare,
  MessageSquareReply,
  MessageSquareText,
  PieChart,
  Plus,
  PlusCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users,
} from "lucide-react";

const moduleIcons = {
  dashboard: BarChart3,
  projects: FolderKanban,
  tasks: ClipboardList,
  subtasks: GitBranch,
  users: Users,
  services: Building2,
  messaging: MessageSquareText,
  reporting: FileText,
  settings: Settings,
};

const moduleSubFunctions = {
  dashboard: [
    { label: "Statistiques globales", icon: Gauge },
    { label: "Tâches par statut", icon: PieChart },
    { label: "Vue par service", icon: Building2 },
  ],
  projects: [
    { label: "Liste des projets", icon: FolderKanban },
    { label: "Créer un projet", icon: PlusCircle },
    { label: "Suivi progression", icon: KanbanSquare },
  ],
  tasks: [
    { label: "Liste des tâches", icon: ClipboardList },
    { label: "Créer une tâche", icon: PlusCircle },
    { label: "Changer statut", icon: RefreshCw },
  ],
  subtasks: [
    { label: "Sous-tâches", icon: GitBranch },
    { label: "Créer sous-tâche", icon: PlusCircle },
  ],
  users: [
    { label: "Liste utilisateurs", icon: Users },
    { label: "Créer utilisateur", icon: UserCog },
    { label: "Rôles & accès", icon: ShieldCheck },
  ],
  services: [
    { label: "Services Fadesol", icon: Building2 },
    { label: "Membres service", icon: Users },
    { label: "Statistiques service", icon: BarChart3 },
  ],
  messaging: [
    { label: "Conversations", icon: MessageSquareText },
    { label: "Messages internes", icon: MessageSquareReply },
  ],
  reporting: [
    { label: "Rapports activité", icon: FileText },
    { label: "Tâches en retard", icon: CalendarDays },
  ],
  settings: [
    { label: "Paramètres", icon: SlidersHorizontal },
    { label: "Sécurité", icon: ShieldCheck },
  ],
};

function WorkspaceSidebar({
  modules,
  selectedModule,
  onSelectModule,
  onCreateClick,
}) {
  return (
    <aside className="tf-workspace-sidebar">
      <div className="tf-workspace-switcher">
        <span className="tf-workspace-switcher__logo">F</span>
        <div>
          <strong>Fadesol Workspace</strong>
          <small>Fadesol TaskFlow</small>
        </div>
        <ChevronDown size={16} />
      </div>

      <div className="tf-sidebar-title-row">
        <h2>Home</h2>
        <button type="button" onClick={onCreateClick}>
          <Plus size={18} />
          Create
        </button>
      </div>

      <section className="tf-sidebar-section tf-sidebar-section--first">
        <h3>Modules Fadesol</h3>
        <div className="tf-modules-list">
          {modules.map((module) => {
            const Icon = moduleIcons[module.id] ?? FolderKanban;
            const isActive = selectedModule?.id === module.id;
            const subFunctions = moduleSubFunctions[module.id] ?? [];

            return (
              <div key={module.id} className="tf-module-group">
                <button
                  type="button"
                  className={`tf-module-item ${isActive ? "is-active" : ""}`}
                  onClick={() => onSelectModule(module)}
                >
                  <Icon size={17} />
                  {module.name}
                </button>

                {isActive && (
                  <div className="tf-subfunctions-list">
                    {subFunctions.map((subFunction) => {
                      const SubIcon = subFunction.icon;

                      return (
                        <button
                          key={subFunction.label}
                          type="button"
                          className="tf-subfunction-item"
                        >
                          <SubIcon size={14} />
                          {subFunction.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}

export default WorkspaceSidebar;
