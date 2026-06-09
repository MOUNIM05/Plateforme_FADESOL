import api, { API_BASE_URL } from "./api";

export function getMessagesWebSocketUrl() {
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

  return apiUrl.toString();
}

export async function getMessages() {
  const response = await api.get("/messages/");

  return response.data;
}

export async function getConversations() {
  const response = await api.get("/messages/conversations");

  return response.data;
}

export async function getConversation(conversationId) {
  const response = await api.get(`/messages/conversations/${conversationId}`);

  return response.data;
}

export async function getUserMessages(userId) {
  const response = await api.get(`/messages/utilisateur/${userId}`);

  return response.data;
}

export async function createMessage(messageData) {
  const response = await api.post("/messages/", messageData);

  return response.data;
}

export async function markMessageAsRead(messageId) {
  const response = await api.patch(`/messages/${messageId}/lu`);

  return response.data;
}
