import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Settings,
  UsersRound,
  Workflow,
} from "lucide-react";
import ClickUpIntegrationCard from "../components/dashboard/ClickUpIntegrationCard";
import EventCalendar from "../components/dashboard/EventCalendar";
import KpiCard from "../components/dashboard/KpiCard";
import PriorityDistribution from "../components/dashboard/PriorityDistribution";
import RealtimeActivity from "../components/dashboard/RealtimeActivity";
import ServiceActivity from "../components/dashboard/ServiceActivity";
import ServiceDistribution from "../components/dashboard/ServiceDistribution";
import TaskEvolutionChart from "../components/dashboard/TaskEvolutionChart";
import UrgentTasks from "../components/dashboard/UrgentTasks";
import WorkloadCard from "../components/dashboard/WorkloadCard";
import Users from "./Users";

const kpis = [
  {
    label: "Total Projets",
    value: "18",
    trend: "+12% ce mois",
    icon: FolderKanban,
    tone: "green",
    sparkline: [24, 34, 28, 46, 42, 58, 64],
  },
  {
    label: "Tâches Actives",
    value: "124",
    trend: "+8% ce mois",
    icon: Workflow,
    tone: "blue",
    sparkline: [30, 44, 38, 54, 50, 66, 60],
  },
  {
    label: "Tâches Terminées",
    value: "87",
    trend: "+15% ce mois",
    icon: CheckCircle2,
    tone: "purple",
    sparkline: [22, 28, 44, 40, 62, 56, 72],
  },
  {
    label: "Tâches en Retard",
    value: "9",
    trend: "-3% ce mois",
    icon: Clock3,
    tone: "red",
    sparkline: [58, 52, 44, 48, 34, 30, 26],
  },
  {
    label: "Services Actifs",
    value: "6",
    trend: "Stable",
    icon: Building2,
    tone: "orange",
    sparkline: [44, 44, 46, 44, 46, 44, 46],
  },
];

const moduleContent = {
  Services: {
    eyebrow: "Organisation",
    title: "Services Fadesol",
    description: "Pilote les équipes internes, leurs responsables et leurs charges de travail.",
    stats: [
      ["6", "Services actifs"],
      ["118", "Tâches rattachées"],
      ["72%", "Progression moyenne"],
    ],
    items: ["Technique", "Commercial", "Achat", "Magasin / Stock", "Comptabilité & Management", "Direction / RH"],
  },
  "Rôles & Permissions": {
    eyebrow: "Sécurité",
    title: "Rôles & Permissions",
    description: "Gère les droits d’accès et les niveaux de responsabilité de la plateforme.",
    stats: [
      ["3", "Rôles principaux"],
      ["14", "Permissions"],
      ["0", "Alertes critiques"],
    ],
    items: ["Administrateur", "Manager", "Employé", "Audit accès"],
  },
  Projets: {
    eyebrow: "Projets",
    title: "Portefeuille projets",
    description: "Vue organisée des projets Fadesol, statuts, priorités et prochaines échéances.",
    stats: [
      ["18", "Projets"],
      ["7", "En cours"],
      ["4", "À risque"],
    ],
    items: ["FADESOL X", "Audit Interne Q2", "Migration ClickUp", "Structure base de données"],
  },
  Tâches: {
    eyebrow: "Exécution",
    title: "Gestion des tâches",
    description: "Suivi clair des tâches actives, terminées, en retard et bloquées.",
    stats: [
      ["124", "Actives"],
      ["87", "Terminées"],
      ["9", "En retard"],
    ],
    items: ["Intégration API ClickUp", "Tester synchronisation", "Finaliser utilisateurs", "Préparer rapport"],
  },
  "Sous-tâches": {
    eyebrow: "Détail",
    title: "Sous-tâches",
    description: "Décompose les livrables en actions précises pour faciliter le suivi quotidien.",
    stats: [
      ["42", "Ouvertes"],
      ["31", "Validées"],
      ["6", "Bloquées"],
    ],
    items: ["Tester API ClickUp", "Créer fixtures", "Valider permissions", "Documenter endpoints"],
  },
  Calendrier: {
    eyebrow: "Planning",
    title: "Calendrier",
    description: "Regroupe les réunions, livrables et échéances importantes de la semaine.",
    stats: [
      ["8", "Événements"],
      ["3", "Réunions"],
      ["5", "Échéances"],
    ],
    items: ["Réunion d’équipe", "Suivi projet FADESOL X", "Présentation rapport", "Point ClickUp"],
  },
  Messagerie: {
    eyebrow: "Communication",
    title: "Messagerie",
    description: "Espace de communication interne pour garder les échanges liés au travail.",
    stats: [
      ["4", "Messages non lus"],
      ["12", "Conversations"],
      ["5", "Mentions"],
    ],
    items: ["Technique", "Commercial", "Management", "Intégration"],
  },
  Notifications: {
    eyebrow: "Alertes",
    title: "Notifications",
    description: "Toutes les alertes importantes de l’organisation au même endroit.",
    stats: [
      ["12", "Nouvelles"],
      ["3", "Urgentes"],
      ["8", "Aujourd’hui"],
    ],
    items: ["Tâche en retard", "Nouveau commentaire", "Sync ClickUp", "Permission modifiée"],
  },
  "ClickUp Sync": {
    eyebrow: "Intégration",
    title: "ClickUp Sync",
    description: "Surveille les synchronisations entre Fadesol TaskFlow et ClickUp.",
    stats: [
      ["342", "Tâches sync"],
      ["24", "Projets sync"],
      ["2", "Erreurs"],
    ],
    items: ["Dernière sync: il y a 18 minutes", "API connectée", "Logs disponibles", "Retry automatique"],
  },
  "Historique Sync": {
    eyebrow: "Intégration",
    title: "Historique Sync",
    description: "Historique clair des synchronisations, erreurs et traitements automatiques.",
    stats: [
      ["28", "Runs"],
      ["26", "Succès"],
      ["2", "À revoir"],
    ],
    items: ["Sync matin", "Sync après-midi", "Retry erreurs", "Audit intégration"],
  },
  Reporting: {
    eyebrow: "Analyse",
    title: "Reporting",
    description: "Rapports opérationnels pour suivre l’activité et la performance des services.",
    stats: [
      ["5", "Rapports"],
      ["87%", "Taux completion"],
      ["6", "Services"],
    ],
    items: ["Rapport tâches", "Rapport services", "Retards", "Productivité"],
  },
  Paramètres: {
    eyebrow: "Système",
    title: "Paramètres",
    description: "Configuration générale de Fadesol TaskFlow et préférences de l’espace interne.",
    stats: [
      ["1", "Workspace"],
      ["ON", "Sécurité"],
      ["OK", "API"],
    ],
    items: ["Profil organisation", "Préférences", "Sécurité", "Intégrations"],
  },
};

