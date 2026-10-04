import type {
  FollowStatus,
  FollowerSummary,
  UserProfile,
} from "../types/profile";
import type { User } from "../types/user";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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
  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : typeof payload === "object" && payload !== null && "error" in payload
          ? String(payload.error)
          : "Profile request failed";
    throw new Error(message);
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
  updatePrivacy: (isPrivate: boolean) =>
    profileApi<User>("/api/users/privacy", {
      method: "PUT",
      body: JSON.stringify({ is_private: isPrivate }),
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
    profileApi<{ data: { users: FollowerSummary[] } }>(
      "/api/users/follow-requests",
    ).then((response) => response.data.users),
  getFollowers: (id: number | string) =>
    profileApi<{ data: { users: FollowerSummary[] } }>(
      `/api/users/${id}/followers`,
    ).then((response) => response.data.users),
  getFollowing: (id: number | string) =>
    profileApi<{ data: { users: FollowerSummary[] } }>(
      `/api/users/${id}/following`,
    ).then((response) => response.data.users),
};
