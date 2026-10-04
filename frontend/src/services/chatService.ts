import { api } from "./api";

export const ChatService = {
  getChatUserList: async () => {
    return api("/api/chatuserlist/", {
      method: "GET",
    });
  },
  getMessages: async (id: string) => {
    return await api(`/api/messages/${id}`, {
      method: "GET",
    });
  },
};
