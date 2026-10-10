import type {
  FollowStatus,
  UserDiscoveryPage,
  FollowerSummary,
  UserProfile,
} from "../types/profile";
import type { User } from "../types/user";

export const API_URL = "http://localhost:8080";

export type HttpError = Error & { status?: number };

function withStatus(error: Error, status: number): HttpError {
  return Object.assign(error, { status });
}

export function isUnauthorized(error: unknown) {
  return (error as HttpError | null)?.status === 401;
}

async function profileApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const isForm =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...(!isForm
      ? { headers: { "Content-Type": "application/json", ...options.headers } }
      : {}),
    ...options,
  });
  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = JSON.parse(text) as unknown;
  } catch {
    // Keep plain-text backend errors readable.
  }

  if (typeof payload === "object" && payload !== null && "success" in payload) {
    const envelope = payload as { success?: boolean; data?: unknown; error?: string; message?: string };
    if (envelope.success === false && (!response.ok || envelope.error)) {
      throw withStatus(
        new Error(envelope.error || envelope.message || `Profile request failed (HTTP ${response.status})`),
        response.status,
      );
    }
    if ("data" in envelope && response.ok) {
      payload = envelope.data;
    }
  }

  if (!response.ok) {
    const message = typeof payload === "string"
      ? payload
      : typeof payload === "object" && payload !== null && "error" in payload
        ? String(payload.error)
        : typeof payload === "object" && payload !== null && "message" in payload
          ? String(payload.message)
          : `Profile request failed (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""})`;
    throw withStatus(new Error(message), response.status);
  }
  return payload as T;
}

export const profileService = {
  avatarURL: (path: string) => {
    const normalized = path.replace(/^\.\/?media\//, "/media/");
    return `${API_URL}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
  },
  getCurrentUser: () => profileApi<User>("/api/auth/me"),
  getProfile: (id: number | string) =>
    profileApi<UserProfile>(`/api/users/${id}/profile`),
  updateProfile: (aboutMe: string, isPrivate: boolean) =>
    profileApi<User>("/api/users/profile", {
      method: "PUT",
      body: JSON.stringify({ about_me: aboutMe, is_private: isPrivate }),
    }),
  follow: (id: number | string) =>
    profileApi<{
      status: FollowStatus;
      notification?: { type: string; recipient_id: number; actor_id: number };
    }>(`/api/users/${id}/follow`, { method: "POST" }),
  unfollow: (id: number | string) =>
    profileApi<{ status: "none" }>(`/api/users/${id}/unfollow`, {
      method: "POST",
    }),
  respondToFollowRequest: (followerId: number, accept: boolean) =>
    profileApi<{ status: FollowStatus }>("/api/users/follow-response", {
      method: "POST",
      body: JSON.stringify({ follower_id: followerId, accept }),
    }),
  getPendingRequests: () =>
    profileApi<{ users: FollowerSummary[] }>("/api/users/follow-requests").then(
      (response) => response.users,
    ),
  getFollowers: (id: number | string) =>
    profileApi<{ users: FollowerSummary[] | null }>(
      `/api/users/${id}/followers`,
    ).then((response) => response.users ?? []),
  getFollowing: (id: number | string) =>
    profileApi<{ users: FollowerSummary[] | null }>(
      `/api/users/${id}/following`,
    ).then((response) => response.users ?? []),
  discoverUsers: (limit: number, offset: number, query: string) => {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (query.trim()) params.set("q", query.trim());
    return profileApi<UserDiscoveryPage>(`/api/users/discover?${params}`);
  },
};
