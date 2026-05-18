import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { getCurrentUser, loginUser } from "../services/authService";
import fadesolLogo from "../assets/fadesol-logo-login.png";
import loginBackground from "../assets/login-energy-bg.png";
import "./LoginPage.css";

function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Connexion réelle au backend FastAPI de Fadesol TaskFlow.
      const data = await loginUser(email, password);

      // Le JWT est utilisé ensuite par Axios pour les routes protégées.
      localStorage.setItem("access_token", data.access_token);

      // On vérifie l'identité connectée et le rôle juste après le login.
      const currentUser = await getCurrentUser();
      onLoginSuccess(currentUser);
    } catch (err) {
      console.error("Login error:", err);

      if (err.response) {
        setError(err.response.data.detail || "Email ou mot de passe incorrect.");
      } else if (err.request) {
        setError("Impossible de contacter le backend. Vérifie le port 8003.");
      } else {
        setError("Erreur inconnue pendant la connexion.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="ft-login-page"
      style={{ backgroundImage: `url(${loginBackground})` }}
    >
      <div className="ft-login-overlay" />

      <section className="ft-login-card" aria-label="Connexion Fadesol TaskFlow">
        <img
          className="ft-login-logo"
          src={fadesolLogo}
          alt="Fadesol Power Solutions"
        />

        <div className="ft-login-heading">
          <h1>LOGIN</h1>
          <p>All your work management, in one simple place..!</p>
        </div>

        <form className="ft-login-form" onSubmit={handleSubmit}>
          <label className="ft-field">
            <span>Email Address</span>
            <div className="ft-input-wrap">
              <Mail size={21} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your Email"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="ft-field">
            <span>Password</span>
            <div className="ft-input-wrap">
              <LockKeyhole size={21} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your Password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="ft-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={21} /> : <Eye size={21} />}
              </button>
            </div>
          </label>

          <div className="ft-login-options">
            <label className="ft-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <button type="button" className="ft-forgot-link">
              Forget Password?
            </button>
          </div>

          {error && <p className="ft-login-error">{error}</p>}

          <button className="ft-login-button" type="submit" disabled={loading}>
            {loading ? "Connexion..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
