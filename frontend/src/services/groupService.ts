import { API_URL } from "./profileService";
import type {
  GroupComment,
  GroupChatMessage,
  GroupDiscovery,
  GroupEvent,
  GroupInvite,
  GroupJoinRequest,
  GroupMember,
  GroupPost,
  GroupSummary,
} from "../types/group";

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
  createGroup: (title: string, description: string, memberIDs: number[]) =>
    groupApi<GroupSummary>("/api/groups", {
      method: "POST",
      body: JSON.stringify({ title, description, member_ids: memberIDs }),
    }),
  browseGroups: () => groupApi<GroupDiscovery[]>("/api/groups/discover"),
  requestToJoin: (groupID: number) =>
    groupApi<{ status: "pending_request" }>(
      `/api/groups/${groupID}/join-requests`,
      {
        method: "POST",
      },
    ),
  getMembers: (groupID: number) =>
    groupApi<GroupMember[]>(`/api/groups/${groupID}/members`),
  getInviteCandidates: (groupID: number) =>
    groupApi<GroupMember[]>(`/api/groups/${groupID}/invite-candidates`),
  inviteMembers: (groupID: number, userIDs: number[]) =>
    groupApi<void>(`/api/groups/${groupID}/invites`, {
      method: "POST",
      body: JSON.stringify({ user_ids: userIDs }),
    }),
  getJoinRequests: (groupID: number) =>
    groupApi<GroupJoinRequest[]>(`/api/groups/${groupID}/join-requests`),
  respondToJoinRequest: (groupID: number, userID: number, accept: boolean) =>
    groupApi<{ status: "accepted" | "declined" }>(
      `/api/groups/${groupID}/join-requests/${userID}/response`,
      { method: "POST", body: JSON.stringify({ accept }) },
    ),
  getPosts: (groupID: number) =>
    groupApi<GroupPost[]>(`/api/groups/${groupID}/posts`),
  createPost: (groupID: number, content: string) =>
    groupApi<GroupPost>(`/api/groups/${groupID}/posts`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  createComment: (groupID: number, postID: number, content: string) =>
    groupApi<GroupComment>(`/api/groups/${groupID}/posts/${postID}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  getEvents: (groupID: number) =>
    groupApi<GroupEvent[]>(`/api/groups/${groupID}/events`),
  getGroupMessages: (groupID: number) =>
    groupApi<GroupChatMessage[]>(`/api/groups/${groupID}/messages`),
  createEvent: (
    groupID: number,
    event: { title: string; description: string; event_time: string },
  ) =>
    groupApi<GroupEvent>(`/api/groups/${groupID}/events`, {
      method: "POST",
      body: JSON.stringify(event),
    }),
  respondToEvent: (
    groupID: number,
    eventID: number,
    response: "going" | "not_going",
  ) =>
    groupApi<{ response: "going" | "not_going" }>(
      `/api/groups/${groupID}/events/${eventID}/response`,
      { method: "POST", body: JSON.stringify({ response }) },
    ),
  getPendingInvites: () => groupApi<GroupInvite[]>("/api/groups/invites"),
  respondToInvite: (groupID: number, accept: boolean) =>
    groupApi<{ status: "accepted" | "declined" }>(
      `/api/groups/${groupID}/invite-response`,
      { method: "POST", body: JSON.stringify({ accept }) },
    ),
};
