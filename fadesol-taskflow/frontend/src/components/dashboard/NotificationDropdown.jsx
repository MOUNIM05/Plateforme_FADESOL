// Menu de notifications affiche dans la barre superieure du dashboard.
import { Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMessages, getMessagesWebSocketUrl } from "../../services/messageService";
import { getTasks } from "../../services/taskService";
import { getMyUserProfile, getUsers } from "../../services/userService";
import { DATA_EVENTS, subscribeDataEvents } from "../../utils/dataEvents";
import { loadUserPreferences } from "../../utils/userPreferences";

function getUserIdentifiers(user) {
  // Regroupe les identifiants possibles pour reconnaitre les messages du compte courant.
  return new Set(
    [user?.uuid, user?.id, user?.user_id]
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String)
  );
}

function NotificationDropdown() {
  // Le menu agrege messages et taches, puis se met a jour via evenements et WebSocket.
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [serviceUsers, setServiceUsers] = useState([]);
  const [preferences, setPreferences] = useState(() => loadUserPreferences(currentUser));
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const role = currentUser?.role;
  const isAdmin = role === "Admin" || role === "Administrateur";
  const isManager = role === "Manager";
  const isEmployee = role === "Employee" || role === "Employe" || role === "EmployÃ©";

  const currentServiceId = profile?.id_service || profile?.service_id || currentUser?.id_service || currentUser?.service_id || "";

  const userIds = useMemo(() => {
    return new Set([...getUserIdentifiers(currentUser), ...getUserIdentifiers(profile)]);
  }, [currentUser, profile]);

  const loadNotifications = useCallback(async () => {
    // Recharge messages et taches en appliquant les filtres du role courant.
    try {
      const taskFilters = isEmployee ? { assigned_to: "me" } : isManager && currentServiceId ? { service_id: currentServiceId } : {};

      const [messagesData, tasksData] = await Promise.allSettled([getMessages(), getTasks(taskFilters)]);

      const rawMessages = messagesData.status === "fulfilled" && Array.isArray(messagesData.value) ? messagesData.value : [];
      const rawTasks = tasksData.status === "fulfilled" && Array.isArray(tasksData.value) ? tasksData.value : [];

      // Filtre les messages par role : employee direct, manager service, admin global.
      let visibleMessages = rawMessages;

      if (isEmployee) {
        visibleMessages = rawMessages.filter((message) => {
          const recipientId = String(message.destinataire_id || "");
          return userIds.has(recipientId);
        });
      } else if (isManager && serviceUsers.length > 0) {
        const serviceIds = new Set(serviceUsers.flatMap((u) => [String(u.id), String(u.uuid)]));
        visibleMessages = rawMessages.filter((message) => {
          const recipientId = String(message.destinataire_id || "");
          const senderId = String(message.expediteur_id || "");
          return serviceIds.has(recipientId) || serviceIds.has(senderId);
        });
      }

      setMessages(visibleMessages);
      setTasks(rawTasks);
    } catch (error) {
      console.error("Notification load error:", error);
      setMessages([]);
      setTasks([]);
    }
  }, [isEmployee, isManager, currentServiceId, serviceUsers, userIds]);

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
    // Ferme le menu au clic en dehors.
    function handleDocumentClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

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
  }, []);

  useEffect(() => {
    // Pour un manager, charge les membres de son service afin de filtrer les messages.
    if (isManager && currentServiceId) {
      getUsers(currentServiceId)
        .then((data) => setServiceUsers(Array.isArray(data) ? data : []))
        .catch(() => setServiceUsers([]));
    }
  }, [isManager, currentServiceId]);

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

  const unreadCount = messages.filter((message) => {
    if (!preferences.notificationsEnabled || !preferences.messageNotifications) {
      return false;
    }

    // Compte seulement les messages recus et pas encore lus.
    const recipientId = String(message.destinataire_id || "");
    const senderId = String(message.expediteur_id || "");

    return !message.est_lu && userIds.has(recipientId) && !userIds.has(senderId);
  }).length;

  const notificationItems = useMemo(() => {
    // Prepare une liste courte pour le menu deroulant.
    if (!preferences.notificationsEnabled) {
      return [];
    }

    const messageNotifications = preferences.messageNotifications ? messages
      .slice(0, 3)
      .map((message) => ({
        id: `message-${message.id}`,
        type: "message",
        title: "Nouveau message reçu",
        detail: message.contenu,
        date: message.date_creation || message.created_at,
        unread: !message.est_lu,
      })) : [];

    const taskNotifications = preferences.taskNotifications ? tasks
      .slice(0, 3)
      .map((task) => ({
        id: `task-${task.id}`,
        type: "task",
        title: "Une tâche vous a été affectée",
        detail: task.title || task.titre || "Tâche",
        date: task.created_at || task.date_creation || task.due_date,
        unread: false,
      })) : [];

    return [...messageNotifications, ...taskNotifications].slice(0, 5);
  }, [messages, preferences, tasks]);

  function formatNotificationDate(value) {
    if (!value) return "";

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
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
