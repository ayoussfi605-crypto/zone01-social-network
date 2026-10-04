export type ChatMessage = {
  type: string;
  message: string;
  sender_id: number | string;
  receiver_id?: number | string;
  sender_name?: string;
  group_id?: number;
  timestamp?: string;
};

export type ChatPresenceEvent = {
  type: "presence";
  user_id: number;
  online: boolean;
  sent_at: number;
};

export type ChatEvent = ChatMessage | ChatPresenceEvent;

export interface ChatUsers {
  id: string;
  name: string;
  fullName: string;
  handle: string;
  avatar: string;
  time: string;
  lastMessage: string;
  unread: number;
  online: boolean;
  // coverPhoto: string;
}
