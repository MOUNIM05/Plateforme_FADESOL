import { ROLES, normalizeRole } from "../context/AuthContext";

function compactValues(values) {
  return values
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map((value) => String(value));
}

function matchesAny(values, allowedValues) {
  return compactValues(values).some((value) => allowedValues.has(value));
}

export function getUserIdentitySet(...users) {
  return new Set(
    compactValues(
      users.flatMap((user) => [
        user?.uuid,
        user?.id,
        user?.user_id,
        user?.utilisateur_id,
        user?.email,
      ])
    )
  );
}

export function getUserServiceSet(...users) {
  return new Set(
    compactValues(
      users.flatMap((user) => [
        user?.service_id,
        user?.id_service,
        user?.service?.id,
        user?.service,
        user?.service_name,
        user?.nom_service,
      ])
    )
  );
}

export function getTaskAssigneeValues(task) {
  return compactValues([
    task?.assigned_to,
    task?.assigned_user_id,
    task?.assignee_id,
    task?.assignee?.id,
    task?.assignee?.uuid,
    task?.assignee?.email,
    task?.assigned_user?.id,
    task?.assigned_user?.uuid,
    task?.assigned_user?.email,
    task?.user_id,
    task?.responsable_id,
  ]);
}

export function getTaskCreatorValues(task) {
  return compactValues([
    task?.created_by,
    task?.creator_id,
    task?.created_by_id,
    task?.sender_id,
  ]);
}

export function getTaskServiceValues(task) {
  return compactValues([
    task?.service_id,
    task?.id_service,
    task?.service?.id,
    task?.service,
    task?.service_name,
    task?.nom_service,
  ]);
}

export function getMessageRecipientValues(message) {
  return compactValues([
    message?.destinataire_id,
    message?.receiver_id,
    message?.recipient_id,
    message?.to_user_id,
    message?.user_id,
    message?.recipient?.id,
    message?.recipient?.uuid,
  ]);
}

export function getMessageSenderValues(message) {
  return compactValues([
    message?.expediteur_id,
    message?.sender_id,
    message?.created_by,
    message?.creator_id,
    message?.sender?.id,
    message?.sender?.uuid,
  ]);
}

export function isTaskAssignedToCurrentUser(task, currentUser, profile = null) {
  const userIds = getUserIdentitySet(currentUser, profile);

  return matchesAny(getTaskAssigneeValues(task), userIds);
}

export function isMessageReceivedByCurrentUser(message, currentUser, profile = null) {
  const userIds = getUserIdentitySet(currentUser, profile);

  return matchesAny(getMessageRecipientValues(message), userIds);
}

export function isNotificationTaskForCurrentUser(task, currentUser, profile = null) {
  const role = normalizeRole(profile?.role || currentUser?.role);

  if (role === ROLES.ADMIN) {
    return true;
  }

  if (task?._notificationAssignedToCurrentUser === true) {
    return true;
  }

  const userIds = getUserIdentitySet(currentUser, profile);
  const serviceIds = getUserServiceSet(currentUser, profile);
  const assignedToUser = matchesAny(getTaskAssigneeValues(task), userIds);
  const createdByUser = matchesAny(getTaskCreatorValues(task), userIds);
  const sameService = matchesAny(getTaskServiceValues(task), serviceIds);

  if (role === ROLES.MANAGER) {
    return sameService || assignedToUser || createdByUser;
  }

  return assignedToUser;
}

export function mergeNotificationRecords(...lists) {
  const records = new Map();

  lists.flat().forEach((record) => {
    if (!record) {
      return;
    }

    const key = String(record.id || record.task_id || record.message_id || JSON.stringify(record));
    records.set(key, { ...(records.get(key) || {}), ...record });
  });

  return Array.from(records.values());
}

export function isNotificationMessageForCurrentUser(message, currentUser, profile = null) {
  const role = normalizeRole(profile?.role || currentUser?.role);

  if (role === ROLES.ADMIN) {
    return true;
  }

  return isMessageReceivedByCurrentUser(message, currentUser, profile);
}

export function getNotificationTimestamp(value) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isNaN(timestamp)) {
    return timestamp;
  }

  const normalized = String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const months = {
    janvier: 0,
    fevrier: 1,
    mars: 2,
    avril: 3,
    mai: 4,
    juin: 5,
    juillet: 6,
    aout: 7,
    septembre: 8,
    octobre: 9,
    novembre: 10,
    decembre: 11,
  };
  const frenchMatch = normalized.match(/(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?(?:,\s*(\d{1,2})[:h](\d{2}))?/);

  if (frenchMatch && months[frenchMatch[2]] !== undefined) {
    const year = Number(frenchMatch[3] || new Date().getFullYear());
    const hour = Number(frenchMatch[4] || 0);
    const minute = Number(frenchMatch[5] || 0);

    return new Date(year, months[frenchMatch[2]], Number(frenchMatch[1]), hour, minute).getTime();
  }

  const shortDateMatch = normalized.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?(?:\s+(\d{1,2}):(\d{2}))?/);

  if (shortDateMatch) {
    const rawYear = shortDateMatch[3] ? Number(shortDateMatch[3]) : new Date().getFullYear();
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const hour = Number(shortDateMatch[4] || 0);
    const minute = Number(shortDateMatch[5] || 0);

    return new Date(year, Number(shortDateMatch[2]) - 1, Number(shortDateMatch[1]), hour, minute).getTime();
  }

  return 0;
}
