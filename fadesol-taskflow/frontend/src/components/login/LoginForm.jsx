import { useState } from "react";
import {
  Eye,
  EyeOff,
  Globe2,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";

function LoginForm({ onSubmit, loading, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ email, password, rememberMe });
  }

  return (
    <section className="login-form-panel">
      <button type="button" className="language-selector">
        <Globe2 size={16} />
        Français
        <span>⌄</span>
      </button>

      <div className="login-form-panel__content">
        <div className="login-heading">
          <h2>
            Connexion à votre espace Fadesol <span>TaskFlow</span>
          </h2>
          <div className="login-heading__line" />
          <p>Connectez-vous pour accéder à votre plateforme interne</p>
        </div>

        <form onSubmit={handleSubmit} className="premium-login-form">
          <label className="premium-field">
            <span>Adresse e-mail</span>
            <div className="premium-input">
              <span className="premium-input__icon">
                <Mail size={20} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="exemple@fadesol.ma"
                required
              />
            </div>
          </label>

          <label className="premium-field">
            <span>Mot de passe</span>
            <div className="premium-input">
              <span className="premium-input__icon">
                <LockKeyhole size={20} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Votre mot de passe"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>

          <div className="login-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <span>Se souvenir de moi</span>
            </label>
            <button type="button" className="forgot-link">
              Mot de passe oublié ?
            </button>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit" disabled={loading}>
            <LogIn size={19} />
            <span>{loading ? "Connexion..." : "Se connecter"}</span>
          </button>
        </form>

        <div className="login-separator">
          <span />
          <p>ou continuer avec</p>
          <span />
        </div>

        <button type="button" className="google-button">
          <span className="google-mark">G</span>
          Continuer avec Google
        </button>

        <div className="login-security-card">
          <div className="login-security-card__icon">
            <ShieldCheck size={28} />
          </div>
          <div>
            <strong>Plateforme sécurisée</strong>
            <p>Vos données sont protégées avec les meilleurs standards de sécurité.</p>
          </div>
          <div>
            <strong>SSL chiffré</strong>
            <p>Connexion sécurisée 256-bit SSL</p>
          </div>
        </div>
      </div>

      <footer className="login-form-footer">
        <p>© 2024 Fadesol Power Solutions. Tous droits réservés.</p>
        <span>|</span>
        <button type="button">Confidentialité</button>
        <span>|</span>
        <button type="button">Conditions d’utilisation</button>
      </footer>
    </section>
  );
}

export default LoginForm;
