import { api } from "./api";
import { profileService } from "./profileService";

export const notificationService = {
  avatarURL: (path: string) => (path ? profileService.avatarURL(path) : ""),
  list: async (limit = 50) => {
    const response: any = await api(`/api/notifications?limit=${limit}`, {
      method: "GET",
    });
    console.log("list all notification", response);

    if (!response.success) {
      return response;
    }

    console.log(response.data ?? []);

    return response.data ?? [];
  },
  unreadCount: async () => {
    const response: any = await api("/api/notifications/unread-count", {
      method: "GET",
    });
    console.log("list unreaded notification", response);

    if (!response.success) {
      return response;
    }
    return response.data.count;
  },
  markRead: async () => {
    const response = await api("/api/notifications/read-all", {
      method: "POST",
    });
    console.log("mark one read", response);
  },
  markAllRead: async () => {
    const respons: any = await api("/api/notifications/read-all", {
      method: "POST",
    });

    console.log("mark al read", respons);
  },
};
