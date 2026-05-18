import {
  BarChart3,
  FolderKanban,
  MessageSquare,
  PlugZap,
  Settings,
  ShieldCheck,
} from "lucide-react";

const moduleDetails = {
  dashboard: {
    title: "Dashboard global",
    description: "Vue consolidée des projets, tâches, retards et performances par service.",
    stats: ["12 projets actifs", "38 tâches ouvertes", "6 tâches en retard"],
    icon: BarChart3,
  },
  projects: {
    title: "Gestion des projets",
    description: "Suivre les projets par service, responsable, priorité, progression et échéance.",
    stats: ["Commercial", "Technique", "Direction"],
    icon: FolderKanban,
  },
  tasks: {
    title: "Gestion des tâches",
    description: "Créer, assigner, prioriser et valider les tâches internes Fadesol.",
    stats: ["À faire", "En cours", "À valider"],
    icon: ShieldCheck,
  },
  subtasks: {
    title: "Gestion des sous-tâches",
    description: "Découper les tâches complexes en actions simples, attribuées et suivies.",
    stats: ["Responsable", "Service", "Date limite"],
    icon: FolderKanban,
  },
  users: {
    title: "Gestion des utilisateurs",
    description: "Administrer les comptes, rôles et accès selon Administrateur, Manager et Employé.",
    stats: ["Administrateur", "Manager", "Employé"],
    icon: ShieldCheck,
  },
  services: {
    title: "Services Fadesol",
    description: "Organiser la plateforme autour des services internes de Fadesol Power Solutions.",
    stats: ["Commercial", "Technique", "Achat"],
    icon: FolderKanban,
  },
  messaging: {
    title: "Messagerie interne",
    description: "Centraliser les échanges autour des projets, tâches et services.",
    stats: ["Conversations", "Messages", "Notifications"],
    icon: MessageSquare,
  },
  clickup: {
    title: "Intégration ClickUp",
    description: "Synchroniser les tâches sélectionnées avec ClickUp sans exposer le token au frontend.",
    stats: ["Connecté", "Dernière sync aujourd’hui", "Logs actifs"],
    icon: PlugZap,
  },
  reporting: {
    title: "Reporting & activité",
    description: "Préparer les rapports de suivi, activité utilisateur et indicateurs opérationnels.",
    stats: ["Activité", "Export", "Historique"],
    icon: BarChart3,
  },
  settings: {
    title: "Paramètres",
    description: "Configurer les préférences générales de la plateforme et les futures intégrations.",
    stats: ["Sécurité", "Notifications", "Environnement"],
    icon: Settings,
  },
};

function ModuleOverview({ module }) {
  const detail = moduleDetails[module.id] ?? moduleDetails.dashboard;
  const Icon = detail.icon;

  return (
    <div className="tf-module-overview">
      <div className="tf-module-overview__hero">
        <span>
          <Icon size={36} />
        </span>
        <div>
          <h2>{detail.title}</h2>
          <p>{detail.description}</p>
        </div>
      </div>

      <div className="tf-module-cards">
        {detail.stats.map((item) => (
          <article key={item}>
            <strong>{item}</strong>
            <small>Module {detail.title}</small>
          </article>
        ))}
      </div>
    </div>
  );
}

export default ModuleOverview;
