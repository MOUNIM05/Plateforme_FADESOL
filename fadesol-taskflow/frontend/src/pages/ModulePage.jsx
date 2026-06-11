import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardList,
  FolderKanban,
  MessageSquareText,
  RefreshCw,
  Settings,
} from "lucide-react";

const iconMap = {
  services: Building2,
  projects: FolderKanban,
  tasks: ClipboardList,
  messages: MessageSquareText,
  clickup: RefreshCw,
  reporting: BarChart3,
  settings: Settings,
};

function ModulePage({ type, title, description, cards = [] }) {
  const Icon = iconMap[type] || CalendarDays;

  return (
    <div className="dashboard-page module-page">
      <div className="board-toolbar">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="module-toolbar-icon">
          <Icon size={24} />
        </div>
      </div>

      <section className="module-grid">
        {cards.map((card) => (
          <article key={card.title} className="workspace-panel info-card">
            <div className="panel-title">
              <h3>{card.title}</h3>
              {card.meta && <span>{card.meta}</span>}
            </div>
            <p className="helper-text">{card.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

export default ModulePage;
