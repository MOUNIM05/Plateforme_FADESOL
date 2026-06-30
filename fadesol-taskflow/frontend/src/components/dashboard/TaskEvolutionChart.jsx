// Graphique d'evolution des taches : suivi journalier des creations et clotures,
// avec filtre utilisateur adapte aux roles Admin et Manager.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ROLES, normalizeRole, useAuth } from "../../context/AuthContext";
import { getTasks } from "../../services/taskService";
import { getUsers } from "../../services/userService";
import { DATA_EVENTS, subscribeDataEvents } from "../../utils/dataEvents";

const USER_FILTER_ALL = "all";
const identityFields = ["id", "uuid", "user_id", "utilisateur_id", "email"];
const userServiceFields = ["service_id", "id_service", "service", "service_name", "nom_service"];
const taskServiceFields = ["service_id", "id_service", "service", "service_name", "nom_service"];
const CHART_LEFT = 54;
const CHART_RIGHT = 570;
const CHART_TOP = 28;
const CHART_BOTTOM = 220;
const CHART_X_AXIS_Y = 256;
const CHART_HEIGHT = CHART_BOTTOM - CHART_TOP;
const CHART_WIDTH = CHART_RIGHT - CHART_LEFT;

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

function compactValues(values) {
  return values.filter((value) => value !== undefined && value !== null && value !== "");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateKey(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatDateKey(date);
}

function formatDayLabel(date) {
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" });
  return formatter.format(date);
}

function formatFullDateLabel(date) {
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return formatter.format(date);
}

function getLastDays(count = 7) {
  // Fenetre glissante de 7 jours pour garder l'axe X lisible.
  const today = new Date();

  today.setHours(12, 0, 0, 0);

  return Array.from({ length: count }, (_, index) => {
    const date = addDays(today, index - count + 1);

    return {
      date,
      key: formatDateKey(date),
      day: formatDayLabel(date),
      fullDate: formatFullDateLabel(date),
      created: 0,
      completed: 0,
    };
  });
}

function getPointX(index, total) {
  if (total <= 1) {
    return CHART_LEFT;
  }

  return CHART_LEFT + index * (CHART_WIDTH / (total - 1));
}

function getPointY(value, max) {
  return CHART_BOTTOM - (value / max) * CHART_HEIGHT;
}

function toPoints(values, max) {
  return values
    .map((value, index) => {
      const x = getPointX(index, values.length);
      const y = getPointY(value, max);
      return `${x},${y}`;
    })
    .join(" ");
}

function getUserIdentityValues(user) {
  return compactValues(identityFields.map((field) => user?.[field]));
}

function getUserServiceValues(user) {
  return compactValues([
    ...userServiceFields.map((field) => user?.[field]),
    user?.service?.id,
    user?.service?.uuid,
    user?.service?.nom,
    user?.service?.name,
  ]);
}

function getTaskServiceValues(task) {
  return compactValues([
    ...taskServiceFields.map((field) => task?.[field]),
    task?.service?.id,
    task?.service?.uuid,
    task?.service?.nom,
    task?.service?.name,
  ]);
}

function hasMatchingValue(values, candidates) {
  return values.some((value) => candidates.some((candidate) => sameId(value, candidate)));
}

function getUserOptionId(user) {
  return getUserIdentityValues(user)[0] || "";
}

function getUserDisplayName(user) {
  const fullName = [user?.prenom || user?.first_name, user?.nom || user?.last_name].filter(Boolean).join(" ");

  return fullName || user?.email || user?.uuid || user?.id || "Utilisateur";
}

function dedupeUsers(users) {
  const seen = new Set();

  return users.filter((user) => {
    const key = getUserOptionId(user);

    if (!key || seen.has(String(key))) {
      return false;
    }

    seen.add(String(key));
    return true;
  });
}

function isSameService(user, serviceValues) {
  // Les managers ne voient que les utilisateurs de leur service dans ce filtre.
  if (serviceValues.length === 0) {
    return true;
  }

  return hasMatchingValue(getUserServiceValues(user), serviceValues);
}

function isTaskAssignedToSelectedUser(task, userIds) {
  return hasMatchingValue(
    [
      task.assigned_to,
      task.assigned_user_id,
      task.assignee_id,
      task.user_id,
      task.assignee?.id,
      task.assignee?.uuid,
      task.assignee?.email,
      task.assigned_user?.id,
      task.assigned_user?.uuid,
      task.assigned_user?.email,
    ],
    userIds
  );
}

function isTaskCreatedBySelectedUser(task, userIds) {
  // Supporte plusieurs noms de champs selon l'origine des donnees.
  return hasMatchingValue(
    [
      task.created_by,
      task.creator_id,
      task.created_by_id,
      task.author_id,
      task.user_id,
      task.creator?.id,
      task.creator?.uuid,
      task.creator?.email,
      task.created_by_user?.id,
      task.created_by_user?.uuid,
      task.created_by_user?.email,
    ],
    userIds
  );
}

function isTaskCompleted(task) {
  // Une tache est terminee par statut explicite ou progression complete.
  const status = normalizeText(task.status || task.statut);
  const progress = parseFloat(
    String(
      task.progression ??
        task.progress ??
        task.completion ??
        task.percentage ??
        0
    )
  );

  return status.includes("termin") || status.includes("done") || status.includes("completed") || status.includes("validee") || progress >= 100;
}

function isTaskCompletedBySelectedUser(task, userIds) {
  // Priorite au champ completed_by, fallback sur l'assignation de la tache terminee.
  return (
    hasMatchingValue(
      [
        task.completed_by,
        task.completed_by_id,
        task.completed_by_user?.id,
        task.completed_by_user?.uuid,
        task.completed_by_user?.email,
      ],
      userIds
    ) ||
    (isTaskAssignedToSelectedUser(task, userIds) && isTaskCompleted(task))
  );
}

function getCreatedDate(task) {
  return task.created_at || task.createdAt || task.date_creation;
}

function getCompletedDate(task) {
  if (!isTaskCompleted(task)) {
    return null;
  }

  return task.completed_at || task.completedAt || task.updated_at || task.updatedAt || task.date_modification || getCreatedDate(task);
}

function TaskEvolutionChart() {
  const { currentUser } = useAuth();
  const currentRole = normalizeRole(currentUser?.role);
  const currentUserServiceValues = useMemo(() => getUserServiceValues(currentUser), [currentUser]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(USER_FILTER_ALL);
  const [hoveredDayIndex, setHoveredDayIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTasksEvolution = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const data = await getTasks();
      setTasks(Array.isArray(data) ? data : []);
      setError("");
    } catch (loadError) {
      console.error("Task evolution load error:", loadError);
      setTasks([]);
      setError("Évolution temporairement indisponible.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  const loadUsers = useCallback(async () => {
    if (currentRole === ROLES.EMPLOYEE) {
      setUsers(currentUser ? [currentUser] : []);
      setSelectedUserId(getUserOptionId(currentUser) || USER_FILTER_ALL);
      return;
    }

    try {
      const serviceFilter = currentRole === ROLES.MANAGER ? currentUserServiceValues[0] : undefined;
      const data = await getUsers(serviceFilter);
      const rawUsers = Array.isArray(data) ? data : [];
      const visibleUsers =
        currentRole === ROLES.MANAGER
          ? rawUsers.filter((user) => isSameService(user, currentUserServiceValues))
          : rawUsers;
      const nextUsers = dedupeUsers(currentUser ? [currentUser, ...visibleUsers] : visibleUsers);

      setUsers(nextUsers);
    } catch (loadError) {
      console.error("Task evolution users load error:", loadError);
      setUsers(currentUser ? [currentUser] : []);
    }
  }, [currentRole, currentUser, currentUserServiceValues]);

  useEffect(() => {
    loadTasksEvolution();
  }, [loadTasksEvolution]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    return subscribeDataEvents([DATA_EVENTS.TASKS_CHANGED], () => {
      loadTasksEvolution({ showLoading: false });
    });
  }, [loadTasksEvolution]);

  useEffect(() => {
    if (selectedUserId === USER_FILTER_ALL) {
      return;
    }

    const selectedUserStillVisible = users.some((user) => sameId(getUserOptionId(user), selectedUserId));

    if (!selectedUserStillVisible) {
      setSelectedUserId(USER_FILTER_ALL);
    }
  }, [selectedUserId, users]);

  const selectedUser = useMemo(
    () => users.find((user) => sameId(getUserOptionId(user), selectedUserId)) || null,
    [selectedUserId, users]
  );

  const selectedUserIds = useMemo(() => getUserIdentityValues(selectedUser), [selectedUser]);
  const visibleUserIds = useMemo(() => users.flatMap(getUserIdentityValues), [users]);

  const visibleTasks = useMemo(() => {
    if (currentRole !== ROLES.MANAGER) {
      return tasks;
    }

    return tasks.filter((task) => {
      const taskIsInManagerService = hasMatchingValue(getTaskServiceValues(task), currentUserServiceValues);
      const taskIsLinkedToVisibleUser =
        visibleUserIds.length > 0 &&
        (isTaskAssignedToSelectedUser(task, visibleUserIds) ||
          isTaskCreatedBySelectedUser(task, visibleUserIds) ||
          isTaskCompletedBySelectedUser(task, visibleUserIds));

      return taskIsInManagerService || taskIsLinkedToVisibleUser;
    });
  }, [currentRole, currentUserServiceValues, tasks, visibleUserIds]);

  const chartData = useMemo(() => {
    const days = getLastDays(7);
    const dayByKey = new Map(days.map((day) => [day.key, day]));

    visibleTasks.forEach((task) => {
      const createdAt = getCreatedDate(task);
      const completedAt = getCompletedDate(task);
      const createdKey = getDateKey(createdAt);
      const completedKey = getDateKey(completedAt);
      const shouldCountCreated =
        selectedUserId === USER_FILTER_ALL ||
        (selectedUserIds.length > 0 && isTaskCreatedBySelectedUser(task, selectedUserIds));
      const shouldCountCompleted =
        selectedUserId === USER_FILTER_ALL ||
        (selectedUserIds.length > 0 && isTaskCompletedBySelectedUser(task, selectedUserIds));
      const createdDay = createdKey ? dayByKey.get(createdKey) : null;
      const completedDay = completedKey ? dayByKey.get(completedKey) : null;

      if (shouldCountCreated && createdDay) {
        createdDay.created += 1;
      }

      if (shouldCountCompleted && completedDay) {
        completedDay.completed += 1;
      }
    });

    return days;
  }, [selectedUserId, selectedUserIds, visibleTasks]);

  const created = chartData.map((day) => day.created);
  const completed = chartData.map((day) => day.completed);
  const maxEvolutionValue = Math.max(1, ...chartData.map((day) => Math.max(Number(day.created || 0), Number(day.completed || 0))));
  const yAxisMax = maxEvolutionValue + 1;
  const yAxisTicks = Array.from({ length: yAxisMax + 1 }, (_, index) => index);
  const hoveredDay = hoveredDayIndex === null ? null : chartData[hoveredDayIndex];
  const tooltipLeft =
    hoveredDayIndex === null
      ? 0
      : Math.min(84, Math.max(16, (getPointX(hoveredDayIndex, chartData.length) / 600) * 100));

  return (
    <section className="dashboard-card task-evolution-card">
      <div className="card-header">
        <div>
          <h2>Évolution des tâches</h2>
          <p>{loading ? "Chargement des données..." : "Suivi quotidien des tâches créées et terminées"}</p>
        </div>
        <div className="task-evolution-card__actions">
          {currentRole !== ROLES.EMPLOYEE && (
            <select
              className="chart-filter-select"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              aria-label="Filtrer l'évolution des tâches par utilisateur"
            >
              <option value={USER_FILTER_ALL}>Tous les utilisateurs</option>
              {users.map((user) => {
                const optionId = getUserOptionId(user);

                return (
                  <option key={optionId} value={optionId}>
                    {getUserDisplayName(user)}
                  </option>
                );
              })}
            </select>
          )}
          <div className="chart-legend">
            <span><i className="is-blue" /> Tâches créées</span>
            <span><i className="is-green" /> Tâches terminées</span>
          </div>
        </div>
      </div>

      {error ? (
        <p className="loading-line compact">{error}</p>
      ) : (
        <div className="line-chart" onMouseLeave={() => setHoveredDayIndex(null)}>
          <svg viewBox="0 0 600 285" role="img" aria-label="Évolution des tâches">
            <defs>
              <linearGradient id="createdGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="doneGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
              </linearGradient>
            </defs>
            {yAxisTicks.map((tick) => (
              <g key={tick}>
                <line x1={CHART_LEFT} x2={CHART_RIGHT} y1={getPointY(tick, yAxisMax)} y2={getPointY(tick, yAxisMax)} className="chart-grid-line" />
                <text x="36" y={getPointY(tick, yAxisMax)} className="chart-y-axis-label" textAnchor="end" dominantBaseline="middle">
                  {tick}
                </text>
              </g>
            ))}
            {chartData.map((day, index) => {
              const x = getPointX(index, chartData.length);

              return (
                <g key={`axis-${day.key}`}>
                  <line x1={x} x2={x} y1={CHART_TOP} y2={CHART_BOTTOM} className="chart-grid-line chart-grid-line-vertical" />
                  <text x={x} y={CHART_X_AXIS_Y} className="chart-x-axis-label" textAnchor="middle">
                    {day.day}
                  </text>
                </g>
              );
            })}
            <line x1={CHART_LEFT} x2={CHART_LEFT} y1={CHART_TOP} y2={CHART_BOTTOM} className="chart-y-axis-line" />
            {chartData.map((day, index) => {
              const x = getPointX(index, chartData.length);

              return (
                <rect
                  key={`hover-${day.key}`}
                  x={x - 42}
                  y={CHART_TOP}
                  width="84"
                  height={CHART_HEIGHT}
                  className="chart-hover-zone"
                  onMouseEnter={() => setHoveredDayIndex(index)}
                  onFocus={() => setHoveredDayIndex(index)}
                  tabIndex={0}
                  aria-label={`${day.fullDate}. Tâches créées : ${day.created}. Tâches terminées : ${day.completed}.`}
                />
              );
            })}
            <polyline points={`${CHART_LEFT},${CHART_BOTTOM} ${toPoints(created, yAxisMax)} ${CHART_RIGHT},${CHART_BOTTOM}`} className="chart-area is-blue" />
            <polyline points={`${CHART_LEFT},${CHART_BOTTOM} ${toPoints(completed, yAxisMax)} ${CHART_RIGHT},${CHART_BOTTOM}`} className="chart-area is-green" />
            <polyline points={toPoints(created, yAxisMax)} className="chart-line is-blue-stroke" />
            <polyline points={toPoints(completed, yAxisMax)} className="chart-line is-green-stroke" />
            {created.map((value, index) => (
              <circle
                key={`created-${chartData[index].key}`}
                cx={getPointX(index, chartData.length)}
                cy={getPointY(value, yAxisMax)}
                r="5"
                className="chart-dot is-blue-dot"
                onMouseEnter={() => setHoveredDayIndex(index)}
              />
            ))}
            {completed.map((value, index) => (
              <circle
                key={`completed-${chartData[index].key}`}
                cx={getPointX(index, chartData.length)}
                cy={getPointY(value, yAxisMax)}
                r="5"
                className="chart-dot is-green-dot"
                onMouseEnter={() => setHoveredDayIndex(index)}
              />
            ))}
          </svg>
          {hoveredDay && (
            <div className="line-chart-tooltip" style={{ left: `${tooltipLeft}%` }} role="status">
              <strong>{hoveredDay.fullDate}</strong>
              <span>Tâches créées : {hoveredDay.created}</span>
              <span>Tâches terminées : {hoveredDay.completed}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default TaskEvolutionChart;

