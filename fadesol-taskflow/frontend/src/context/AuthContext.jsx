/* eslint-disable react-refresh/only-export-components */
// Contexte d'authentification global : session, profil utilisateur, roles et permissions.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentUser, loginUser } from "../services/authService";
import { getMyPermissions, getMyUserProfile } from "../services/userService";
import { DATA_EVENTS, subscribeDataEvents } from "../utils/dataEvents";
import { applyUserPreferences, loadUserPreferences } from "../utils/userPreferences";

export const ROLES = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

const roleAliases = {
  // Normalise les variantes venant du backend ou des anciennes donnees.
  Admin: ROLES.ADMIN,
  admin: ROLES.ADMIN,
  ADMIN: ROLES.ADMIN,
  Administrateur: ROLES.ADMIN,
  Manager: ROLES.MANAGER,
  manager: ROLES.MANAGER,
  MANAGER: ROLES.MANAGER,
  Employee: ROLES.EMPLOYEE,
  employee: ROLES.EMPLOYEE,
  EMPLOYEE: ROLES.EMPLOYEE,
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
  // Convertit un role brut en role applicatif standard.
  return roleAliases[role] || role;
}

export function getRoleLabel(role) {
  return roleLabels[normalizeRole(role)] || role || "Utilisateur";
}

export function getInitials(user) {
  // Genere les initiales affichees dans la barre de navigation et les menus.
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

export const permissionRouteOrder = [
  { path: "/dashboard", permission: "dashboard.view" },
  { path: "/users", permission: "users.view" },
  { path: "/services", permission: "services.view" },
  { path: "/projects", permission: "projects.view" },
  { path: "/my-tasks", roles: [ROLES.MANAGER, ROLES.EMPLOYEE] },
  { path: "/tasks", permission: "tasks.view" },
  { path: "/messages", permission: "messages.view" },
  { path: "/permissions", permission: "settings.permissions.manage", roles: [ROLES.ADMIN] },
];

export function userHasPermission(user, permissionKey) {
  if (!permissionKey) {
    return true;
  }

  if (normalizeRole(user?.role) === ROLES.ADMIN) {
    return true;
  }

  return user?.permissions?.[permissionKey] === true;
}

export function getRouteAccess(pathname = "") {
  return permissionRouteOrder.find((route) => pathname.startsWith(route.path));
}

export function canAccessPath(user, pathname = "") {
  const routeAccess = getRouteAccess(pathname);

  if (!routeAccess) {
    return true;
  }

  const allowedByPermission = userHasPermission(user, routeAccess.permission);
  const allowedByRole = !routeAccess.roles || routeAccess.roles.includes(normalizeRole(user?.role));

  return allowedByPermission && allowedByRole;
}

export function getFirstAllowedPath(user) {
  const firstAllowedRoute = permissionRouteOrder.find((route) => canAccessPath(user, route.path));

  return firstAllowedRoute?.path || "/access-denied";
}

export function getAuthorizedPath(user, preferredPath) {
  if (preferredPath && preferredPath !== "/login" && canAccessPath(user, preferredPath)) {
    return preferredPath;
  }

  return getFirstAllowedPath(user);
}

export function getDashboardPath(user) {
  return getFirstAllowedPath(user);
}

async function getCurrentUserWithPermissions() {
  // Charge le compte auth, le profil metier et les permissions effectives.
  const authUser = await getCurrentUser();
  let profile = {};

  try {
    profile = await getMyUserProfile();
  } catch (error) {
    console.error("Current user profile load error:", error);
  }

  try {
    const permissionData = await getMyPermissions();
    return { ...authUser, ...profile, permissions: permissionData.permissions || {} };
  } catch (error) {
    console.error("Current user permissions load error:", error);
    return { ...authUser, ...profile, permissions: {} };
  }
}

export function AuthProvider({ children }) {
  // Le token est initialise depuis localStorage pour conserver la session au refresh.
  const [token, setToken] = useState(() => localStorage.getItem("access_token"));
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("current_user") || localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("access_token")));

  const refreshCurrentUser = useCallback(async () => {
    // Recharge le profil et les permissions apres modification des droits ou du profil.
    const storedToken = localStorage.getItem("access_token");

    if (!storedToken) {
      setCurrentUser(null);
      setToken(null);
      setLoading(false);
      return null;
    }

    setLoading(true);

    try {
      const user = await getCurrentUserWithPermissions();
      setCurrentUser(user);
      // Persiste le profil pour les composants qui lisent encore localStorage directement.
      const toStore = user;
      localStorage.setItem("current_user", JSON.stringify(toStore));
      localStorage.setItem("user", JSON.stringify(toStore));
      setToken(storedToken);
      return user;
    } catch (error) {
      console.error("Current user load error:", error);
      localStorage.removeItem("access_token");
      localStorage.removeItem("current_user");
      localStorage.removeItem("user");
      setCurrentUser(null);
      setToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Au montage, restaure la session si un token est deja stocke.
    let isMounted = true;
    const storedToken = localStorage.getItem("access_token");

    if (!storedToken) {
      return () => {
        isMounted = false;
      };
    }

    getCurrentUserWithPermissions()
      .then((user) => {
        if (isMounted) {
          setCurrentUser(user);
          localStorage.setItem("current_user", JSON.stringify(user));
          localStorage.setItem("user", JSON.stringify(user));
          setToken(storedToken);
        }
      })
      .catch((error) => {
        console.error("Current user load error:", error);
        localStorage.removeItem("access_token");
        localStorage.removeItem("current_user");
        localStorage.removeItem("user");
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

  useEffect(() => {
    // Les ecrans d'administration peuvent declencher un rafraichissement des permissions.
    return subscribeDataEvents([DATA_EVENTS.PERMISSIONS_CHANGED], () => {
      refreshCurrentUser();
    });
  }, [refreshCurrentUser]);

  useEffect(() => {
    // Applique les preferences propres au compte courant a chaque changement de session.
    applyUserPreferences(loadUserPreferences(currentUser));
  }, [currentUser]);

  async function login(email, password) {
    // Connecte l'utilisateur puis charge son profil complet.
    const data = await loginUser(email, password);
    localStorage.setItem("access_token", data.access_token);
    setToken(data.access_token);

    // Le JWT doit etre stocke avant /auth/me pour qu'Axios ajoute le Bearer.
    try {
      const user = await getCurrentUserWithPermissions();
      setCurrentUser(user);
      localStorage.setItem("current_user", JSON.stringify(user));
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    } catch (error) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("current_user");
      localStorage.removeItem("user");
      setToken(null);
      setCurrentUser(null);
      throw error;
    }
  }

  function logout() {
    // Nettoie toutes les traces de session cote navigateur.
    localStorage.removeItem("access_token");
    localStorage.removeItem("current_user");
    localStorage.removeItem("user");
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

  const hasPermission = useCallback(
    (permissionKey) => {
      // L'admin possede toujours tous les droits fonctionnels.
      return userHasPermission(currentUser, permissionKey);
    },
    [currentUser?.permissions, currentUser?.role]
  );

  const hasAnyPermission = useCallback(
    (permissions) => permissions.some((permission) => hasPermission(permission)),
    [hasPermission]
  );

  const value = useMemo(
    // Memoise l'API du contexte pour limiter les rerenders des pages.
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
      hasPermission,
      hasAnyPermission,
    }),
    [currentUser, token, loading, refreshCurrentUser, hasRole, hasAnyRole, hasPermission, hasAnyPermission]
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
