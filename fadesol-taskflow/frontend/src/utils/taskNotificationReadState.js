export const TASK_NOTIFICATION_READ_EVENT = "fadesol-task-notifications-read";

function normalizeUserKey(value) {
  return String(value || "guest").trim().toLowerCase();
}

export function getTaskNotificationReadKey(currentUser, profile = null) {
  const userKey =
    profile?.uuid ||
    profile?.id ||
    profile?.user_id ||
    currentUser?.uuid ||
    currentUser?.id ||
    currentUser?.user_id ||
    currentUser?.email ||
    "guest";

  return `fadesol-task-notifications-read-${normalizeUserKey(userKey)}`;
}

export function getTaskNotificationId(task) {
  return task?.id || task?.task_id || task?.uuid || null;
}

export function loadReadTaskNotificationIds(currentUser, profile = null) {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = window.localStorage.getItem(getTaskNotificationReadKey(currentUser, profile));
    const values = JSON.parse(raw || "[]");

    return new Set(Array.isArray(values) ? values.map(String) : []);
  } catch {
    return new Set();
  }
}

export function saveReadTaskNotificationIds(currentUser, profile = null, ids = new Set()) {
  if (typeof window === "undefined") {
    return new Set(ids);
  }

  const normalizedIds = new Set(Array.from(ids).filter(Boolean).map(String));

  try {
    window.localStorage.setItem(
      getTaskNotificationReadKey(currentUser, profile),
      JSON.stringify(Array.from(normalizedIds))
    );
  } catch {
    // Les notifications restent utilisables meme si le stockage local est indisponible.
  }

  window.dispatchEvent(
    new CustomEvent(TASK_NOTIFICATION_READ_EVENT, {
      detail: { key: getTaskNotificationReadKey(currentUser, profile), ids: Array.from(normalizedIds) },
    })
  );

  return normalizedIds;
}

export function markTaskNotificationsAsRead(currentUser, profile = null, tasks = []) {
  const readIds = loadReadTaskNotificationIds(currentUser, profile);

  tasks.forEach((task) => {
    const taskId = getTaskNotificationId(task);

    if (taskId) {
      readIds.add(String(taskId));
    }
  });

  return saveReadTaskNotificationIds(currentUser, profile, readIds);
}

export function markTaskNotificationAsRead(currentUser, profile = null, task = null) {
  return markTaskNotificationsAsRead(currentUser, profile, task ? [task] : []);
}
