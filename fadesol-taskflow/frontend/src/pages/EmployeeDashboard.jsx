import { CalendarDays, CheckCircle2, Clock3, MessageSquareText, RefreshCw, UserRound, Workflow } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AccountMenu from "../components/dashboard/AccountMenu";
import DashboardCharts from "../components/dashboard/DashboardCharts";
import KpiCard from "../components/dashboard/KpiCard";
import NotificationDropdown from "../components/dashboard/NotificationDropdown";
import { getTasks } from "../services/taskService";
import { DATA_EVENTS, subscribeDataEvents } from "../utils/dataEvents";

const fallbackStatistics = {
  total_tasks: 0,
  tasks_in_progress: 0,
  tasks_completed: 0,
  tasks_late: 0,
  tasks_blocked: 0,
};

const employeeKpiDefinitions = [
  {
    label: "Mes taches",
    statKey: "total_tasks",
    trend: "Affectees",
    icon: Workflow,
    tone: "green",
    sparkline: [16, 22, 24, 30, 28, 34, 38],
  },
  {
    label: "En cours",
    statKey: "tasks_in_progress",
    trend: "A suivre",
    icon: Clock3,
    tone: "blue",
    sparkline: [10, 12, 16, 14, 20, 18, 22],
  },
  {
    label: "Bloquees",
    statKey: "tasks_blocked",
    trend: "A debloquer",
    icon: CalendarDays,
    tone: "orange",
    sparkline: [22, 24, 20, 18, 16, 14, 12],
  },
  {
    label: "Terminees",
    statKey: "tasks_completed",
    trend: "Cloturees",
    icon: CheckCircle2,
    tone: "green",
    sparkline: [18, 24, 28, 34, 38, 44, 48],
  },
];

const inProgressStatuses = new Set(["encours", "inprogress", "enprogress"]);
const completedStatuses = new Set(["termine", "terminee", "done", "completed", "validee"]);
const blockedStatuses = new Set(["bloque", "blocked"]);

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function getTaskStatus(task) {
  return task?.status ?? task?.statut ?? "";
}

function getTaskPriority(task) {
  return task?.priority ?? task?.priorite ?? "Non definie";
}

function getTaskDueDate(task) {
  return task?.due_date ?? task?.date_echeance ?? task?.deadline ?? task?.date_limite ?? null;
}

function getAssignedValues(task) {
  return [
    task?.assigned_to,
    task?.assigned_user_id,
    task?.assignee_id,
    task?.user_id,
    task?.responsable_id,
    task?.assignee_a,
  ]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map(String);
}

function buildCurrentUserIds(currentUser) {
  return new Set(
    [
      currentUser?.id,
      currentUser?.uuid,
      currentUser?.user_id,
      currentUser?.email,
    ]
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String)
  );
}

function isTaskAssignedToCurrentUser(task, currentUserIds) {
  if (!currentUserIds.size) {
    return false;
  }

  return getAssignedValues(task).some((value) => currentUserIds.has(value));
}

function isInProgressTask(task) {
  const status = normalizeText(getTaskStatus(task));
  return inProgressStatuses.has(status) || status.includes("encours") || status.includes("inprogress");
}

function isCompletedTask(task) {
  const status = normalizeText(getTaskStatus(task));
  return completedStatuses.has(status) || status.startsWith("termin") || status.includes("done") || status.includes("completed");
}

function isBlockedTask(task) {
  const status = normalizeText(getTaskStatus(task));
  return blockedStatuses.has(status) || status.includes("bloqu") || status.includes("blocked");
}

function isLateTask(task) {
  if (isCompletedTask(task)) {
    return false;
  }

  const dueDate = getTaskDueDate(task);

  if (!dueDate) {
    return false;
  }

  const parsedDate = new Date(String(dueDate).slice(0, 10));

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsedDate.setHours(0, 0, 0, 0);

  return parsedDate < today;
}

