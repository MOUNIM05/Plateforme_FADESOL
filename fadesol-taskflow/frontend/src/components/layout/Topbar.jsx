import {
  Bell,
  Bot,
  CheckCircle2,
  Search,
  Share2,
  Wifi,
} from "lucide-react";

function Topbar({ currentUser }) {
  const initials =
    currentUser?.prenom && currentUser?.nom
      ? `${currentUser.prenom[0]}${currentUser.nom[0]}`
      : "AM";

  return (
    <header className="tf-topbar">
      <div className="tf-search">
        <Search size={18} />
        <span>Search tasks, projects, users...</span>
        <kbd>Ctrl K</kbd>
      </div>

      <div className="tf-topbar-actions">
        <button type="button" title="Statut synchronisation">
          <Wifi size={18} />
        </button>
        <button type="button" title="Notifications">
          <Bell size={18} />
        </button>
        <button type="button" className="tf-topbar-pill">
          <Bot size={18} />
          Ask AI
        </button>
        <button type="button" className="tf-topbar-pill">
          <Share2 size={18} />
          Share
        </button>
        <div className="tf-user-avatar">
          {initials.toUpperCase()}
          <span>
            <CheckCircle2 size={12} />
          </span>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
