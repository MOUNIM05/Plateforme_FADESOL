// Service API de la messagerie : conversations, messages, lecture et WebSocket.
import api, { API_BASE_URL } from "./api";

export function getMessagesWebSocketUrl() {
  // Construit l'URL WebSocket a partir de l'URL API pour fonctionner en local et en production.
  const configuredUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_MESSAGES_WS_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  const apiUrl = new URL(API_BASE_URL);
  const apiBasePath = apiUrl.pathname.replace(/\/api\/?$/, "");
  apiUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  apiUrl.pathname = `${apiBasePath}/ws/messages`;
  apiUrl.search = "";
  apiUrl.hash = "";

  // Ajoute le token en query param car les WebSockets ne permettent pas toujours les headers custom.
  try {
    const token = localStorage.getItem("access_token");

    if (token) {
      const sep = apiUrl.search ? "&" : "?";
      apiUrl.search = `${apiUrl.search}${sep}authorization=${encodeURIComponent("Bearer " + token)}`;
    }
  } catch (e) {
    // Ignore : l'absence de localStorage ne doit pas bloquer la construction de l'URL.
  }

  return apiUrl.toString();
}

export async function getMessages() {
  const response = await api.get("/messages/");

  return response.data;
}

export async function getConversations() {
  // Liste agregee pour la colonne gauche de la messagerie.
  const response = await api.get("/messages/conversations");

  return response.data;
}

export async function getConversation(conversationId) {
  const response = await api.get(`/messages/conversations/${conversationId}`);

  return response.data;
}

export async function getConversationMessages(conversationId) {
  // Alias conserve pour les composants qui nomment explicitement les messages d'une conversation.
  return getConversation(conversationId);
}

export async function getUserMessages(userId) {
  const response = await api.get(`/messages/utilisateur/${userId}`);

  return response.data;
}

export async function createMessage(messageData) {
  // Envoi direct : le backend force l'expediteur depuis le token JWT.
  const response = await api.post("/messages/", messageData);

  return response.data;
}

export async function sendMessage(messageData) {
  // Alias lisible cote composants pour l'envoi de message.
  return createMessage(messageData);
}

export async function markMessageAsRead(messageId) {
  // Met a jour l'etat lu/non lu et declenche la notification temps reel cote backend.
  const response = await api.patch(`/messages/${messageId}/lu`);

  return response.data;
}

export async function getOnlineUsers() {
  const response = await api.get(`/messages/online-users`);

  return response.data;
}