function groupTasksBy(tasks, getLabel) {
  const counters = tasks.reduce((accumulator, task) => {
    const label = getLabel(task) || "Non renseigne";
    accumulator[label] = (accumulator[label] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counters).map(([label, value]) => ({ label, value }));
}

function buildEmployeeStatistics(tasks) {
  return {
    total_tasks: tasks.length,
    tasks_in_progress: tasks.filter(isInProgressTask).length,
    tasks_completed: tasks.filter(isCompletedTask).length,
    tasks_late: tasks.filter(isLateTask).length,
    tasks_blocked: tasks.filter(isBlockedTask).length,
  };
}

function buildEmployeeAnalytics(tasks, displayName) {
  return {
    tasks_by_status: groupTasksBy(tasks, (task) => getTaskStatus(task) || "Non defini"),
    tasks_by_service: [{ label: "Mes taches", value: tasks.length }],
    workload_by_member: [{ label: displayName, value: tasks.length, completed: tasks.filter(isCompletedTask).length }],
    tasks_by_priority: groupTasksBy(tasks, getTaskPriority),
  };
}

function EmployeeDashboard({ currentUser }) {
  const displayName = currentUser?.prenom || currentUser?.first_name || currentUser?.email || "Employe";
  const [statistics, setStatistics] = useState(fallbackStatistics);
  const [analytics, setAnalytics] = useState(null);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [statisticsWarning, setStatisticsWarning] = useState("");

  const loadDashboardStatistics = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setStatisticsLoading(true);
    }
    setStatisticsWarning("");

    try {
      const currentUserIds = buildCurrentUserIds(currentUser);
      const assignedTasks = await getTasks({ assigned_to: "me" });
      let employeeTasks = Array.isArray(assignedTasks) ? assignedTasks : [];

      if (employeeTasks.length === 0 && currentUserIds.size) {
        const authorizedTasks = await getTasks();
        employeeTasks = (Array.isArray(authorizedTasks) ? authorizedTasks : []).filter((task) =>
          isTaskAssignedToCurrentUser(task, currentUserIds)
        );
      }

      const employeeStatistics = buildEmployeeStatistics(employeeTasks);
      setStatistics({ ...fallbackStatistics, ...employeeStatistics });
      setAnalytics(buildEmployeeAnalytics(employeeTasks, displayName));
    } catch (error) {
      console.error("Dashboard statistics error:", error);
      setStatistics(fallbackStatistics);
      setAnalytics(null);
      setStatisticsWarning("Statistiques temporairement indisponibles.");
    } finally {
      if (showLoading) {
        setStatisticsLoading(false);
      }
    }
  }, [currentUser, displayName]);

  useEffect(() => {
    loadDashboardStatistics();
  }, [loadDashboardStatistics]);

  useEffect(() => {
    return subscribeDataEvents([DATA_EVENTS.DATA_CHANGED], () => {
      loadDashboardStatistics({ showLoading: false });
    });
  }, [loadDashboardStatistics]);

  const employeeKpis = useMemo(() => {
    return employeeKpiDefinitions.map((kpi) => ({
      ...kpi,
      value: statisticsLoading ? "..." : String(statistics[kpi.statKey] ?? 0),
    }));
  }, [statistics, statisticsLoading]);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Bonjour, {displayName}</h1>
          <p>Votre espace personnel pour suivre vos taches, messages et echeances.</p>
        </div>
        <div className="dashboard-header__actions">
          <button
            type="button"
            className="date-selector"
            onClick={() => loadDashboardStatistics()}
            disabled={statisticsLoading}
          >
            <RefreshCw size={18} />
            <span>{statisticsLoading ? "Actualisation..." : "Actualiser"}</span>
          </button>
          <NotificationDropdown />
          <AccountMenu currentUser={currentUser} compact />
        </div>
      </header>

      {statisticsWarning && <p className="notice warning">{statisticsWarning}</p>}

      <section className="kpi-grid manager-kpis" aria-label="Indicateurs employe">
        {employeeKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <DashboardCharts analytics={analytics} />

      <section className="role-dashboard-grid">
        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Mes taches</h2>
              <p>Vue filtree sur les taches autorisees pour votre service.</p>
            </div>
          </div>
          <div className="status-list">
            <div>
              <span><i className="is-blue" />En cours</span>
              <strong>{statistics.tasks_in_progress}</strong>
            </div>
            <div>
              <span><i className="is-green" />Terminees</span>
              <strong>{statistics.tasks_completed}</strong>
            </div>
            <div>
              <span><i className="is-orange" />En retard</span>
              <strong>{statistics.tasks_late}</strong>
            </div>
            <div>
              <span><i className="is-red" />Bloquees</span>
              <strong>{statistics.tasks_blocked}</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Messages</h2>
              <p>Resume des echanges internes.</p>
            </div>
          </div>
          <div className="timeline-list">
            <div><MessageSquareText size={16} /><span>Consultez la messagerie pour les nouveaux echanges.</span></div>
            <div><MessageSquareText size={16} /><span>Les notifications restent liees a votre compte.</span></div>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Profil</h2>
              <p>Acces rapide a vos informations.</p>
            </div>
          </div>
          <div className="profile-shortcut">
            <UserRound size={34} />
            <div>
              <strong>{currentUser?.email}</strong>
              <span>Compte actif</span>
            </div>
          </div>
        </article>

        <article className="dashboard-card">
          <div className="card-header">
            <div>
              <h2>Echeances</h2>
              <p>Suivi simplifie des retards.</p>
            </div>
          </div>
          <div className="event-days">
            <article>
              <h3>A surveiller</h3>
              <div className="event-row">
                <time>{statistics.tasks_late}</time>
                <div>
                  <strong>Taches en retard</strong>
                  <span>Priorite de traitement personnelle</span>
                </div>
              </div>
            </article>
          </div>
        </article>
      </section>
    </div>
  );
}

export default EmployeeDashboard;
