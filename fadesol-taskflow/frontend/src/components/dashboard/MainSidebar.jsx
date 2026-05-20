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
  RefreshCw,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import fadesolLogo from "../../assets/fadesol-logo.png";
import energyIcon from "../../assets/fadesol-energy-icon.png";

const sections = [
  {
    title: "ORGANISATION",
    items: [
      { label: "Dashboard", icon: BarChart3 },
      { label: "Services", icon: Building2 },
      { label: "Utilisateurs", icon: UsersRound },
      { label: "Rôles & Permissions", icon: KeyRound },
    ],
  },
  {
    title: "PROJETS & TÂCHES",
    items: [
      { label: "Projets", icon: FolderKanban },
      { label: "Tâches", icon: ClipboardList },
      { label: "Sous-tâches", icon: ShieldCheck },
      { label: "Calendrier", icon: CalendarDays },
    ],
  },
  {
    title: "COMMUNICATION",
    items: [
      { label: "Messagerie", icon: MessageSquareText, badge: 4 },
      { label: "Notifications", icon: Bell, badge: 12 },
    ],
  },
  {
    title: "INTÉGRATION",
    items: [
      { label: "ClickUp Sync", icon: RefreshCw },
      { label: "Historique Sync", icon: History },
    ],
  },
  {
    title: "SYSTÈME",
    items: [
      { label: "Reporting", icon: BarChart3 },
      { label: "Paramètres", icon: Settings },
    ],
  },
];

function MainSidebar({ activeItem, currentUser, collapsed, onSelect, onToggleCollapse, onLogout }) {
  const fullName =
    currentUser?.first_name && currentUser?.last_name
      ? `${currentUser.first_name} ${currentUser.last_name}`
      : "Abdelmounim Maani";
  const role = currentUser?.role || "Administrateur";

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
        {sections.map((section) => (
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
        <div className="sidebar-avatar">AM</div>
        <div className="sidebar-profile__copy">
          <strong>{fullName}</strong>
          <span>{role}</span>
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
