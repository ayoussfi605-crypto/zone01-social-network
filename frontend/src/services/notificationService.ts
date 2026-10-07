import type { AppNotification } from "../types/notification";
import { API_URL, profileService } from "./profileService";

type Envelope<T> = { data: T };

async function notificationApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    // Keep plain-text backend errors readable.
  }
  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : typeof payload === "object" && payload !== null && "error" in payload
          ? String(payload.error)
          : "Notification request failed";
    throw new Error(message);
  }
  return payload as T;
}

export const notificationService = {
  avatarURL: (path: string) =>
    path ? profileService.avatarURL(path) : "",
  list: (limit = 50) =>
    notificationApi<Envelope<AppNotification[]>>(
      `/api/notifications?limit=${limit}`,
    ).then((response) => response.data ?? []),
  unreadCount: () =>
    notificationApi<Envelope<{ count: number }>>(
      "/api/notifications/unread-count",
    ).then((response) => response.data.count),
  markRead: (id: number) =>
    notificationApi<Envelope<{ status: string }>>(
      `/api/notifications/${id}/read`,
      { method: "POST" },
    ),
  markAllRead: () =>
    notificationApi<Envelope<{ status: string }>>(
      "/api/notifications/read-all",
      { method: "POST" },
    ),
};
