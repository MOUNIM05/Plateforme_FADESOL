import api from "./api";

// Fonction responsable de la connexion utilisateur.
// Elle envoie email + password vers le backend FastAPI.
export async function loginUser(email, password) {
  console.log("Login request to:", import.meta.env.VITE_API_URL + "/auth/login");
  console.log("Login payload:", {
    email: email.trim(),
    password,
  });

  const response = await api.post("/auth/login", {
    email: email.trim(),
    password,
  });

  console.log("Login response:", response.data);

  return response.data;
}

// Récupère le profil de l'utilisateur connecté.
// Le token JWT est ajouté automatiquement par l'intercepteur Axios dans api.js.
export async function getCurrentUser() {
  const response = await api.get("/auth/me");

  console.log("Current user response:", response.data);

  return response.data;
}
