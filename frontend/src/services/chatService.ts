import { api } from "./api";
import type { ChatMessage, ChatUsers } from "../types/chat";

type APIResponse<T> = {
  success: boolean;
  data: T;
};

export const ChatService = {
  getChatUserList: async (): Promise<APIResponse<ChatUsers[]>> => {
    return (await api("/api/chatuserlist/", {
      method: "GET",
    })) as APIResponse<ChatUsers[]>;
  },
  getMessages: async (id: string): Promise<APIResponse<ChatMessage[]>> => {
    return (await api(`/api/messages/${id}`, {
      method: "GET",
    })) as APIResponse<ChatMessage[]>;
  },
  MarkMessagesRed: async (
    id: string | number,
  ): Promise<APIResponse<ChatMessage[]>> => {
    return (await api(`/api/messages/read/${id}`, {
      method: "GET",
    })) as APIResponse<ChatMessage[]>;
  },
};
