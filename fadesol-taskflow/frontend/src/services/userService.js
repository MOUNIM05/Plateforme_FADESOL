import api from "./api";

// Appel simple utilise par l'administration et la messagerie pour charger les contacts.
// Le backend renvoie uniquement les champs publics du profil utilisateur.
export async function getUsers(serviceId) {
  // Sans serviceId, la messagerie recupere tous les utilisateurs actifs disponibles.
  const response = await api.get("/users/", {
    params: serviceId ? { id_service: serviceId } : undefined,
  });

  return response.data;
}

export async function getUserById(userId) {
  const response = await api.get(`/users/${userId}`);

  return response.data;
}

export async function getMyUserProfile() {
  const response = await api.get("/users/me");

  return response.data;
}

export async function uploadMyPhoto(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/users/me/photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}

export async function getPermissionCatalog() {
  const response = await api.get("/permissions");

  return response.data;
}

export async function getMyPermissions() {
  const response = await api.get("/users/me/permissions");

  return response.data;
}

export async function getUserPermissions(userId) {
  const response = await api.get(`/permissions/${userId}`);

  return response.data;
}

export async function updateUserPermissions(userId, permissions) {
  const response = await api.patch(`/permissions/${userId}`, { permissions });

  return response.data;
}

export async function createUser(userData) {
  const response = await api.post("/users/", userData);

  return response.data;
}

export async function updateUser(userId, userData) {
  const response = await api.put(`/users/${userId}`, userData);

  return response.data;
}

export async function deleteUser(userId) {
  const response = await api.delete(`/users/${userId}`);

  return response.data;
}
