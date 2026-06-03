import api from "./api";

// Appel simple utilisé pour tester les permissions par rôle.
// Le backend autorise Admin + Manager et refuse Employé avec 403.
export async function getUsers(serviceId) {
  const response = await api.get("/users/", {
    params: serviceId ? { id_service: serviceId } : undefined,
  });

  return response.data;
}

export async function getMyUserProfile() {
  const response = await api.get("/users/me/profile");

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
