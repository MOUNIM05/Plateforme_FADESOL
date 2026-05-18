import { useState } from "react";
import { getCurrentUser, loginUser } from "../services/authService";

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await loginUser(email, password);

      // Le token est gardé pour que les appels protégés envoient
      // Authorization: Bearer <token> via l'intercepteur Axios.
      localStorage.setItem("access_token", data.access_token);

      // /auth/me confirme le token et récupère le rôle réel de l'utilisateur.
      const user = await getCurrentUser();
      onLoginSuccess(user);
    } catch (err) {
      console.error("Login error:", err);

      if (err.response) {
        setError(err.response.data.detail || "Erreur de connexion.");
      } else if (err.request) {
        setError(
          "Impossible de contacter le backend. Vérifie que FastAPI tourne sur le port 8003."
        );
      } else {
        setError("Erreur inconnue pendant la connexion.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="empty-state login-panel">
      <div className="empty-illustration">
        <span />
        <span />
        <span />
      </div>
      <h2>Connectez-vous à Fadesol TaskFlow</h2>
      <p>Utilisez votre compte interne pour accéder à votre espace.</p>

      <form onSubmit={handleSubmit} className="login-form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="exemple@fadesol.com"
            required
          />
        </label>

        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Votre mot de passe"
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={loading} className="primary-action">
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}

export default Login;
