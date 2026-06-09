import axios from "axios";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api"
).replace(/\/$/, "");

export function resolveApiUrl(path = "") {
  const normalizedPath = String(path).replace(/^\//, "");

  if (!API_BASE_URL) {
    return `/${normalizedPath}`;
  }

  return new URL(normalizedPath, `${API_BASE_URL}/`).toString();
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes("/auth/login");
    const failedUrl = resolveApiUrl(error.config?.url || "");
    const status = error.response?.status || "NETWORK_ERROR";

    console.error("[API] Request failed", {
      method: error.config?.method?.toUpperCase(),
      url: failedUrl,
      status,
      detail: error.response?.data?.detail || error.message,
    });

    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem("access_token");

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
