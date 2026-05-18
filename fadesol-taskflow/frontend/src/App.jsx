import { useEffect, useState } from "react";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import { getCurrentUser } from "./services/authService";

function App() {
  const [hasToken, setHasToken] = useState(Boolean(localStorage.getItem("access_token")));
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(
    Boolean(localStorage.getItem("access_token"))
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      if (!localStorage.getItem("access_token")) {
        if (isMounted) {
          setCurrentUser(null);
          setCheckingSession(false);
        }
        return;
      }

      try {
        const user = await getCurrentUser();
        if (isMounted) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Current user load error:", error);
        localStorage.removeItem("access_token");
        if (isMounted) {
          setHasToken(false);
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, [hasToken]);

  function handleLoginSuccess(user) {
    setCurrentUser(user);
    setHasToken(true);
  }

  if (!hasToken) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (checkingSession || !currentUser) {
    return (
      <main className="session-loading-screen">
        <div>
          <strong>Fadesol TaskFlow</strong>
          <p>Chargement de votre espace...</p>
        </div>
      </main>
    );
  }

  return <AppLayout currentUser={currentUser} />;
}

export default App;
