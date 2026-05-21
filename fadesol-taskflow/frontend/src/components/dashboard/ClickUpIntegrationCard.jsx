import { CheckCircle2, RefreshCw } from "lucide-react";

function ClickUpIntegrationCard() {
  return (
    <section className="dashboard-card clickup-card">
      <div className="card-header">
        <div>
          <h2>Intégration ClickUp</h2>
          <p>Dernière synchronisation: Il y a 18 minutes</p>
        </div>
        <span className="status-badge"><CheckCircle2 size={15} /> Connecté</span>
      </div>

      <div className="clickup-metrics">
        <div>
          <span>Tâches synchronisées</span>
          <strong>342</strong>
        </div>
        <div>
          <span>Projets synchronisés</span>
          <strong>24</strong>
        </div>
        <div>
          <span>Erreurs</span>
          <strong className="is-danger">2</strong>
        </div>
      </div>

      <div className="clickup-sparkline" aria-hidden="true">
        {[36, 52, 44, 70, 62, 84, 76, 92].map((height, index) => (
          <i key={`${height}-${index}`} style={{ height: `${height}%` }} />
        ))}
      </div>

      <button type="button" className="sync-button">
        <RefreshCw size={17} />
        Synchroniser maintenant
      </button>
    </section>
  );
}

export default ClickUpIntegrationCard;
