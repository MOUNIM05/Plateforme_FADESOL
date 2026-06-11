import { Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMessages, getMessagesWebSocketUrl } from "../../services/messageService";
import { getMyUserProfile } from "../../services/userService";
import { DATA_EVENTS, subscribeDataEvents } from "../../utils/dataEvents";

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
  const [profile, setProfile] = useState(null);

  const userIds = useMemo(() => {
    return new Set([...getUserIdentifiers(currentUser), ...getUserIdentifiers(profile)]);
  }, [currentUser, profile]);

  const loadUnreadMessages = useCallback(async () => {
    try {
      const data = await getMessages();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Notification load error:", error);
      setMessages([]);
    }
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
    const recipientId = String(message.destinataire_id || "");
    const senderId = String(message.expediteur_id || "");

    return !message.est_lu && userIds.has(recipientId) && !userIds.has(senderId);
  }).length;

  return (
    <button
      type="button"
      className="icon-button notification-button"
      aria-label={`Notifications${unreadCount ? `: ${unreadCount} non lue(s)` : ""}`}
      title="Notifications"
      onClick={() => navigate("/notifications")}
    >
      <Bell size={19} />
      {unreadCount > 0 && <b>{unreadCount > 99 ? "99+" : unreadCount}</b>}
    </button>
  );
}

export default NotificationButton;
