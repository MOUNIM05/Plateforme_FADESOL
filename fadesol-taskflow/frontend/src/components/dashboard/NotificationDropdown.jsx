import { Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMessages, getMessagesWebSocketUrl } from "../../services/messageService";
import { getTasks } from "../../services/taskService";
import { getMyUserProfile, getUsers } from "../../services/userService";
import { DATA_EVENTS, subscribeDataEvents } from "../../utils/dataEvents";

function getUserIdentifiers(user) {
  return new Set(
    [user?.uuid, user?.id, user?.user_id]
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String)
  );
}

function NotificationDropdown() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(null);
  const [serviceUsers, setServiceUsers] = useState([]);
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
    try {
      const taskFilters = isEmployee ? { assigned_to: "me" } : isManager && currentServiceId ? { service_id: currentServiceId } : {};

      const [messagesData, tasksData] = await Promise.allSettled([getMessages(), getTasks(taskFilters)]);

      const rawMessages = messagesData.status === "fulfilled" && Array.isArray(messagesData.value) ? messagesData.value : [];
      const rawTasks = tasksData.status === "fulfilled" && Array.isArray(tasksData.value) ? tasksData.value : [];

      // Filter messages by role
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
    function handleDocumentClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, []);

  useEffect(() => {
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
    return subscribeDataEvents([DATA_EVENTS.MESSAGES_CHANGED, DATA_EVENTS.TASKS_CHANGED], loadNotifications);
  }, [loadNotifications]);

  useEffect(() => {
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
    const recipientId = String(message.destinataire_id || "");
    const senderId = String(message.expediteur_id || "");

    return !message.est_lu && userIds.has(recipientId) && !userIds.has(senderId);
  }).length;

  const notificationItems = useMemo(() => {
    const messageNotifications = messages
      .slice(0, 3)
      .map((message) => ({
        id: `message-${message.id}`,
        type: "message",
        title: "Nouveau message reçu",
        detail: message.contenu,
        date: message.date_creation || message.created_at,
        unread: !message.est_lu,
      }));

    const taskNotifications = tasks
      .slice(0, 3)
      .map((task) => ({
        id: `task-${task.id}`,
        type: "task",
        title: "Une tâche vous a été affectée",
        detail: task.title || task.titre || "Tâche",
        date: task.created_at || task.date_creation || task.due_date,
        unread: false,
      }));

    return [...messageNotifications, ...taskNotifications].slice(0, 5);
  }, [messages, tasks]);

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
                onClick={() => {
                  setOpen(false);
                  if (item.type === "task") navigate("/tasks");
                  if (item.type === "message") navigate("/messages");
                }}
                style={{ cursor: "pointer" }}
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
