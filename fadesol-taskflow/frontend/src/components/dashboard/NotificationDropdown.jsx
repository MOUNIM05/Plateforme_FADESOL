// Menu de notifications affiche dans la barre superieure du dashboard.
import { Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMessages, getMessagesWebSocketUrl } from "../../services/messageService";
import { getTasks } from "../../services/taskService";
import { getMyUserProfile } from "../../services/userService";
import { DATA_EVENTS, subscribeDataEvents } from "../../utils/dataEvents";
import {
  getTaskAssigneeValues,
  getUserIdentitySet,
  isMessageReceivedByCurrentUser,
  isNotificationMessageForCurrentUser,
  isNotificationTaskForCurrentUser,
  mergeNotificationRecords,
} from "../../utils/notificationFilters";
import {
  getTaskNotificationId,
  loadReadTaskNotificationIds,
  markTaskNotificationAsRead,
  TASK_NOTIFICATION_READ_EVENT,
} from "../../utils/taskNotificationReadState";
import { loadUserPreferences } from "../../utils/userPreferences";

function NotificationDropdown() {
  // Le menu agrege messages et taches, puis se met a jour via evenements et WebSocket.
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(() => loadUserPreferences(currentUser));
  const [readTaskIds, setReadTaskIds] = useState(() => loadReadTaskNotificationIds(currentUser));
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const role = currentUser?.role;
  const userIds = useMemo(() => getUserIdentitySet(currentUser, profile), [currentUser, profile]);

  const loadNotifications = useCallback(async () => {
    // Recharge messages et taches en appliquant les filtres du role courant.
    try {
      const [messagesData, tasksData, myTasksData] = await Promise.allSettled([
        getMessages(),
        getTasks(),
        getTasks({ assigned_to: "me" }),
      ]);

      const rawMessages = messagesData.status === "fulfilled" && Array.isArray(messagesData.value) ? messagesData.value : [];
      const rawTasks = tasksData.status === "fulfilled" && Array.isArray(tasksData.value) ? tasksData.value : [];
      const rawMyTasks = myTasksData.status === "fulfilled" && Array.isArray(myTasksData.value)
        ? myTasksData.value.map((task) => ({ ...task, _notificationAssignedToCurrentUser: true }))
        : [];
      const mergedTasks = mergeNotificationRecords(rawTasks, rawMyTasks);

      const visibleMessages = rawMessages.filter((message) =>
        isNotificationMessageForCurrentUser(message, currentUser, profile)
      );
      const visibleTasks = mergedTasks.filter((task) =>
        isNotificationTaskForCurrentUser(task, currentUser, profile)
      );

      setMessages(visibleMessages);
      setTasks(visibleTasks);
    } catch (error) {
      console.error("Notification load error:", error);
      setMessages([]);
      setTasks([]);
    }
  }, [currentUser, profile]);

  useEffect(() => {
    function handleSettingsChanged(event) {
      setPreferences(event.detail?.preferences || loadUserPreferences(currentUser));
    }

    window.addEventListener("fadesol-user-settings-changed", handleSettingsChanged);

    return () => window.removeEventListener("fadesol-user-settings-changed", handleSettingsChanged);
  }, [currentUser]);

  useEffect(() => {
    setPreferences(loadUserPreferences(currentUser));
  }, [currentUser]);

  useEffect(() => {
    setReadTaskIds(loadReadTaskNotificationIds(currentUser, profile));
  }, [currentUser, profile]);

  useEffect(() => {
    function syncReadTaskNotifications() {
      setReadTaskIds(loadReadTaskNotificationIds(currentUser, profile));
    }

    window.addEventListener(TASK_NOTIFICATION_READ_EVENT, syncReadTaskNotifications);
    window.addEventListener("storage", syncReadTaskNotifications);

    return () => {
      window.removeEventListener(TASK_NOTIFICATION_READ_EVENT, syncReadTaskNotifications);
      window.removeEventListener("storage", syncReadTaskNotifications);
    };
  }, [currentUser, profile]);

  useEffect(() => {
    // Ferme le menu au clic en dehors.
    function handleDocumentClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [currentUser]);

  useEffect(() => {
    // Recupere le profil metier pour connaitre le service courant.
    let isMounted = true;

    getMyUserProfile()
      .then((data) => {
        if (isMounted) {
          setProfile(data);
        }
      })
      .catch(() => {
        if (isMounted) setProfile(null);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    // Synchronise le badge quand d'autres pages modifient messages ou taches.
    return subscribeDataEvents([DATA_EVENTS.MESSAGES_CHANGED, DATA_EVENTS.TASKS_CHANGED], loadNotifications);
  }, [loadNotifications]);

  useEffect(() => {
    // WebSocket leger pour rafraichir le badge au moment des messages.
    const websocket = new WebSocket(getMessagesWebSocketUrl());

    websocket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === "message_created" || payload.type === "message_read") {
          loadNotifications();
        }
      } catch (error) {
        console.error("Notification websocket error:", error);
      }
    };

    websocket.onerror = () => websocket.close();

    return () => {
      websocket.close();
    };
  }, [loadNotifications]);

  const unreadMessagesCount = messages.filter((message) => {
    if (!preferences.notificationsEnabled || !preferences.messageNotifications) {
      return false;
    }

    // Compte seulement les messages recus et pas encore lus.
    const adminViewer = role === "Admin" || role === "Administrateur";

    return !message.est_lu && (adminViewer || isMessageReceivedByCurrentUser(message, currentUser, profile));
  }).length;
  const unreadTasksCount = preferences.notificationsEnabled && preferences.taskNotifications
    ? tasks.filter((task) => {
        const taskId = getTaskNotificationId(task);

        return taskId && !readTaskIds.has(String(taskId));
      }).length
    : 0;
  const unreadCount = unreadMessagesCount + unreadTasksCount;

  const notificationItems = useMemo(() => {
    // Prepare une liste courte pour le menu deroulant.
    if (!preferences.notificationsEnabled) {
      return [];
    }

    const messageNotifications = preferences.messageNotifications ? messages
      .map((message) => ({
        id: `message-${message.id}`,
        type: "message",
        title: "Nouveau message reçu",
        detail: message.contenu,
        date: message.date_creation || message.created_at,
        unread: !message.est_lu,
        meta: message,
      })) : [];

    const taskNotifications = preferences.taskNotifications ? tasks
      .map((task) => ({
        id: `task-${task.id}`,
        type: "task",
        title: "Une tâche vous a été affectée",
        detail: task.title || task.titre || "Tâche",
        date: task.created_at || task.date_creation || task.due_date,
        unread: !readTaskIds.has(String(getTaskNotificationId(task))),
        meta: task,
      })) : [];

    return [...messageNotifications, ...taskNotifications]
      .map((item) => {
        if (item.type !== "task") {
          return item;
        }

        const task = tasks.find((candidate) => `task-${candidate.id}` === item.id) || item.meta || {};
        const taskTitle = task.title || task.titre || item.detail || "Tâche";

        return {
          ...item,
          title: "Nouvelle tâche affectée",
          detail: `Une nouvelle tâche vous a été affectée : ${taskTitle}`,
          meta: task,
        };
      })
      .sort((firstItem, secondItem) => getNotificationTimestamp(secondItem.date) - getNotificationTimestamp(firstItem.date))
      .slice(0, 5);
  }, [messages, preferences, readTaskIds, tasks]);

  function getNotificationTimestamp(value) {
    if (!value) {
      return 0;
    }

    const timestamp = new Date(value).getTime();

    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }

    const normalized = String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const months = {
      janvier: 0,
      fevrier: 1,
      mars: 2,
      avril: 3,
      mai: 4,
      juin: 5,
      juillet: 6,
      aout: 7,
      septembre: 8,
      octobre: 9,
      novembre: 10,
      decembre: 11,
    };
    const frenchMatch = normalized.match(/(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?(?:,\s*(\d{1,2})[:h](\d{2}))?/);

    if (frenchMatch && months[frenchMatch[2]] !== undefined) {
      const year = Number(frenchMatch[3] || new Date().getFullYear());
      const hour = Number(frenchMatch[4] || 0);
      const minute = Number(frenchMatch[5] || 0);

      return new Date(year, months[frenchMatch[2]], Number(frenchMatch[1]), hour, minute).getTime();
    }

    const shortDateMatch = normalized.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?(?:\s+(\d{1,2}):(\d{2}))?/);

    if (shortDateMatch) {
      const rawYear = shortDateMatch[3] ? Number(shortDateMatch[3]) : new Date().getFullYear();
      const year = rawYear < 100 ? 2000 + rawYear : rawYear;
      const hour = Number(shortDateMatch[4] || 0);
      const minute = Number(shortDateMatch[5] || 0);

      return new Date(year, Number(shortDateMatch[2]) - 1, Number(shortDateMatch[1]), hour, minute).getTime();
    }

    return 0;
  }

  function formatNotificationDate(value) {
    if (!value) return "";

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function handleViewNotification(item) {
    setOpen(false);

    if (item.type === "task") {
      const taskId = item.meta?.id || item.meta?.task_id;

      if (!taskId) {
        navigate("/notifications");
        return;
      }

      const updatedReadIds = markTaskNotificationAsRead(currentUser, profile, item.meta);
      setReadTaskIds(updatedReadIds);

      const normalizedRole = String(profile?.role || currentUser?.role || "").toLowerCase();
      const isPersonalTask =
        item.meta?._notificationAssignedToCurrentUser === true ||
        getTaskAssigneeValues(item.meta).some((value) => userIds.has(String(value)));
      const shouldOpenMyTasks =
        isPersonalTask &&
        (normalizedRole.includes("manager") || normalizedRole.includes("employee") || normalizedRole.includes("employ"));

      navigate(`${shouldOpenMyTasks ? "/my-tasks" : "/tasks"}?taskId=${taskId}`);
      return;
    }

    if (item.type === "message") {
      const conversationId = item.meta?.conversation_id || item.meta?.conversation || item.meta?.conversationId;

      if (conversationId) {
        navigate(`/messages?conversationId=${conversationId}`);
      } else if (item.meta?.id) {
        navigate(`/messages?messageId=${item.meta.id}`);
      } else {
        navigate("/messages");
      }
      return;
    }

    navigate("/notifications");
  }

  return (
    <div className="notification-menu" ref={dropdownRef}>
      <button
        type="button"
        className="icon-button notification-button"
        aria-label={`Notifications${unreadCount ? `: ${unreadCount} non lue(s)` : ""}`}
        title="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={19} />
        {unreadCount > 0 && <b>{unreadCount > 99 ? "99+" : unreadCount}</b>}
      </button>

      {open && (
        <div className="notification-dropdown" role="menu">
          <header>
            <strong>Notifications</strong>
            <span>{unreadCount} non lue(s)</span>
          </header>

          <div className="notification-dropdown__list">
            {notificationItems.map((item) => (
              <article
                key={item.id}
                className={item.unread ? "is-unread" : ""}
              >
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <time>{formatNotificationDate(item.date)}</time>
                <button type="button" onClick={() => handleViewNotification(item)}>
                  Voir
                </button>
              </article>
            ))}

            {notificationItems.length === 0 && <p className="empty-notifications">Aucune notification pour le moment.</p>}
          </div>

          <div style={{ display: "flex", gap: 8, padding: 12 }}>
            <button
              type="button"
              className="notification-dropdown__footer"
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
            >
              Voir tout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
