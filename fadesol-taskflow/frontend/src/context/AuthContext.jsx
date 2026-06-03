/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser, loginUser } from "../services/authService";

export const ROLES = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

const roleAliases = {
  Admin: ROLES.ADMIN,
  Administrateur: ROLES.ADMIN,
  Manager: ROLES.MANAGER,
  Employee: ROLES.EMPLOYEE,
  Employe: ROLES.EMPLOYEE,
  "Employé": ROLES.EMPLOYEE,
};

const roleLabels = {
  [ROLES.ADMIN]: "Administrateur",
  [ROLES.MANAGER]: "Manager",
  [ROLES.EMPLOYEE]: "Employé",
};

const AuthContext = createContext(null);

export function normalizeRole(role) {
  return roleAliases[role] || role;
}

export function getRoleLabel(role) {
  return roleLabels[normalizeRole(role)] || role || "Utilisateur";
}

export function getInitials(user) {
  const source =
    [user?.prenom || user?.first_name, user?.nom || user?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "FT";

  return source
    .split(/[.\s@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function getDashboardPath() {
  return "/dashboard";
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("access_token"));
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("access_token")));

  const refreshCurrentUser = useCallback(async () => {
    const storedToken = localStorage.getItem("access_token");

    if (!storedToken) {
      setCurrentUser(null);
      setToken(null);
      setLoading(false);
      return null;
    }

    setLoading(true);

    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setToken(storedToken);
      return user;
    } catch (error) {
      console.error("Current user load error:", error);
      localStorage.removeItem("access_token");
      setCurrentUser(null);
      setToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const storedToken = localStorage.getItem("access_token");

    if (!storedToken) {
      return () => {
        isMounted = false;
      };
    }

    getCurrentUser()
      .then((user) => {
        if (isMounted) {
          setCurrentUser(user);
          setToken(storedToken);
        }
      })
      .catch((error) => {
        console.error("Current user load error:", error);
        localStorage.removeItem("access_token");
        if (isMounted) {
          setCurrentUser(null);
          setToken(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function login(email, password) {
    const data = await loginUser(email, password);
    localStorage.setItem("access_token", data.access_token);
    setToken(data.access_token);

    // The JWT must be stored before /auth/me so Axios can attach Bearer auth.
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      return user;
    } catch (error) {
      localStorage.removeItem("access_token");
      setToken(null);
      setCurrentUser(null);
      throw error;
    }
  }

  function logout() {
    localStorage.removeItem("access_token");
    setToken(null);
    setCurrentUser(null);
  }

  const hasRole = useCallback(
    (role) => normalizeRole(currentUser?.role) === normalizeRole(role),
    [currentUser?.role]
  );

  const hasAnyRole = useCallback(
    (roles) => roles.some((role) => hasRole(role)),
    [hasRole]
  );

  const value = useMemo(
    () => ({
      currentUser,
      token,
      loading,
      isAuthenticated: Boolean(token && currentUser),
      login,
      logout,
      refreshCurrentUser,
      hasRole,
      hasAnyRole,
    }),
    [currentUser, token, loading, refreshCurrentUser, hasRole, hasAnyRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
