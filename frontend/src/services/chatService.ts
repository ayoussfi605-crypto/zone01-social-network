

import { api, GetSessionToken } from "./api";

export const ChatService = {
  getChatUserList: async () => {
    api("/api/chatuserlist/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${await GetSessionToken()}`,
        "Content-Type": "application/json",
      },
    });
  },
};
