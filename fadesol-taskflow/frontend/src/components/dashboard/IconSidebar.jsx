import {
  BarChart3,
  Building2,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
  SquareCheckBig,
  UsersRound,
} from "lucide-react";
import energyIcon from "../../assets/fadesol-energy-icon.png";

const iconItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Services", icon: Building2 },
  { label: "Projets", icon: FolderKanban },
  { label: "Tâches", icon: SquareCheckBig },
  { label: "Utilisateurs", icon: UsersRound },
  { label: "Messagerie", icon: MessageSquareText },
  { label: "Reporting", icon: BarChart3 },
  { label: "Paramètres", icon: Settings },
];

function IconSidebar({ activeItem, onSelect }) {
  return (
    <aside className="ft-icon-sidebar" aria-label="Navigation rapide">
      <div className="ft-icon-sidebar__mark">
        <img src={energyIcon} alt="Fadesol energy" />
      </div>

      <nav className="ft-icon-sidebar__nav">
        {iconItems.map((item) => {
          const Icon = item.icon;
          const active = activeItem === item.label;

          return (
            <button
              key={item.label}
              type="button"
              className={active ? "is-active" : ""}
              onClick={() => onSelect(item.label)}
              title={item.label}
            >
              <Icon size={21} />
            </button>
          );
        })}
      </nav>

      <div className="ft-icon-sidebar__bottom">
        <div className="ft-mini-avatar">AM</div>
        <button type="button" title="Déconnexion">
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
}

export default IconSidebar;
