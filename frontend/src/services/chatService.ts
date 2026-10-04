import { api } from "./api";

export const ChatService = {
  getChatUserList: async () => {
    return api("/api/chatuserlist/", {
      method: "GET",
    });
  },
};
