// Service API d'authentification : login JWT et profil expose par auth_service.
import api from "./api";

export async function loginUser(email, password) {
  // Nettoie l'email avant l'envoi et laisse le backend verifier le mot de passe.
  const response = await api.post("/auth/login", {
    email: email.trim(),
    password,
  });

  return response.data;
}

export async function getCurrentUser() {
  // Retourne les informations de session decodees depuis le token courant.
  const response = await api.get("/auth/me");

  return response.data;
}
