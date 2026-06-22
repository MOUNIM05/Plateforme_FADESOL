// Page Notifications : agrège les messages non lus et les taches affectees.
import { Bell, CheckCheck, MessageSquareText, RefreshCw, ClipboardList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMessages, markMessageAsRead } from "../services/messageService";
import { getTasks } from "../services/taskService";
import { getMyUserProfile, getUsers } from "../services/userService";
import { loadUserPreferences } from "../utils/userPreferences";

function getUserIdentifiers(user) {
  // Regroupe les identifiants possibles pour reconnaitre le compte courant.
  return new Set(
    [user?.uuid, user?.id, user?.user_id, user?.utilisateur_id, user?.email]
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String)
  );
}

function getTaskAssigneeValues(task) {
  return [
    task?.assigned_to,
    task?.assigned_user_id,
    task?.assignee_id,
    task?.assignee_a,
    task?.user_id,
    task?.responsable_id,
  ].filter((value) => value !== undefined && value !== null && value !== "");
}

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
  const [users, setUsers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(() => loadUserPreferences(currentUser));
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const userIds = useMemo(() => {
    // Fusionne les ids du contexte auth et du profil metier charge.
    return new Set([...getUserIdentifiers(currentUser), ...getUserIdentifiers(profile)]);
  }, [currentUser, profile]);


  const userById = useMemo(() => {
    return users.reduce((accumulator, user) => {
      accumulator[String(user.id)] = user;
      accumulator[String(user.uuid)] = user;
      return accumulator;
    }, {});
  }, [users]);

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
        unread: false,
        meta: t,
      }))
      .filter(Boolean) : [];

    const all = [...messageNotifications, ...taskNotifications];

    return all.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [messages, preferences, tasks]);

  const unreadMessages = useMemo(() => buildNotifications.filter((n) => n.type === "message" && n.unread), [buildNotifications]);

  async function loadNotifications() {
    // Charge les donnees utiles puis applique les regles de visibilite par role.
    setLoading(true);
    setError("");

    try {
      const profileResult = await getMyUserProfile();
      setProfile(profileResult || null);

      const role = profileResult?.role || currentUser?.role;
      const isEmployee = role === "Employee" || role === "Employe" || role === "EmployÃ©";
      const isManager = role === "Manager";
      const currentServiceId = profileResult?.id_service || profileResult?.service_id || currentUser?.id_service || currentUser?.service_id || "";

      const [messagesResult, tasksResult, usersResult] = await Promise.allSettled([
        getMessages(),
        getTasks(isEmployee ? { assigned_to: "me" } : isManager && currentServiceId ? { service_id: currentServiceId } : {}),
        getUsers(isManager && currentServiceId ? currentServiceId : undefined),
      ]);

      const rawMessages = messagesResult.status === "fulfilled" && Array.isArray(messagesResult.value) ? messagesResult.value : [];
      const rawTasks = tasksResult.status === "fulfilled" && Array.isArray(tasksResult.value) ? tasksResult.value : [];
      const rawUsers = usersResult.status === "fulfilled" && Array.isArray(usersResult.value) ? usersResult.value : [];

      // Applique les memes regles de visibilite que le menu de notifications.
      let visibleMessages = rawMessages;

      if (isEmployee) {
        const userIdsSet = new Set([...getUserIdentifiers(currentUser), ...getUserIdentifiers(profileResult)]);
        visibleMessages = rawMessages.filter((message) => userIdsSet.has(String(message.destinataire_id || "")));
      } else if (isManager && rawUsers.length > 0) {
        const serviceIds = new Set(rawUsers.flatMap((u) => [String(u.id), String(u.uuid)]));
        visibleMessages = rawMessages.filter((message) => {
          const recipientId = String(message.destinataire_id || "");
          const senderId = String(message.expediteur_id || "");
          return serviceIds.has(recipientId) || serviceIds.has(senderId);
        });
      }

      setMessages(visibleMessages);
      setTasks(rawTasks);
      setUsers(rawUsers);
    } catch (err) {
      console.error("Load notifications error:", err);
      setError("Impossible de charger les notifications.");
      setMessages([]);
      setTasks([]);
      setUsers([]);
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

    const unread = messages.filter((m) => !m.est_lu).map((m) => m.id);

    if (!unread.length) {
      setMessage("Aucune notification non lue.");
      return;
    }

    const results = await Promise.allSettled(unread.map((id) => markMessageAsRead(id)));

    if (results.some((result) => result.status === "rejected")) {
      setError("Certaines notifications n'ont pas pu être marquées comme lues.");
    } else {
      setMessage("Toutes les notifications sont marquées comme lues.");
    }

    setMessages((current) => current.map((item) => (unread.includes(item.id) ? { ...item, est_lu: true } : item)));
  }

  function handleView(notification) {
    // Redirige vers la page metier correspondant a la notification.
    if (!notification) return;

    if (notification.type === "task") {
      const taskId = notification.meta?.id || notification.meta?.task_id;
      if (taskId) {
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
          <button type="button" className="secondary-action" onClick={markAllAsRead} disabled={!unreadMessages.length}>
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
