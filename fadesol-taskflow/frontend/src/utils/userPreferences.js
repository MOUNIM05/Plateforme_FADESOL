export const USER_SETTINGS_STORAGE_KEY = "fadesol-user-settings";

export const defaultUserPreferences = {
  theme: "light",
  compactMode: false,
  showAvatars: true,
  notificationsEnabled: true,
  messageNotifications: true,
  taskNotifications: true,
};

export function getStoredCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("current_user") || localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function getUserSettingsKey(user = getStoredCurrentUser()) {
  const userId = user?.uuid || user?.id || user?.user_id || user?.email || "guest";
  return `${USER_SETTINGS_STORAGE_KEY}-${String(userId).trim().toLowerCase()}`;
}

export function loadUserPreferences(user = getStoredCurrentUser()) {
  try {
    const userKey = getUserSettingsKey(user);
    const raw = localStorage.getItem(userKey);
    const parsed = raw ? JSON.parse(raw) : {};

    return { ...defaultUserPreferences, ...parsed };
  } catch {
    return defaultUserPreferences;
  }
}

export function saveUserPreferences(preferences, user = getStoredCurrentUser()) {
  const nextPreferences = { ...defaultUserPreferences, ...preferences };
  const userKey = getUserSettingsKey(user);

  localStorage.setItem(userKey, JSON.stringify(nextPreferences));
  window.dispatchEvent(
    new CustomEvent("fadesol-user-settings-changed", {
      detail: {
        preferences: nextPreferences,
        key: userKey,
        user,
      },
    })
  );

  return nextPreferences;
}

export function applyUserPreferences(preferences) {
  const nextPreferences = { ...defaultUserPreferences, ...preferences };
  const root = document.documentElement;

  root.classList.toggle("theme-dark", nextPreferences.theme === "dark");
  root.classList.toggle("compact-mode", nextPreferences.compactMode === true);
  root.classList.toggle("hide-avatars", nextPreferences.showAvatars === false);
  root.dataset.theme = nextPreferences.theme;

  return nextPreferences;
}

export function applyStoredUserPreferences() {
  return applyUserPreferences(loadUserPreferences());
}
