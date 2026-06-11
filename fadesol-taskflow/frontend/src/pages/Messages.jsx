import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox, MessageCircle, Radio, Search, Send, UsersRound } from "lucide-react";
import { getRoleLabel, useAuth } from "../context/AuthContext";
import { getProjects } from "../services/projectService";
import { getServices } from "../services/serviceService";
import { getMyUserProfile, getUsers } from "../services/userService";
import {
  createMessage,
  getConversation,
  getConversations,
  getMessagesWebSocketUrl,
  markMessageAsRead,
} from "../services/messageService";
import { DATA_EVENTS, dispatchDataChanged } from "../utils/dataEvents";

function getUserId(user) {
  return String(user?.uuid || user?.id || user?.user_id || "");
}

function getUserName(user) {
  return (
    [user?.first_name || user?.prenom, user?.last_name || user?.nom].filter(Boolean).join(" ") ||
    user?.email ||
    "Utilisateur"
  );
}

function getNameInitials(name) {
  const initials = String(name || "UT")
    .split(/[.\s@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "UT";
}

function formatDate(value) {
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

function formatTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function Messages() {
  const { currentUser, hasPermission } = useAuth();
  const canSendMessages = hasPermission("messages.send");
  const [conversations, setConversations] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const selectedThreadIdRef = useRef("");
  const selectedConversationIdRef = useRef("");
  const chatHistoryRef = useRef(null);

  const currentUserIdentifiers = useMemo(() => {
    return new Set(
      [
        myProfile?.uuid,
        myProfile?.id,
        currentUser?.uuid,
        currentUser?.user_id,
        currentUser?.id,
      ]
        .filter((identifier) => identifier !== undefined && identifier !== null && identifier !== "")
        .map(String)
    );
  }, [currentUser, myProfile]);

  const currentMessagingUserId =
    String(myProfile?.uuid || myProfile?.id || currentUser?.user_id || currentUser?.uuid || currentUser?.id || "");

  const userById = useMemo(() => {
    return users.reduce((accumulator, user) => {
      accumulator[String(user.id)] = user;
      accumulator[String(user.uuid)] = user;
      return accumulator;
    }, {});
  }, [users]);

  const serviceById = useMemo(() => {
    return services.reduce((accumulator, service) => {
      accumulator[String(service.id)] = service.name || service.nom || service.service_name;
      accumulator[String(service.service_id)] = service.name || service.nom || service.service_name;
      return accumulator;
    }, {});
  }, [services]);

  const projectById = useMemo(() => {
    return projects.reduce((accumulator, project) => {
      accumulator[String(project.id)] = project.titre || project.title || project.name;
      accumulator[String(project.project_id)] = project.titre || project.title || project.name;
      return accumulator;
    }, {});
  }, [projects]);

  function getConversationUserId(conversation) {
    if (!conversation) {
      return "";
    }

    const senderId = String(conversation.expediteur_id || "");
    const recipientId = String(conversation.destinataire_id || "");

    if (recipientId) {
      return currentUserIdentifiers.has(senderId) ? recipientId : senderId;
    }

    return senderId;
  }

  function getConversationUser(conversation) {
    return userById[getConversationUserId(conversation)] || null;
  }

  function getConversationTitle(conversation) {
    if (!conversation) {
      return "Conversation";
    }

    const user = getConversationUser(conversation);

    return (
      (user ? getUserName(user) : "") ||
      conversation.other_user_name ||
      conversation.other_user_email ||
      conversation.title ||
      "Utilisateur"
    );
  }

  function getConversationRole(conversation, user) {
    if (user?.role) {
      return getRoleLabel(user.role);
    }

    if (conversation?.service_id) {
      return serviceById[String(conversation.service_id)] || "Service";
    }

    if (conversation?.projet_id) {
      return projectById[String(conversation.projet_id)] || "Projet";
    }

    return user?.email || "Conversation";
  }

  const conversationByUserId = useMemo(() => {
    return conversations.reduce((accumulator, conversation) => {
      const userId = getConversationUserId(conversation);

      if (userId) {
        accumulator[userId] = conversation;
      }

      return accumulator;
    }, {});
  }, [conversations, currentUserIdentifiers, userById]);

  const threadItems = useMemo(() => {
    const itemsById = {};

    users.forEach((user) => {
      const userId = getUserId(user);

      if (!userId || currentUserIdentifiers.has(userId) || user.email === currentUser?.email) {
        return;
      }

      const conversation = conversationByUserId[userId] || null;
      const name = getUserName(user);

      itemsById[userId] = {
        id: userId,
        userId,
        user,
        conversation,
        name,
        role: getConversationRole(conversation, user),
        lastMessage: conversation?.last_message || "Aucun message pour le moment.",
        lastMessageAt: conversation?.last_message_at || null,
        unreadCount: conversation?.unread_count || 0,
      };
    });

    conversations.forEach((conversation) => {
      const userId = getConversationUserId(conversation);
      const user = userById[userId];
      const name = user ? getUserName(user) : getConversationTitle(conversation);

      if (!userId || itemsById[userId]) {
        return;
      }

      itemsById[userId] = {
        id: userId,
        userId,
        user,
        conversation,
        name,
        role: getConversationRole(conversation, user),
        lastMessage: conversation.last_message,
        lastMessageAt: conversation.last_message_at,
        unreadCount: conversation.unread_count || 0,
      };
    });

    const normalizedSearch = searchTerm.trim().toLowerCase();

    return Object.values(itemsById)
      .filter((item) => {
        if (!normalizedSearch) {
          return true;
        }

        return `${item.name} ${item.role} ${item.user?.email || ""}`.toLowerCase().includes(normalizedSearch);
      })
      .sort((firstItem, secondItem) =>
        firstItem.name.localeCompare(secondItem.name, "fr", {
          sensitivity: "base",
        })
      );
  }, [conversationByUserId, conversations, currentUser, currentUserIdentifiers, searchTerm, userById, users]);

  const selectedThread = useMemo(
    () => threadItems.find((item) => item.id === selectedThreadId) || null,
    [selectedThreadId, threadItems]
  );

  useEffect(() => {
    loadMessagingData();
  }, []);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.conversation_id || "";
  }, [selectedConversation?.conversation_id]);

  useEffect(() => {
    const websocket = new WebSocket(getMessagesWebSocketUrl());

    websocket.onopen = () => {
      setRealtimeStatus("connected");
    };

    websocket.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === "message_created") {
          await refreshMessaging(false);
          dispatchDataChanged(DATA_EVENTS.MESSAGES_CHANGED);
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
    if (realtimeStatus === "connected") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      refreshMessaging(false);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [realtimeStatus]);

  useEffect(() => {
    if (!selectedThread) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    if (!selectedThread.conversation?.conversation_id) {
      setSelectedConversation(null);
      setMessages([]);
      return;
    }

    loadConversation(selectedThread.conversation.conversation_id);
  }, [selectedThread?.conversation?.conversation_id, selectedThread?.id]);

  useEffect(() => {
    if (!chatHistoryRef.current) {
      return;
    }

    chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
  }, [messages, selectedThreadId, conversationLoading]);

  async function refreshMessaging(showLoader = false) {
    await loadMessagingData(showLoader);

    if (selectedConversationIdRef.current) {
      await loadConversation(selectedConversationIdRef.current, false);
    }
  }

  async function loadConversation(conversationId, showLoader = true) {
    if (showLoader) {
      setConversationLoading(true);
    }

    return getConversation(conversationId)
      .then((data) => {
        setSelectedConversation(data.conversation || null);
        const messageData = Array.isArray(data.messages) ? data.messages : [];
        setMessages(messageData);
        markVisibleMessagesAsRead(messageData);
      })
      .catch((loadError) => {
        console.error("Conversation load error:", loadError);
        setSelectedConversation(null);
        setMessages([]);
        setError("Historique de conversation temporairement indisponible.");
      })
      .finally(() => {
        if (showLoader) {
          setConversationLoading(false);
        }
      });
  }

  async function loadMessagingData(showLoader = true) {
    if (showLoader) {
      setLoading(true);
    }

    setError("");

    try {
      const [conversationsData, usersData, profileData, servicesData, projectsData] = await Promise.allSettled([
        getConversations(),
        getUsers(),
        getMyUserProfile(),
        getServices(),
        getProjects(),
      ]);

      if (conversationsData.status === "fulfilled") {
        setConversations(Array.isArray(conversationsData.value) ? conversationsData.value : []);
      }

      if (usersData.status === "fulfilled") {
        setUsers(Array.isArray(usersData.value) ? usersData.value : []);
      }

      if (profileData.status === "fulfilled") {
        setMyProfile(profileData.value || null);
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
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    setNotice("");
    setError("");

    const content = draftMessage.trim();

    if (!content || !selectedThread) {
      return;
    }

    if (!canSendMessages) {
      setError("Vous n'avez pas l'autorisation d'envoyer des messages.");
      return;
    }

    if (!currentMessagingUserId) {
      setError("Utilisateur connecté introuvable.");
      return;
    }

    setSending(true);

    try {
      const createdMessage = await createMessage({
        expediteur_id: currentMessagingUserId,
        destinataire_id: selectedThread.userId,
        service_id: null,
        projet_id: null,
        tache_id: null,
        contenu: content,
        est_lu: false,
      });

      setMessages((current) => [...current, createdMessage]);
      setDraftMessage("");
      setNotice("");
      await loadMessagingData(false);
      dispatchDataChanged(DATA_EVENTS.MESSAGES_CHANGED);
    } catch (sendError) {
      console.error("Message send error:", sendError);
      setError("Impossible d'envoyer le message.");
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function markVisibleMessagesAsRead(messageList) {
    const unreadMessages = messageList.filter(
      (message) =>
        !message.est_lu &&
        currentUserIdentifiers.has(String(message.destinataire_id || "")) &&
        !currentUserIdentifiers.has(String(message.expediteur_id || ""))
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

    setConversations((current) =>
      current.map((conversation) =>
        conversation.conversation_id === selectedConversation?.conversation_id
          ? { ...conversation, unread_count: 0 }
          : conversation
      )
    );
  }

  function isMine(message) {
    return currentUserIdentifiers.has(String(message.expediteur_id || ""));
  }

  return (
    <div className="dashboard-page messages-page">
      <div className="board-toolbar">
        <div>
          <h2>Messagerie</h2>
          <p>Conversations internes en temps réel.</p>
        </div>
        <span className={`realtime-status is-${realtimeStatus}`}>
          <Radio size={16} />
          {realtimeStatus === "connected" ? "En ligne" : "Synchronisation REST"}
        </span>
      </div>

      {notice && <p className="notice success">{notice}</p>}
      {error && <p className="notice warning">{error}</p>}

      <section className="messages-whatsapp-shell">
        <aside className="messages-sidebar-panel">
          <header className="messages-sidebar-header">
            <div>
              <h3>Messagerie</h3>
              <span>{loading ? "Chargement..." : `${threadItems.length} conversation(s)`}</span>
            </div>
            <Inbox size={20} />
          </header>

          <label className="messages-search">
            <Search size={17} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher un utilisateur..."
            />
          </label>

          <div className="conversations-list">
            {loading ? (
              <div className="messages-empty">Chargement des conversations...</div>
            ) : threadItems.length ? (
              threadItems.map((thread) => (
                <button
                  type="button"
                  key={thread.id}
                  className={`conversation-item ${selectedThreadId === thread.id ? "is-selected" : ""}`}
                  onClick={() => setSelectedThreadId(thread.id)}
                >
                  <div className="message-avatar">{getNameInitials(thread.name)}</div>
                  <div>
                    <header>
                      <strong>{thread.name}</strong>
                      <time>{formatDate(thread.lastMessageAt)}</time>
                    </header>
                    <p>{thread.lastMessage}</p>
                    <footer>
                      <span>{thread.role}</span>
                      {thread.unreadCount > 0 && <mark>{thread.unreadCount}</mark>}
                    </footer>
                  </div>
                </button>
              ))
            ) : (
              <div className="messages-empty">Aucune conversation disponible.</div>
            )}
          </div>
        </aside>

        <article className="messages-chat-panel">
          {!selectedThread ? (
            <div className="messages-chat-empty">
              <MessageCircle size={42} />
              <h3>Sélectionnez un utilisateur pour afficher la conversation.</h3>
            </div>
          ) : (
            <>
              <header className="messages-chat-header">
                <div className="message-avatar">{getNameInitials(selectedThread.name)}</div>
                <div>
                  <h3>{selectedThread.name}</h3>
                  <span>{selectedThread.user?.email || selectedThread.role || "Conversation"}</span>
                </div>
                <UsersRound size={20} />
              </header>

              <div className="messages-chat-history" ref={chatHistoryRef}>
                {conversationLoading ? (
                  <div className="messages-empty">Chargement de l'historique...</div>
                ) : messages.length ? (
                  messages.map((message) => (
                    <article key={message.id} className={`message-bubble-row ${isMine(message) ? "is-mine" : ""}`}>
                      <div className="message-bubble">
                        <p>{message.contenu}</p>
                        <time>{formatTime(message.date_creation)}</time>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="messages-empty">Aucun message. Écrivez le premier message.</div>
                )}
              </div>

              <form className="messages-chat-composer" onSubmit={handleSendMessage}>
                <textarea
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  rows={1}
                  placeholder={canSendMessages ? "Écrire un message..." : "Vous n'avez pas l'autorisation d'envoyer des messages."}
                  disabled={!canSendMessages}
                />
                <button type="submit" disabled={sending || !draftMessage.trim() || !canSendMessages}>
                  <Send size={18} />
                  <span>{sending ? "Envoi..." : "Envoyer"}</span>
                </button>
              </form>
            </>
          )}
        </article>
      </section>
    </div>
  );
}

export default Messages;
