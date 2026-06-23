// Page Notifications : agrège les messages non lus et les taches affectees.
import { Bell, CheckCheck, MessageSquareText, RefreshCw, ClipboardList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMessages, markMessageAsRead } from "../services/messageService";
import { getTasks } from "../services/taskService";
import { getMyUserProfile } from "../services/userService";
import {
  getNotificationTimestamp,
  getTaskAssigneeValues,
  getUserIdentitySet,
  isNotificationMessageForCurrentUser,
  isNotificationTaskForCurrentUser,
  mergeNotificationRecords,
} from "../utils/notificationFilters";
import {
  getTaskNotificationId,
  loadReadTaskNotificationIds,
  markTaskNotificationAsRead,
  markTaskNotificationsAsRead,
  TASK_NOTIFICATION_READ_EVENT,
} from "../utils/taskNotificationReadState";
import { loadUserPreferences } from "../utils/userPreferences";

function getUserName(user) {
  return (
    [user?.prenom || user?.first_name, user?.nom || user?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "Utilisateur"
  );
}

function formatDate(value) {
  if (!value) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Notifications() {
  // Les notifications sont construites cote frontend a partir des services messages et taches.
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(() => loadUserPreferences(currentUser));
  const [readTaskIds, setReadTaskIds] = useState(() => loadReadTaskNotificationIds(currentUser));
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const userIds = useMemo(() => {
    // Fusionne les ids du contexte auth et du profil metier charge.
    return getUserIdentitySet(currentUser, profile);
  }, [currentUser, profile]);

  const buildNotifications = useMemo(() => {
    // Transforme messages et taches en une liste unique triee par date.
    if (!preferences.notificationsEnabled) {
      return [];
    }

    const messageNotifications = preferences.messageNotifications ? (messages || [])
      .map((m) => ({
        id: `message-${m.id}`,
        type: "message",
        title: "Nouveau message reçu",
        description: m.contenu || "",
        date: m.date_creation || m.created_at,
        unread: !m.est_lu,
        meta: m,
      }))
      .filter(Boolean) : [];

    const taskNotifications = preferences.taskNotifications ? (tasks || [])
      .map((t) => ({
        id: `task-${t.id}`,
        type: "task",
        title: "Une tâche vous a été affectée",
        description: t.title || t.titre || t.name || "Tâche",
        date: t.created_at || t.date_creation || t.updated_at || t.due_date,
        unread: getTaskNotificationId(t) ? !readTaskIds.has(String(getTaskNotificationId(t))) : false,
        meta: t,
      }))
      .filter(Boolean) : [];

    const all = [...messageNotifications, ...taskNotifications].map((notification) => {
      if (notification.type !== "task") {
        return notification;
      }

      const taskTitle =
        notification.meta?.title ||
        notification.meta?.titre ||
        notification.meta?.name ||
        notification.description ||
        "TÃ¢che";

      return {
        ...notification,
        title: "Nouvelle tâche affectée",
        description: `Une nouvelle tâche vous a été affectée : ${taskTitle}`,
      };
    });

    return all.sort((a, b) => getNotificationTimestamp(b.date) - getNotificationTimestamp(a.date));
  }, [messages, preferences, readTaskIds, tasks]);

  const unreadNotifications = useMemo(() => buildNotifications.filter((n) => n.unread), [buildNotifications]);

  async function loadNotifications() {
    // Charge les donnees utiles puis applique les regles de visibilite par role.
    setLoading(true);
    setError("");

    try {
      const profileResult = await getMyUserProfile();
      setProfile(profileResult || null);

      const [messagesResult, tasksResult, myTasksResult] = await Promise.allSettled([
        getMessages(),
        getTasks(),
        getTasks({ assigned_to: "me" }),
      ]);

      const rawMessages = messagesResult.status === "fulfilled" && Array.isArray(messagesResult.value) ? messagesResult.value : [];
      const rawTasks = tasksResult.status === "fulfilled" && Array.isArray(tasksResult.value) ? tasksResult.value : [];
      const rawMyTasks = myTasksResult.status === "fulfilled" && Array.isArray(myTasksResult.value)
        ? myTasksResult.value.map((task) => ({ ...task, _notificationAssignedToCurrentUser: true }))
        : [];
      const mergedTasks = mergeNotificationRecords(rawTasks, rawMyTasks);

      // Applique les memes regles de visibilite que le menu de notifications.
      const visibleMessages = rawMessages.filter((message) =>
        isNotificationMessageForCurrentUser(message, currentUser, profileResult)
      );
      const visibleTasks = mergedTasks.filter((task) =>
        isNotificationTaskForCurrentUser(task, currentUser, profileResult)
      );

      setMessages(visibleMessages);
      setTasks(visibleTasks);
    } catch (err) {
      console.error("Load notifications error:", err);
      setError("Impossible de charger les notifications.");
      setMessages([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

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

  async function markOneAsRead(messageId) {
    // Marque une notification message comme lue.
    setMessage("");
    setError("");

    try {
      await markMessageAsRead(messageId);
      setMessages((current) => current.map((item) => (item.id === messageId ? { ...item, est_lu: true } : item)));
      setMessage("Notification marquée comme lue.");
    } catch (readError) {
      console.error("Mark notification read error:", readError);
      setError("Impossible de marquer cette notification comme lue.");
    }
  }

  async function markAllAsRead() {
    // Marque toutes les notifications message non lues comme lues.
    setMessage("");
    setError("");

    const unreadMessageIds = messages.filter((m) => !m.est_lu).map((m) => m.id);
    const unreadTasks = tasks.filter((task) => {
      const taskId = getTaskNotificationId(task);

      return taskId && !readTaskIds.has(String(taskId));
    });

    if (!unreadMessageIds.length && !unreadTasks.length) {
      setMessage("Aucune notification non lue.");
      return;
    }

    const updatedReadTaskIds = markTaskNotificationsAsRead(currentUser, profile, unreadTasks);
    setReadTaskIds(updatedReadTaskIds);

    const results = await Promise.allSettled(unreadMessageIds.map((id) => markMessageAsRead(id)));

    if (results.some((result) => result.status === "rejected")) {
      setError("Certaines notifications n'ont pas pu être marquées comme lues.");
    } else {
      setMessage("Toutes les notifications sont marquées comme lues.");
    }

    setMessages((current) => current.map((item) => (unreadMessageIds.includes(item.id) ? { ...item, est_lu: true } : item)));
  }

  function handleView(notification) {
    // Redirige vers la page metier correspondant a la notification.
    if (!notification) return;

    if (notification.type === "task") {
      const taskId = notification.meta?.id || notification.meta?.task_id;
      if (taskId) {
        const updatedReadIds = markTaskNotificationAsRead(currentUser, profile, notification.meta);
        setReadTaskIds(updatedReadIds);

        const role = profile?.role || currentUser?.role || "";
        const normalizedRole = String(role).toLowerCase();
        const isPersonalTask = getTaskAssigneeValues(notification.meta).some((value) => userIds.has(String(value)));
        const shouldOpenMyTasks = isPersonalTask && (normalizedRole.includes("manager") || normalizedRole.includes("employee") || normalizedRole.includes("employ"));

        navigate(`${shouldOpenMyTasks ? "/my-tasks" : "/tasks"}?taskId=${taskId}`);
      } else {
        navigate("/notifications");
      }
      return;
    }

    if (notification.type === "message") {
      const convId = notification.meta?.conversation_id || notification.meta?.conversation || notification.meta?.conversationId;
      if (convId) {
        navigate(`/messages?conversationId=${convId}`);
      } else if (notification.meta?.id) {
        navigate(`/messages?messageId=${notification.meta.id}`);
      } else {
        navigate("/messages");
      }
      return;
    }

    navigate("/notifications");
  }

  return (
    <div className="dashboard-page notifications-page">
      <div className="board-toolbar">
        <div>
          <h2>Notifications</h2>
          <p>Activités récentes liées aux tâches et aux messages.</p>
        </div>
        <div className="toolbar-actions">
          <button type="button" className="secondary-action" onClick={loadNotifications}>
            <RefreshCw size={17} />
            Actualiser
          </button>
          <button type="button" className="secondary-action" onClick={markAllAsRead} disabled={!unreadNotifications.length}>
            <CheckCheck size={17} />
            Tout lire
          </button>
        </div>
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice warning">{error}</p>}

      <section className="workspace-panel notifications-panel">
        <div className="panel-title">
          <h3>Notifications</h3>
          <span>{loading ? "Chargement..." : `${buildNotifications.length} notification(s)`}</span>
        </div>

        {loading && <p className="loading-line">Chargement des notifications...</p>}

        {!loading && buildNotifications.length === 0 && (
          <article className="empty-state-panel notifications-empty">
            <div className="empty-state-icon">
              <Bell size={32} />
            </div>
            <h3>Aucune notification pour le moment.</h3>
            <p>Les nouvelles tâches et messages pertinents apparaîtront ici.</p>
          </article>
        )}

        {!loading && buildNotifications.length > 0 && (
          <div className="notifications-list">
            {buildNotifications.map((item) => {
              return (
                <article key={item.id} className="notification-item">
                  <div className="notification-item__icon">
                    {item.type === "message" ? <MessageSquareText size={19} /> : <ClipboardList size={19} />}
                  </div>
                  <div>
                    <header>
                      <strong>{item.title}</strong>
                      <time>{formatDate(item.date)}</time>
                    </header>
                    <p>{item.description}</p>
                    <footer>
                      <button type="button" onClick={() => handleView(item)}>
                        Voir
                      </button>
                      {item.type === "message" && item.unread && (
                        <button type="button" onClick={() => markOneAsRead(item.meta.id)}>
                          Marquer comme lu
                        </button>
                      )}
                    </footer>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Notifications;
