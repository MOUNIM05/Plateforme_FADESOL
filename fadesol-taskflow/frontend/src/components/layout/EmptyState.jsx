import { DownloadCloud, ListPlus, SearchCheck } from "lucide-react";

function EmptyState({ selectedService, onCreateClick }) {
  return (
    <div className="tf-empty-state">
      <div className="tf-empty-illustration">
        <SearchCheck size={70} />
        <span />
        <span />
        <span />
      </div>

      <h2>Aucun espace sélectionné</h2>
      <p>
        {selectedService?.id === "all"
          ? "Sélectionnez un service ou créez une liste pour commencer."
          : `${selectedService.name} est prêt. Créez une liste pour organiser les tâches de ce service.`}
      </p>

      <div className="tf-empty-actions">
        <button type="button" onClick={onCreateClick}>
          <ListPlus size={18} />
          Créer une liste
        </button>
        <button type="button">
          <DownloadCloud size={18} />
          Importer depuis ClickUp
        </button>
      </div>
    </div>
  );
}

export default EmptyState;
