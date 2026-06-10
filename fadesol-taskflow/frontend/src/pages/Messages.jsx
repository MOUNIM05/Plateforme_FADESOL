import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox, MessageSquareText, Radio, RefreshCw, Send, UsersRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getProjects } from "../services/projectService";
import { getServices } from "../services/serviceService";
import { getUsers } from "../services/userService";
import {
  createMessage,
  getConversation,
  getConversations,
  getMessagesWebSocketUrl,
  markMessageAsRead,
} from "../services/messageService";

const initialForm = {
  destinataire_id: "",
  service_id: "",
  projet_id: "",
  contenu: "",
};

function getUserId(user) {
  return String(user?.uuid || user?.id || "");
}

function getUserName(user) {
  return (
    [user?.first_name || user?.prenom, user?.last_name || user?.nom].filter(Boolean).join(" ") ||
    user?.email ||
    "Utilisateur"
  );
}

function formatDate(value) {
  if (!value) {
    return "Date non renseignée";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function Messages() {
  const { currentUser } = useAuth();
  const currentUserId = getUserId(currentUser);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const selectedConversationIdRef = useRef("");

  const userById = useMemo(() => {
    return users.reduce((accumulator, user) => {
      accumulator[String(user.id)] = user;
      accumulator[String(user.uuid)] = user;
      return accumulator;
    }, {});
  }, [users]);

  const serviceById = useMemo(() => {
    return services.reduce((accumulator, service) => {
      accumulator[String(service.id)] = service.name;
      return accumulator;
    }, {});
  }, [services]);

  const projectById = useMemo(() => {
    return projects.reduce((accumulator, project) => {
      accumulator[String(project.id)] = project.titre;
      return accumulator;
    }, {});
  }, [projects]);

  useEffect(() => {
    loadMessagingData();
  }, []);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    const websocket = new WebSocket(getMessagesWebSocketUrl());

    websocket.onopen = () => {
      setRealtimeStatus("connected");
    };

    websocket.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === "message_created") {
          await loadMessagingData();

          if (selectedConversationIdRef.current) {
            await loadConversation(selectedConversationIdRef.current, false);
          }
        }

        if (payload.type === "message_read") {
          setMessages((current) =>
            current.map((message) =>
              message.id === payload.message?.id ? { ...message, est_lu: true } : message
            )
          );
        }
      } catch (socketError) {
        console.error("Realtime message error:", socketError);
      }
    };

    websocket.onerror = () => {
      setRealtimeStatus("disconnected");
    };

    websocket.onclose = () => {
      setRealtimeStatus("disconnected");
    };

    return () => {
      websocket.close();
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    loadConversation(selectedConversationId);
  }, [selectedConversationId]);

  async function loadConversation(conversationId, showLoader = true) {
    let isMounted = true;

    if (showLoader) {
      setConversationLoading(true);
    }

    return getConversation(conversationId)
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setSelectedConversation(data.conversation || null);
        const messageData = Array.isArray(data.messages) ? data.messages : [];
        setMessages(messageData);
        markVisibleMessagesAsRead(messageData);
      })
      .catch((loadError) => {
        console.error("Conversation load error:", loadError);
        if (isMounted) {
          setSelectedConversation(null);
          setMessages([]);
          setError("Historique de conversation temporairement indisponible.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setConversationLoading(false);
        }
      });
  }

  async function loadMessagingData() {
    setLoading(true);
    setError("");

    try {
      const [conversationsData, usersData, servicesData, projectsData] = await Promise.allSettled([
        getConversations(),
        getUsers(),
        getServices(),
        getProjects(),
      ]);

      if (conversationsData.status === "fulfilled") {
        const conversationData = Array.isArray(conversationsData.value) ? conversationsData.value : [];
        setConversations(conversationData);
        setSelectedConversationId((current) => current || conversationData[0]?.conversation_id || "");
      }

      if (usersData.status === "fulfilled") {
        setUsers(Array.isArray(usersData.value) ? usersData.value : []);
      }

      if (servicesData.status === "fulfilled") {
        setServices(Array.isArray(servicesData.value) ? servicesData.value : []);
      }

      if (projectsData.status === "fulfilled") {
        setProjects(Array.isArray(projectsData.value) ? projectsData.value : []);
      }

      if (conversationsData.status === "rejected") {
        setError("Conversations temporairement indisponibles.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice("");
    setError("");

    if (!formData.contenu.trim()) {
      setError("Le message ne peut pas être vide.");
      return;
    }

    if (!currentUserId) {
      setError("Utilisateur connecté introuvable.");
      return;
    }

    setSending(true);

    try {
      await createMessage({
        expediteur_id: currentUserId,
        destinataire_id: formData.destinataire_id || null,
        service_id: formData.service_id || null,
        projet_id: formData.projet_id || null,
        tache_id: null,
        contenu: formData.contenu.trim(),
        est_lu: false,
      });

      setFormData(initialForm);
      setNotice("Message envoyé avec succès.");
      await loadMessagingData();

      if (selectedConversationIdRef.current) {
        await loadConversation(selectedConversationIdRef.current, false);
      }
    } catch (sendError) {
      console.error("Message send error:", sendError);
      setError("Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  }

  async function markVisibleMessagesAsRead(messageList) {
    const unreadMessages = messageList.filter(
      (message) =>
        !message.est_lu &&
        String(message.destinataire_id || "") === currentUserId &&
        String(message.expediteur_id || "") !== currentUserId
    );

    if (!unreadMessages.length) {
      return;
    }

    await Promise.allSettled(unreadMessages.map((message) => markMessageAsRead(message.id)));

    setMessages((current) =>
      current.map((message) =>
        unreadMessages.some((unreadMessage) => unreadMessage.id === message.id)
          ? { ...message, est_lu: true }
          : message
      )
    );
  }

  function getConversationTitle(conversation) {
    if (!conversation) {
      return "Conversation";
    }

    if (conversation.projet_id) {
      return projectById[String(conversation.projet_id)] || conversation.title;
    }

    if (conversation.service_id) {
      return serviceById[String(conversation.service_id)] || conversation.title;
    }

    if (conversation.destinataire_id) {
      const otherUserId =
        String(conversation.expediteur_id) === currentUserId
          ? conversation.destinataire_id
          : conversation.expediteur_id;
      return getUserName(userById[String(otherUserId)]);
    }

    return conversation.title || "Conversation générale";
  }

  return (
    <div className="dashboard-page messages-page">
      <div className="board-toolbar">
        <div>
          <h2>Messagerie</h2>
          <p>Conversations et historique des messages internes.</p>
        </div>
        <button type="button" className="date-selector" onClick={loadMessagingData}>
          <RefreshCw size={18} />
          <span>Actualiser</span>
        </button>
        <span className={`realtime-status is-${realtimeStatus}`}>
          <Radio size={16} />
          {realtimeStatus === "connected" ? "En ligne" : "Hors ligne"}
        </span>
      </div>

      {notice && <p className="notice success">{notice}</p>}
      {error && <p className="notice warning">{error}</p>}

      <section className="messages-layout">
        <article className="dashboard-card message-compose-card">
          <div className="card-header">
            <div>
              <h2>Nouveau message</h2>
              <p>Envoyer à un membre, un service ou un projet.</p>
            </div>
            <Send size={20} />
          </div>

          <form className="message-form" onSubmit={handleSubmit}>
            <label>
              Destinataire
              <select name="destinataire_id" value={formData.destinataire_id} onChange={handleChange}>
                <option value="">Aucun destinataire direct</option>
                {users
                  .filter((user) => getUserId(user) !== currentUserId)
                  .map((user) => (
                    <option key={getUserId(user)} value={getUserId(user)}>
                      {getUserName(user)}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Service
              <select name="service_id" value={formData.service_id} onChange={handleChange}>
                <option value="">Aucun service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Projet
              <select name="projet_id" value={formData.projet_id} onChange={handleChange}>
                <option value="">Aucun projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.titre}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Message
              <textarea
                name="contenu"
                value={formData.contenu}
                onChange={handleChange}
                rows={6}
                placeholder="Écrire un message interne..."
              />
            </label>

            <button type="submit" className="primary-action" disabled={sending}>
              <Send size={18} />
              <span>{sending ? "Envoi..." : "Envoyer"}</span>
            </button>
          </form>
        </article>

        <section className="messages-conversations-panel">
          <article className="dashboard-card conversations-list-card">
            <div className="card-header">
              <div>
                <h2>Conversations</h2>
                <p>{loading ? "Chargement..." : `${conversations.length} conversation(s)`}</p>
              </div>
              <Inbox size={20} />
            </div>

            <div className="conversations-list">
              {loading ? (
                <div className="messages-empty">Chargement des conversations...</div>
              ) : conversations.length ? (
                conversations.map((conversation) => (
                  <button
                    type="button"
                    key={conversation.conversation_id}
                    className={`conversation-item ${
                      selectedConversationId === conversation.conversation_id ? "is-selected" : ""
                    }`}
                    onClick={() => setSelectedConversationId(conversation.conversation_id)}
                  >
                    <div className="message-avatar">
                      <MessageSquareText size={18} />
                    </div>
                    <div>
                      <header>
                        <strong>{getConversationTitle(conversation)}</strong>
                        <time>{formatDate(conversation.last_message_at)}</time>
                      </header>
                      <p>{conversation.last_message}</p>
                      <footer>
                        <span>{conversation.total_messages} message(s)</span>
                        {conversation.unread_count > 0 && <mark>{conversation.unread_count} non lu(s)</mark>}
                      </footer>
                    </div>
                  </button>
                ))
              ) : (
                <div className="messages-empty">Aucune conversation pour le moment.</div>
              )}
            </div>
          </article>

          <article className="dashboard-card conversation-history-card">
            <div className="card-header">
              <div>
                <h2>{getConversationTitle(selectedConversation)}</h2>
                <p>{conversationLoading ? "Chargement..." : `${messages.length} message(s)`}</p>
              </div>
              <UsersRound size={20} />
            </div>

            <div className="conversation-history">
              {conversationLoading ? (
                <div className="messages-empty">Chargement de l'historique...</div>
              ) : messages.length ? (
                messages.map((message) => {
                  const sender = userById[String(message.expediteur_id)];
                  const recipient = userById[String(message.destinataire_id)];
                  const isMine = String(message.expediteur_id) === currentUserId;

                  return (
                    <article key={message.id} className={`message-item ${isMine ? "is-mine" : ""}`}>
                      <div className="message-avatar">
                        {isMine ? <MessageSquareText size={18} /> : <UsersRound size={18} />}
                      </div>
                      <div>
                        <header>
                          <strong>{getUserName(sender)}</strong>
                          <time>{formatDate(message.date_creation)}</time>
                        </header>
                        <p>{message.contenu}</p>
                        <footer>
                          <span>{recipient ? `À ${getUserName(recipient)}` : "Message général"}</span>
                          {message.service_id && <span>{serviceById[String(message.service_id)] || message.service_id}</span>}
                          {message.projet_id && <span>{projectById[String(message.projet_id)] || message.projet_id}</span>}
                        </footer>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="messages-empty">Sélectionnez une conversation pour afficher l'historique.</div>
              )}
            </div>
          </article>
        </section>
      </section>
    </div>
  );
}

export default Messages;
