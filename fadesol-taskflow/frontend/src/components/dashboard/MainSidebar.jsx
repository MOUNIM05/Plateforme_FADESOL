import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  KeyRound,
  MessageSquareText,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import fadesolLogo from "../../assets/fadesol-logo.png";
import energyIcon from "../../assets/fadesol-energy-icon.png";
import { ROLES, normalizeRole, useAuth } from "../../context/AuthContext";
import AccountMenu from "./AccountMenu";

const sections = [
  {
    title: "ORGANISATION",
    items: [
      { label: "Dashboard", icon: BarChart3, permission: "dashboard.view" },
      { label: "Services", icon: Building2, permission: "services.view" },
      { label: "Utilisateurs", icon: UsersRound, permission: "users.view" },
    ],
  },
  {
    title: "PROJETS & TACHES",
    items: [
      { label: "Projets", icon: FolderKanban, permission: "projects.view" },
      { label: "Taches", icon: ClipboardList, permission: "tasks.view" },
      { label: "Mes taches", icon: ShieldCheck, roles: [ROLES.MANAGER, ROLES.EMPLOYEE] },
    ],
  },
  {
    title: "COMMUNICATION",
    items: [
      {
        label: "Messagerie",
        icon: MessageSquareText,
        permission: "messages.view",
      },
    ],
  },
  {
    title: "SYSTEME",
    items: [
      { label: "Permissions", icon: KeyRound, roles: [ROLES.ADMIN], permission: "settings.permissions.manage" },
      { label: "Parametres", icon: Settings },
    ],
  },
];

function MainSidebar({ activeItem, currentUser, collapsed, onSelect, onToggleCollapse }) {
  const { hasPermission } = useAuth();
  const role = normalizeRole(currentUser?.role);
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const hasAllowedRole = item.roles?.includes(role) ?? true;

        if (!hasAllowedRole) {
          return false;
        }

        if (item.permission) {
          return hasPermission(item.permission);
        }

        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="main-sidebar">
      <header className="sidebar-brand">
        <div className="sidebar-brand__identity">
          {collapsed ? (
            <img src={energyIcon} alt="Fadesol energy" className="sidebar-logo-icon" />
          ) : (
            <>
              <img src={fadesolLogo} alt="Fadesol Power Solutions" className="sidebar-logo-full" />
              <div>
                <strong>Fadesol TaskFlow</strong>
                <span>Workspace interne</span>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="sidebar-collapse"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Deplier la navigation" : "Reduire la navigation"}
          title={collapsed ? "Deplier" : "Reduire"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </header>

      <nav className="sidebar-nav" aria-label="Navigation principale">
        {visibleSections.map((section) => (
          <section key={section.title} className="sidebar-section">
            <h3>{section.title}</h3>
            <div className="sidebar-section__items">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = activeItem === item.label;

                return (
                  <button
                    key={item.label}
                    type="button"
                    className={active ? "is-active" : ""}
                    onClick={() => onSelect(item.label)}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={20} />
                    <span className="sidebar-link-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <footer className="sidebar-profile">
        <AccountMenu currentUser={currentUser} compact={collapsed} />
      </footer>
    </aside>
  );
}

export default MainSidebar;
