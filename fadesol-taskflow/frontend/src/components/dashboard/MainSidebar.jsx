import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  History,
  KeyRound,
  LogOut,
  MessageSquareText,
  Moon,
  RefreshCw,
  Settings,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import fadesolLogo from "../../assets/fadesol-logo.png";
import energyIcon from "../../assets/fadesol-energy-icon.png";

const sections = [
  {
    title: "Organisation",
    items: [
      { label: "Dashboard", icon: BarChart3 },
      { label: "Services", icon: Building2 },
      { label: "Utilisateurs", icon: UsersRound },
      { label: "Rôles & Permissions", icon: KeyRound },
    ],
  },
  {
    title: "Projets & Tâches",
    items: [
      { label: "Projets", icon: FolderKanban },
      { label: "Tâches", icon: ClipboardList },
      { label: "Sous-tâches", icon: UserRoundCog },
      { label: "Calendrier", icon: CalendarDays },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Messagerie", icon: MessageSquareText },
      { label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Intégration",
    items: [
      { label: "ClickUp Sync", icon: RefreshCw },
      { label: "Historique Sync", icon: History },
    ],
  },
  {
    title: "Système",
    items: [
      { label: "Reporting", icon: BarChart3 },
      { label: "Paramètres", icon: Settings },
    ],
  },
];

function MainSidebar({
  activeItem,
  currentUser,
  darkMode,
  collapsed,
  onSelect,
  onToggleDarkMode,
  onToggleCollapse,
  onLogout,
}) {
  const fullName =
    currentUser?.first_name && currentUser?.last_name
      ? `${currentUser.first_name} ${currentUser.last_name}`
      : "Abdelmounim Maani";

  return (
    <aside className={`ft-main-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      <header className="ft-main-sidebar__brand">
        <div className="ft-sidebar-branding">
          {collapsed ? (
            <img
              src={energyIcon}
              alt="Fadesol energy"
              className="sidebar-logo-icon"
            />
          ) : (
            <img
              src={fadesolLogo}
              alt="Fadesol Power Solutions"
              className="sidebar-logo-full"
            />
          )}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Déplier la navigation" : "Réduire la navigation"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </header>

      <div className="ft-main-sidebar__sections">
        {sections.map((section) => (
          <section key={section.title} className="ft-menu-section">
            <h3>{section.title}</h3>
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
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </section>
        ))}

        <button
          type="button"
          className="ft-dark-toggle"
          onClick={onToggleDarkMode}
          title={collapsed ? "Dark mode" : undefined}
        >
          <span>
            <Moon size={18} />
            <span>Dark mode</span>
          </span>
          <i className={darkMode ? "is-on" : ""} />
        </button>
      </div>

      <footer className="ft-sidebar-user">
        <div className="ft-user-avatar">AM</div>
        <div className="ft-sidebar-user__text">
          <strong>{fullName}</strong>
          <span>{currentUser?.role || "Administrateur"}</span>
        </div>
        <button type="button" onClick={onLogout} title="Log out">
          <LogOut size={18} />
        </button>
      </footer>
    </aside>
  );
}

export default MainSidebar;
