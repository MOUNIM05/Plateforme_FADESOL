import api from "./api";

export async function loginUser(email, password) {
  const response = await api.post("/auth/login", {
    email: email.trim(),
    password,
  });

  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me");

  return response.data;
}
