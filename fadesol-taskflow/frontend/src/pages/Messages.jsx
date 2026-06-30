// Page Messagerie : conversations internes, presence utilisateur et WebSocket temps reel.
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Inbox, MessageCircle, Radio, Search, Send, UsersRound } from "lucide-react";
import { getRoleLabel, useAuth } from "../context/AuthContext";
import { getProjects } from "../services/projectService";
import { getServices } from "../services/serviceService";
import { getMyUserProfile, getUsers } from "../services/userService";
import {
  createMessage,
  getConversation,
  getConversations,
  getMessages,
  getMessagesWebSocketUrl,
  markMessageAsRead,
  getOnlineUsers,
} from "../services/messageService";
import { DATA_EVENTS, dispatchDataChanged } from "../utils/dataEvents";

function getUserId(user) {
  // Normalise l'identifiant utilisateur venant de plusieurs microservices.
  return String(user?.uuid || user?.id || user?.user_id || "");
}

function sameId(a, b) {
  return a !== undefined && a !== null && b !== undefined && b !== null && String(a) === String(b);
}

function isActiveUser(user) {
  return user?.est_actif !== false && user?.is_active !== false;
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

function presenceLabel(info) {
  // Convertit l'etat de presence technique en libelle lisible.
  if (!info) return "";
  if (info.is_online) return "En ligne";
  if (info.last_seen) {
    const last = new Date(info.last_seen).getTime();
    const diffMinutes = (Date.now() - last) / 1000 / 60;
    return diffMinutes < 15 ? "Vu récemment" : "Hors ligne";
  }
  return "Hors ligne";
}

function Messages() {
  // Les permissions determinent si l'utilisateur peut envoyer des messages.
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
  const [presence, setPresence] = useState({});
  const selectedThreadIdRef = useRef("");
  const selectedConversationIdRef = useRef("");
  const chatHistoryRef = useRef(null);
  const handledNotificationRouteRef = useRef("");

  const currentUserIdentifiers = useMemo(() => {
    // Regroupe tous les identifiants possibles du compte courant pour comparer les messages.
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
  const currentRole = currentUser?.role;
  
  function computeDisplayName(name, conversation) {
    // Pour les employes, privilegie un nom lisible et evite d'afficher un UUID complet.
    if (!name) return "Conversation";

    const isEmployee = currentRole && String(currentRole).toLowerCase().includes("employee") ||
      String(currentRole).toLowerCase().includes("employe");

    if (!isEmployee) {
      return name.length > 40 ? `${name.slice(0, 37)}...` : name;
    }

    // Vue Employee : masque les identifiants techniques trop longs.
    const techPattern = /--|^direct--|^general--|^tache--|^projet--|^service--|[0-9a-fA-F]{8,}/i;

    if (techPattern.test(name) || name.length > 30) {
      const idMatch = String(name).match(/[0-9a-fA-F]{4,}/);
      const short = idMatch ? `${idMatch[0].slice(0, 8)}...` : `${String(name).slice(0, 12)}...`;
      return `Conversation ${short}`;
    }

    return name.length > 28 ? `${name.slice(0, 25)}...` : name;
  }

  const userById = useMemo(() => {
    return users.reduce((accumulator, user) => {
      accumulator[String(user.id)] = user;
      accumulator[String(user.uuid)] = user;
      accumulator[String(user.user_id)] = user;
      return accumulator;
    }, {});
  }, [users]);

  const visibleUsers = useMemo(() => {
    // La messagerie affiche tous les utilisateurs actifs, sans restriction de role ou de service.
    return users.filter((user) => {
      if (!isActiveUser(user)) {
        return false;
      }

      const isCurrentById =
        currentUserIdentifiers.has(String(user.id || "")) ||
        currentUserIdentifiers.has(String(user.user_id || "")) ||
        currentUserIdentifiers.has(String(user.uuid || "")) ||
        sameId(user.id, currentUser?.id) ||
        sameId(user.id, currentUser?.user_id) ||
        sameId(user.user_id, currentUser?.id) ||
        sameId(user.user_id, currentUser?.user_id) ||
        sameId(user.uuid, currentUser?.uuid) ||
        sameId(user.uuid, myProfile?.uuid);

      const isCurrentByEmail =
        user.email &&
        (currentUser?.email || myProfile?.email) &&
        user.email.toLowerCase() === String(currentUser?.email || myProfile?.email).toLowerCase();

      return !isCurrentById && !isCurrentByEmail;
    });
  }, [currentUser, currentUserIdentifiers, myProfile, users]);

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

  function getConversationIdentifier(conversation) {
    return String(conversation?.conversation_id || conversation?.conversation || conversation?.conversationId || conversation?.id || "");
  }

  function selectConversationThread(conversation, fallbackConversationId = "") {
    const participantId = getConversationUserId(conversation);
    const matchingThread = threadItems.find((thread) => {
      const threadConversationId = getConversationIdentifier(thread.conversation);

      return (
        String(thread.id) === String(participantId) ||
        String(thread.id) === String(fallbackConversationId) ||
        (threadConversationId && threadConversationId === String(fallbackConversationId))
      );
    });

    setSelectedThreadId(matchingThread?.id || participantId || String(fallbackConversationId || ""));
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
    // Indexe les conversations existantes par interlocuteur pour fusionner users + conversations.
    return conversations.reduce((accumulator, conversation) => {
      const userId = getConversationUserId(conversation);

      if (userId) {
        accumulator[userId] = conversation;
      }

      return accumulator;
    }, {});
  }, [conversations, currentUserIdentifiers, userById]);

  const threadItems = useMemo(() => {
    // Construit la liste laterale a partir des utilisateurs visibles et des conversations existantes.
    const itemsById = {};

    visibleUsers.forEach((user) => {
      const userId = getUserId(user);

      if (!userId || currentUserIdentifiers.has(userId) || user.email === currentUser?.email) {
        return;
      }

      const conversation = conversationByUserId[userId] || null;
      const name = getUserName(user);
      const displayName = computeDisplayName(name, conversation);

      itemsById[userId] = {
        id: userId,
        userId,
        user,
        conversation,
        name,
        displayName,
        role: getConversationRole(conversation, user),
        lastMessage: conversation?.last_message || "Aucun message pour le moment.",
        lastMessageAt: conversation?.last_message_at || null,
        unreadCount: conversation?.unread_count || 0,
      };
    });

    conversations.forEach((conversation) => {
      // Ajoute aussi les conversations dont l'utilisateur n'est pas encore dans la liste chargee.
      const userId = getConversationUserId(conversation);
      const user = userById[userId];
      const name = user ? getUserName(user) : getConversationTitle(conversation);

      if (!userId || itemsById[userId]) {
        return;
      }

      const displayName = computeDisplayName(name, conversation);

      itemsById[userId] = {
        id: userId,
        userId,
        user,
        conversation,
        name,
        displayName,
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
      .sort((firstItem, secondItem) => {
        // Tri principal : derniere activite en premier.
        const getTime = (it) =>
          new Date(it.lastMessageAt || it.conversation?.last_message_at || it.conversation?.last_message?.date_creation || 0).getTime();

        const aTime = getTime(firstItem) || 0;
        const bTime = getTime(secondItem) || 0;

        if (bTime !== aTime) return bTime - aTime;

        // Fallback : ordre alphabetique stable.
        return String(firstItem.displayName || firstItem.name || "").localeCompare(String(secondItem.displayName || secondItem.name || ""), "fr", {
          sensitivity: "base",
        });
      });
  }, [conversationByUserId, conversations, currentUser, currentUserIdentifiers, searchTerm, userById, visibleUsers]);

  const selectedThread = useMemo(() => {
    const found = threadItems.find((item) => item.id === selectedThreadId);

    if (found) {
      return found;
    }

    if (!selectedConversation || !selectedThreadId) {
      return null;
    }

    const conversationId = getConversationIdentifier(selectedConversation);
    const participantId = getConversationUserId(selectedConversation);

    if (String(selectedThreadId) !== String(participantId) && String(selectedThreadId) !== String(conversationId)) {
      return null;
    }

    const user = getConversationUser(selectedConversation);
    const name = user ? getUserName(user) : getConversationTitle(selectedConversation);

    return {
      id: selectedThreadId,
      userId: participantId || selectedThreadId,
      user,
      conversation: selectedConversation,
      name,
      displayName: computeDisplayName(name, selectedConversation),
      role: getConversationRole(selectedConversation, user),
      lastMessage: selectedConversation.last_message || "",
      lastMessageAt: selectedConversation.last_message_at || selectedConversation.date_creation || null,
      unreadCount: selectedConversation.unread_count || 0,
    };
  }, [selectedConversation, selectedThreadId, threadItems, userById]);

  useEffect(() => {
    loadMessagingData();
  }, []);

  // Parametres d'URL permettant d'ouvrir directement une conversation ou un message.
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const conversationId = searchParams.get("conversationId");
    const messageId = searchParams.get("messageId");
    const deepLinkKey = conversationId ? `conversation:${conversationId}` : messageId ? `message:${messageId}` : "";

    if (!deepLinkKey) {
      handledNotificationRouteRef.current = "";
      return;
    }

    if (handledNotificationRouteRef.current === deepLinkKey) {
      return;
    }

    handledNotificationRouteRef.current = deepLinkKey;

    if (conversationId) {
      // Charge les donnees puis ouvre la conversation cible.
      (async () => {
        const data = await loadConversation(conversationId);
        selectConversationThread(data?.conversation, conversationId);
        await loadMessagingData(false);
      })();
      return;
    }

    if (messageId) {
      // Retrouve la conversation qui contient le message demande.
      (async () => {
        try {
          const data = await getMessages();
          const msg = Array.isArray(data) ? data.find((m) => String(m.id) === String(messageId)) : null;

          if (msg) {
            const convId = msg.conversation_id || msg.conversation || msg.conversationId;

            if (convId) {
              const data = await loadConversation(convId);
              selectConversationThread(data?.conversation, convId);
              await loadMessagingData(false);
            } else {
              const directConversationId = `direct--${[String(msg.expediteur_id || ""), String(msg.destinataire_id || "")].sort().join("--")}`;
              const data = await loadConversation(directConversationId);
              selectConversationThread(data?.conversation, directConversationId);
              await loadMessagingData(false);
            }
          } else {
            setError("Message introuvable ou non autorise.");
          }
        } catch (err) {
          console.error("Message lookup error:", err);
          setError("Impossible d'ouvrir le message demande.");
        }
      })();
    }
  }, [searchParams, threadItems]);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.conversation_id || "";
  }, [selectedConversation?.conversation_id]);

  useEffect(() => {
    // Connexion WebSocket pour recevoir les nouveaux messages et les changements de presence.
    const websocket = new WebSocket(getMessagesWebSocketUrl());

    websocket.onopen = () => {
      setRealtimeStatus("connected");
    };

    websocket.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === "message_created") {
          // Mise a jour optimiste : la conversation active remonte immediatement.
          const msg = payload.message || payload;

          if (msg) {
            setConversations((current) => {
              const convs = Array.isArray(current) ? [...current] : [];

              const findById = (c) => String(c.conversation_id || c.conversation || c.id) === String(msg.conversation_id || msg.conversation || "");

              let idx = convs.findIndex(findById);

              if (idx === -1) {
                // Fallback : rapprochement par participants si l'id de conversation manque.
                idx = convs.findIndex((c) => {
                  const a = String(c.expediteur_id || c.expediteur_id || "");
                  const b = String(c.destinataire_id || c.destinataire || "");
                  return (
                    (a && b) &&
                    ((a === String(msg.expediteur_id) && b === String(msg.destinataire_id)) || (a === String(msg.destinataire_id) && b === String(msg.expediteur_id)))
                  );
                });
              }

              const now = msg.date_creation || new Date().toISOString();

              if (idx !== -1) {
                const updated = { ...convs[idx], last_message: msg.contenu || msg.body || msg.content, last_message_at: now };
                convs.splice(idx, 1);
                convs.unshift(updated);
              } else {
                const newConv = {
                  conversation_id: msg.conversation_id || msg.conversation || `direct--${msg.expediteur_id}--${msg.destinataire_id}`,
                  last_message: msg.contenu || msg.body || msg.content,
                  last_message_at: now,
                  expediteur_id: msg.expediteur_id,
                  destinataire_id: msg.destinataire_id,
                  unread_count: 0,
                };
                convs.unshift(newConv);
              }

              return convs;
            });
          }

          await refreshMessaging(false);
          dispatchDataChanged(DATA_EVENTS.MESSAGES_CHANGED);
        }

        if (payload.type === "message_read") {
          setMessages((current) =>
            current.map((message) =>
              message.id === payload.message?.id
                ? { ...message, est_lu: true, date_lecture: payload.read_at || message.date_lecture }
                : message
            )
          );
        }

        if (payload.type === "presence_update") {
          setPresence((prev) => ({ ...prev, [payload.user_id]: { is_online: !!payload.is_online, last_seen: payload.last_seen } }));
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
    // Si le WebSocket n'est pas connecte, un polling REST garde l'interface synchronisee.
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
    // Charge l'historique quand l'utilisateur selectionne une conversation.
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
    // Scroll automatique en bas du fil apres chargement ou nouveau message.
    if (!chatHistoryRef.current) {
      return;
    }

    chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
  }, [messages, selectedThreadId, conversationLoading]);

  async function refreshMessaging(showLoader = false) {
    // Recharge la liste et, si besoin, la conversation ouverte.
    await loadMessagingData(showLoader);

    if (selectedConversationIdRef.current) {
      await loadConversation(selectedConversationIdRef.current, false);
    }
  }

  async function loadConversation(conversationId, showLoader = true) {
    // Charge l'historique d'une conversation et marque les messages visibles comme lus.
    if (showLoader) {
      setConversationLoading(true);
    }

    return getConversation(conversationId)
      .then((data) => {
        setSelectedConversation(data.conversation || null);
        const messageData = Array.isArray(data.messages) ? data.messages : [];
        setMessages(messageData);
        markVisibleMessagesAsRead(messageData);
        return data;
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
    // Charge en parallele conversations, utilisateurs, profil, services, projets et presence.
    if (showLoader) {
      setLoading(true);
    }

    setError("");

    try {
      const [conversationsData, usersData, profileData, servicesData, projectsData, onlineData] = await Promise.allSettled([
        getConversations(),
        getUsers(),
        getMyUserProfile(),
        getServices(),
        getProjects(),
        getOnlineUsers(),
      ]);

      if (conversationsData.status === "fulfilled") {
        // Les conversations recentes doivent apparaitre en premier dans la liste.
        const convs = Array.isArray(conversationsData.value) ? conversationsData.value : [];
        convs.sort((a, b) => {
          const dateA = new Date(a.last_message_at || a.last_message?.date_creation || a.updated_at || a.created_at || 0).getTime();
          const dateB = new Date(b.last_message_at || b.last_message?.date_creation || b.updated_at || b.created_at || 0).getTime();
          return dateB - dateA;
        });

        setConversations(convs);
      } else {
        // Fallback : reconstruit les conversations cote client depuis les messages bruts.
        try {
          const raw = await getMessages();

          if (Array.isArray(raw)) {
            const grouped = {};

            function convIdForMessage(msg) {
              if (msg.tache_id) return `tache--${msg.tache_id}`;
              if (msg.projet_id) return `projet--${msg.projet_id}`;
              if (msg.service_id) return `service--${msg.service_id}`;
              if (msg.destinataire_id) {
                const parts = [String(msg.expediteur_id), String(msg.destinataire_id)].sort();
                return `direct--${parts[0]}--${parts[1]}`;
              }
              return `general--${msg.expediteur_id}`;
            }

            raw.forEach((m) => {
              const cid = convIdForMessage(m);
              grouped[cid] = grouped[cid] || [];
              grouped[cid].push(m);
            });

            const convs = Object.entries(grouped).map(([conversation_id, msgs]) => {
              const last = msgs[msgs.length - 1];
              const first = msgs[0];

              return {
                conversation_id,
                type: conversation_id.split("--")[0],
                title: conversation_id.startsWith("direct--")
                  ? `Conversation ${first.expediteur_id} / ${first.destinataire_id}`
                  : conversation_id,
                total_messages: msgs.length,
                unread_count: msgs.filter((m) => !m.est_lu).length,
                last_message: last.contenu,
                last_message_at: last.date_creation,
                expediteur_id: first.expediteur_id,
                destinataire_id: first.destinataire_id,
                service_id: first.service_id,
                tache_id: first.tache_id,
                projet_id: first.projet_id,
              };
            });

            // Le fallback garde le meme tri que l'API principale.
            convs.sort((a, b) => {
              const dateA = new Date(a.last_message_at || a.lastMessage?.created_at || a.updated_at || a.created_at || 0).getTime();
              const dateB = new Date(b.last_message_at || b.lastMessage?.created_at || b.updated_at || b.created_at || 0).getTime();
              return dateB - dateA;
            });

            setConversations(convs);
          }
        } catch (fallbackError) {
          // Une seule erreur lisible suffit si l'API principale et le fallback echouent.
          setError("Conversations temporairement indisponibles.");
        }
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

      if (onlineData.status === "fulfilled") {
        // Format attendu : { user_id: { is_online: bool, last_seen: string } }.
        setPresence(typeof onlineData.value === "object" && onlineData.value ? onlineData.value : {});
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
    // Envoie un message direct a l'interlocuteur selectionne.
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
      // Mise a jour optimiste pour remonter la conversation sans attendre le WebSocket.
      setConversations((current) => {
        const convs = Array.isArray(current) ? [...current] : [];

        const findById = (c) => String(c.conversation_id || c.conversation || c.id) === String(createdMessage.conversation_id || createdMessage.conversation || "");

        let idx = convs.findIndex(findById);

        if (idx === -1) {
          idx = convs.findIndex((c) => {
            const a = String(c.expediteur_id || "");
            const b = String(c.destinataire_id || "");
            return (
              (a && b) &&
              ((a === String(createdMessage.expediteur_id) && b === String(createdMessage.destinataire_id)) || (a === String(createdMessage.destinataire_id) && b === String(createdMessage.expediteur_id)))
            );
          });
        }

        const now = createdMessage.date_creation || new Date().toISOString();

        if (idx !== -1) {
          const updated = { ...convs[idx], last_message: createdMessage.contenu, last_message_at: now };
          convs.splice(idx, 1);
          convs.unshift(updated);
        } else {
          const newConv = {
            conversation_id: createdMessage.conversation_id || createdMessage.conversation || `direct--${createdMessage.expediteur_id}--${createdMessage.destinataire_id}`,
            last_message: createdMessage.contenu,
            last_message_at: now,
            expediteur_id: createdMessage.expediteur_id,
            destinataire_id: createdMessage.destinataire_id,
            unread_count: 0,
          };
          convs.unshift(newConv);
        }

        return convs;
      });

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
    // Entree envoie le message; Shift+Entree garde le retour a la ligne.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function markVisibleMessagesAsRead(messageList) {
    // Marque comme lus uniquement les messages recus par l'utilisateur courant.
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
                          <div className="message-avatar">
                            {getNameInitials(thread.user ? getUserName(thread.user) : thread.displayName)}
                            <span className={`presence-dot ${presence[thread.userId]?.is_online ? "is-online" : "is-offline"}`} />
                          </div>
                          <div>
                            <header>
                              <strong>{thread.displayName}</strong>
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
                <div className="message-avatar">{getNameInitials(selectedThread.user ? getUserName(selectedThread.user) : selectedThread.displayName)}</div>
                <div>
                  <h3>{selectedThread.displayName}</h3>
                  <span>{selectedThread.user?.email || selectedThread.role || "Conversation"}</span>
                  <small className="presence-text">{presenceLabel(presence[selectedThread.userId])}</small>
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
                        <div className="message-meta">
                          <time>{formatTime(message.date_creation)}</time>
                          {isMine(message) && (
                            <small className="message-status">
                              {message.est_lu
                                ? message.date_lecture
                                  ? ` · Vu ${formatTime(message.date_lecture)}`
                                  : " · Vu"
                                : " · Envoyé"}
                            </small>
                          )}
                        </div>
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
