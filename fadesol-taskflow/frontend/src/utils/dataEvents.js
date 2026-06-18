// Evenements frontend utilises pour synchroniser les pages sans store global lourd.
export const DATA_EVENTS = {
  DATA_CHANGED: "fadesol:data-changed",
  SERVICES_CHANGED: "fadesol:services-changed",
  PROJECTS_CHANGED: "fadesol:projects-changed",
  TASKS_CHANGED: "fadesol:tasks-changed",
  USERS_CHANGED: "fadesol:users-changed",
  MESSAGES_CHANGED: "fadesol:messages-changed",
  PERMISSIONS_CHANGED: "fadesol:permissions-changed",
};

const DATA_EVENT_BROADCAST_KEY = "fadesol:data-event";

export function dispatchDataChanged(...eventNames) {
  // Diffuse un changement de donnees dans l'onglet courant et les autres onglets.
  if (typeof window === "undefined") {
    return;
  }

  const events = [...new Set([...eventNames.filter(Boolean), DATA_EVENTS.DATA_CHANGED])];

  events.forEach((eventName) => {
    window.dispatchEvent(new Event(eventName));
  });

  try {
    window.localStorage.setItem(
      DATA_EVENT_BROADCAST_KEY,
      JSON.stringify({
        events,
        timestamp: Date.now(),
        nonce: Math.random(),
      })
    );
  } catch {
    // LocalStorage peut etre indisponible; les evenements de l'onglet courant fonctionnent encore.
  }
}

export function subscribeDataEvents(eventNames, handler) {
  // Ecoute les evenements locaux et les notifications inter-onglets via localStorage.
  if (typeof window === "undefined") {
    return () => {};
  }

  let pendingRefresh = null;
  const names = [...new Set(eventNames.filter(Boolean))];
  const refresh = () => {
    // Debounce minimal pour regrouper plusieurs evenements emis au meme moment.
    if (pendingRefresh) {
      window.clearTimeout(pendingRefresh);
    }

    pendingRefresh = window.setTimeout(() => {
      pendingRefresh = null;
      handler();
    }, 0);
  };
  const refreshFromStorage = (event) => {
    if (event.key !== DATA_EVENT_BROADCAST_KEY || !event.newValue) {
      return;
    }

    try {
      const payload = JSON.parse(event.newValue);
      const receivedEvents = Array.isArray(payload.events) ? payload.events : [];

      if (receivedEvents.some((eventName) => names.includes(eventName))) {
        refresh();
      }
    } catch {
      refresh();
    }
  };

  names.forEach((eventName) => window.addEventListener(eventName, refresh));
  window.addEventListener("storage", refreshFromStorage);

  return () => {
    if (pendingRefresh) {
      window.clearTimeout(pendingRefresh);
    }

    names.forEach((eventName) => window.removeEventListener(eventName, refresh));
    window.removeEventListener("storage", refreshFromStorage);
  };
}
