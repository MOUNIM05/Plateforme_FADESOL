import { Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMessages, getMessagesWebSocketUrl } from "../../services/messageService";
import { getTasks } from "../../services/taskService";
import { getMyUserProfile } from "../../services/userService";
import { DATA_EVENTS, subscribeDataEvents } from "../../utils/dataEvents";
import { loadUserPreferences } from "../../utils/userPreferences";

function getUserIdentifiers(user) {
  return new Set(
    [user?.uuid, user?.id, user?.user_id]
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String)
  );
}

function NotificationButton() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(() => loadUserPreferences(currentUser));
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const userIds = useMemo(() => {
    return new Set([...getUserIdentifiers(currentUser), ...getUserIdentifiers(profile)]);
  }, [currentUser, profile]);

  const loadUnreadMessages = useCallback(async () => {
    try {
      const [messagesData, tasksData] = await Promise.allSettled([
        getMessages(),
        getTasks({ assigned_to: "me" }),
      ]);

      setMessages(messagesData.status === "fulfilled" && Array.isArray(messagesData.value) ? messagesData.value : []);
      setTasks(tasksData.status === "fulfilled" && Array.isArray(tasksData.value) ? tasksData.value : []);
    } catch (error) {
      console.error("Notification load error:", error);
      setMessages([]);
      setTasks([]);
    }
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
    function handleDocumentClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  useEffect(() => {
    loadUnreadMessages();
  }, [loadUnreadMessages]);

  useEffect(() => {
    return subscribeDataEvents([DATA_EVENTS.MESSAGES_CHANGED], loadUnreadMessages);
  }, [loadUnreadMessages]);

  useEffect(() => {
    let isMounted = true;

    getMyUserProfile()
      .then((data) => {
        if (isMounted) {
          setProfile(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProfile(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const websocket = new WebSocket(getMessagesWebSocketUrl());

    websocket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === "message_created" || payload.type === "message_read") {
          loadUnreadMessages();
        }
      } catch (error) {
        console.error("Notification websocket error:", error);
      }
    };

    websocket.onerror = () => {
      websocket.close();
    };

    return () => {
      websocket.close();
    };
  }, [loadUnreadMessages]);

  const unreadCount = messages.filter((message) => {
    if (!preferences.notificationsEnabled || !preferences.messageNotifications) {
      return false;
    }

    const recipientId = String(message.destinataire_id || "");
    const senderId = String(message.expediteur_id || "");

    return !message.est_lu && userIds.has(recipientId) && !userIds.has(senderId);
  }).length;

  const notificationItems = useMemo(() => {
    if (!preferences.notificationsEnabled) {
      return [];
    }

    const messageNotifications = messages
      .filter((message) => {
        const recipientId = String(message.destinataire_id || "");
        const senderId = String(message.expediteur_id || "");
        return userIds.has(recipientId) && !userIds.has(senderId);
      })
      .slice(0, 3)
      .map((message) => ({
        id: `message-${message.id}`,
        title: "Nouveau message reçu",
        detail: message.contenu,
        date: message.date_creation,
        unread: !message.est_lu,
      }));

    const taskNotifications = tasks.slice(0, 2).map((task) => ({
      id: `task-${task.id}`,
      title: "Une tâche vous a été affectée",
      detail: task.title || task.titre || "Tâche",
      date: task.created_at || task.date_creation || task.due_date,
      unread: false,
    }));

    return [
      ...(preferences.messageNotifications ? messageNotifications : []),
      ...(preferences.taskNotifications ? taskNotifications : []),
    ].slice(0, 5);
  }, [messages, preferences, tasks, userIds]);

  function formatNotificationDate(value) {
    if (!value) {
      return "";
    }

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
              <article key={item.id} className={item.unread ? "is-unread" : ""}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <time>{formatNotificationDate(item.date)}</time>
              </article>
            ))}

            {notificationItems.length === 0 && <p className="empty-notifications">Aucune notification pour le moment.</p>}
          </div>

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
      )}
    </div>
  );
}

export default NotificationButton;
