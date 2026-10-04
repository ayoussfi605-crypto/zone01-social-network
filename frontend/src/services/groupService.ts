import { API_URL } from "./profileService";
import type { GroupInvite, GroupSummary } from "../types/group";

type GroupResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
};

async function groupApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const payload = (await response
    .json()
    .catch(() => null)) as GroupResponse<T> | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || "Group request failed");
  }
  return payload.data;
}

export const groupService = {
  createGroup: (title: string, memberIDs: number[]) =>
    groupApi<GroupSummary>("/api/groups", {
      method: "POST",
      body: JSON.stringify({ title, description: "", member_ids: memberIDs }),
    }),
  getPendingInvites: () => groupApi<GroupInvite[]>("/api/groups/invites"),
  respondToInvite: (groupID: number, accept: boolean) =>
    groupApi<{ status: "accepted" | "declined" }>(
      `/api/groups/${groupID}/invite-response`,
      { method: "POST", body: JSON.stringify({ accept }) },
    ),
};
