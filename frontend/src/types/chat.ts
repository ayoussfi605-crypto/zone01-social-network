export type ChatMessage = {
  type: string;
  message: string;
  sender_id: number | string;
  receiver_id: number | string;
  sender_name?: string;
};

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
