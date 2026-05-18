import axios from "axios";

// Création d'une instance Axios centrale.
// Elle permet de communiquer avec le backend FastAPI.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur exécuté avant chaque requête.
// Si un token JWT existe dans localStorage, on l'ajoute automatiquement.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Debug temporaire: permet de vérifier que Vite utilise bien frontend/.env.
console.log("Axios base URL:", import.meta.env.VITE_API_URL);

export default api;
