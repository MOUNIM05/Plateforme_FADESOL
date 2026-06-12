import {
  BarChart3,
  BellDot,
  FolderKanban,
  GitBranch,
  MessageSquare,
  Settings,
  ShieldCheck,
  SquareCheckBig,
  Rocket,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";

const moduleIconMap = {
  dashboard: BarChart3,
  projects: FolderKanban,
  tasks: SquareCheckBig,
  subtasks: GitBranch,
  users: Users,
  services: Wrench,
  messaging: MessageSquare,
  reporting: BellDot,
  settings: Settings,
};

function IconSidebar({ modules, selectedModule, onSelectModule }) {
  return (
    <aside className="tf-icon-sidebar" aria-label="Navigation principale">
      <div className="tf-brand-mark">F</div>

      <nav className="tf-icon-nav">
        {modules.map((module) => {
          const Icon = moduleIconMap[module.id] ?? ShieldCheck;

          return (
            <button
              key={module.id}
              type="button"
              className={`tf-icon-nav__item ${
                selectedModule?.id === module.id ? "is-active" : ""
              }`}
              onClick={() => onSelectModule(module)}
              title={module.name}
            >
              <span>
                <Icon size={20} strokeWidth={2.2} />
              </span>
              <small>{module.shortLabel}</small>
            </button>
          );
        })}
      </nav>

      <div className="tf-icon-sidebar__bottom">
        <button type="button" className="tf-icon-nav__item">
          <span>
            <UserPlus size={20} strokeWidth={2.2} />
          </span>
          <small>Invite</small>
        </button>
        <button type="button" className="tf-icon-nav__item">
          <span>
            <Rocket size={20} strokeWidth={2.2} />
          </span>
          <small>Upgrade</small>
        </button>
      </div>
    </aside>
  );
}

export default IconSidebar;
