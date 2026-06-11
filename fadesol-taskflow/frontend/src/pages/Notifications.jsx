import { Bell, CheckCheck, MessageSquareText, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMessages, markMessageAsRead } from "../services/messageService";
import { getMyUserProfile, getUsers } from "../services/userService";

function getUserIdentifiers(user) {
  return new Set(
    [user?.uuid, user?.id, user?.user_id]
      .filter((value) => value !== undefined && value !== null && value !== "")
      .map(String)
  );
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
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const userIds = useMemo(() => {
    return new Set([...getUserIdentifiers(currentUser), ...getUserIdentifiers(profile)]);
  }, [currentUser, profile]);

  const userById = useMemo(() => {
    return users.reduce((accumulator, user) => {
      accumulator[String(user.id)] = user;
      accumulator[String(user.uuid)] = user;
      return accumulator;
    }, {});
  }, [users]);

  const unreadMessages = useMemo(() => {
    return messages
      .filter((item) => {
        const recipientId = String(item.destinataire_id || "");
        const senderId = String(item.expediteur_id || "");

        return !item.est_lu && userIds.has(recipientId) && !userIds.has(senderId);
      })
      .sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation));
  }, [messages, userIds]);

  async function loadNotifications() {
    setLoading(true);
    setError("");

    const [messageResult, userResult, profileResult] = await Promise.allSettled([
      getMessages(),
      getUsers(),
      getMyUserProfile(),
    ]);

    if (messageResult.status === "fulfilled") {
      setMessages(Array.isArray(messageResult.value) ? messageResult.value : []);
    } else {
      setMessages([]);
      setError("Notifications temporairement indisponibles.");
    }

    if (userResult.status === "fulfilled") {
      setUsers(Array.isArray(userResult.value) ? userResult.value : []);
    }

    if (profileResult.status === "fulfilled") {
      setProfile(profileResult.value);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markOneAsRead(messageId) {
    setMessage("");
    setError("");

    try {
      await markMessageAsRead(messageId);
      setMessages((current) =>
        current.map((item) => (item.id === messageId ? { ...item, est_lu: true } : item))
      );
      setMessage("Notification marquée comme lue.");
    } catch (readError) {
      console.error("Mark notification read error:", readError);
      setError("Impossible de marquer cette notification comme lue.");
    }
  }

  async function markAllAsRead() {
    setMessage("");
    setError("");

    const results = await Promise.allSettled(unreadMessages.map((item) => markMessageAsRead(item.id)));

    if (results.some((result) => result.status === "rejected")) {
      setError("Certaines notifications n'ont pas pu être marquées comme lues.");
    } else {
      setMessage("Toutes les notifications sont marquées comme lues.");
    }

    setMessages((current) =>
      current.map((item) =>
        unreadMessages.some((unread) => unread.id === item.id) ? { ...item, est_lu: true } : item
      )
    );
  }

  return (
    <div className="dashboard-page notifications-page">
      <div className="board-toolbar">
        <div>
          <h2>Notifications</h2>
          <p>Messages non lus envoyés par d'autres utilisateurs.</p>
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
          <h3>Messages non lus</h3>
          <span>{loading ? "Chargement..." : `${unreadMessages.length} notification(s)`}</span>
        </div>

        {loading && <p className="loading-line">Chargement des notifications...</p>}

        {!loading && unreadMessages.length === 0 && (
          <article className="empty-state-panel notifications-empty">
            <div className="empty-state-icon">
              <Bell size={32} />
            </div>
            <h3>Aucune notification</h3>
            <p>Les nouveaux messages envoyés par d'autres utilisateurs apparaîtront ici.</p>
          </article>
        )}

        {!loading && unreadMessages.length > 0 && (
          <div className="notifications-list">
            {unreadMessages.map((item) => {
              const sender = userById[String(item.expediteur_id)];

              return (
                <article key={item.id} className="notification-item">
                  <div className="notification-item__icon">
                    <MessageSquareText size={19} />
                  </div>
                  <div>
                    <header>
                      <strong>{getUserName(sender)}</strong>
                      <time>{formatDate(item.date_creation)}</time>
                    </header>
                    <p>{item.contenu}</p>
                    <footer>
                      <button type="button" onClick={() => navigate("/messages")}>
                        Ouvrir messagerie
                      </button>
                      <button type="button" onClick={() => markOneAsRead(item.id)}>
                        Marquer comme lu
                      </button>
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