function ModulePage({ activeItem }) {
  const content = moduleContent[activeItem] || moduleContent.Services;

  return (
    <div className="module-page">
      <header className="module-hero">
        <div>
          <span>{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
        </div>
      </header>

      <section className="module-stat-grid">
        {content.stats.map(([value, label]) => (
          <article className="module-stat-card" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-card module-panel">
        <div className="card-header">
          <div>
            <h2>{content.title}</h2>
            <p>Interface prête pour brancher les données backend.</p>
          </div>
        </div>
        <div className="module-list">
          {content.items.map((item, index) => (
            <article key={item}>
              <div>
                <strong>{item}</strong>
                <span>Élément #{index + 1}</span>
              </div>
              <mark>Actif</mark>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Dashboard({ activeItem = "Dashboard", currentUser, onLogout }) {
  if (activeItem === "Utilisateurs") {
    return <Users currentUser={currentUser} onLogout={onLogout} />;
  }

  if (activeItem !== "Dashboard") {
    return <ModulePage activeItem={activeItem} />;
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Bonjour, Abdelmounim 👋</h1>
          <p>Voici un aperçu complet de l’activité de votre organisation.</p>
        </div>

        <div className="dashboard-header__actions">
          <button type="button" className="date-selector">
            <CalendarDays size={18} />
            <span>28 Mai - 3 Juin 2024</span>
          </button>
          <button type="button" className="icon-button" aria-label="Paramètres">
            <Settings size={19} />
          </button>
          <button type="button" className="icon-button notification-button" aria-label="Notifications">
            <Bell size={19} />
            <b>8</b>
          </button>
          <div className="header-avatar" aria-label="Abdelmounim Maani">
            <UsersRound size={16} />
            <span>AM</span>
          </div>
        </div>
      </header>

      <section className="kpi-grid" aria-label="Indicateurs clés">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <section className="dashboard-grid" aria-label="Tableau de bord analytique">
        <TaskEvolutionChart />
        <PriorityDistribution />
        <RealtimeActivity />
        <ServiceDistribution />
        <ServiceActivity />
        <UrgentTasks />
        <ClickUpIntegrationCard />
        <WorkloadCard />
        <EventCalendar />
      </section>
    </div>
  );
}

export default Dashboard;
