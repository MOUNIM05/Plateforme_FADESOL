import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  KeyRound,
  LogOut,
  MessageSquareText,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import fadesolLogo from "../../assets/fadesol-logo.png";
import energyIcon from "../../assets/fadesol-energy-icon.png";
import { ROLES, getInitials, getRoleLabel, normalizeRole, useAuth } from "../../context/AuthContext";

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
    title: "PROJETS & TÂCHES",
    items: [
      { label: "Projets", icon: FolderKanban, permission: "projects.view" },
      { label: "Tâches", icon: ClipboardList, permission: "tasks.view" },
      { label: "Mes tâches", icon: ShieldCheck, roles: [ROLES.EMPLOYEE] },
    ],
  },
  {
    title: "COMMUNICATION",
    items: [
      { label: "Messagerie", icon: MessageSquareText, badge: 4, permission: "messages.view" },
    ],
  },
  {
    title: "INTÉGRATION",
    items: [
    ],
  },
  {
    title: "SYSTÈME",
    items: [
      { label: "Paramètres", icon: Settings, permission: "settings.view" },
      { label: "Profile", icon: KeyRound, roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE] },
    ],
  },
];

function MainSidebar({ activeItem, currentUser, collapsed, onSelect, onToggleCollapse, onLogout }) {
  const { hasPermission } = useAuth();
  const fullName =
    currentUser?.prenom && currentUser?.nom
      ? `${currentUser.prenom} ${currentUser.nom}`
      : currentUser?.email || "Utilisateur Fadesol";
  const role = normalizeRole(currentUser?.role);
  const initials = getInitials(currentUser);
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.permission) {
          return hasPermission(item.permission);
        }

        return item.roles.includes(role);
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
          aria-label={collapsed ? "Déplier la navigation" : "Réduire la navigation"}
          title={collapsed ? "Déplier" : "Réduire"}
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
                    {item.badge ? <b>{item.badge}</b> : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <footer className="sidebar-profile">
        <div className="sidebar-avatar">{initials}</div>
        <div className="sidebar-profile__copy">
          <strong>{fullName}</strong>
          <span>{getRoleLabel(role)}</span>
        </div>
        <button type="button" onClick={onLogout} title="Se déconnecter" aria-label="Se déconnecter">
          <LogOut size={18} />
          <span>Se déconnecter</span>
        </button>
      </footer>
    </aside>
  );
}

export default MainSidebar;
