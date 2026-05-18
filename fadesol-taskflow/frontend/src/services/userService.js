import api from "./api";

// Appel simple utilisé pour tester les permissions par rôle.
// Le backend autorise Admin + Manager et refuse Employé avec 403.
export async function getUsers() {
  const response = await api.get("/users/");

  console.log("Users response:", response.data);

  return response.data;
}

export async function createUser(userData) {
  const response = await api.post("/users/", userData);

  console.log("Create user response:", response.data);

  return response.data;
}

export async function updateUser(userId, userData) {
  const response = await api.put(`/users/${userId}`, userData);

  console.log("Update user response:", response.data);

  return response.data;
}

export async function deleteUser(userId) {
  const response = await api.delete(`/users/${userId}`);

  console.log("Delete user response:", response.data);

  return response.data;
}
